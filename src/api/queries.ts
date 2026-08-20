import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";

import { fetchProduct, ProductNotFoundError } from "@/api/open-food-facts";
import {
  DefaultPantrySort,
  deletePantryItem,
  getPantryItem,
  insertPantryItem,
  listPantryItems,
  updatePantryItemExpiry,
  type NewPantryItem,
  type PantryItem,
  type PantrySort,
} from "@/db/pantry";
import {
  cancelExpiryReminder,
  scheduleExpiryReminder,
} from "@/lib/notifications";

export const productKeys = {
  all: ["product"] as const,
  detail: (barcode: string) => [...productKeys.all, barcode] as const,
};

export const pantryKeys = {
  all: ["pantry"] as const,
  /**
   * The sort is part of the key so each ordering caches separately; reusing one
   * key would serve the previous ordering until a refetch landed.
   */
  list: (sort: PantrySort = DefaultPantrySort) =>
    ["pantry", sort.field, sort.direction] as const,
};

export function useProduct(barcode: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(barcode ?? ""),
    queryFn: ({ signal }) => fetchProduct(barcode!, signal),
    // Conditional fetching in v5: the query stays idle until a barcode exists.
    enabled: !!barcode,
    // An unknown barcode will stay unknown, so retrying it is pure latency.
    retry: (failureCount, error) =>
      error instanceof ProductNotFoundError ? false : failureCount < 2,
  });
}

export function usePantryItems(sort: PantrySort = DefaultPantrySort) {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: pantryKeys.list(sort),
    queryFn: () => listPantryItems(db, sort),
    // The local database is the source of truth, so a cached copy is never
    // "stale" in the way a remote fetch is — only a mutation invalidates it.
    staleTime: Infinity,
    // Keeps the previous ordering on screen while the new one loads, instead of
    // flashing an empty list on every sort change.
    placeholderData: (previous) => previous,
  });
}

/** Every cached pantry list, one per sort option. */
type PantrySnapshot = [readonly unknown[], PantryItem[] | undefined][];

/**
 * Cancels in-flight pantry reads and snapshots every cached ordering so an
 * optimistic write can be rolled back. Cancelling first matters: a refetch that
 * lands after the optimistic update would otherwise clobber it.
 */
async function beginOptimisticPantryUpdate(
  queryClient: QueryClient,
): Promise<{ previous: PantrySnapshot }> {
  await queryClient.cancelQueries({ queryKey: pantryKeys.all });
  return {
    previous: queryClient.getQueriesData<PantryItem[]>({
      queryKey: pantryKeys.all,
    }),
  };
}

/**
 * Applies an optimistic change to every cached ordering. Each sort is a
 * separate cache entry, so updating only the active one would leave the others
 * stale the moment the user switched sort.
 */
function updateEveryPantryList(
  queryClient: QueryClient,
  update: (items: PantryItem[]) => PantryItem[],
) {
  queryClient.setQueriesData<PantryItem[]>(
    { queryKey: pantryKeys.all },
    (old) => update(old ?? []),
  );
}

/** Restores every ordering captured by `beginOptimisticPantryUpdate`. */
function restorePantryLists(
  queryClient: QueryClient,
  snapshot: PantrySnapshot | undefined,
) {
  snapshot?.forEach(([key, items]) => queryClient.setQueryData(key, items));
}

export function useAddToPantry() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: NewPantryItem) => {
      // Schedule first so the identifier can be stored with the row; without
      // it there is no way to cancel the reminder when the item is deleted.
      const notificationId = await scheduleExpiryReminder(item);
      try {
        return await insertPantryItem(db, item, notificationId);
      } catch (error) {
        // Don't leave a reminder scheduled for a row that was never written.
        await cancelExpiryReminder(notificationId ?? undefined);
        throw error;
      }
    },

    onMutate: async (item) => {
      const context = await beginOptimisticPantryUpdate(queryClient);

      updateEveryPantryList(queryClient, (items) => [
        {
          ...item,
          // Negative sentinel id: replaced by the real row id once the insert
          // settles and the list is refetched.
          id: -Date.now(),
          addedAt: new Date().toISOString(),
        },
        ...items,
      ]);

      return context;
    },

    onError: (_error, _item, context) => {
      restorePantryLists(queryClient, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all });
    },
  });
}

export function useUpdatePantryExpiry() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      expiresOn,
    }: {
      id: number;
      expiresOn: string | undefined;
    }) => {
      const existing = await getPantryItem(db, id);
      if (!existing) throw new Error(`Pantry item ${id} no longer exists`);

      // Schedule the replacement before cancelling the old reminder, so a
      // failure here leaves the original intact rather than none at all.
      const notificationId = await scheduleExpiryReminder({
        name: existing.name,
        expiresOn,
      });

      try {
        const updated = await updatePantryItemExpiry(
          db,
          id,
          expiresOn,
          notificationId,
        );
        await cancelExpiryReminder(existing.notificationId);
        return updated;
      } catch (error) {
        // The row is unchanged, so drop the reminder that now has no owner.
        await cancelExpiryReminder(notificationId ?? undefined);
        throw error;
      }
    },

    onMutate: async ({ id, expiresOn }) => {
      const context = await beginOptimisticPantryUpdate(queryClient);

      updateEveryPantryList(queryClient, (items) =>
        items.map((item) => (item.id === id ? { ...item, expiresOn } : item)),
      );

      return context;
    },

    onError: (_error, _variables, context) => {
      restorePantryLists(queryClient, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all });
    },
  });
}

export function useRemoveFromPantry() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      // Read the row first: once it is deleted the identifier is gone, and an
      // orphaned reminder would fire for an item the user no longer has.
      const existing = await getPantryItem(db, id);
      await deletePantryItem(db, id);
      await cancelExpiryReminder(existing?.notificationId);
    },

    onMutate: async (id) => {
      const context = await beginOptimisticPantryUpdate(queryClient);

      updateEveryPantryList(queryClient, (items) =>
        items.filter((item) => item.id !== id),
      );

      return context;
    },

    onError: (_error, _id, context) => {
      restorePantryLists(queryClient, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all });
    },
  });
}
