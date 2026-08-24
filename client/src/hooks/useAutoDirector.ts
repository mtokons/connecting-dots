/**
 * Voice-activity-driven scene auto-switcher ("auto-director").
 *
 * Watches the LiveKit speaker list and:
 *   - Goes to `spotlight` on the dominant speaker when one person dominates.
 *   - Falls back to `grid` when 2+ speakers are equally active.
 *   - Uses small hysteresis (debounce) to avoid flapping cuts.
 */
import { useEffect, useRef } from 'react';

import type { MultiCameraLayout } from '../types';

interface SpeakerSnapshot {
  id: string;
  isSpeaking: boolean;
  isOnStage: boolean;
}

interface Options {
  enabled: boolean;
  speakers: SpeakerSnapshot[];
  currentLayout: MultiCameraLayout;
  setLayout: (l: MultiCameraLayout) => void;
  onSpotlight?: (speakerId: string) => void;
  /** Min ms a speaker must dominate before we switch. Default 1500. */
  debounceMs?: number;
}

const useAutoDirector = ({
  enabled,
  speakers,
  currentLayout,
  setLayout,
  onSpotlight,
  debounceMs = 1500,
}: Options) => {
  const lastChangeRef = useRef(0);
  const lastSpotlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const onStage = speakers.filter((s) => s.isOnStage);
    if (onStage.length === 0) return;

    const speaking = onStage.filter((s) => s.isSpeaking);
    const now = Date.now();
    if (now - lastChangeRef.current < debounceMs) return;

    if (speaking.length === 1) {
      const dominant = speaking[0];
      if (lastSpotlightRef.current !== dominant.id || currentLayout !== 'spotlight') {
        lastSpotlightRef.current = dominant.id;
        lastChangeRef.current = now;
        setLayout('spotlight');
        onSpotlight?.(dominant.id);
      }
    } else if (speaking.length >= 2 && currentLayout !== 'grid') {
      lastChangeRef.current = now;
      setLayout('grid');
    }
  }, [enabled, speakers, currentLayout, setLayout, onSpotlight, debounceMs]);
};

export default useAutoDirector;
