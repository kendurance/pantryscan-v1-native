import { type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

type ScreenPlaceholderProps = {
  title: string;
  /** What this screen becomes once its milestone lands. */
  description: string;
  /** Milestone label, e.g. "Milestone 5". Shown above the title. */
  milestone?: string;
  children?: ReactNode;
};

/**
 * Stand-in body for routes whose milestone has not been built yet. Keeps the
 * routing skeleton navigable without pretending the feature exists.
 */
export function ScreenPlaceholder({
  title,
  description,
  milestone,
  children,
}: ScreenPlaceholderProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {milestone && (
          <ThemedText type="code" style={styles.milestone}>
            {milestone}
          </ThemedText>
        )}

        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>

        <ThemedText themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>

        {children}
      </SafeAreaView>
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
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  milestone: {
    textTransform: "uppercase",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
  },
});
