import { Stack } from "expo-router";

import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function NotificationsLab() {
  return (
    <>
      <Stack.Screen options={{ title: "Notifications" }} />
      <ScreenPlaceholder
        title="Notifications"
        description="Schedule and cancel local notifications, and inspect permission state."
      />
    </>
  );
}
