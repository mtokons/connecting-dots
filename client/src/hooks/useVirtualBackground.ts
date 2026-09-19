import { useState, useEffect, useRef } from 'react';
import { BackgroundProcessor } from '@livekit/track-processors';
import { LocalVideoTrack } from 'livekit-client';

export type BackgroundType = 'original' | 'blur' | 'sccg-studio' | 'sccg-interview' | 'sccg-dark' | 'sccg-news';

export const useVirtualBackground = (videoTrack: LocalVideoTrack | null) => {
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('original');
  const pending = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!videoTrack || backgroundType === 'original') return;
    let cancelled = false;
    let processor: ReturnType<typeof BackgroundProcessor> | null = null;

    const applyBackground = async () => {
      if (cancelled) return;
      processor = BackgroundProcessor(backgroundType === 'blur'
        ? { mode: 'background-blur', blurRadius: 10 }
        : { mode: 'virtual-background', imagePath: `/backgrounds/${backgroundType}.png` });
      try {
        await videoTrack.setProcessor(processor);
      } catch (error) {
        if (videoTrack.getProcessor() === processor) await videoTrack.stopProcessor();
        else await processor.destroy();
        processor = null;
        throw error;
      }
    };

    pending.current = pending.current.then(applyBackground).catch((error) => {
      console.error('Unable to apply virtual background:', error);
    });

    return () => {
      cancelled = true;
      pending.current = pending.current.then(async () => {
        if (processor && videoTrack.getProcessor() === processor) {
          await videoTrack.stopProcessor();
        }
      }).catch((error) => {
        console.error('Unable to stop virtual background:', error);
      });
    };
  }, [backgroundType, videoTrack]);

  return {
    backgroundType,
    setBackgroundType
  };
};
