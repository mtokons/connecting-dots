import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/constants';
import { useSocket } from '../contexts/SocketContext';
import type { StreamTarget } from '../types';

interface UseRTMPStreamReturn {
  isStreaming: boolean;
  streamDuration: number;
  streamTargets: StreamTarget[];
  error: string | null;
  setTargets: (targets: StreamTarget[]) => void;
  startStream: (canvasRef: React.RefObject<HTMLCanvasElement>) => Promise<void>;
  stopStream: () => Promise<void>;
}

/** Pick the best mimeType the current browser supports. */
function getBestMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

const useRTMPStream = (): UseRTMPStreamReturn => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [streamTargets, setStreamTargets] = useState<StreamTarget[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { connected, sendBinary, send } = useSocket();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const setTargets = useCallback((targets: StreamTarget[]) => {
    setStreamTargets(targets);
  }, []);

  const startStream = useCallback(
    async (canvasRef: React.RefObject<HTMLCanvasElement>) => {
      try {
        setError(null);

        if (!canvasRef.current) {
          setError('Canvas not available');
          return;
        }

        // ── 1. Build RTMP target body ──────────────────────────────────
        const enabledTargets = streamTargets.filter((t) => t.enabled);
        const body: Record<string, unknown> = {};
        const customTargets: string[] = [];

        enabledTargets.forEach((t) => {
          if (t.platform === 'custom') {
            const url = (t.rtmpUrl ?? '').trim();
            if (url) customTargets.push(url);
            return;
          }
          if (t.rtmpKey) body[t.platform] = t.rtmpKey;
        });
        if (customTargets.length > 0) body.targets = customTargets;

        // ── 2. Start FFmpeg on the server ──────────────────────────────
        await axios.post(`${API_BASE}/api/stream/start`, body);

        // ── 3. Capture canvas video ────────────────────────────────────
        const videoStream = canvasRef.current.captureStream(30);

        // ── 4. Get microphone audio ────────────────────────────────────
        let audioTrack: MediaStreamTrack | null = null;
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          audioTrack = mic.getAudioTracks()[0] ?? null;
        } catch {
          try {
            const actx = new AudioContext({ sampleRate: 44100 });
            audioCtxRef.current = actx;
            const dest = actx.createMediaStreamDestination();
            const gain = actx.createGain();
            gain.gain.value = 0;
            gain.connect(dest);
            const osc = actx.createOscillator();
            osc.connect(gain);
            osc.start();
            osc.stop(actx.currentTime + 0.001);
            audioTrack = dest.stream.getAudioTracks()[0] ?? null;
          } catch { /* no audio */ }
        }

        const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
        if (audioTrack) tracks.push(audioTrack);
        const combinedStream = new MediaStream(tracks);

        // ── 5. Check WS is connected (shared context — no extra connection) ──
        if (!connected) {
          throw new Error('WebSocket not connected');
        }

        // ── 6. Start MediaRecorder — send binary chunks via shared WS ──
        const mimeType = getBestMimeType();
        const opts: MediaRecorderOptions = { videoBitsPerSecond: 2_500_000 };
        if (mimeType) opts.mimeType = mimeType;

        const recorder = new MediaRecorder(combinedStream, opts);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && connected) {
            sendBinary(e.data);
          }
        };

        recorder.onerror = () => {
          setError('MediaRecorder error — browser may not support this codec');
        };

        recorder.start(1000);
        recorderRef.current = recorder;

        setStreamDuration(0);
        timerRef.current = setInterval(() => setStreamDuration((p) => p + 1), 1000);
        setIsStreaming(true);
      } catch (err) {
        axios.post(`${API_BASE}/api/stream/stop`).catch(() => {});
        setError(err instanceof Error ? err.message : 'Failed to start stream');
      }
    },
    [streamTargets, connected, sendBinary]
  );

  const stopStream = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    send({ type: 'stream:stop' });

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStreamDuration(0);
    setIsStreaming(false);

    try {
      await axios.post(`${API_BASE}/api/stream/stop`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? `Stopped locally, but server stop failed: ${err.message}` : 'Stopped locally, but server stop failed');
    }
  }, []);

  return {
    isStreaming,
    streamDuration,
    streamTargets,
    error,
    setTargets,
    startStream,
    stopStream,
  };
};

export default useRTMPStream;
