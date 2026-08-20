import Toast from "react-native-toast-message";

export type ToastPosition = "top" | "bottom";

type ToastOptions = {
  /** Defaults to the bottom, which stays clear of the notch and status bar. */
  position?: ToastPosition;
};

/**
 * Thin wrapper over `react-native-toast-message` so call sites share one
 * vocabulary and the library stays swappable from a single place.
 */
export const toast = {
  success(text1: string, text2?: string, options?: ToastOptions) {
    Toast.show({
      type: "success",
      text1,
      text2,
      position: options?.position ?? "bottom",
    });
  },
  error(text1: string, text2?: string, options?: ToastOptions) {
    Toast.show({
      type: "error",
      text1,
      text2,
      position: options?.position ?? "bottom",
    });
  },
  info(text1: string, text2?: string, options?: ToastOptions) {
    Toast.show({
      type: "info",
      text1,
      text2,
      position: options?.position ?? "bottom",
    });
  },
};
