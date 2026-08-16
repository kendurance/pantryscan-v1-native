import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";

/**
 * UPC-A is deliberately absent: iOS reports UPC-A codes as EAN-13 with a
 * leading zero, so `ean13` already covers US groceries on both platforms.
 */
const BarcodeTypes = ["ean13", "ean8", "upc_e", "qr"] as const;

/** How long to ignore further scans after a successful one. */
const RescanDelayMs = 1500;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  // Pausing the camera when the tab is backgrounded keeps it from holding the
  // device camera (and the battery) while the user is elsewhere.
  const isFocused = useIsFocused();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The unlock timer outlives a fast navigation away from this tab, so clear it
  // on unmount rather than letting it fire against a gone component.
  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      // `onBarcodeScanned` fires on every frame containing a barcode — many
      // times per second — so this guard is mandatory, not defensive. A ref
      // rather than state, because state updates land a render too late.
      if (lockedRef.current) return;
      lockedRef.current = true;

      setScannedCode(data);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push(`/product/${data}`);

      unlockTimerRef.current = setTimeout(() => {
        lockedRef.current = false;
        setScannedCode(null);
      }, RescanDelayMs);
    },
    [],
  );

  // `null` means the permission state is still resolving.
  if (!permission) {
    return <Centered />;
  }

  if (!permission.granted) {
    return (
      <Centered>
        <ThemedText type="subtitle" style={styles.centeredText}>
          Camera access needed
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          PantryScan uses the camera to scan grocery barcodes.
        </ThemedText>

        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.button}>
              <ThemedText type="smallBold">Grant access</ThemedText>
            </ThemedView>
          </Pressable>
        ) : (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.centeredText}
          >
            Access was denied. Enable the camera for PantryScan in your device
            settings to continue.
          </ThemedText>
        )}
      </Centered>
    );
  }

  return (
    // Black rather than the theme background: this sits behind the camera feed,
    // so a light theme would otherwise flash white before the preview appears.
    <ThemedView style={styles.cameraContainer}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: [...BarcodeTypes] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="none">
        <ThemedView style={styles.reticle} />
        <ThemedView type="backgroundElement" style={styles.hint}>
          <ThemedText type="small">
            {scannedCode
              ? `Scanned ${scannedCode}`
              : "Point the camera at a barcode"}
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Centered({ children }: { children?: React.ReactNode }) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.centered}>{children}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  centeredText: {
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
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  reticle: {
    width: "78%",
    maxWidth: 320,
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: Spacing.three,
    backgroundColor: "transparent",
  },
  hint: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
