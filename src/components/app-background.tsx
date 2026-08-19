import { Image } from "expo-image";
import { type ReactNode } from "react";
import { StyleSheet } from "react-native";

import { ThemedView } from "./themed-view";

import { useTheme } from "@/hooks/use-theme";

const PantryPattern = require("@/assets/images/pantry-pattern.png");

/**
 * App-wide backdrop: the pantry artwork behind every screen, faded so content
 * stays legible. The opacity differs per theme because the artwork is a warm
 * mid-brown — it needs to be lighter than a white surface and darker than a
 * black one to read as texture rather than a stain.
 */
export function AppBackground({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDark = theme.background !== "#ffffff";

  return (
    <ThemedView style={styles.container}>
      <Image
        source={PantryPattern}
        style={{ ...styles.pattern, opacity: isDark ? 0.16 : 0.12 }}
        contentFit="cover"
      />
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pattern: {
    position: "absolute",
    pointerEvents: "none",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
