import {
  deletePantryItem,
  getPantryItem,
  insertPantryItem,
  listPantryItems,
  updatePantryItemExpiry,
} from "@/db/pantry";
import { migrate } from "@/db/schema";

type TestDb = Parameters<typeof listPantryItems>[0];

/**
 * Wraps `node:sqlite` in the subset of the `SQLiteDatabase` interface these
 * modules use, so the real SQL runs against a real engine rather than a mock.
 */
function createAdapter(raw: {
  prepare: (sql: string) => {
    all: (...p: unknown[]) => unknown;
    get: (...p: unknown[]) => unknown;
    run: (...p: unknown[]) => { lastInsertRowid: number; changes: number };
  };
  exec: (sql: string) => void;
}): TestDb {
  return {
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> =>
      raw.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T>(
      sql: string,
      ...params: unknown[]
    ): Promise<T | null> =>
      (raw.prepare(sql).get(...params) ?? null) as T | null,
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = raw.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
  } as unknown as TestDb;
}

/**
 * Builds a database by running the real migrations, so the tests fail if the
 * schema and the queries ever drift apart.
 */
async function createTestDb(): Promise<TestDb> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require("node:sqlite");
  const db = createAdapter(new DatabaseSync(":memory:"));
  await migrate(db);
  return db;
}

describe("pantry storage", () => {
  it("round-trips an item and maps snake_case columns to camelCase", async () => {
    const db = await createTestDb();

    const inserted = await insertPantryItem(db, {
      barcode: "5000112637922",
      name: "Coca Cola",
      brand: "Coca-Cola",
      quantity: "330 ml",
      imageUrl: "https://example.test/coke.jpg",
      expiresOn: "2026-09-01",
    });

    expect(inserted).toMatchObject({
      barcode: "5000112637922",
      name: "Coca Cola",
      brand: "Coca-Cola",
      imageUrl: "https://example.test/coke.jpg",
      expiresOn: "2026-09-01",
    });
    expect(inserted.id).toBeGreaterThan(0);
    expect(inserted.addedAt).toBeTruthy();
  });

  it("stores omitted optional fields as undefined, not null", async () => {
    const db = await createTestDb();

    const inserted = await insertPantryItem(db, {
      barcode: "1",
      name: "Unnamed",
    });

    expect(inserted.brand).toBeUndefined();
    expect(inserted.quantity).toBeUndefined();
    expect(inserted.imageUrl).toBeUndefined();
    expect(inserted.expiresOn).toBeUndefined();
  });

  it("orders by soonest expiry, with undated items last", async () => {
    const db = await createTestDb();

    await insertPantryItem(db, { barcode: "1", name: "No date" });
    await insertPantryItem(db, {
      barcode: "2",
      name: "Later",
      expiresOn: "2026-12-31",
    });
    await insertPantryItem(db, {
      barcode: "3",
      name: "Sooner",
      expiresOn: "2026-01-01",
    });

    const items = await listPantryItems(db);
    expect(items.map((i) => i.name)).toEqual(["Sooner", "Later", "No date"]);
  });

  it("removes an item", async () => {
    const db = await createTestDb();
    const inserted = await insertPantryItem(db, { barcode: "1", name: "Gone" });

    await deletePantryItem(db, inserted.id);

    expect(await listPantryItems(db)).toHaveLength(0);
  });
});

describe("expiry date handling", () => {
  it("persists and reads back an expiry date", async () => {
    const db = await createTestDb();

    const inserted = await insertPantryItem(db, {
      barcode: "5000112637922",
      name: "Coca Cola",
      expiresOn: "2026-08-23",
    });

    expect(inserted.expiresOn).toBe("2026-08-23");

    const [listed] = await listPantryItems(db);
    expect(listed.expiresOn).toBe("2026-08-23");
  });
});

describe("expiry reminders", () => {
  it("stores and reads back a notification id", async () => {
    const db = await createTestDb();

    const inserted = await insertPantryItem(
      db,
      { barcode: "1", name: "Milk", expiresOn: "2026-09-01" },
      "notification-abc",
    );

    expect(inserted.notificationId).toBe("notification-abc");

    const fetched = await getPantryItem(db, inserted.id);
    expect(fetched?.notificationId).toBe("notification-abc");
  });

  it("leaves the notification id undefined when none was scheduled", async () => {
    const db = await createTestDb();
    const inserted = await insertPantryItem(db, { barcode: "1", name: "Milk" });

    expect(inserted.notificationId).toBeUndefined();
  });

  it("exposes the id before deletion so the reminder can be cancelled", async () => {
    const db = await createTestDb();
    const inserted = await insertPantryItem(
      db,
      { barcode: "1", name: "Milk" },
      "notification-xyz",
    );

    const beforeDelete = await getPantryItem(db, inserted.id);
    await deletePantryItem(db, inserted.id);

    expect(beforeDelete?.notificationId).toBe("notification-xyz");
    expect(await getPantryItem(db, inserted.id)).toBeNull();
  });
});

describe("editing the expiry date", () => {
  it("updates the date and swaps the notification id", async () => {
    const db = await createTestDb();
    const inserted = await insertPantryItem(
      db,
      { barcode: "1", name: "Milk", expiresOn: "2026-09-01" },
      "old-notification",
    );

    const updated = await updatePantryItemExpiry(
      db,
      inserted.id,
      "2026-09-15",
      "new-notification",
    );

    expect(updated.expiresOn).toBe("2026-09-15");
    expect(updated.notificationId).toBe("new-notification");
  });

  it("clears the date and the reminder together", async () => {
    const db = await createTestDb();
    const inserted = await insertPantryItem(
      db,
      { barcode: "1", name: "Milk", expiresOn: "2026-09-01" },
      "old-notification",
    );

    const updated = await updatePantryItemExpiry(db, inserted.id, undefined, null);

    expect(updated.expiresOn).toBeUndefined();
    expect(updated.notificationId).toBeUndefined();
  });

  it("leaves the other fields untouched", async () => {
    const db = await createTestDb();
    const inserted = await insertPantryItem(db, {
      barcode: "5000112637922",
      name: "Coca Cola",
      brand: "Coca-Cola",
      quantity: "330 ml",
      expiresOn: "2026-09-01",
    });

    const updated = await updatePantryItemExpiry(
      db,
      inserted.id,
      "2026-10-01",
      null,
    );

    expect(updated).toMatchObject({
      barcode: "5000112637922",
      name: "Coca Cola",
      brand: "Coca-Cola",
      quantity: "330 ml",
      addedAt: inserted.addedAt,
    });
  });

  it("re-sorts the list when a date moves earlier", async () => {
    const db = await createTestDb();
    await insertPantryItem(db, { barcode: "1", name: "First", expiresOn: "2026-03-01" });
    const later = await insertPantryItem(db, {
      barcode: "2",
      name: "Second",
      expiresOn: "2026-12-01",
    });

    await updatePantryItemExpiry(db, later.id, "2026-01-01", null);

    const items = await listPantryItems(db);
    expect(items.map((i) => i.name)).toEqual(["Second", "First"]);
  });
});

describe("sorting", () => {
  /** Seeds a spread of names, brands, and expiry dates (some absent). */
  async function seed(db: Awaited<ReturnType<typeof createTestDb>>) {
    await insertPantryItem(db, {
      barcode: "1",
      name: "banana",
      brand: "Chiquita",
      expiresOn: "2026-12-01",
    });
    await insertPantryItem(db, {
      barcode: "2",
      name: "Apple",
      brand: "acme",
      expiresOn: "2026-01-01",
    });
    await insertPantryItem(db, { barcode: "3", name: "Cherry" });
  }

  it("orders by soonest expiry, with undated items last", async () => {
    const db = await createTestDb();
    await seed(db);

    const items = await listPantryItems(db, {
      field: "expiry",
      direction: "asc",
    });
    expect(items.map((i) => i.name)).toEqual(["Apple", "banana", "Cherry"]);
  });

  it("keeps undated items last when expiry is reversed", async () => {
    const db = await createTestDb();
    await seed(db);

    const items = await listPantryItems(db, {
      field: "expiry",
      direction: "desc",
    });
    // "Cherry" has no date, so it stays last rather than leading the list.
    expect(items.map((i) => i.name)).toEqual(["banana", "Apple", "Cherry"]);
  });

  it("sorts names case-insensitively", async () => {
    const db = await createTestDb();
    await seed(db);

    const items = await listPantryItems(db, { field: "name", direction: "asc" });
    // Without COLLATE NOCASE, "Apple" and "Cherry" would both precede "banana".
    expect(items.map((i) => i.name)).toEqual(["Apple", "banana", "Cherry"]);
  });

  it("reverses the name order", async () => {
    const db = await createTestDb();
    await seed(db);

    const items = await listPantryItems(db, {
      field: "name",
      direction: "desc",
    });
    expect(items.map((i) => i.name)).toEqual(["Cherry", "banana", "Apple"]);
  });

  it("sorts by brand, with brandless items last", async () => {
    const db = await createTestDb();
    await seed(db);

    const items = await listPantryItems(db, {
      field: "brand",
      direction: "asc",
    });
    expect(items.map((i) => i.brand)).toEqual(["acme", "Chiquita", undefined]);
  });

  it("orders by when items were added", async () => {
    const db = await createTestDb();
    await seed(db);

    const newest = await listPantryItems(db, {
      field: "added",
      direction: "desc",
    });
    expect(newest[0].name).toBe("Cherry");
  });

  it("defaults to soonest expiry first", async () => {
    const db = await createTestDb();
    await seed(db);

    expect(await listPantryItems(db)).toEqual(
      await listPantryItems(db, { field: "expiry", direction: "asc" }),
    );
  });
});
