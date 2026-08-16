import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductNotFoundError, type Product } from "@/api/open-food-facts";
import { useProduct } from "@/api/queries";
import { AddToPantry } from "@/components/add-to-pantry";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";

export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { data, error, isPending, isFetching, refetch } = useProduct(barcode);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: data?.name ?? "Product" }} />
      <SafeAreaView style={styles.safeArea}>
        {isPending ? (
          <Centered>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">
              Looking up {barcode}…
            </ThemedText>
          </Centered>
        ) : error ? (
          <ProductError
            barcode={barcode}
            error={error}
            isRetrying={isFetching}
            onRetry={refetch}
          />
        ) : (
          <ProductDetail product={data} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <ThemedView style={styles.centered}>{children}</ThemedView>;
}

function ProductError({
  barcode,
  error,
  isRetrying,
  onRetry,
}: {
  barcode: string;
  error: Error;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  // A missing barcode is a dead end; a network failure is worth retrying.
  const notFound = error instanceof ProductNotFoundError;

  return (
    <Centered>
      <ThemedText type="subtitle" style={styles.centeredText}>
        {notFound ? "Not in the database" : "Couldn't load this product"}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centeredText}>
        {notFound
          ? `Open Food Facts has no entry for ${barcode}. It's crowdsourced, so plenty of real products are missing.`
          : error.message}
      </ThemedText>

      {!notFound && (
        <Pressable
          onPress={onRetry}
          disabled={isRetrying}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <ThemedView type="backgroundElement" style={styles.button}>
            <ThemedText type="smallBold">
              {isRetrying ? "Retrying…" : "Try again"}
            </ThemedText>
          </ThemedView>
        </Pressable>
      )}
    </Centered>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const { name, brand, quantity, imageUrl, novaGroup, nutriscoreGrade, code } =
    product;
  const [imageLoading, setImageLoading] = useState(!!imageUrl);

  return (
    <ThemedView style={styles.detail}>
      {imageUrl ? (
        <ThemedView style={styles.imageSlot}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            // Open Food Facts' image CDN is slow — 5-10s time-to-first-byte is
            // normal even for a few KB. Keeping decoded images in memory as
            // well as on disk makes a second viewing instant.
            cachePolicy="memory-disk"
            accessibilityLabel={name}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <ThemedView style={styles.imageOverlay} pointerEvents="none">
              <ActivityIndicator />
            </ThemedView>
          )}
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={styles.imageFallback}>
          <ThemedText type="small" themeColor="textSecondary">
            No image
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.heading}>
        <ThemedText type="subtitle">{name}</ThemedText>
        {/* Brand and quantity are frequently absent in crowdsourced data. */}
        {brand && <ThemedText themeColor="textSecondary">{brand}</ThemedText>}
        {quantity && (
          <ThemedText type="small" themeColor="textSecondary">
            {quantity}
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.facts}>
        <Fact label="Barcode" value={code} />
        {novaGroup !== undefined && (
          <Fact label="NOVA group" value={String(novaGroup)} />
        )}
        {nutriscoreGrade && (
          <Fact label="Nutri-Score" value={nutriscoreGrade.toUpperCase()} />
        )}
      </ThemedView>

      <AddToPantry product={product} />
    </ThemedView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    alignSelf: "stretch",
    maxWidth: MaxContentWidth,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centeredText: {
    textAlign: "center",
  },
  detail: {
    flex: 1,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  imageSlot: {
    width: "100%",
    height: 220,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  imageFallback: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.three,
  },
  heading: {
    gap: Spacing.half,
  },
  facts: {
    gap: Spacing.two,
  },
  fact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
