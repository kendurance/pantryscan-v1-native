import type { AsyncStorage } from "@tanstack/query-persist-client-core";

/**
 * Backing store for the persisted query cache on web.
 *
 * Deliberately not `expo-sqlite/kv-store` here. On web, expo-sqlite runs
 * wa-sqlite over an OPFS `AccessHandlePoolVFS`, which is a pool of a fixed
 * six file slots shared by every database in the app. Slots are claimed on
 * open and are not released on page unload, so adding the kv-store database
 * alongside `pantry.db` exhausts the pool across reloads; once full, opening a
 * database fails with `SQLITE_CANTOPEN`, surfaced as `sqlite3_open_v2`.
 *
 * Sharing a single database file between the two is not an option either:
 * `SQLiteStorage` runs its own `PRAGMA user_version` migration, which would
 * collide with the pantry schema's versioning and cause one of the two
 * migrations to be silently skipped.
 *
 * `localStorage` sidesteps both problems. The persisted cache is small, and
 * writes are throttled by the persister, so the synchronous API is not a
 * concern here.
 */
export const queryCacheStorage: AsyncStorage<string> = {
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => {
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    window.localStorage.removeItem(key);
  },
};
