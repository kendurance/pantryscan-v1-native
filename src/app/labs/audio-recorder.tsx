import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { LabButton } from "@/components/lab-button";
import { LabRow, LabScreen, LabSection } from "@/components/lab-screen";
import { PermissionGate } from "@/components/permission-gate";
import { ThemedText } from "@/components/themed-text";

/** `expo-av` is deprecated and split into expo-audio / expo-video. This is expo-audio. */

type PermissionState = { granted: boolean; canAskAgain: boolean } | null;

function formatDuration(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function AudioRecorderLab() {
  // expo-audio exposes imperative permission functions rather than a hook, so
  // the response is mirrored into state to feed the shared PermissionGate.
  const [permission, setPermission] = useState<PermissionState>(null);

  useEffect(() => {
    let cancelled = false;
    AudioModule.getRecordingPermissionsAsync()
      .then((response) => {
        if (!cancelled) setPermission(response);
      })
      .catch(() => {
        if (!cancelled) setPermission({ granted: false, canAskAgain: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    const response = await AudioModule.requestRecordingPermissionsAsync();
    setPermission(response);
    return response;
  }, []);

  return (
    <LabScreen
      title="Audio recorder"
      description="Record from the microphone with expo-audio, then play the result back. Note that expo-av is deprecated — this uses its replacement."
    >
      <PermissionGate
        permission={permission}
        request={request}
        rationale="This lab needs the microphone to record a short clip."
      >
        <RecorderSurface />
      </PermissionGate>
    </LabScreen>
  );
}

function RecorderSurface() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const player = useAudioPlayer(recordingUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);

  const startRecording = async () => {
    // Playing in silent mode matters on iOS: without it, playback is inaudible
    // when the hardware mute switch is on, which reads as a broken feature.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingUri(null);
  };

  const stopRecording = async () => {
    await recorder.stop();
    setRecordingUri(recorder.uri ?? null);
    // Release the recording route so playback is not forced through the earpiece.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  };

  return (
    <>
      <LabSection title="Record">
        <ThemedText type="small" themeColor="textSecondary">
          {recorderState.isRecording
            ? `Recording · ${formatDuration(recorderState.durationMillis)}`
            : "Idle"}
        </ThemedText>
        <LabRow>
          <LabButton
            label={recorderState.isRecording ? "Stop" : "Start recording"}
            emphasis="strong"
            onPress={() =>
              void (recorderState.isRecording
                ? stopRecording()
                : startRecording())
            }
          />
        </LabRow>
      </LabSection>

      <LabSection title="Play back">
        {recordingUri ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {playerStatus.playing
                ? `Playing · ${formatDuration(playerStatus.currentTime * 1000)}`
                : `Ready · ${formatDuration(playerStatus.duration * 1000)}`}
            </ThemedText>
            <LabRow>
              <LabButton
                label={playerStatus.playing ? "Pause" : "Play"}
                onPress={() => {
                  if (playerStatus.playing) {
                    player.pause();
                  } else {
                    // Restart from the top once the clip has finished.
                    if (playerStatus.didJustFinish) player.seekTo(0);
                    player.play();
                  }
                }}
              />
              <LabButton
                label="Discard"
                onPress={() => {
                  player.pause();
                  setRecordingUri(null);
                }}
              />
            </LabRow>
            <ThemedText type="code" numberOfLines={2}>
              {recordingUri}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Record something to enable playback.
          </ThemedText>
        )}
      </LabSection>

      {Platform.OS === "web" && (
        <ThemedText type="small" themeColor="textSecondary">
          On web the browser asks for microphone access itself, so the gate
          above may show as granted before you are prompted.
        </ThemedText>
      )}
    </>
  );
}
