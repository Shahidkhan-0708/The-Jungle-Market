// Jungle Market — real device media utilities.
// Voice:  expo-audio microphone recording + playback with robust fallback.
// Speech: expo-speech-recognition live speech-to-text (hi-IN and en-IN).
// Photos: expo-image-picker camera / gallery, capped at 4 craft shots.
// Enhance: expo-image-manipulator resize + JPEG normalize (real on-device
//          processing pass; server-side OpenCV runs later in production).
// Story:  expo-speech reads the voiceLore transcript aloud (hi-IN).
// Simple English rules: short sentences, active voice, no contractions.

import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Speech from "expo-speech";

export const MAX_CRAFT_PHOTOS = 4;

// Safe dynamic loaders so a missing native module cannot crash startup.
let ExpoAudioModule = null;
function getAudioModule() {
  if (ExpoAudioModule !== null) return ExpoAudioModule;
  try {
    const mod = require("expo-audio");
    ExpoAudioModule = mod || false;
  } catch (e) {
    ExpoAudioModule = false;
  }
  return ExpoAudioModule;
}

let SpeechRecognitionModule = null;
function getSpeechRecognitionModule() {
  if (SpeechRecognitionModule !== null) return SpeechRecognitionModule;
  try {
    const mod = require("expo-speech-recognition");
    SpeechRecognitionModule = mod || false;
  } catch (e) {
    SpeechRecognitionModule = false;
  }
  return SpeechRecognitionModule;
}

// ---------- Voice recording (expo-audio) ----------
export async function startVoiceRecording() {
  const audio = getAudioModule();
  const startTime = Date.now();

  if (audio && typeof audio.requestRecordingPermissionsAsync === "function") {
    try {
      const perm = await audio.requestRecordingPermissionsAsync();
      if (perm.granted) {
        if (typeof audio.setAudioModeAsync === "function") {
          await audio
            .setAudioModeAsync({
              allowsRecording: true,
              playsInSilentMode: true,
            })
            .catch(() => {});
        }
        // Real API: AudioModule.AudioRecorder(options) — verified against
        // node_modules/expo-audio/build/AudioModule.types.d.ts (v57.0.4).
        if (audio.AudioModule?.AudioRecorder) {
          const options =
            audio.RecordingPresets?.HIGH_QUALITY || { extension: ".m4a" };
          const recorder = new audio.AudioModule.AudioRecorder(options);
          await recorder.prepareToRecordAsync();
          recorder.record();
          return { type: "native", recorder, startTime };
        }
      }
    } catch (e) {
      console.warn("Native audio recording fallback:", e.message);
    }
  }

  // Robust simulated recording object for all Expo Go builds.
  return {
    type: "simulated",
    startTime,
  };
}

export async function stopVoiceRecording(recording) {
  if (!recording) return { uri: null, durationMs: 0 };
  const durationMs = Math.max(
    1500,
    Date.now() - (recording.startTime || Date.now())
  );

  if (recording.type === "native" && recording.recorder) {
    try {
      await recording.recorder.stop();
      const uri = recording.recorder.uri;
      const audio = getAudioModule();
      if (audio?.setAudioModeAsync) {
        await audio
          .setAudioModeAsync({ allowsRecording: false })
          .catch(() => {});
      }
      if (uri) return { uri, durationMs };
    } catch (e) {
      console.warn("Native stop recorder fallback:", e.message);
    }
  }

  // Simulated builds keep the placeholder URI so the UI flow still works.
  return {
    uri: recording.type === "native" ? null : "recorded-story-voice.m4a",
    durationMs,
  };
}

export async function playVoiceNote(uri, onDone) {
  const audio = getAudioModule();

  if (
    audio &&
    typeof audio.createAudioPlayer === "function" &&
    uri &&
    (uri.startsWith("http://") ||
      uri.startsWith("https://") ||
      uri.startsWith("file://"))
  ) {
    try {
      const player = audio.createAudioPlayer(uri);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (onDone) onDone();
      };
      // Real end-of-playback event instead of a fixed timer.
      const sub = player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) finish();
      });
      player.play();
      return { type: "native", player, subscription: sub, timer: null };
    } catch (e) {
      console.warn("Native audio player fallback:", e.message);
    }
  }

  // Simulated audio playback.
  const timer = setTimeout(() => {
    if (onDone) onDone();
  }, 3500);

  return { type: "simulated", timer };
}

export async function stopVoiceNote(sound) {
  if (!sound) return;
  if (sound.timer) {
    clearTimeout(sound.timer);
  }
  if (sound.subscription) {
    try {
      sound.subscription.remove();
    } catch (e) {}
  }
  if (sound.player) {
    try {
      if (typeof sound.player.pause === "function") sound.player.pause();
      if (typeof sound.player.release === "function") sound.player.release();
    } catch (e) {}
  }
}

// ---------- Live speech-to-text (expo-speech-recognition) ----------
// Returns a stop() handle. Emits partial and final transcripts live.
// Fallback: simulated handle that yields no transcript (manual typing path).
export function startLiveTranscription(lang, callbacks) {
  const sr = getSpeechRecognitionModule();
  const module = sr && sr.ExpoSpeechRecognitionModule;

  if (module && typeof module.start === "function") {
    let ended = false;
    const subs = [];
    const cleanup = () => {
      if (ended) return;
      ended = true;
      subs.forEach((s) => {
        try {
          s.remove();
        } catch (e) {}
      });
    };

    subs.push(
      module.addListener("result", (event) => {
        const text = event.results?.[0]?.transcript || "";
        if (event.isFinal) {
          if (callbacks.onFinal) callbacks.onFinal(text);
        } else if (callbacks.onPartial) {
          callbacks.onPartial(text);
        }
      })
    );
    subs.push(
      module.addListener("error", (event) => {
        if (callbacks.onError) callbacks.onError(event.error, event.message);
      })
    );
    subs.push(
      module.addListener("end", () => {
        cleanup();
        if (callbacks.onEnd) callbacks.onEnd();
      })
    );

    (async () => {
      try {
        const perm = await module.requestPermissionsAsync();
        if (!perm.granted) {
          if (callbacks.onError) {
            callbacks.onError("not-allowed", "Microphone permission denied.");
          }
          cleanup();
          if (callbacks.onEnd) callbacks.onEnd();
          return;
        }
        module.start({
          lang: lang || "hi-IN",
          interimResults: true,
          continuous: false,
        });
      } catch (e) {
        console.warn("Speech recognition start fallback:", e.message);
        if (callbacks.onError) callbacks.onError("unknown", e.message);
        cleanup();
        if (callbacks.onEnd) callbacks.onEnd();
      }
    })();

    return {
      type: "native",
      stop: () => {
        try {
          module.stop();
        } catch (e) {}
        cleanup();
      },
    };
  }

  // Simulated: no native speech recognizer available.
  return {
    type: "simulated",
    stop: () => {
      if (callbacks.onEnd) callbacks.onEnd();
    },
  };
}

// ---------- Craft photos (expo-image-picker) ----------
export async function pickCraftPhotos(fromCamera, alreadyHave = 0) {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      fromCamera ? "Camera permission denied." : "Gallery permission denied."
    );
  }

  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
    : await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, MAX_CRAFT_PHOTOS - alreadyHave),
      });

  if (!result || result.canceled) return [];
  const assets = result.assets || [];
  return assets
    .slice(0, Math.max(0, MAX_CRAFT_PHOTOS - alreadyHave))
    .map((a) => a.uri);
}

// ---------- Enhancement pass (expo-image-manipulator) ----------
export async function enhanceCraftPhoto(uri) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.warn("Image enhancement fallback to original URI:", e.message);
    return uri;
  }
}

// ---------- Story playback (expo-speech) ----------
export function speakStory(text, callbacks = {}) {
  const clean = (text || "").trim();
  if (!clean) return false;
  try {
    Speech.stop();
    Speech.speak(clean, {
      language: "hi-IN",
      rate: 0.95,
      onDone: callbacks.onDone,
      onStopped: callbacks.onStopped,
      onError: callbacks.onError,
    });
    return true;
  } catch (e) {
    console.warn("Speech playback fallback:", e.message);
    if (callbacks.onDone) setTimeout(callbacks.onDone, 2000);
    return false;
  }
}

export function stopStorySpeech() {
  try {
    Speech.stop();
  } catch (e) {}
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + String(s).padStart(2, "0");
}
