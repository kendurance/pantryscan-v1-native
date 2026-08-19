/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

/**
 * PantryScan brand palette, shared with the app icon and splash screen.
 * Kept separate from `Colors` so the light/dark theme keys stay in sync.
 */
export const Brand = {
  /** Pantry brown — splash background and adaptive icon background. */
  brown: "#8B5E34",
  /** Accent green, also used for the notification channel colour. */
  green: "#1f6f4a",
  /** Warm beige, the light surface tone from the icon artwork. */
  beige: "#F5E6D3",
  /** Neutral dark grey for body text on light surfaces. */
  charcoal: "#4A4A4A",
} as const;

export const Colors = {
  light: {
    text: Brand.charcoal,
    background: "#ffffff",
    backgroundElement: "#FAF3EA",
    backgroundSelected: Brand.beige,
    textSecondary: "#6B5B4C",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    backgroundElement: "#212225",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
