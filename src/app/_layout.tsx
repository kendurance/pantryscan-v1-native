import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import Toast from "react-native-toast-message";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { PantryDatabaseProvider } from "@/db/pantry-database-provider";
import { persister, PersistMaxAge, queryClient } from "@/lib/query-client";
import { useAppStateFocusManager } from "@/lib/query-native-adapters";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAppStateFocusManager();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: PersistMaxAge }}
    >
      {/* At the root rather than scoped to the tab group: /product/[barcode]
          writes to the pantry too, and it renders outside (tabs). */}
      <PantryDatabaseProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <AnimatedSplashOverlay />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="labs" options={{ headerShown: false }} />
          </Stack>
          {/* Rendered last so toasts sit above every screen in the stack. */}
          <Toast />
        </ThemeProvider>
      </PantryDatabaseProvider>
    </PersistQueryClientProvider>
  );
}
