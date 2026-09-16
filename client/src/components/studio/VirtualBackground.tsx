import React, { useEffect, useRef } from 'react';
import { LocalVideoTrack } from 'livekit-client';
import { useVirtualBackground, BackgroundType } from '../../hooks/useVirtualBackground';

interface VirtualBackgroundProps {
  videoTrack: LocalVideoTrack | null;
  backgroundType: BackgroundType;
}

const VirtualBackground: React.FC<VirtualBackgroundProps> = ({ videoTrack, backgroundType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // This hook handles the background processing logic on the track
  const { setBackgroundType } = useVirtualBackground(videoTrack);

  useEffect(() => {
    setBackgroundType(backgroundType);
  }, [backgroundType, setBackgroundType]);

  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
    }
    return () => {
      if (videoTrack && videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [videoTrack]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
      {videoTrack ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
          Camera Off
        </div>
      )}
    </div>
  );
};

export default VirtualBackground;
