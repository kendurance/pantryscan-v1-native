import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Platform } from "react-native";

import { LabButton } from "@/components/lab-button";
import { LabRow, LabScreen, LabSection } from "@/components/lab-screen";
import { ThemedText } from "@/components/themed-text";

const ImpactStyles = [
  { label: "Light", style: Haptics.ImpactFeedbackStyle.Light },
  { label: "Medium", style: Haptics.ImpactFeedbackStyle.Medium },
  { label: "Heavy", style: Haptics.ImpactFeedbackStyle.Heavy },
  { label: "Rigid", style: Haptics.ImpactFeedbackStyle.Rigid },
  { label: "Soft", style: Haptics.ImpactFeedbackStyle.Soft },
];

const NotificationTypes = [
  { label: "Success", type: Haptics.NotificationFeedbackType.Success },
  { label: "Warning", type: Haptics.NotificationFeedbackType.Warning },
  { label: "Error", type: Haptics.NotificationFeedbackType.Error },
];

export default function HapticsLab() {
  const [lastFired, setLastFired] = useState<string | null>(null);
  // The haptics engine is a no-op in a browser; say so rather than appearing broken.
  const supported = Platform.OS !== "web";

  const fire = (label: string, run: () => Promise<void>) => {
    void run();
    setLastFired(label);
  };

  return (
    <LabScreen
      title="Haptics"
      description="Impact, notification, and selection feedback via expo-haptics. No permission required — the taptic engine is always available."
    >
      {!supported && (
        <ThemedText type="small" themeColor="textSecondary">
          Haptics are a no-op on web. Open this lab on a device to feel the
          difference between styles.
        </ThemedText>
      )}

      <LabSection title="Impact">
        <ThemedText type="small" themeColor="textSecondary">
          Simulates a physical collision. Weight maps to the size of the UI
          element that moved.
        </ThemedText>
        <LabRow>
          {ImpactStyles.map(({ label, style }) => (
            <LabButton
              key={label}
              label={label}
              disabled={!supported}
              onPress={() =>
                fire(`Impact · ${label}`, () => Haptics.impactAsync(style))
              }
            />
          ))}
        </LabRow>
      </LabSection>

      <LabSection title="Notification">
        <ThemedText type="small" themeColor="textSecondary">
          Communicates an outcome. Use these to confirm a result, not to
          decorate a tap.
        </ThemedText>
        <LabRow>
          {NotificationTypes.map(({ label, type }) => (
            <LabButton
              key={label}
              label={label}
              disabled={!supported}
              onPress={() =>
                fire(`Notification · ${label}`, () =>
                  Haptics.notificationAsync(type),
                )
              }
            />
          ))}
        </LabRow>
      </LabSection>

      <LabSection title="Selection">
        <ThemedText type="small" themeColor="textSecondary">
          A light tick for a value changing — pickers, sliders, segmented
          controls.
        </ThemedText>
        <LabRow>
          <LabButton
            label="Selection tick"
            disabled={!supported}
            onPress={() => fire("Selection", () => Haptics.selectionAsync())}
          />
        </LabRow>
      </LabSection>

      {lastFired && (
        <ThemedText type="small" themeColor="textSecondary">
          Last fired: {lastFired}
        </ThemedText>
      )}
    </LabScreen>
  );
}
