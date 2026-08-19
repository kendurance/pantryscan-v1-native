/**
 * Web has no native splash screen to hand over from — the page simply renders
 * — so the overlay is a no-op here and the platform-specific file exists to
 * keep `expo-splash-screen` out of the web bundle.
 */
export function AnimatedSplashOverlay() {
  return null;
}
