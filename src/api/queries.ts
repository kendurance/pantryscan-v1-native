import { useQuery } from "@tanstack/react-query";

import { fetchProduct, ProductNotFoundError } from "@/api/open-food-facts";

export const productKeys = {
  all: ["product"] as const,
  detail: (barcode: string) => [...productKeys.all, barcode] as const,
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
