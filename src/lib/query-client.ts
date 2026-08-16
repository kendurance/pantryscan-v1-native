import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

import { queryCacheStorage } from "@/lib/query-cache-storage";

/** How long a cached product stays fresh before a background refetch. */
const StaleTime = 1000 * 60 * 60 * 24; // 24h

/**
 * How long an unused query is kept in memory. Must exceed `PersistMaxAge`,
 * or entries would be evicted from the cache before the persisted copy expires.
 */
const GcTime = 1000 * 60 * 60 * 24 * 7; // 7d

/** How long a persisted cache written to disk is still considered restorable. */
export const PersistMaxAge = 1000 * 60 * 60 * 24 * 7; // 7d

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Product data barely changes. Don't refetch it constantly.
      staleTime: StaleTime,
      gcTime: GcTime,
      retry: 2,
    },
  },
});

/** Backing store is platform-resolved; see `query-cache-storage.ts`. */
export const persister = createAsyncStoragePersister({
  storage: queryCacheStorage,
  key: "PANTRYSCAN_QUERY_CACHE",
});
