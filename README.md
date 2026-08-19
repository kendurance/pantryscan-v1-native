# PantryScan

Scan a grocery barcode, get the product, track what's about to expire.

Built with Expo SDK 57 · React Native 0.86 · React 19.2 · TanStack Query v5 · TypeScript · expo-router.

> _[ screenshot / GIF: scan → product → added to pantry ]_

## Why I built it

I wanted a real reference implementation of the mobile-specific problems —
permissions, offline state, native capture, scheduled notifications — rather
than a tutorial clone. Each of those has a wrong-but-plausible solution that
only fails on a device, which is the interesting part.

## What it demonstrates

- **Offline-first data** — the TanStack Query cache is persisted (SQLite on
  native, `localStorage` on web) and `onlineManager` / `focusManager` are
  adapted to React Native, where neither `window.focus` nor `navigator.onLine`
  exists.
- **Camera in scan mode** — continuous barcode detection guarded against
  firing many times per second, with the iOS UPC-A/EAN-13 quirk handled.
- **Optimistic mutations** — `onMutate` → `onError` rollback → `onSettled`,
  covered by tests that assert the list returns to its previous state.
- **The full permission lifecycle** — undetermined, granted, deniable, and
  denied-permanently, all four handled rather than the usual two.
- **Scheduled local notifications** — Android channels, with the notification
  id stored on the row so deleting an item cancels its reminder instead of
  leaving an orphaned alert.
- **A real API client** — Open Food Facts answers `200` with `status: 0` for an
  unknown barcode, so transport success is translated into a domain error.

## Labs

A reference gallery of native capabilities, kept separate from the product so
neither one distorts the other. Each screen is self-contained:

camera capture · audio recording · notifications · haptics · sensors · toasts

## Running it

### Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node 22+** | The database tests use `node:sqlite`, which is not in Node 20. |
| **Android Studio** | For the SDK and an emulator. |
| **JDK 17** | Android Studio bundles JDK 25, which React Native's NDK build rejects. `npm run android` finds a 17 automatically, or installs via `mise install java@temurin-17`. |
| **Xcode** | iOS only. |

Add to your shell profile (`~/.zshrc`):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

### Install and run

```bash
npm install

npm run android     # build and install a development build (first run ~10 min)
npm run ios
npm run web
```

`npm run android` builds a standalone app. That is required for notifications,
which Expo Go dropped on Android in SDK 53, and it is the only way to see the
real app icon and splash screen.

```bash
npm run android:go  # Expo Go instead — faster to start, no notifications
```

### Test and check

```bash
npm test            # 44 tests: API parsing, SQL, migrations, mutations, screens
npm run lint
npx tsc --noEmit
```

CI runs all three on every push.

### Try it without a barcode

An emulator camera cannot scan, so the product route can be opened directly to
exercise the whole path — `/product/<barcode>` on web, or a deep link on a
device:

| Barcode | Case |
| --- | --- |
| `5000112637922` | Coca-Cola — full data |
| `3017620422003` | Nutella — missing quantity |
| `0000000000000` | Not found (a `200` carrying `status: 0`) |

```bash
# web
open http://localhost:8081/product/5000112637922

# android
adb shell am start -a android.intent.action.VIEW \
  -d "pantryscanv1native://product/5000112637922"
```

## Project layout

```
src/
  app/          # expo-router routes: (tabs), labs/, product/[barcode]
  api/          # Open Food Facts client (no React) + query hooks
  db/           # SQLite schema, migrations, pantry queries
  components/   # shared UI, including the four-state PermissionGate
  lib/          # query client, notifications, dates, toasts
```

Two conventions worth naming: `src/api/` contains no React, so the fetch layer
is testable without rendering; and migrations are versioned with
`PRAGMA user_version`, with a test that upgrades a v1 database to prove
existing rows survive.

## What I'd do next

An offline mutation queue so scans made without connectivity are replayed on
reconnect; E2E coverage with Maestro; and a seamless tiling asset for the
background, which currently cover-fits rather than repeats.

## Known limitations

- **Notifications need a development build on Android.** `expo-notifications`
  throws at import in Expo Go since SDK 53, so the module is loaded lazily
  behind a guard and reminders are skipped there.
- **Sensors and haptics are no-ops on web**, and `expo-sensors` has no listener
  support in a browser at all. The labs say so rather than appearing broken.
