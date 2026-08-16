import {
  deletePantryItem,
  insertPantryItem,
  listPantryItems,
} from "@/db/pantry";

/**
 * Exercises the pantry SQL against a real SQLite engine (`node:sqlite`) rather
 * than a mock, so the queries themselves are covered — column names, the null
 * handling, and the expiry ordering.
 */
function createTestDb() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require("node:sqlite");
  const raw = new DatabaseSync(":memory:");

  raw.exec(`
    CREATE TABLE pantry_items (
      id INTEGER PRIMARY KEY NOT NULL,
      barcode TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      quantity TEXT,
      image_url TEXT,
      expires_on TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Minimal adapter matching the subset of SQLiteDatabase the module uses.
  return {
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> =>
      raw.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T>(
      sql: string,
      ...params: unknown[]
    ): Promise<T | null> => (raw.prepare(sql).get(...params) ?? null) as T | null,
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = raw.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
  } as unknown as Parameters<typeof listPantryItems>[0];
}

describe("pantry storage", () => {
  it("round-trips an item and maps snake_case columns to camelCase", async () => {
    const db = createTestDb();

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
    const db = createTestDb();

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
    const db = createTestDb();

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
    const db = createTestDb();
    const inserted = await insertPantryItem(db, { barcode: "1", name: "Gone" });

    await deletePantryItem(db, inserted.id);

    expect(await listPantryItems(db)).toHaveLength(0);
  });
});

describe("expiry date handling", () => {
  it("persists and reads back an expiry date", async () => {
    const db = createTestDb();

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
