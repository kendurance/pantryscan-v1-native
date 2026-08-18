import { type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";

/** The subset of Expo's `PermissionResponse` every module's hook provides. */
type PermissionLike = {
  granted: boolean;
  canAskAgain: boolean;
};

type PermissionGateProps = {
  /** `null` while the permission state is still resolving. */
  permission: PermissionLike | null;
  request: () => Promise<unknown>;
  /** Why the app needs this, shown before the OS prompt and after a denial. */
  rationale: string;
  children: ReactNode;
};

/**
 * Renders `children` only once a permission is granted, handling all four
 * states an Expo permission can be in: undetermined (still loading), granted,
 * deniable (can prompt again), and denied permanently (must use Settings).
 *
 * Most examples handle only granted/not-granted, which leaves the user stuck
 * with no explanation once they have denied a permission for good.
 */
export function PermissionGate({
  permission,
  request,
  rationale,
  children,
}: PermissionGateProps) {
  if (!permission) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  if (permission.granted) return <>{children}</>;

  if (permission.canAskAgain) {
    return (
      <Centered>
        <ThemedText themeColor="textSecondary" style={styles.text}>
          {rationale}
        </ThemedText>
        <ActionButton label="Grant access" onPress={() => void request()} />
      </Centered>
    );
  }

  return (
    <Centered>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        {rationale}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        Access was denied permanently, so the app can no longer ask.
      </ThemedText>
      <ActionButton
        label="Open settings"
        onPress={() => void Linking.openSettings()}
      />
    </Centered>
  );
}

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundSelected" style={styles.button}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <ThemedView style={styles.centered}>{children}</ThemedView>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: "transparent",
  },
  text: {
    textAlign: "center",
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
