import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";

export function LabButton({
  label,
  onPress,
  disabled = false,
  emphasis = "normal",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  emphasis?: "normal" | "strong";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        (pressed || disabled) && styles.faded,
      ]}
    >
      <ThemedView
        type={emphasis === "strong" ? "backgroundSelected" : "backgroundElement"}
        style={styles.button}
      >
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  faded: {
    opacity: 0.5,
  },
});
