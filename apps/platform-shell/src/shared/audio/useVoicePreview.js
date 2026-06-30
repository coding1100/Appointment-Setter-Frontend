import { useCallback, useEffect, useRef } from "react";

import { playVoicePreview, stopVoicePreview } from "./voicePreview";

export const useVoicePreview = (selectedVoiceId = "") => {
  const lastSelectedVoiceRef = useRef(selectedVoiceId || "");

  useEffect(() => {
    lastSelectedVoiceRef.current = selectedVoiceId || "";
  }, [selectedVoiceId]);

  useEffect(() => () => stopVoicePreview(), []);

  const handleVoiceSelect = useCallback((event, onChange) => {
    const nextVoiceId = event.target.value;
    const previousVoiceId = lastSelectedVoiceRef.current;

    onChange(event);

    if (nextVoiceId && nextVoiceId !== previousVoiceId) {
      playVoicePreview(nextVoiceId);
    }

    lastSelectedVoiceRef.current = nextVoiceId;
  }, []);

  return { handleVoiceSelect };
};
