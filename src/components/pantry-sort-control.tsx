import { Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";
import type { PantrySort, PantrySortField } from "@/db/pantry";

const SortFields: { field: PantrySortField; label: string }[] = [
  { field: "expiry", label: "Expiry" },
  { field: "name", label: "Name" },
  { field: "brand", label: "Brand" },
  { field: "added", label: "Added" },
];

/**
 * What each direction means in plain language. "Ascending" is meaningless to
 * read at a glance — "Soonest first" says what the list will actually do.
 */
const DirectionLabel: Record<PantrySortField, { asc: string; desc: string }> = {
  expiry: { asc: "Soonest", desc: "Latest" },
  name: { asc: "A–Z", desc: "Z–A" },
  brand: { asc: "A–Z", desc: "Z–A" },
  added: { asc: "Oldest", desc: "Newest" },
};

export function PantrySortControl({
  sort,
  onChange,
}: {
  sort: PantrySort;
  onChange: (sort: PantrySort) => void;
}) {
  const directions = DirectionLabel[sort.field];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A horizontal ScrollView has no intrinsic height, so inside a flex
      // column it would expand and push the list down the screen.
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {SortFields.map(({ field, label }) => {
        const isActive = sort.field === field;
        return (
          <Pressable
            key={field}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Sort by ${label}`}
            // Tapping the active field flips direction; tapping another
            // switches to it, starting from ascending.
            onPress={() =>
              onChange({
                field,
                direction:
                  isActive && sort.direction === "asc" ? "desc" : "asc",
              })
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView
              type={isActive ? "backgroundSelected" : "backgroundElement"}
              style={styles.chip}
            >
              <ThemedText
                type={isActive ? "smallBold" : "small"}
                themeColor={isActive ? "text" : "textSecondary"}
              >
                {label}
                {isActive
                  ? ` · ${sort.direction === "asc" ? directions.asc : directions.desc}`
                  : ""}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
