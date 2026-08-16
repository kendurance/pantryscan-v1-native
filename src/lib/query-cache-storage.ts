import AsyncStorage from "expo-sqlite/kv-store";

/**
 * Backing store for the persisted query cache.
 *
 * On native this is `expo-sqlite/kv-store`, which implements the AsyncStorage
 * API on top of SQLite — no extra dependency, and a faster store than a plain
 * key-value file. See `query-cache-storage.web.ts` for the web store.
 */
export const queryCacheStorage = AsyncStorage;
