import { useState, useCallback, useEffect } from 'react';
import { createLocalVideoTrack, createLocalAudioTrack, LocalVideoTrack, LocalAudioTrack, Room } from 'livekit-client';

export const usePodcastMedia = () => {
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [videoDeviceId, setVideoDeviceId] = useState<string>('');
  const [audioDeviceId, setAudioDeviceId] = useState<string>('');

  const toggleCamera = useCallback(async () => {
    if (isCameraOn && videoTrack) {
      videoTrack.stop();
      setVideoTrack(null);
      setIsCameraOn(false);
    } else {
      try {
        const track = await createLocalVideoTrack({
          deviceId: videoDeviceId || undefined,
          resolution: { width: 1280, height: 720, frameRate: 30 },
        });
        setVideoTrack(track);
        setIsCameraOn(true);
      } catch (e) {
        console.error("Failed to start camera", e);
      }
    }
  }, [isCameraOn, videoTrack, videoDeviceId]);

  const toggleMic = useCallback(async () => {
    if (isMicOn && audioTrack) {
      audioTrack.stop();
      setAudioTrack(null);
      setIsMicOn(false);
    } else {
      try {
        const track = await createLocalAudioTrack({
          deviceId: audioDeviceId || undefined,
          echoCancellation: true,
          noiseSuppression: true,
        });
        setAudioTrack(track);
        setIsMicOn(true);
      } catch (e) {
        console.error("Failed to start mic", e);
      }
    }
  }, [isMicOn, audioTrack, audioDeviceId]);

  useEffect(() => {
    return () => {
      if (videoTrack) videoTrack.stop();
      if (audioTrack) audioTrack.stop();
    };
  }, []); // Cleanup on unmount

  return {
    videoTrack,
    audioTrack,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
    setVideoDeviceId,
    setAudioDeviceId,
  };
};
