import { Stack } from "expo-router";

import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function HapticsLab() {
  return (
    <>
      <Stack.Screen options={{ title: "Haptics" }} />
      <ScreenPlaceholder
        title="Haptics"
        description="Impact, notification, and selection feedback via expo-haptics."
      />
    </>
  );
}
