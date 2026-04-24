import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEYS = {
  muted: "chat_live_alerts_muted",
  volume: "chat_live_alerts_volume",
  enabled: "chat_live_alerts_enabled",
  theme: "chat_live_alerts_theme",
};

const DEFAULT_VOLUME = 100;
const DEFAULT_THEME = "soft";
const SOUND_THEMES = ["soft", "neutral", "crisp"];
const MIN_GAP_MS = {
  newSession: 1300,
  message: 420,
};

const clampVolume = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const loadBoolean = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
};

const loadTheme = () => {
  const raw = String(localStorage.getItem(STORAGE_KEYS.theme) || "").toLowerCase();
  if (SOUND_THEMES.includes(raw)) return raw;
  return DEFAULT_THEME;
};

const buildToneDataUri = (frequency = 880, durationMs = 170, gain = 0.44) => {
  const sampleRate = 22050;
  const durationSec = Math.max(0.04, durationMs / 1000);
  const sampleCount = Math.floor(sampleRate * durationSec);
  const attackSamples = Math.floor(sampleRate * 0.012);
  const releaseSamples = Math.floor(sampleRate * 0.06);
  const pcm = new Int16Array(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const fundamental = Math.sin(2 * Math.PI * frequency * t);
    const harmonic = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.24;
    const sine = fundamental + harmonic;
    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / Math.max(1, attackSamples);
    } else if (i > sampleCount - releaseSamples) {
      envelope = (sampleCount - i) / Math.max(1, releaseSamples);
    }
    pcm[i] = Math.floor(sine * envelope * gain * 32767);
  }

  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  const writeStr = (value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset, value.charCodeAt(i));
      offset += 1;
    }
  };

  writeStr("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeStr("WAVE");
  writeStr("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * 2, true);
  offset += 4;
  view.setUint16(offset, 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeStr("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(offset, pcm[i], true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
};

const pickBestVoice = (voices = []) => {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const preferredNames = [
    "Samantha",
    "Google US English",
    "Microsoft Jenny",
    "Microsoft Aria",
    "Microsoft Zira",
  ];

  const directMatch = voices.find((voice) =>
    preferredNames.some((name) =>
      String(voice?.name || "").toLowerCase().includes(name.toLowerCase()),
    ),
  );
  if (directMatch) return directMatch;

  const enVoice = voices.find((voice) =>
    String(voice?.lang || "").toLowerCase().startsWith("en"),
  );
  if (enVoice) return enVoice;

  return voices[0];
};

export const useLiveChatAudioAlerts = () => {
  const [muted, setMuted] = useState(() => loadBoolean(STORAGE_KEYS.muted, false));
  const [enabled, setEnabled] = useState(() => loadBoolean(STORAGE_KEYS.enabled, true));
  const [soundTheme, setSoundThemeState] = useState(() => loadTheme());
  const [volume, setVolumeState] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.volume);
    return clampVolume(raw === null ? DEFAULT_VOLUME : raw);
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const [hint, setHint] = useState("");

  const lastFireRef = useRef({ newSession: 0, message: 0 });
  const spokenSessionIdsRef = useRef(new Set());
  const notifiedMessageIdsRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const preferredVoiceRef = useRef(null);

  const themeConfig = useMemo(() => {
    if (soundTheme === "crisp") {
      return {
        tone: {
          newSession: [756, 480, 0.42],
          message: [1040, 260, 0.28],
          test: [920, 320, 0.35],
        },
        webAudio: {
          newSession: [
            [760, 0, 0.30, "triangle", 0.15],
            [950, 0.22, 0.33, "triangle", 0.15],
          ],
          message: [[1020, 0, 0.20, "sine", 0.11]],
          test: [
            [760, 0, 0.22, "triangle", 0.15],
            [980, 0.18, 0.24, "triangle", 0.15],
          ],
        },
        tts: {
          rate: 0.99,
          pitch: 1.02,
          gainMultiplier: 1,
        },
      };
    }

    if (soundTheme === "neutral") {
      return {
        tone: {
          newSession: [710, 500, 0.40],
          message: [968, 280, 0.30],
          test: [980, 340, 0.36],
        },
        webAudio: {
          newSession: [
            [712, 0, 0.34, "triangle", 0.16],
            [870, 0.24, 0.34, "triangle", 0.16],
          ],
          message: [[960, 0, 0.22, "sine", 0.11]],
          test: [
            [740, 0, 0.24, "triangle", 0.16],
            [980, 0.18, 0.25, "triangle", 0.16],
          ],
        },
        tts: {
          rate: 0.97,
          pitch: 1.0,
          gainMultiplier: 1,
        },
      };
    }

    return {
      tone: {
        newSession: [684, 520, 0.42],
        message: [912, 300, 0.32],
        test: [980, 360, 0.38],
      },
      webAudio: {
        newSession: [
          [684, 0, 0.36, "triangle", 0.16],
          [812, 0.26, 0.36, "triangle", 0.16],
        ],
        message: [[912, 0, 0.24, "sine", 0.12]],
        test: [
          [740, 0, 0.26, "triangle", 0.17],
          [980, 0.2, 0.28, "triangle", 0.17],
        ],
      },
      tts: {
        rate: 0.96,
        pitch: 0.98,
        gainMultiplier: 1,
      },
    };
  }, [soundTheme]);

  const toneUris = useMemo(
    () => ({
      newSession: buildToneDataUri(...themeConfig.tone.newSession),
      message: buildToneDataUri(...themeConfig.tone.message),
      test: buildToneDataUri(...themeConfig.tone.test),
    }),
    [themeConfig],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;

    const refreshVoice = () => {
      preferredVoiceRef.current = pickBestVoice(window.speechSynthesis.getVoices());
    };

    refreshVoice();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoice);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.muted, String(muted));
  }, [muted]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.volume, String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.enabled, String(enabled));
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, soundTheme);
  }, [soundTheme]);

  const shouldPlay = useCallback(() => enabled && !muted, [enabled, muted]);

  const primeAudio = useCallback(async () => {
    try {
      const context =
        audioContextRef.current ||
        new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = context;

      if (context.state === "suspended") {
        await context.resume();
      }

      const source = toneUris.test || toneUris.message;
      const audio = new Audio(source);
      audio.volume = 0;
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      setIsBlocked(false);
      setHint("");
      return true;
    } catch (_error) {
      return false;
    }
  }, [toneUris]);

  const playToneWithAudioTag = useCallback(
    async (kind) => {
      const source = toneUris[kind] || toneUris.message;
      const audio = new Audio(source);
      audio.volume = Math.max(0, Math.min(1, (volume / 100) * 1.25));
      await audio.play();
    },
    [toneUris, volume],
  );

  const playToneWithWebAudio = useCallback(
    async (kind) => {
      const context = audioContextRef.current || new AudioContext();
      audioContextRef.current = context;

      if (context.state === "suspended") {
        await context.resume();
      }

      const now = context.currentTime;
      const outputGain = context.createGain();
      outputGain.gain.value = 1.25;
      outputGain.connect(context.destination);

      const playNote = (frequency, start, duration, type = "triangle", gainAmount = 0.16) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, (volume / 100) * gainAmount),
          start + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(outputGain);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.015);
      };

      const notes = themeConfig.webAudio[kind] || themeConfig.webAudio.message;
      notes.forEach(([frequency, offset, duration, type, gainAmount]) => {
        playNote(frequency, now + offset, duration, type, gainAmount);
      });
    },
    [themeConfig, volume],
  );

  const playTone = useCallback(
    async (kind) => {
      try {
        await playToneWithAudioTag(kind);
        setIsBlocked(false);
        setHint("");
      } catch (_error) {
        try {
          await playToneWithWebAudio(kind);
          setIsBlocked(false);
          setHint("");
        } catch (_fallbackError) {
          setIsBlocked(true);
          setHint("Alerts are blocked by the browser until you enable audio.");
          throw _fallbackError;
        }
      }
    },
    [playToneWithAudioTag, playToneWithWebAudio],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let cleaned = false;
    const onFirstInteraction = async () => {
      if (cleaned) return;
      await primeAudio();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };

    window.addEventListener("pointerdown", onFirstInteraction, { passive: true });
    window.addEventListener("keydown", onFirstInteraction);
    window.addEventListener("touchstart", onFirstInteraction, { passive: true });

    return () => {
      cleaned = true;
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
  }, [primeAudio]);

  const speakNewUser = useCallback(
    async (text) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        throw new Error("Speech synthesis unavailable");
      }

      await new Promise((resolve, reject) => {
        let settled = false;
        let timeoutId = null;

        const finish = (fn) => {
          if (settled) return;
          settled = true;
          if (timeoutId) {
            window.clearTimeout(timeoutId);
          }
          fn();
        };

        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = preferredVoiceRef.current;
          utterance.volume = Math.max(
            0,
            Math.min(1, (volume / 100) * 1.35 * themeConfig.tts.gainMultiplier),
          );
          utterance.rate = themeConfig.tts.rate;
          utterance.pitch = themeConfig.tts.pitch;
          utterance.onend = () => finish(resolve);
          utterance.onerror = () =>
            finish(() => reject(new Error("Speech synthesis failed")));

          timeoutId = window.setTimeout(() => {
            try {
              window.speechSynthesis.cancel();
            } catch (_error) {
              // No-op
            }
            finish(() =>
              reject(new Error("Speech synthesis timed out in this tab state")),
            );
          }, 2200);

          window.speechSynthesis.speak(utterance);
        } catch (error) {
          finish(() => reject(error));
        }
      });
    },
    [themeConfig, volume],
  );

  const rateLimited = useCallback((kind) => {
    const now = Date.now();
    if (now - lastFireRef.current[kind] < MIN_GAP_MS[kind]) return false;
    lastFireRef.current[kind] = now;
    return true;
  }, []);

  const notifyNewSession = useCallback(
    async ({ sessionId, visitorLabel }) => {
      if (!sessionId || !shouldPlay()) return;
      if (spokenSessionIdsRef.current.has(sessionId)) return;
      if (!rateLimited("newSession")) return;

      spokenSessionIdsRef.current.add(sessionId);
      const phrase = visitorLabel ? "New user arrived" : "New user arrived";

      try {
        await speakNewUser(phrase);
        setIsBlocked(false);
        setHint("");
      } catch (_error) {
        await playTone("newSession");
      }
    },
    [playTone, rateLimited, shouldPlay, speakNewUser],
  );

  const notifyIncomingVisitorMessage = useCallback(
    async ({ messageId, sessionId, createdAt, content }) => {
      const fallbackMessageKey = [
        sessionId || "session",
        createdAt || "time",
        String(content || "").slice(0, 42),
      ].join(":");
      const messageKey = messageId || fallbackMessageKey;
      if (!messageKey || !shouldPlay()) return;
      if (notifiedMessageIdsRef.current.has(messageKey)) return;
      if (!rateLimited("message")) return;

      notifiedMessageIdsRef.current.add(messageKey);
      await playTone("message");
    },
    [playTone, rateLimited, shouldPlay],
  );

  const unlockAudio = useCallback(async () => {
    setEnabled(true);
    try {
      await playTone("test");
      setIsBlocked(false);
      setHint("");
      return true;
    } catch (_error) {
      setIsBlocked(true);
      setHint("Browser is still blocking audio playback. Click again after interacting with the page.");
      return false;
    }
  }, [playTone]);

  const playTestSound = useCallback(async () => {
    if (!shouldPlay()) return;
    await playTone("test");
  }, [playTone, shouldPlay]);

  const setVolume = useCallback((value) => {
    setVolumeState(clampVolume(value));
  }, []);

  const setSoundTheme = useCallback((value) => {
    const next = String(value || "").toLowerCase();
    if (!SOUND_THEMES.includes(next)) return;
    setSoundThemeState(next);
  }, []);

  const settings = useMemo(
    () => ({ muted, enabled, volume, soundTheme }),
    [enabled, muted, soundTheme, volume],
  );

  return {
    notifyNewSession,
    notifyIncomingVisitorMessage,
    settings,
    setMuted,
    setVolume,
    setSoundTheme,
    playTestSound,
    unlockAudio,
    isBlocked,
    hint,
    soundThemes: SOUND_THEMES,
  };
};
