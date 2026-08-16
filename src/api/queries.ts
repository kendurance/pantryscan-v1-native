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
  insertPantryItem,
  listPantryItems,
  type NewPantryItem,
  type PantryItem,
} from "@/db/pantry";

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
    mutationFn: (item: NewPantryItem) => insertPantryItem(db, item),

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

export function useRemoveFromPantry() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePantryItem(db, id),

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
