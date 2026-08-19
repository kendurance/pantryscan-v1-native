import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fromIsoDate, startOfToday, toIsoDate } from "@/lib/iso-date";

function formatForDisplay(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ExpiryDateFieldProps = {
  /** Selected expiry as YYYY-MM-DD, or undefined when none is set. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

/**
 * Picks an expiry date.
 *
 * `@expo/ui`'s `DateTimePicker` renders `null` on web, so web gets a native
 * `<input type="date">` instead. On Android the picker is a dialog that opens
 * as soon as it mounts, which is why it is only rendered while picking.
 */
export function ExpiryDateField({ value, onChange }: ExpiryDateFieldProps) {
  const [isPicking, setIsPicking] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Expires on
      </ThemedText>

      <ThemedView style={styles.row}>
        {Platform.OS === "web" ? (
          <WebDateInput value={value} onChange={onChange} />
        ) : (
          <Pressable
            onPress={() => setIsPicking(true)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText
                type="small"
                themeColor={value ? "text" : "textSecondary"}
              >
                {value ? formatForDisplay(value) : "Set a date"}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}

        {value && (
          <Pressable
            onPress={() => onChange(undefined)}
            accessibilityLabel="Clear expiry date"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedText type="small" themeColor="textSecondary">
              Clear
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      {isPicking && Platform.OS !== "web" && (
        <DateTimePicker
          mode="date"
          value={value ? fromIsoDate(value) : startOfToday()}
          minimumDate={startOfToday()}
          onValueChange={(_event, date) => {
            setIsPicking(false);
            onChange(toIsoDate(date));
          }}
          onDismiss={() => setIsPicking(false)}
        />
      )}
    </ThemedView>
  );
}

/**
 * Web fallback. Rendered through `any` because React Native's JSX types don't
 * include DOM intrinsics, though react-native-web renders them fine.
 */
function WebDateInput({ value, onChange }: ExpiryDateFieldProps) {
  const Input = "input" as unknown as React.ElementType;
  const theme = useTheme();

  return (
    <Input
      type="date"
      value={value ?? ""}
      min={toIsoDate(startOfToday())}
      onChange={(event: { target: { value: string } }) =>
        onChange(event.target.value || undefined)
      }
      style={{
        font: "inherit",
        padding: Spacing.two,
        borderRadius: Spacing.two,
        border: "1px solid rgba(128,128,128,0.4)",
        // Explicit colours rather than `inherit`/transparent: the browser draws
        // the date text and calendar picker itself, and in dark mode those
        // default to near-black, leaving black text on a black surface.
        background: theme.backgroundElement,
        color: theme.text,
        colorScheme: theme.background === "#ffffff" ? "light" : "dark",
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    backgroundColor: "transparent",
  },
  field: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
