import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

const Labs: { href: Href; title: string; description: string }[] = [
  {
    href: "/labs/camera-capture",
    title: "Camera capture",
    description: "Still photos, permissions, and saving to the file system",
  },
  {
    href: "/labs/audio-recorder",
    title: "Audio recorder",
    description: "Microphone permissions, recording, and playback",
  },
  {
    href: "/labs/notifications",
    title: "Notifications",
    description: "Local scheduling, handlers, and permission states",
  },
  {
    href: "/labs/haptics",
    title: "Haptics",
    description: "Impact, notification, and selection feedback",
  },
  {
    href: "/labs/sensors",
    title: "Sensors",
    description: "Device motion and orientation readings",
  },
];

export default function LabsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Labs</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.intro}>
          A reference gallery of native capabilities, kept separate from the
          product.
        </ThemedText>

        {Labs.map((lab) => (
          <Link key={lab.href as string} href={lab.href} asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{lab.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {lab.description}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        ))}
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
    alignSelf: "stretch",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  intro: {
    marginBottom: Spacing.one,
  },
  card: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
