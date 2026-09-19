import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/constants';
import { useSocket } from '../contexts/SocketContext';
import type { StreamTarget } from '../types';
import { workspaceHeaders } from '../lib/workspace';
import { selectCaptureProfile, type BroadcastQuality } from '../lib/studioMedia';

interface RelayHealth {
  status: 'idle' | 'starting' | 'live' | 'stopping' | 'stopped' | 'error';
  frames: number;
  fps: number;
  speed: number;
  seconds: number;
  outputBytes: number;
  bytesReceived: number;
  duplicateFrames: number;
  droppedFrames: number;
  error: string | null;
}

const useRTMPStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [streamTargets, setTargets] = useState<StreamTarget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<RelayHealth | null>(null);
  const [profile, setProfile] = useState('');
  const { connected, sendBinary, send, on } = useSocket();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ownedTracksRef = useRef<MediaStreamTrack[]>([]);
  const serverStartedRef = useRef(false);
  const startingRef = useRef(false);
  const stoppingRef = useRef<Promise<void> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const releaseMedia = useCallback(() => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    captureTimerRef.current = null;
    timerRef.current = null;
    ownedTracksRef.current.forEach((track) => track.stop());
    ownedTracksRef.current = [];
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const stopStream = useCallback((): Promise<void> => {
    if (stoppingRef.current) return stoppingRef.current;
    setIsStopping(true);
    const stop = async () => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          const deadline = setTimeout(resolve, 1500);
          recorder.addEventListener('stop', () => { clearTimeout(deadline); resolve(); }, { once: true });
          recorder.stop();
        });
      }
      releaseMedia();
      setIsStreaming(false);
      setHealth(null);
      if (serverStartedRef.current) {
        serverStartedRef.current = false;
        await new Promise<void>((resolve) => {
          const requestId = crypto.randomUUID();
          const finish = () => { clearTimeout(deadline); unsubscribe(); resolve(); };
          const unsubscribe = on('stream:drained', (message) => { if (message.requestId === requestId) finish(); });
          const deadline = setTimeout(finish, 2500);
          if (!send({ type: 'stream:stop', requestId })) finish();
        });
        try {
          const response = await axios.post(`${API_BASE}/api/stream/stop`, {}, { headers: workspaceHeaders(), timeout: 8000 });
          if (response.data.status === 'stopping') setError('The server is still closing the broadcast. Wait before restarting.');
        } catch {
          setError('Stopped in this browser. The server could not confirm shutdown; check the destination before restarting.');
        }
      }
    };
    stoppingRef.current = stop().finally(() => { stoppingRef.current = null; setIsStopping(false); });
    return stoppingRef.current;
  }, [releaseMedia, send, on]);

  const failStream = useCallback((message: string) => {
    setError(message);
    if (recorderRef.current) recorderRef.current.ondataavailable = null;
    void stopStream();
  }, [stopStream]);

  const startStream = useCallback(async (
    canvasRef: React.RefObject<HTMLCanvasElement>, audioStream?: MediaStream | null, quality: BroadcastQuality = '1080p'
  ): Promise<boolean> => {
    if (startingRef.current || recorderRef.current || stoppingRef.current) return false;
    startingRef.current = true;
    setIsStarting(true);
    setError(null);
    try {
      const source = canvasRef.current;
      if (!source) throw new Error('Program canvas is not ready.');
      if (!connected) throw new Error('Broadcast connection is not ready. Try again shortly.');
      const selected = streamTargets.filter((target) => target.enabled);
      if (!selected.length) throw new Error('Select a publishing destination.');
      const body: Record<string, unknown> = {};
      for (const target of selected) {
        if (target.platform === 'custom') throw new Error('Choose YouTube or Facebook as the destination.');
        body[target.platform] = target.rtmpKey.trim() || true;
      }
      const capture = selectCaptureProfile((mime) => MediaRecorder.isTypeSupported(mime), quality);
      body.codec = capture.codec;
      let videoStream: MediaStream;
      if (source.width === capture.width && source.height === capture.height) {
        videoStream = source.captureStream(capture.fps);
      } else {
        const output = document.createElement('canvas');
        output.width = capture.width;
        output.height = capture.height;
        const context = output.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas capture is not supported.');
        context.imageSmoothingQuality = 'high';
        videoStream = output.captureStream(capture.fps);
        const draw = () => {
          context.drawImage(source, 0, 0, output.width, output.height);
        };
        draw();
        captureTimerRef.current = setInterval(draw, 1000 / capture.fps);
      }
      const videoTrack = videoStream.getVideoTracks()[0];
      ownedTracksRef.current.push(videoTrack);

      let audioTrack = audioStream?.getAudioTracks().find((track) => track.readyState === 'live');
      if (!audioTrack) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
          ownedTracksRef.current.push(...mic.getTracks());
          audioTrack = mic.getAudioTracks()[0];
        } catch {
          const context = new AudioContext({ sampleRate: 48000 });
          audioCtxRef.current = context;
          const destination = context.createMediaStreamDestination();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          gain.gain.value = 0;
          oscillator.connect(gain).connect(destination);
          oscillator.start();
          await context.resume();
          audioTrack = destination.stream.getAudioTracks()[0];
          ownedTracksRef.current.push(audioTrack);
        }
      }
      const combined = new MediaStream([videoTrack, ...(audioTrack ? [audioTrack] : [])]);
      const options: MediaRecorderOptions & { videoKeyFrameIntervalDuration: number } = {
        mimeType: capture.mimeType, videoBitsPerSecond: capture.bitrate, audioBitsPerSecond: 160_000, videoKeyFrameIntervalDuration: capture.keyFrameIntervalMs,
      };
      const recorder = new MediaRecorder(combined, options);
      await axios.post(`${API_BASE}/api/stream/start`, body, { headers: workspaceHeaders(), timeout: 15000 });
      serverStartedRef.current = true;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size && !sendBinary(event.data)) failStream('Upload connection lost or too slow. The broadcast stopped to avoid corrupted video; reconnect or choose 720p.');
      };
      recorder.onerror = () => failStream('Camera encoding failed. Stop other camera apps and restart at 720p.');
      recorder.start(250);
      setProfile(capture.label);
      setStreamDuration(0);
      const startedAt = Date.now();
      timerRef.current = setInterval(() => setStreamDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
      setIsStreaming(true);
      if ('wakeLock' in navigator) {
        void navigator.wakeLock.request('screen').then((lock) => {
          if (recorderRef.current) wakeLockRef.current = lock;
          else void lock.release();
        }).catch(() => {});
      }
      return true;
    } catch (caught) {
      setError(axios.isAxiosError(caught) ? caught.response?.data?.error || caught.message : caught instanceof Error ? caught.message : 'Unable to start the broadcast.');
      await stopStream();
      return false;
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [connected, streamTargets, sendBinary, failStream, stopStream]);

  useEffect(() => {
    if (!isStreaming) return;
    if (!connected) { failStream('The broadcast connection was lost. Reconnect and restart the broadcast.'); return; }
    const controller = new AbortController();
    let polling = false;
    let failures = 0;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await axios.get<RelayHealth>(`${API_BASE}/api/stream/status`, { headers: workspaceHeaders(), signal: controller.signal, timeout: 4000 });
        if (controller.signal.aborted || stoppingRef.current) return;
        failures = 0;
        setHealth(response.data);
        if (['error', 'stopped', 'idle'].includes(response.data.status)) failStream(response.data.error || 'The server relay stopped. Check the destination and restart.');
      } catch {
        if (!controller.signal.aborted && ++failures >= 3) failStream('Server health checks failed. The broadcast has been stopped.');
      } finally { polling = false; }
    };
    void poll();
    const timer = setInterval(() => void poll(), 1000);
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('beforeunload', beforeUnload); };
  }, [isStreaming, connected, failStream]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') { recorder.ondataavailable = null; recorder.stop(); }
    releaseMedia();
    if (serverStartedRef.current) {
      send({ type: 'stream:stop' });
      void fetch(`${API_BASE}/api/stream/stop`, { method: 'POST', headers: workspaceHeaders(), keepalive: true }).catch(() => {});
    }
  }, [releaseMedia, send]);

  return { isStreaming, isStarting, isStopping, streamDuration, streamTargets, error, health, profile, setTargets, startStream, stopStream };
};

export default useRTMPStream;
