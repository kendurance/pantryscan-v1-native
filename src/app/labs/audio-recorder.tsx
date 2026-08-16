import { Stack } from "expo-router";

import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function AudioRecorderLab() {
  return (
    <>
      <Stack.Screen options={{ title: "Audio recorder" }} />
      <ScreenPlaceholder
        title="Audio recorder"
        description="Record from the microphone with expo-audio and play the result back."
      />
    </>
  );
}
