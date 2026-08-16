import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Bump this when adding a migration below. `PRAGMA user_version` tracks which
 * migrations a given device has already run, so each one applies exactly once.
 */
const LatestVersion = 1;

/**
 * Runs pending migrations on the pantry database. Passed to `SQLiteProvider`'s
 * `onInit`, so it completes before any component can query.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= LatestVersion) return;

  if (currentVersion < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS pantry_items (
        id INTEGER PRIMARY KEY NOT NULL,
        barcode TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        quantity TEXT,
        image_url TEXT,
        expires_on TEXT,
        added_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_pantry_items_expires_on
        ON pantry_items (expires_on);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${LatestVersion}`);
}
