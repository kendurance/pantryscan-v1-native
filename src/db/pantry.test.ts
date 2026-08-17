import {
  deletePantryItem,
  getPantryItem,
  insertPantryItem,
  listPantryItems,
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
