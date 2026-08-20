import { useCallback, useEffect, useState } from "react";

import { LabButton } from "@/components/lab-button";
import { LabRow, LabScreen, LabSection } from "@/components/lab-screen";
import { ThemedText } from "@/components/themed-text";
import { toast } from "@/lib/toast";
import {
  ensureNotificationSetup,
  loadNotifications,
  notificationsSupported,
} from "@/lib/notifications";

const ScheduledDelaySeconds = 10;

export default function NotificationsLab() {
  // Resolved synchronously when unsupported: there is nothing to ask, and
  // setting it from inside the effect would be a needless cascading render.
  const [granted, setGranted] = useState<boolean | null>(
    notificationsSupported ? null : false,
  );
  const [log, setLog] = useState<string[]>([]);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const note = useCallback((message: string) => {
    setLog((entries) => [message, ...entries].slice(0, 6));
    toast.info(message);
  }, []);

  useEffect(() => {
    if (!notificationsSupported) return;

    let cancelled = false;
    loadNotifications()
      .then(async (Notifications) => {
        if (!Notifications || cancelled) return;
        const { status } = await Notifications.getPermissionsAsync();
        if (!cancelled) setGranted(status === "granted");

        // The non-hook form of `useLastNotificationResponse`, used so the
        // module stays behind the lazy-load guard.
        const response = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && response) {
          setLastResponse(
            response.notification.request.content.title ?? "(untitled)",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setGranted(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestPermission = async () => {
    const ok = await ensureNotificationSetup();
    setGranted(ok);
    note(ok ? "Permission granted" : "Permission denied");
  };

  const sendImmediate = async () => {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Immediate notification",
        body: "Delivered as soon as it was scheduled.",
        data: { source: "labs" },
      },
      // A null trigger means deliver now rather than schedule.
      trigger: null,
    });
    note("Sent immediate notification");
  };

  const sendScheduled = async () => {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Scheduled notification",
        body: `Scheduled ${ScheduledDelaySeconds}s earlier. Background the app to see it arrive.`,
        data: { source: "labs" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: ScheduledDelaySeconds,
        repeats: false,
        channelId: "expiry",
      },
    });
    note(`Scheduled one for ${ScheduledDelaySeconds}s from now`);
  };

  const listScheduled = async () => {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    note(`${pending.length} notification(s) pending`);
  };

  const cancelAll = async () => {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    note("Cancelled all scheduled notifications");
  };

  return (
    <LabScreen
      title="Notifications"
      description="Immediate, scheduled, and channelled local notifications, plus reading the response when one is tapped."
    >
      {!notificationsSupported && (
        <ThemedText type="small" themeColor="textSecondary">
          Notifications are unavailable here. Android removed push support from
          Expo Go in SDK 53, and the module throws on import — so this lab needs
          a development build (`npx expo run:android`). Web is unsupported too.
        </ThemedText>
      )}

      <LabSection title="Permission">
        <ThemedText type="small" themeColor="textSecondary">
          {granted === null
            ? "Checking…"
            : granted
              ? "Granted"
              : "Not granted"}
        </ThemedText>
        <LabRow>
          <LabButton
            label="Request permission"
            disabled={!notificationsSupported}
            onPress={() => void requestPermission()}
          />
        </LabRow>
      </LabSection>

      <LabSection title="Send">
        <ThemedText type="small" themeColor="textSecondary">
          A notification only appears while the app is backgrounded on most
          platforms — send one, then switch away.
        </ThemedText>
        <LabRow>
          <LabButton
            label="Immediate"
            emphasis="strong"
            disabled={!granted}
            onPress={() => void sendImmediate()}
          />
          <LabButton
            label={`In ${ScheduledDelaySeconds}s`}
            disabled={!granted}
            onPress={() => void sendScheduled()}
          />
        </LabRow>
      </LabSection>

      <LabSection title="Manage">
        <LabRow>
          <LabButton
            label="List pending"
            disabled={!granted}
            onPress={() => void listScheduled()}
          />
          <LabButton
            label="Cancel all"
            disabled={!granted}
            onPress={() => void cancelAll()}
          />
        </LabRow>
      </LabSection>

      {lastResponse && (
        <LabSection title="Last tapped notification">
          <ThemedText type="small" themeColor="textSecondary">
            {lastResponse}
          </ThemedText>
        </LabSection>
      )}

      {log.length > 0 && (
        <LabSection title="Activity">
          {log.map((entry, index) => (
            <ThemedText
              key={`${entry}-${index}`}
              type="small"
              themeColor="textSecondary"
            >
              {entry}
            </ThemedText>
          ))}
        </LabSection>
      )}
    </LabScreen>
  );
}
