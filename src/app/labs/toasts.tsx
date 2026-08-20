import Toast from "react-native-toast-message";
import { useEffect, useRef, useState } from "react";

import { LabButton } from "@/components/lab-button";
import { LabRow, LabScreen, LabSection } from "@/components/lab-screen";
import { ThemedText } from "@/components/themed-text";
import { toast } from "@/lib/toast";

const Positions = ["top", "bottom"] as const;
type Position = (typeof Positions)[number];

/** Gap between toasts in the sequential demo, longer than the display time. */
const SequenceGapMs = 2200;

export default function ToastsLab() {
  const [position, setPosition] = useState<Position>("bottom");
  const [lastShown, setLastShown] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Pending sequence timers would otherwise fire against an unmounted screen.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const show = (label: string, run: () => void) => {
    run();
    setLastShown(label);
  };

  return (
    <LabScreen
      title="Toasts"
      description="Transient feedback via react-native-toast-message. Unlike a notification, a toast is in-app only and needs no permission."
    >
      <LabSection title="Variants">
        <ThemedText type="small" themeColor="textSecondary">
          Each variant carries its own colour and icon. Use success and error to
          confirm an outcome; info for something the user did not ask about.
        </ThemedText>
        <LabRow>
          <LabButton
            label="Success"
            emphasis="strong"
            onPress={() =>
              show("Success", () =>
                toast.success("Added to pantry", "Coca Cola", { position }),
              )
            }
          />
          <LabButton
            label="Error"
            onPress={() =>
              show("Error", () =>
                toast.error("Couldn't add this item", "Database is locked", {
                  position,
                }),
              )
            }
          />
          <LabButton
            label="Info"
            onPress={() =>
              show("Info", () =>
                toast.info("Recording started", undefined, { position }),
              )
            }
          />
        </LabRow>
      </LabSection>

      <LabSection title="Position">
        <ThemedText type="small" themeColor="textSecondary">
          Bottom keeps the toast clear of the notch and status bar, which is why
          the app uses it by default.
        </ThemedText>
        <LabRow>
          {Positions.map((option) => (
            <LabButton
              key={option}
              label={option}
              emphasis={position === option ? "strong" : "normal"}
              onPress={() => setPosition(option)}
            />
          ))}
        </LabRow>
      </LabSection>

      <LabSection title="Behaviour">
        <ThemedText type="small" themeColor="textSecondary">
          Only one toast is on screen at a time — a second call replaces the
          first rather than stacking, so a burst has to be spaced out by hand.
        </ThemedText>
        <LabRow>
          <LabButton
            label="Show three in a row"
            onPress={() =>
              show("Sequence of 3", () => {
                timersRef.current.forEach(clearTimeout);
                timersRef.current = ["First", "Second", "Third"].map(
                  (text, index) =>
                    setTimeout(
                      () => toast.info(text, undefined, { position }),
                      index * SequenceGapMs,
                    ),
                );
              })
            }
          />
          <LabButton
            label="Replace instantly"
            onPress={() =>
              show("Replaced", () => {
                // Fired back to back: only the last one is ever seen, which is
                // the behaviour the spaced-out demo above works around.
                toast.info("This one is replaced", undefined, { position });
                toast.info("Only this one appears", undefined, { position });
              })
            }
          />
          <LabButton
            label="Long text"
            onPress={() =>
              show("Long text", () =>
                toast.info(
                  "A deliberately long heading that will wrap",
                  "And a second line with more supporting detail than usually fits on one line.",
                  { position },
                ),
              )
            }
          />
          <LabButton
            label="Dismiss"
            onPress={() => {
              Toast.hide();
              setLastShown("Dismissed");
            }}
          />
        </LabRow>
      </LabSection>

      {lastShown && (
        <ThemedText type="small" themeColor="textSecondary">
          Last action: {lastShown}
        </ThemedText>
      )}
    </LabScreen>
  );
}
