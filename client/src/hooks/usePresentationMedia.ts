import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, Track } from 'livekit-client';

export default function usePresentationMedia(room: Room | null, onError: (message: string) => void) {
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [clip, setClip] = useState<{ name: string; video: HTMLVideoElement } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(false);
  const [sharing, setSharing] = useState(false);
  const screenRef = useRef<MediaStream | null>(null);
  const clipRef = useRef<HTMLVideoElement | null>(null);
  const clipUrlRef = useRef<string | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;

  const releaseScreen = useCallback(() => {
    const current = screenRef.current;
    screenRef.current = null;
    current?.getTracks().forEach((track) => {
      track.onended = null;
      void roomRef.current?.localParticipant.unpublishTrack(track).catch(() => {});
      track.stop();
    });
  }, []);

  const stopScreen = useCallback(() => { releaseScreen(); setScreen(null); }, [releaseScreen]);
  const startScreen = useCallback(async () => {
    if (screenRef.current || sharing) return false;
    setSharing(true);
    let current: MediaStream | null = null;
    try {
      current = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, audio: true });
      screenRef.current = current;
      for (const track of current.getTracks()) {
        if (track.kind === 'video') { track.contentHint = 'detail'; track.onended = stopScreen; }
        await roomRef.current?.localParticipant.publishTrack(track, { source: track.kind === 'video' ? Track.Source.ScreenShare : Track.Source.ScreenShareAudio });
      }
      setScreen(current);
      return true;
    } catch (error) {
      releaseScreen();
      onError(error instanceof Error && error.name === 'NotAllowedError' ? 'Screen sharing cancelled.' : 'Screen sharing is unavailable in this browser.');
      return false;
    } finally { setSharing(false); }
  }, [sharing, stopScreen, releaseScreen, onError]);

  const releaseClip = useCallback(() => {
    const current = clipRef.current;
    clipRef.current = null;
    if (current) { current.pause(); current.removeAttribute('src'); current.load(); }
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    clipUrlRef.current = null;
  }, []);

  const removeClip = useCallback(() => {
    releaseClip(); setClip(null); setPlaying(false); setPosition(0); setDuration(0);
  }, [releaseClip]);

  const loadClip = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/') || file.size > 1024 * 1024 * 1024) { onError('Choose a video file smaller than 1 GB.'); return false; }
    removeClip();
    const video = document.createElement('video');
    video.playsInline = true;
    video.preload = 'auto';
    const url = URL.createObjectURL(file);
    clipRef.current = video;
    clipUrlRef.current = url;
    video.src = url;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Video loading timed out.')), 15000);
        video.onloadeddata = () => { clearTimeout(timer); resolve(); };
        video.onerror = () => { clearTimeout(timer); reject(new Error('This video format is not supported. Try an H.264 MP4.')); };
      });
      if (clipRef.current !== video) return false;
      video.ontimeupdate = () => setPosition(video.currentTime);
      video.onplay = () => setPlaying(true);
      video.onpause = () => setPlaying(false);
      video.onended = () => setPlaying(false);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setLoop(false);
      setClip({ name: file.name, video });
      return true;
    } catch (error) {
      if (clipRef.current === video) {
        removeClip();
        onError(error instanceof Error ? error.message : 'Unable to load the reference video.');
      }
      return false;
    }
  }, [onError, removeClip]);

  const toggleClip = useCallback(async () => {
    const current = clipRef.current;
    if (!current) return;
    try {
      if (current.paused) await current.play();
      else current.pause();
    } catch { onError('Video playback was blocked. Press play again.'); }
  }, [onError]);

  const seek = useCallback((value: number) => {
    if (clipRef.current) clipRef.current.currentTime = Math.max(0, Math.min(value, duration));
    setPosition(value);
  }, [duration]);

  useEffect(() => { if (clip?.video) clip.video.loop = loop; }, [clip, loop]);
  useEffect(() => () => { releaseScreen(); releaseClip(); }, [releaseScreen, releaseClip]);

  return { screen, clip, playing, position, duration, volume, loop, sharing, startScreen, stopScreen, loadClip, removeClip, toggleClip, seek, setVolume, setLoop };
}