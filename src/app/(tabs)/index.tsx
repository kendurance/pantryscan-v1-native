import { Link } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

/**
 * Stand-ins until the SQLite pantry lands. These cover the states the product
 * screen has to handle: full data, partial data, and a barcode that isn't in
 * the database at all.
 */
const SampleBarcodes = [
  { code: "5000112637922", label: "Coca-Cola — full data" },
  { code: "3017620422003", label: "Nutella — no quantity" },
  { code: "0000000000000", label: "Unknown — not found" },
];

export default function PantryScreen() {
  return (
    <ScreenPlaceholder
      milestone="Milestone 5"
      title="Pantry"
      description="Scanned items and their expiry dates will live here, read from SQLite."
    >
      {SampleBarcodes.map(({ code, label }) => (
        <Link key={code} href={`/product/${code}`} asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.link}>
              <ThemedText type="smallBold">{label}</ThemedText>
              <ThemedText type="code" themeColor="textSecondary">
                {code}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Link>
      ))}
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: "center",
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
