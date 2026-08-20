# PantryScan — React Native Build Guide

**Stack as of August 2026:** Expo SDK 57 · React Native 0.86 · React 19.2 · TanStack Query v5 · TypeScript · expo-router

**Target machine:** macOS + Android device/emulator (iOS Simulator available as a bonus — use it for screenshots)

---

## 0. What we're building

**The product:** Scan a grocery barcode with the camera → look up the product on Open Food Facts → add it to a local pantry with an expiry date → get a local notification before it expires.

**The lab:** A `/labs` tab that is a permanent, self-contained reference gallery of native capabilities. This is the part we come back to in six months when a new job asks "can you get the mic working by Thursday."

Keeping these two halves separate is deliberate. The product proves we can ship something coherent. The labs prove breadth without bolting fake features onto the product to show off.

**Scope discipline:** Milestones 1–6 are the shippable app. Ship those before adding a seventh idea. A finished small app beats an abandoned ambitious one on a GitHub profile, and hiring managers can tell the difference in about ten seconds.

---

## 1. Day 0 — Environment (macOS + Android)

```bash
# Node — 20 LTS or 22 LTS. Check what's installed:
node -v

# Watchman makes Metro's file watching much less flaky on macOS
brew install watchman
```

**Android:**

1. Install Android Studio.
2. Open it → **More Actions → SDK Manager** → install the latest SDK Platform and Build-Tools.
3. **More Actions → Virtual Device Manager** → create a Pixel device with a recent API level.
4. Add to `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

**iOS (free bonus on a Mac):**

```bash
xcode-select --install
# Then install Xcode from the App Store and open it once to accept the license
```

The iOS Simulator runs without an Apple Developer account. The $99/yr account is only needed to distribute to real iPhones via TestFlight. For this project we use the simulator for screenshots and skip the account.

**Physical Android phone:** install **Expo Go** from the Play Store. The camera, mic, location, and local notifications all work inside Expo Go because they're part of the Expo SDK — a custom development build is only needed once we add a library with its own native code. We start in Expo Go and move on when we outgrow it.

---

## 2. Scaffold

```bash
npx create-expo-app@latest pantryscan
cd pantryscan
```

The default template comes with TypeScript and expo-router already. Then:

```bash
npx expo install \
  @tanstack/react-query \
  @tanstack/react-query-persist-client \
  @tanstack/query-async-storage-persister \
  expo-camera \
  expo-audio \
  expo-sqlite \
  expo-haptics \
  expo-notifications \
  expo-image \
  @react-native-community/netinfo

npm i -D jest-expo @testing-library/react-native @types/jest
```

Use `npx expo install` rather than `npm install` for everything — it resolves versions against the project's SDK instead of grabbing whatever's newest, which is the single most common source of "it built yesterday" problems.

Run it:

```bash
npx expo start
# press 'a' for Android emulator, 'i' for iOS simulator,
# or scan the QR with Expo Go on a phone
```

### Permissions config

Edit `app.json` → `expo.plugins`. Permission strings live here, not in native files:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "PantryScan uses the camera to scan grocery barcodes."
        }
      ],
      [
        "expo-audio",
        {
          "microphonePermission": "PantryScan uses the microphone to record voice notes."
        }
      ],
      [
        "expo-notifications",
        {
          "color": "#1f6f4a"
        }
      ]
    ]
  }
}
```

Write real sentences here. Apple rejects vague permission strings, and it's a small tell of having actually shipped.

---

## 3. Folder structure

```
app/
  _layout.tsx                 # QueryClientProvider + SQLiteProvider + root Stack
  (tabs)/
    _layout.tsx               # Tab bar
    index.tsx                 # Pantry list
    scan.tsx                  # Camera barcode scanner
    labs.tsx                  # Labs index (links out to /labs/*)
  labs/
    _layout.tsx
    camera-capture.tsx
    audio-recorder.tsx
    notifications.tsx
    haptics.tsx
    sensors.tsx
  product/[barcode].tsx       # Product detail + "add to pantry"

src/
  api/
    openFoodFacts.ts          # fetch layer, no React
    queries.ts                # useQuery / useMutation hooks
  db/
    schema.ts                 # migrations
    pantry.ts                 # SQLite read/write functions
  components/
    PermissionGate.tsx        # the reusable permission pattern
    EmptyState.tsx
    ProductCard.tsx
  lib/
    queryClient.ts
    notifications.ts
```

---

## 4. Milestone 1 — Routing skeleton

`app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: "Pantry" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="labs" options={{ title: "Labs" }} />
    </Tabs>
  );
}
```

Navigate imperatively with `router.push()`, declaratively with `<Link href="/product/5000112637922">`. Read params with `useLocalSearchParams()`.

**Stop here and commit.** Three empty tabs that navigate is a real milestone.

---

## 5. Milestone 2 — React Query with offline persistence

This is the part that makes it a portfolio piece instead of a fetch demo.

`src/lib/queryClient.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "expo-sqlite/kv-store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Product data barely changes. Don't refetch it constantly.
      staleTime: 1000 * 60 * 60 * 24, // 24h
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7d — must exceed maxAge below
      retry: 2,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "PANTRYSCAN_QUERY_CACHE",
});
```

`expo-sqlite/kv-store` implements the AsyncStorage API on top of SQLite. Using it instead of `@react-native-async-storage/async-storage` means one less dependency and a faster backing store.

`app/_layout.tsx`:

```tsx
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager, focusManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persister } from "@/src/lib/queryClient";
import { migrate } from "@/src/db/schema";

// Teach React Query what "online" means on a phone.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

export default function RootLayout() {
  // Teach React Query what "focus" means — there is no window.focus on mobile.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (Platform.OS !== "web") focusManager.setFocused(status === "active");
    });
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <SQLiteProvider databaseName="pantry.db" onInit={migrate}>
        <Stack />
      </SQLiteProvider>
    </PersistQueryClientProvider>
  );
}
```

**Verify it works:** load a product, force-quit the app, turn on airplane mode, reopen. The product should still be there.

---

## 6. Milestone 3 — Open Food Facts (before touching the camera)

Build and test the whole data path with a hardcoded barcode first. Debugging the camera and the API at the same time is miserable.

`src/api/openFoodFacts.ts`:

```ts
const BASE = "https://world.openfoodfacts.org/api/v2";
const FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "image_front_small_url",
  "nova_group",
  "nutriscore_grade",
].join(",");

export class ProductNotFoundError extends Error {}

export type Product = {
  code: string;
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
};

export async function fetchProduct(barcode: string): Promise<Product> {
  const res = await fetch(`${BASE}/product/${barcode}.json?fields=${FIELDS}`, {
    headers: {
      // Open Food Facts asks apps to identify themselves. Do it.
      "User-Agent": "PantryScan/1.0 (github.com/kendurance/pantryscan)",
    },
  });

  if (!res.ok) throw new Error(`Open Food Facts responded ${res.status}`);

  const json = await res.json();
  // The API returns 200 with status: 0 for unknown barcodes.
  if (json.status !== 1 || !json.product)
    throw new ProductNotFoundError(barcode);

  const p = json.product;
  return {
    code: p.code,
    name: p.product_name?.trim() || "Unnamed product",
    brand: p.brands?.split(",")[0]?.trim(),
    quantity: p.quantity,
    imageUrl: p.image_front_small_url,
  };
}
```

Two things worth noticing, because both are realistic:

- A **200 response that means "not found."** Translating transport-level success into a domain error is exactly the kind of thing that separates a real client from `await res.json()`.
- **Missing fields everywhere.** Open Food Facts is crowdsourced. Plenty of products have no name, no image, no brand. We write genuine empty and partial states, and the UI is better for it.

`src/api/queries.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchProduct, ProductNotFoundError } from "./openFoodFacts";

export const productKeys = {
  all: ["product"] as const,
  detail: (barcode: string) => [...productKeys.all, barcode] as const,
};

export function useProduct(barcode: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(barcode ?? ""),
    queryFn: () => fetchProduct(barcode!),
    enabled: !!barcode,
    retry: (failureCount, error) =>
      error instanceof ProductNotFoundError ? false : failureCount < 2,
  });
}
```

That `retry` predicate matters — retrying a 404-equivalent three times is pure latency. `enabled` is how conditional fetching is done in v5.

**v5 naming changes from the v3/v4 tutorials still in circulation:** `isLoading` → `isPending`, `cacheTime` → `gcTime`, and everything takes a single object argument now.

Test barcodes: `5000112637922` (Coke), `3017620422003` (Nutella), `0000000000000` (guaranteed not-found).

---

## 7. Milestone 4 — Camera barcode scanning

```tsx
import { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission) return null; // still loading
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>PantryScan needs camera access to scan barcodes.</Text>
        {permission.canAskAgain ? (
          <Button title="Grant access" onPress={requestPermission} />
        ) : (
          <Text>Enable camera access in Settings to continue.</Text>
        )}
      </View>
    );
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      barcodeScannerSettings={{
        barcodeTypes: ["ean13", "ean8", "upc_e", "qr"],
      }}
      onBarcodeScanned={
        locked
          ? undefined
          : ({ data }) => {
              setLocked(true); // fires many times/sec otherwise
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              router.push(`/product/${data}`);
              setTimeout(() => setLocked(false), 1500);
            }
      }
    />
  );
}
```

Three details that will bite us and are worth knowing:

- **`onBarcodeScanned` fires continuously**, many times per second, on every frame containing a barcode. The `locked` guard is mandatory, not defensive.
- **UPC-A is not in the list on purpose.** iOS reports UPC-A codes as EAN-13 with a leading zero. Including `ean13` covers US groceries on both platforms. Adding `upc_a` will work on Android and silently do nothing useful on iOS.
- **The Android emulator's fake camera can't scan.** Either point a real device at a real cereal box, or use the emulator's extended controls to feed it a barcode image. This is where a physical phone with Expo Go earns its keep.

---

## 8. Milestone 5 — SQLite pantry + optimistic mutations

`src/db/schema.ts`:

```ts
import type { SQLiteDatabase } from "expo-sqlite";

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pantry_items (
      id          INTEGER PRIMARY KEY NOT NULL,
      barcode     TEXT NOT NULL,
      name        TEXT NOT NULL,
      brand       TEXT,
      image_url   TEXT,
      expires_at  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pantry_expires ON pantry_items(expires_at);
  `);
}
```

`src/api/queries.ts` — the mutation with optimistic update:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";

export const pantryKeys = { list: ["pantry"] as const };

export function useAddToPantry() {
  const db = useSQLiteContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (item: NewPantryItem) => {
      const res = await db.runAsync(
        `INSERT INTO pantry_items (barcode, name, brand, image_url, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        item.barcode,
        item.name,
        item.brand ?? null,
        item.imageUrl ?? null,
        item.expiresAt ?? null,
      );
      return { ...item, id: res.lastInsertRowId };
    },

    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: pantryKeys.list });
      const previous = qc.getQueryData(pantryKeys.list);
      qc.setQueryData(pantryKeys.list, (old: PantryItem[] = []) => [
        { ...item, id: -Date.now() }, // negative temp id, replaced on settle
        ...old,
      ]);
      return { previous };
    },

    onError: (_err, _item, ctx) => {
      qc.setQueryData(pantryKeys.list, ctx?.previous); // roll back
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: pantryKeys.list });
    },
  });
}
```

---

## 9. Milestone 6 — Expiry notifications

`src/lib/notifications.ts`:

```ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationSetup() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("expiry", {
      name: "Expiry alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleExpiryReminder(item: {
  id: number;
  name: string;
  expiresAt: string;
}) {
  const fireAt = new Date(item.expiresAt);
  fireAt.setDate(fireAt.getDate() - 3); // three days ahead
  if (fireAt <= new Date()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Use it or lose it",
      body: `${item.name} expires in 3 days.`,
      data: { itemId: item.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: "expiry",
    },
  });
}
```

Store the returned identifier on the row so `cancelScheduledNotificationAsync` can run when the item is deleted. Orphaned notifications firing for deleted items is a classic bug, and fixing it proactively is worth a line in the README.

**Android channels are mandatory** on modern Android — a notification without a channel silently does nothing. **Local notifications work in Expo Go; remote push on Android does not** and needs a development build. Remote push is not needed here.

---

## 10. The labs tab

One screen per capability. Each one self-contained, each one demonstrating the full permission lifecycle. Build these three first:

### The reusable permission pattern

Every Expo module follows the same shape, so extract it once:

```tsx
export function PermissionGate({
  permission,
  request,
  rationale,
  children,
}: {
  permission: { granted: boolean; canAskAgain: boolean } | null;
  request: () => Promise<unknown>;
  rationale: string;
  children: React.ReactNode;
}) {
  if (!permission) return <ActivityIndicator />; // undetermined
  if (permission.granted) return <>{children}</>;
  if (permission.canAskAgain) {
    return <Rationale text={rationale} onPress={request} />;
  }
  return <OpenSettings text={rationale} />; // denied permanently
}
```

Four states — undetermined, granted, deniable, denied-forever — and most tutorials handle two. Handling all four is the mobile equivalent of writing real loading and error states, and it's the kind of thing that shows up in code review.

### `labs/camera-capture.tsx`

Photo capture (distinct from scanning): `CameraView` ref → `takePictureAsync()`, front/back toggle, flash modes, then compress and write to `expo-file-system`. Display with `expo-image`.

### `labs/audio-recorder.tsx`

```tsx
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";

const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
const state = useAudioRecorderState(recorder); // isRecording, durationMillis

// start
await AudioModule.requestRecordingPermissionsAsync();
await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
await recorder.prepareToRecordAsync();
recorder.record();

// stop
await recorder.stop();
const uri = recorder.uri;
```

Note: **`expo-av` is deprecated** and split into `expo-audio` and `expo-video`. Nearly every tutorial and Stack Overflow answer still uses `expo-av`. Ignore them.

### `labs/notifications.ts`

Immediate, scheduled, and channelled notifications, plus tapping one to deep-link into the app via `useLastNotificationResponse()`.

Then add `haptics.tsx` and `sensors.tsx` (accelerometer from `expo-sensors`) as we go.

---

## 11. Testing

Jest, React Testing Library, and Playwright are already Tier 1 skills here — carrying them into mobile is cheap and it's a differentiator, because a large share of portfolio RN apps have no tests at all.

`package.json`:

```json
{ "jest": { "preset": "jest-expo" } }
```

Test what's actually worth testing:

- `fetchProduct` against mocked responses — success, `status: 0`, network failure, missing fields
- The optimistic-update rollback: mutation fails, list returns to previous state
- A screen renders empty state, loading state, and error state

Wrap render in a fresh `QueryClientProvider` with `retry: false` per test.

## 12. CI

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint .
      - run: npm test -- --ci
```

A green badge on the README is a small, cheap credibility signal.

---

## 13. Hosting and distribution

**Android APK — the main one.**

```bash
npm i -g eas-cli
eas login
eas build:configure
```

In `eas.json`, make the preview profile produce an installable APK rather than an AAB:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```

```bash
eas build -p android --profile preview
```

The build produces a download URL. Attach the APK to a GitHub Release and link it from the README. Free tier covers a hobby project fine.

**Web export — the zero-friction demo.**

```bash
npx expo export -p web
```

Static output that can be pushed to GitHub Pages or dropped on Netlify. Most of the app works; the camera degrades to `getUserMedia` and notifications largely won't. Label it honestly as a partial demo — overselling it is worse than not having it.

**iOS.** Skip. It needs the $99/yr account and adds nothing a hiring manager will check.

**The thing that actually gets looked at:** screen recordings. Record the emulator (or a phone via QuickTime), convert to GIF, embed in the README. Do one per capability. Nobody installs a stranger's APK; everybody scrolls a README.

---

## 14. README skeleton

Write this for a hiring manager skimming for 45 seconds, not for a user.

```markdown
# PantryScan

Scan a grocery barcode, get the product, track what's about to expire.
Built with Expo SDK 57 / React Native 0.86 / React 19 / TanStack Query v5.

[ animated GIF: scan → result → added to pantry ]

## Why I built it

Ten years of frontend, mostly React on the web. I wanted a real
reference implementation of the mobile-specific problems — permissions,
offline state, native capture, scheduled notifications — rather than
a tutorial clone.

## What it demonstrates

- **Offline-first data** — TanStack Query cache persisted to SQLite,
  with `onlineManager` and `focusManager` adapted to React Native
  (neither `window.focus` nor `navigator.onLine` exists here)
- **Camera in scan mode** — continuous barcode detection with debounce,
  and the iOS UPC-A/EAN-13 quirk handled
- **Optimistic mutations** — `onMutate` / `onError` rollback / `onSettled`
- **Full permission lifecycle** — undetermined, granted, deniable,
  denied-permanently, all four handled
- **Scheduled local notifications** — Android channels, cancellation
  on delete so no orphaned alerts

## Labs

A reference gallery of native capabilities, each screen self-contained:
camera capture · audio recording · notifications · haptics · sensors

[ GIF grid ]

## Running it

...

## What I'd do next

Offline mutation queue for scans made without connectivity;
E2E coverage with Maestro; native module for a faster scan pipeline.
```

That last section does real work. Naming what we'd improve reads as engineering judgment; claiming completeness reads as inexperience.

---

## 15. React 16 → 19: what changed in the meantime

Applies to the web side too, and it's good to review given how long THD sat on an older version.

| Since | Change                                       | Why it matters                                                             |
| ----- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 18    | Automatic batching everywhere                | State updates in promises/timeouts batch now; they didn't in 16            |
| 18    | `useTransition`, `useDeferredValue`          | Mark updates non-urgent so typing stays responsive                         |
| 18    | `<StrictMode>` double-invokes effects in dev | Surfaces missing cleanup; catches people off guard                         |
| 19    | `ref` is a normal prop                       | `forwardRef` still works but is on the way out                             |
| 19    | `use()`                                      | Read promises/context conditionally; must cache the promise outside render |
| 19    | Actions, `useActionState`, `useOptimistic`   | Web forms and pending states. Not applicable in RN, but ask-able           |
| 19    | Document metadata                            | `<title>`/`<meta>` render anywhere. Web only                               |
| 19    | React Compiler 1.0 (Oct 2025)                | Auto-memoizes; most `useMemo`/`useCallback` become unnecessary             |

React Native 0.86 ships React 19.2, so this project has hooks-level parity — it just doesn't touch the DOM-specific pieces.

---

## Suggested commit sequence

1. `chore: scaffold expo app with router and typescript`
2. `feat: tab navigation skeleton`
3. `feat: query client with sqlite-backed offline persistence`
4. `feat: open food facts client with not-found handling`
5. `test: cover product fetch success, not-found, and network failure`
6. `feat: barcode scanning with debounce and permission gate`
7. `feat: pantry storage with optimistic add`
8. `feat: expiry notifications with android channel`
9. `feat: labs — camera capture`
10. `feat: labs — audio recorder`
11. `feat: labs — notifications`
12. `ci: typecheck, lint, test on push`
13. `docs: readme with demo recordings`

Small honest commits with real messages are themselves part of the portfolio. A single "initial commit" containing a finished app tells a hiring manager nothing.

---

## Out-of-scope Inclusions

- **Scan Beep** - We will add a scan/beep sound when a barcode has been recognized while in Scan/camera view.
- **Logo/Background** - We will add a new logo with a pantry background (both for when the app is loading up). The Pantry page itself may also have a background.
- **Toast Confirmations** - When an item has been added to the pantry from the Scan, there will be a "toast" that pops up while the user gets navigated right back to the pantry page.
- **Sort/Filter** - We need a way to sort the pantry based on expiry date, name, brand; ascending and descending
