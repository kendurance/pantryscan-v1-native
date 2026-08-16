import { Stack, useLocalSearchParams } from "expo-router";

import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { ThemedText } from "@/components/themed-text";

export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();

  return (
    <>
      <Stack.Screen options={{ title: "Product" }} />
      <ScreenPlaceholder
        milestone="Milestone 3"
        title="Product"
        description="Open Food Facts lookup and the add-to-pantry action land here."
      >
        <ThemedText type="code">{barcode}</ThemedText>
      </ScreenPlaceholder>
    </>
  );
}
