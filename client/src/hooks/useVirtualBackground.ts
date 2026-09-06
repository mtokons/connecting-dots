import { useState, useCallback, useEffect } from 'react';
import { BackgroundProcessor } from '@livekit/track-processors';
import { LocalVideoTrack } from 'livekit-client';

export type BackgroundType = 'original' | 'blur' | 'sccg-studio' | 'sccg-interview' | 'sccg-dark' | 'sccg-news';

export const useVirtualBackground = (videoTrack: LocalVideoTrack | null) => {
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('original');
  const [processor, setProcessor] = useState<BackgroundProcessor | null>(null);

  useEffect(() => {
    // Initialize the processor once
    const initProcessor = async () => {
      const bgProcessor = BackgroundProcessor({
        mode: 'virtual-background',
      });
      setProcessor(bgProcessor);
    };
    initProcessor();
    
    return () => {
      if (processor && videoTrack) {
        processor.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!processor || !videoTrack) return;

    const applyBackground = async () => {
      if (backgroundType === 'original') {
        if (videoTrack.processor) {
          await videoTrack.stopProcessor();
        }
        return;
      }

      if (backgroundType === 'blur') {
        // We can either create a new processor or use a blur processor. 
        // For simplicity, Livekit BackgroundProcessor supports blur.
        const p = BackgroundProcessor({ mode: 'blur', blurRadius: 10 });
        await videoTrack.setProcessor(p);
        return;
      }

      // For image backgrounds
      const imagePath = `/backgrounds/${backgroundType}.png`;
      const p = BackgroundProcessor({
        mode: 'virtual-background',
        imagePath,
      });
      await videoTrack.setProcessor(p);
    };

    applyBackground();
  }, [backgroundType, processor, videoTrack]);

  return {
    backgroundType,
    setBackgroundType
  };
};
