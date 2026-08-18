import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

import { fromIsoDate } from "@/lib/iso-date";

/** Android requires a channel; a notification without one silently does nothing. */
const ExpiryChannelId = "expiry";

/** How many days before expiry the reminder fires. */
export const ReminderLeadDays = 3;

/**
 * Whether local notifications can be used at all.
 *
 * `expo-notifications` was stripped of Android push support in Expo Go as of
 * SDK 53, and its entry point registers a device-push-token listener at import
 * time. On Android + Expo Go that listener *throws*, so the module cannot even
 * be imported — hence the dynamic import below and this guard around it.
 * Local notifications work normally in a development build.
 */
export const notificationsSupported =
  Platform.OS !== "web" && !(Platform.OS === "android" && isRunningInExpoGo());

/**
 * Loads `expo-notifications` on demand.
 *
 * Exported so the labs screen can drive the module directly without
 * duplicating the Expo Go guard below.
 *
 * A static import would run the module's side effects during bundle
 * evaluation, crashing the whole app on Android + Expo Go before any screen
 * renders. Importing it only when it is both supported and needed keeps the
 * app usable there, minus the reminders.
 */
export async function loadNotifications() {
  if (!notificationsSupported) return null;

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  return Notifications;
}

/**
 * Creates the Android channel and requests permission.
 * Returns whether notifications may actually be posted.
 */
export async function ensureNotificationSetup(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ExpiryChannelId, {
      name: "Expiry alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** When the reminder for a given expiry date should fire. */
export function reminderDateFor(expiresOn: string): Date {
  const fireAt = fromIsoDate(expiresOn);
  fireAt.setDate(fireAt.getDate() - ReminderLeadDays);
  // Late morning is more useful than midnight for a "use it soon" nudge.
  fireAt.setHours(9, 0, 0, 0);
  return fireAt;
}

/**
 * Schedules an expiry reminder, returning its identifier so it can be
 * cancelled later. Returns null when nothing was scheduled — no expiry date,
 * unsupported runtime, permission withheld, or the time has already passed.
 */
export async function scheduleExpiryReminder(item: {
  name: string;
  expiresOn?: string;
}): Promise<string | null> {
  if (!item.expiresOn || !notificationsSupported) return null;

  const fireAt = reminderDateFor(item.expiresOn);
  if (fireAt.getTime() <= Date.now()) return null;

  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  const granted = await ensureNotificationSetup();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Use it or lose it",
      body: `${item.name} expires in ${ReminderLeadDays} days.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: ExpiryChannelId,
    },
  });
}

/** Cancels a previously scheduled reminder, tolerating an already-gone id. */
export async function cancelExpiryReminder(
  notificationId: string | undefined,
): Promise<void> {
  if (!notificationId || !notificationsSupported) return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or cancelled; nothing to clean up.
  }
}
