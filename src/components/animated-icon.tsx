import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Brand } from "@/constants/theme";

const AnimationDurationMs = 600;

/**
 * Bridges the native splash screen and the first rendered frame.
 *
 * The native splash is held until this mounts, then hidden and cross-faded out,
 * so there is no blank flash between the two. The logo and background match
 * `expo-splash-screen`'s configuration in app.json, which is what makes the
 * handover invisible.
 */
export function AnimatedSplashOverlay() {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const fadeOut = new Keyframe({
    0: { transform: [{ scale: 1 }], opacity: 1 },
    20: { opacity: 1 },
    70: { opacity: 0, easing: Easing.elastic(0.7) },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const logo = (
    <Image
      style={styles.logo}
      source={require("@/assets/images/splash-icon.png")}
    />
  );

  if (isFadingOut) {
    return (
      <Animated.View
        entering={fadeOut.duration(AnimationDurationMs).withCallback(
          (finished) => {
            "worklet";
            // Unmount only once the fade has finished, so the overlay does not
            // pop away mid-animation.
            if (finished) scheduleOnRN(setIsVisible, false);
          },
        )}
        style={styles.overlay}
      >
        {logo}
      </Animated.View>
    );
  }

  return (
    <View
      // `onLayout` rather than an effect: the native splash should not be
      // hidden until this replacement has actually been laid out.
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setIsFadingOut(true));
      }}
      style={styles.overlay}
    >
      {logo}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.brown,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  logo: {
    width: 200,
    height: 200,
  },
});
