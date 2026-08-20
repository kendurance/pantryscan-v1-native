import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

/**
 * React Query's defaults assume a browser: `navigator.onLine` for connectivity
 * and `window` focus events for refetch-on-focus. Neither exists in React
 * Native, so both managers have to be taught what they mean on a phone.
 */

/**
 * Bridges NetInfo into React Query's online state. Registered at module scope so
 * the listener is installed once, before any query can run.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

/** Maps foreground/background transitions onto React Query's focus state. */
export function useAppStateFocusManager(): void {
  useEffect(() => {
    // On web the default `window` focus handling already works.
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });
    return () => subscription.remove();
  }, []);
}
