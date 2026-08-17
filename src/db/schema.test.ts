import { migrate } from "@/db/schema";

type RawDb = {
  prepare: (sql: string) => {
    all: (...p: unknown[]) => unknown;
    get: (...p: unknown[]) => unknown;
    run: (...p: unknown[]) => { lastInsertRowid: number; changes: number };
  };
  exec: (sql: string) => void;
};

function createRawDb(): RawDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require("node:sqlite");
  return new DatabaseSync(":memory:");
}

function adapt(raw: RawDb) {
  return {
    getAllAsync: async <T>(sql: string, ...p: unknown[]): Promise<T[]> =>
      raw.prepare(sql).all(...p) as T[],
    getFirstAsync: async <T>(sql: string, ...p: unknown[]): Promise<T | null> =>
      (raw.prepare(sql).get(...p) ?? null) as T | null,
    runAsync: async (sql: string, ...p: unknown[]) => {
      const r = raw.prepare(sql).run(...p);
      return {
        lastInsertRowId: Number(r.lastInsertRowid),
        changes: Number(r.changes),
      };
    },
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
  } as unknown as Parameters<typeof migrate>[0];
}

function columnNames(raw: RawDb): string[] {
  const rows = raw.prepare("PRAGMA table_info(pantry_items)").all() as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

function userVersion(raw: RawDb): number {
  return (raw.prepare("PRAGMA user_version").get() as { user_version: number })
    .user_version;
}

describe("migrate", () => {
  it("creates the full schema on a fresh database", async () => {
    const raw = createRawDb();
    await migrate(adapt(raw));

    expect(columnNames(raw)).toEqual(
      expect.arrayContaining([
        "id",
        "barcode",
        "name",
        "brand",
        "quantity",
        "image_url",
        "expires_on",
        "added_at",
        "notification_id",
      ]),
    );
    expect(userVersion(raw)).toBe(2);
  });

  it("is idempotent across repeated runs", async () => {
    const raw = createRawDb();
    await migrate(adapt(raw));
    await migrate(adapt(raw));

    expect(userVersion(raw)).toBe(2);
    // A second ALTER TABLE would have thrown a duplicate-column error.
    expect(columnNames(raw).filter((c) => c === "notification_id")).toHaveLength(
      1,
    );
  });

  it("upgrades an existing v1 database without losing rows", async () => {
    const raw = createRawDb();

    // Recreate the v1 schema exactly as it shipped, then add a row.
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
      INSERT INTO pantry_items (barcode, name) VALUES ('1', 'Existing item');
      PRAGMA user_version = 1;
    `);

    await migrate(adapt(raw));

    expect(columnNames(raw)).toContain("notification_id");
    expect(userVersion(raw)).toBe(2);

    const rows = raw
      .prepare("SELECT name, notification_id FROM pantry_items")
      .all() as { name: string; notification_id: string | null }[];
    expect(rows).toEqual([{ name: "Existing item", notification_id: null }]);
  });
});
