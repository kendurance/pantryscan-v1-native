import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { ExpiryDateField } from "./expiry-date-field";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import type { Product } from "@/api/open-food-facts";
import { useAddToPantry } from "@/api/queries";
import { Spacing } from "@/constants/theme";
import { toast } from "@/lib/toast";

export function AddToPantry({ product }: { product: Product }) {
  const [expiresOn, setExpiresOn] = useState<string | undefined>(undefined);
  const { mutate, isPending } = useAddToPantry();

  const handleAdd = () => {
    mutate(
      {
        barcode: product.code,
        name: product.name,
        brand: product.brand,
        quantity: product.quantity,
        imageUrl: product.imageUrl,
        expiresOn,
      },
      {
        onSuccess: () => {
          toast.success("Added to pantry", product.name);
          // The optimistic update already shows the row, so returning to the
          // list immediately is safe and saves a tap.
          router.replace("/");
        },
        onError: (mutationError) => {
          toast.error("Couldn't add this item", mutationError.message);
        },
      },
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ExpiryDateField value={expiresOn} onChange={setExpiresOn} />

      <Pressable
        onPress={handleAdd}
        disabled={isPending}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView type="backgroundSelected" style={styles.addButton}>
          {isPending ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="smallBold">Add to pantry</ThemedText>
          )}
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
