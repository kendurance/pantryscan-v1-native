import { Stack } from "expo-router";

import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function CameraCaptureLab() {
  return (
    <>
      <Stack.Screen options={{ title: "Camera capture" }} />
      <ScreenPlaceholder
        title="Camera capture"
        description="Take a still photo with expo-camera and write it to the file system."
      />
    </>
  );
}
