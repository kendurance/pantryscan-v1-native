import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import { Image } from "expo-image";
import { useIsFocused } from "expo-router";
import { useRef, useState } from "react";
import { Platform, StyleSheet } from "react-native";

import { LabButton } from "@/components/lab-button";
import { LabRow, LabScreen, LabSection } from "@/components/lab-screen";
import { PermissionGate } from "@/components/permission-gate";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { toast } from "@/lib/toast";

const FlashModes: FlashMode[] = ["off", "on", "auto"];

export default function CameraCaptureLab() {
  const [permission, requestPermission] = useCameraPermissions();

  return (
    <LabScreen
      title="Camera capture"
      description="Still photos with expo-camera: permission lifecycle, facing toggle, flash modes, and rendering the result with expo-image."
    >
      <PermissionGate
        permission={permission}
        request={requestPermission}
        rationale="This lab needs the camera to take a photo."
      >
        <CaptureSurface />
      </PermissionGate>
    </LabScreen>
  );
}

function CaptureSurface() {
  const cameraRef = useRef<CameraView>(null);
  // Releasing the camera when the screen is backgrounded keeps it from holding
  // the hardware (and the battery) while the user is elsewhere.
  const isFocused = useIsFocused();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const result = await cameraRef.current.takePictureAsync({
        // Compress on the way out; a full-resolution JPEG is rarely what you
        // want to hold in memory or write to disk.
        quality: 0.6,
        skipProcessing: Platform.OS === "android",
      });
      setPhoto(result ?? null);
      if (result) {
        toast.success("Photo captured", `${result.width}x${result.height}`);
      }
    } catch (error) {
      toast.error(
        "Capture failed",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      <ThemedView style={styles.preview}>
        {isFocused && !photo && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={flash}
          />
        )}
        {photo && (
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel="Captured photo"
          />
        )}
      </ThemedView>

      <LabRow>
        <LabButton
          label={photo ? "Retake" : isCapturing ? "Capturing…" : "Take photo"}
          emphasis="strong"
          disabled={isCapturing}
          onPress={() => (photo ? setPhoto(null) : void takePicture())}
        />
        <LabButton
          label={facing === "back" ? "Front camera" : "Back camera"}
          disabled={!!photo}
          onPress={() =>
            setFacing((current) => (current === "back" ? "front" : "back"))
          }
        />
      </LabRow>

      <LabSection title="Flash">
        <LabRow>
          {FlashModes.map((mode) => (
            <LabButton
              key={mode}
              label={mode}
              disabled={!!photo}
              emphasis={flash === mode ? "strong" : "normal"}
              onPress={() => setFlash(mode)}
            />
          ))}
        </LabRow>
      </LabSection>

      {photo && (
        <LabSection title="Result">
          <ThemedText type="small" themeColor="textSecondary">
            {photo.width}×{photo.height}
          </ThemedText>
          <ThemedText type="code" numberOfLines={2}>
            {photo.uri}
          </ThemedText>
        </LabSection>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
});
