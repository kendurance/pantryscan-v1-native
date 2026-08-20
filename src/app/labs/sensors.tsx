import {
  Accelerometer,
  Gyroscope,
  type AccelerometerMeasurement,
  type GyroscopeMeasurement,
} from "expo-sensors";
import { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";

import { LabButton } from "@/components/lab-button";
import { LabRow, LabScreen, LabSection } from "@/components/lab-screen";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { toast } from "@/lib/toast";
import { Spacing } from "@/constants/theme";

const UpdateIntervalMs = 100;

/**
 * `expo-sensors` ships a web module that implements `startObserving` but not
 * `addListener`, so subscribing throws in a browser. Desktop browsers have no
 * accelerometer to read anyway, so the lab reports that instead.
 */
const SensorsSupported = Platform.OS !== "web";

type Reading = { x: number; y: number; z: number };

const Zero: Reading = { x: 0, y: 0, z: 0 };

function format(value: number): string {
  // Pad so the sign does not shift the column as values cross zero.
  return value.toFixed(3).padStart(7, " ");
}

export default function SensorsLab() {
  const [isSubscribed, setIsSubscribed] = useState(SensorsSupported);
  const [available, setAvailable] = useState<boolean | null>(
    SensorsSupported ? null : false,
  );
  const [accelerometer, setAccelerometer] = useState<Reading>(Zero);
  const [gyroscope, setGyroscope] = useState<Reading>(Zero);

  useEffect(() => {
    if (!SensorsSupported) return;

    let cancelled = false;
    Accelerometer.isAvailableAsync()
      .then((result) => {
        if (!cancelled) setAvailable(result);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSubscribed || !SensorsSupported) return;

    Accelerometer.setUpdateInterval(UpdateIntervalMs);
    Gyroscope.setUpdateInterval(UpdateIntervalMs);

    const accelerometerSub = Accelerometer.addListener(
      (reading: AccelerometerMeasurement) => setAccelerometer(reading),
    );
    const gyroscopeSub = Gyroscope.addListener((reading: GyroscopeMeasurement) =>
      setGyroscope(reading),
    );

    // Sensors keep firing (and draining battery) until explicitly removed, so
    // unsubscribing on unmount is mandatory rather than tidy.
    return () => {
      accelerometerSub.remove();
      gyroscopeSub.remove();
    };
  }, [isSubscribed]);

  return (
    <LabScreen
      title="Sensors"
      description="Live accelerometer and gyroscope readings from expo-sensors. No permission is required, but subscriptions must be cleaned up by hand."
    >
      {available === false && (
        <ThemedText type="small" themeColor="textSecondary">
          {SensorsSupported
            ? "No accelerometer is available here. Emulators usually report nothing — open this on a physical device."
            : "expo-sensors has no listener support on web, so readings stay at zero. Open this lab on a device."}
        </ThemedText>
      )}

      <LabSection title="Accelerometer">
        <ThemedText type="small" themeColor="textSecondary">
          Acceleration in g along each axis, including gravity.
        </ThemedText>
        <AxisReadout reading={accelerometer} />
      </LabSection>

      <LabSection title="Gyroscope">
        <ThemedText type="small" themeColor="textSecondary">
          Rotation rate in radians per second around each axis.
        </ThemedText>
        <AxisReadout reading={gyroscope} />
      </LabSection>

      <LabRow>
        <LabButton
          label={isSubscribed ? "Unsubscribe" : "Subscribe"}
          emphasis="strong"
          disabled={!SensorsSupported}
          onPress={() => {
            // Toast outside the updater: state updaters must stay pure, and
            // React may invoke them more than once.
            toast.info(isSubscribed ? "Unsubscribed" : "Subscribed");
            setIsSubscribed(!isSubscribed);
          }}
        />
      </LabRow>

      <ThemedText type="small" themeColor="textSecondary">
        Sampling every {UpdateIntervalMs}ms while subscribed.
      </ThemedText>
    </LabScreen>
  );
}

function AxisReadout({ reading }: { reading: Reading }) {
  return (
    <ThemedView type="backgroundElement" style={styles.readout}>
      {(["x", "y", "z"] as const).map((axis) => (
        <ThemedView key={axis} style={styles.axisRow}>
          <ThemedText type="smallBold">{axis.toUpperCase()}</ThemedText>
          <ThemedText type="code">{format(reading[axis])}</ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  readout: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
