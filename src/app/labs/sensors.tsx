import { Stack } from "expo-router";

import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function SensorsLab() {
  return (
    <>
      <Stack.Screen options={{ title: "Sensors" }} />
      <ScreenPlaceholder
        title="Sensors"
        description="Live device motion and orientation readings."
      />
    </>
  );
}
