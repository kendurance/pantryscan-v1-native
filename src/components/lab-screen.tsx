import { Stack } from "expo-router";
import { type ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { MaxContentWidth, Spacing } from "@/constants/theme";

/** Shared chrome for a lab screen: title, description, and scrolling body. */
export function LabScreen({
  title,
  description,
  children,
  scroll = true,
}: {
  title: string;
  description: string;
  children: ReactNode;
  /** Labs that fill the screen themselves (the camera) opt out of scrolling. */
  scroll?: boolean;
}) {
  const body = (
    <>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
      {children}
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
      ) : (
        <ThemedView style={styles.content}>{body}</ThemedView>
      )}
    </ThemedView>
  );
}

/** A labelled group of controls within a lab. */
export function LabSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

/** A row of wrapped action buttons. */
export function LabRow({ children }: { children: ReactNode }) {
  return <ThemedView style={styles.row}>{children}</ThemedView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  section: {
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
});
