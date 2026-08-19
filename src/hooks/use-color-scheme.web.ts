import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/** Hydration state never changes after mount, so no subscriber is needed. */
function subscribe() {
  return () => {};
}

const getIsHydrated = () => true;
const getIsHydratedOnServer = () => false;

/**
 * To support static rendering, the colour scheme has to be re-calculated on the
 * client: the server has no `matchMedia`, so it always prerenders as light.
 *
 * `useSyncExternalStore` expresses "false on the server, true on the client"
 * directly through its server-snapshot argument, avoiding the cascading render
 * a `setState` inside an effect would cause.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    getIsHydrated,
    getIsHydratedOnServer,
  );
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : "light";
}
