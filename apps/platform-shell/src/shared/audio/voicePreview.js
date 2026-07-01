const activePreview = { audio: null };

export const getVoicePreviewUrl = (voiceId) => {
  if (!voiceId) return null;
  return `/voices-agent/${encodeURIComponent(voiceId)}.wav`;
};

export const stopVoicePreview = () => {
  if (!activePreview.audio) return;
  activePreview.audio.pause();
  activePreview.audio.currentTime = 0;
  activePreview.audio = null;
};

export const playVoicePreview = (voiceId) => {
  if (!voiceId) return;

  stopVoicePreview();

  const audio = new Audio(getVoicePreviewUrl(voiceId));
  audio.loop = false;
  activePreview.audio = audio;

  audio.play().catch((error) => {
    if (error?.name !== "AbortError") {
      console.warn(`Voice preview unavailable for ${voiceId}:`, error);
    }
  });

  audio.addEventListener(
    "ended",
    () => {
      if (activePreview.audio === audio) {
        activePreview.audio = null;
      }
    },
    { once: true },
  );
};
