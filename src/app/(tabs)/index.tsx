import { Image } from "expo-image";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  usePantryItems,
  useRemoveFromPantry,
  useUpdatePantryExpiry,
} from "@/api/queries";
import { AppBackground } from "@/components/app-background";
import { ExpiryDateField } from "@/components/expiry-date-field";
import { PantrySortControl } from "@/components/pantry-sort-control";
import { DefaultPantrySort, type PantryItem, type PantrySort } from "@/db/pantry";
import { daysUntil } from "@/lib/iso-date";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

export default function PantryScreen() {
  const [sort, setSort] = useState<PantrySort>(DefaultPantrySort);
  const { data: items, isPending } = usePantryItems(sort);
  const hasItems = (items?.length ?? 0) > 0;

  return (
    <AppBackground>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle" style={styles.heading}>
            Pantry
          </ThemedText>

          {/* Hidden until there is something to sort — the control would just
              be noise above an empty state. */}
          {hasItems && <PantrySortControl sort={sort} onChange={setSort} />}

          {isPending ? (
            <ThemedView style={styles.centered}>
              <ActivityIndicator />
            </ThemedView>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              // `flexGrow` only when empty: it lets the empty state fill the
              // screen, but would otherwise stretch a short list's spacing.
              contentContainerStyle={[
                styles.list,
                !hasItems && styles.listEmpty,
              ]}
              ListEmptyComponent={<EmptyState />}
              renderItem={({ item }) => <PantryRow item={item} />}
            />
          )}
        </SafeAreaView>
      </ThemedView>
    </AppBackground>
  );
}

function EmptyState() {
  return (
    <ThemedView style={styles.emptyBackground}>
      <ThemedText themeColor="textSecondary" style={styles.centeredText}>
        Nothing here yet. Scan a barcode to add your first item.
      </ThemedText>
      <Link href="/scan" asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.scanButton}>
            <ThemedText type="smallBold">Scan a barcode</ThemedText>
          </ThemedView>
        </Pressable>
      </Link>
    </ThemedView>
  );
}

function expiryLabel(expiresOn: string | undefined) {
  if (!expiresOn) return { text: "No expiry set", urgent: false };

  const days = daysUntil(expiresOn);
  if (days < 0) return { text: "Expired", urgent: true };
  if (days === 0) return { text: "Expires today", urgent: true };
  if (days === 1) return { text: "Expires tomorrow", urgent: true };
  return { text: `Expires in ${days} days`, urgent: days <= 3 };
}

function PantryRow({ item }: { item: PantryItem }) {
  const { mutate: remove } = useRemoveFromPantry();
  const { mutate: updateExpiry } = useUpdatePantryExpiry();
  const [isEditing, setIsEditing] = useState(false);
  const expiry = expiryLabel(item.expiresOn);
  // Optimistically-added rows carry a negative sentinel id until the insert
  // settles; mutating one would target a row that does not exist yet.
  const isPendingRow = item.id < 0;

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedView style={styles.rowMain}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbnail}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityLabel={item.name}
          />
        ) : (
          <ThemedView type="backgroundSelected" style={styles.thumbnail} />
        )}

        <ThemedView style={styles.rowBody}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {item.name}
          </ThemedText>
          {item.brand && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
            >
              {item.brand}
            </ThemedText>
          )}

          <ThemedText
            type="small"
            themeColor={expiry.urgent ? "text" : "textSecondary"}
          >
            {expiry.text}
          </ThemedText>
        </ThemedView>

        {/* Edit sits directly above Remove so the row's two actions read as a
            pair rather than being split across the tile. */}
        <ThemedView style={styles.rowActions}>
          <Pressable
            onPress={() => setIsEditing((editing) => !editing)}
            disabled={isPendingRow}
            accessibilityLabel={`Change expiry date for ${item.name}`}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {isEditing ? "Done" : "Edit"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => remove(item.id)}
            disabled={isPendingRow}
            accessibilityLabel={`Remove ${item.name}`}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedText type="small" themeColor="textSecondary">
              Remove
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>

      {isEditing && (
        <ExpiryDateField
          value={item.expiresOn}
          onChange={(expiresOn) => {
            setIsEditing(false);
            updateExpiry({ id: item.id, expiresOn });
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    // Transparent so the app-wide pantry backdrop shows through.
    backgroundColor: "transparent",
  },
  safeArea: {
    flex: 1,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  heading: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  listEmpty: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.six,
  },
  centeredText: {
    textAlign: "center",
  },
  emptyBackground: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 360,
    backgroundColor: "transparent",
  },
  row: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    backgroundColor: "transparent",
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
    backgroundColor: "transparent",
  },
  rowActions: {
    alignItems: "flex-end",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  scanButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
