import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { ExpiryDateField } from "./expiry-date-field";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import type { Product } from "@/api/open-food-facts";
import { useAddToPantry } from "@/api/queries";
import { Spacing } from "@/constants/theme";

export function AddToPantry({ product }: { product: Product }) {
  const [expiresOn, setExpiresOn] = useState<string | undefined>(undefined);
  const { mutate, isPending, isSuccess, isError, error, reset } =
    useAddToPantry();

  const handleAdd = () => {
    mutate({
      barcode: product.code,
      name: product.name,
      brand: product.brand,
      quantity: product.quantity,
      imageUrl: product.imageUrl,
      expiresOn,
    });
  };

  if (isSuccess) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Added to pantry</ThemedText>
        <Pressable
          onPress={() => {
            setExpiresOn(undefined);
            reset();
          }}
        >
          <ThemedText type="link" themeColor="textSecondary">
            Add another
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

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

      {isError && (
        <ThemedText type="small" themeColor="textSecondary">
          Couldn&apos;t add this item: {error.message}
        </ThemedText>
      )}
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
  card: {
    alignItems: "center",
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
