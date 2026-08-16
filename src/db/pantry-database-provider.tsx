import { SQLiteProvider } from "expo-sqlite";
import { useSyncExternalStore, type ReactNode } from "react";

import { migrate } from "@/db/schema";

/** Hydration state never changes after mount, so no subscriber is needed. */
function subscribe() {
  return () => {};
}

const getIsHydrated = () => true;
const getIsHydratedOnServer = () => false;

/**
 * False while prerendering on the server, true once running on the client.
 *
 * This has to be resolved per-render rather than as a module-level
 * `typeof window` constant: on web the module is first evaluated during the
 * static prerender, so a constant would be baked in as "server" and never
 * re-evaluate in the browser.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    getIsHydrated,
    getIsHydratedOnServer,
  );
}

/**
 * Opens the pantry database and runs migrations before rendering `children`.
 *
 * `SQLiteProvider` renders nothing until the database opens in an effect.
 * Effects don't run while prerendering, so mounting it during a static web
 * render would emit blank HTML for every page it wraps. The provider is
 * therefore skipped until the client has hydrated, at which point it mounts,
 * runs `migrate`, and exposes the database via `useSQLiteContext`.
 */
export function PantryDatabaseProvider({ children }: { children: ReactNode }) {
  const isHydrated = useIsHydrated();

  if (!isHydrated) return <>{children}</>;

  return (
    <SQLiteProvider databaseName="pantry.db" onInit={migrate}>
      {children}
    </SQLiteProvider>
  );
}
