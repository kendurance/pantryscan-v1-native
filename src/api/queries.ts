import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";

import { fetchProduct, ProductNotFoundError } from "@/api/open-food-facts";
import {
  deletePantryItem,
  getPantryItem,
  insertPantryItem,
  listPantryItems,
  updatePantryItemExpiry,
  type NewPantryItem,
  type PantryItem,
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
  list: ["pantry"] as const,
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

export function usePantryItems() {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: pantryKeys.list,
    queryFn: () => listPantryItems(db),
    // The local database is the source of truth, so a cached copy is never
    // "stale" in the way a remote fetch is — only a mutation invalidates it.
    staleTime: Infinity,
  });
}

/**
 * Cancels in-flight pantry reads and snapshots the list so an optimistic write
 * can be rolled back. Cancelling first matters: a refetch that lands after the
 * optimistic update would otherwise clobber it.
 */
async function beginOptimisticPantryUpdate(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: pantryKeys.list });
  return {
    previous: queryClient.getQueryData<PantryItem[]>(pantryKeys.list),
  };
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

      queryClient.setQueryData<PantryItem[]>(pantryKeys.list, (old = []) => [
        {
          ...item,
          // Negative sentinel id: replaced by the real row id once the insert
          // settles and the list is refetched.
          id: -Date.now(),
          addedAt: new Date().toISOString(),
        },
        ...old,
      ]);

      return context;
    },

    onError: (_error, _item, context) => {
      queryClient.setQueryData(pantryKeys.list, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.list });
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

      queryClient.setQueryData<PantryItem[]>(pantryKeys.list, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, expiresOn } : item)),
      );

      return context;
    },

    onError: (_error, _variables, context) => {
      queryClient.setQueryData(pantryKeys.list, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.list });
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

      queryClient.setQueryData<PantryItem[]>(pantryKeys.list, (old = []) =>
        old.filter((item) => item.id !== id),
      );

      return context;
    },

    onError: (_error, _id, context) => {
      queryClient.setQueryData(pantryKeys.list, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.list });
    },
  });
}
