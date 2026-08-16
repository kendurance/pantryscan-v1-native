import { Link } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

/** Stand-in until the SQLite pantry lands; also proves the dynamic route works. */
const SampleBarcode = "5000112637922";

export default function PantryScreen() {
  return (
    <ScreenPlaceholder
      milestone="Milestone 5"
      title="Pantry"
      description="Scanned items and their expiry dates will live here, read from SQLite."
    >
      <Link href={`/product/${SampleBarcode}`} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.link}>
            <ThemedText type="smallBold">
              Open sample product ({SampleBarcode})
            </ThemedText>
          </ThemedView>
        </Pressable>
      </Link>
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  link: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
