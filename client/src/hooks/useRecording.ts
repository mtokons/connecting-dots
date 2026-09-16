import { useState, useRef, useCallback } from 'react';
import { API_BASE } from '../utils/constants';

interface UseRecordingReturn {
  isRecording: boolean;
  duration: number;
  recordingBlob: Blob | null;
  sessionId: string | null;
  bytesUploaded: number;
  serverSaveEnabled: boolean;
  setServerSaveEnabled: (v: boolean) => void;
  startRecording: (roomId?: string, episodeTitle?: string) => void;
  stopRecording: () => Promise<void>;
  downloadRecording: () => void;
}

const useRecording = (canvasRef: React.RefObject<HTMLCanvasElement>, audioTracks: MediaStreamTrack[] = []): UseRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [serverSaveEnabled, setServerSaveEnabled] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Upload a chunk to the server session */
  const uploadChunk = useCallback(
    async (sid: string, chunk: Blob, index: number) => {
      try {
        const fd = new FormData();
        fd.append('chunk', chunk, `chunk-${index}.webm`);
        fd.append('chunkIndex', index.toString());

        const res = await fetch(`${API_BASE}/api/recordings/session/${sid}/chunk`, {
          method: 'POST',
          body: fd,
        });

        if (res.ok) {
          const data = await res.json();
          setBytesUploaded((prev) => prev + (data.bytesWritten ?? 0));
        }
      } catch (err) {
        console.warn('[Recording] Chunk upload failed:', err);
      }
    },
    []
  );

  const startRecording = useCallback(
    (roomId?: string, episodeTitle?: string) => {
      if (!canvasRef.current) return;

      const stream = canvasRef.current.captureStream(30);
      
      // Mix audio tracks
      if (audioTracks.length > 0) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        audioTracks.forEach(track => {
          if (track) {
            const ms = new MediaStream([track]);
            const source = audioCtx.createMediaStreamSource(ms);
            source.connect(dest);
          }
        });
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      chunksRef.current = [];
      chunkIndexRef.current = 0;
      setBytesUploaded(0);
      setRecordingBlob(null);

      // Start server session if enabled
      if (serverSaveEnabled && roomId) {
        fetch(`${API_BASE}/api/recordings/session/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, episodeTitle }),
        })
          .then((r) => r.json())
          .then((data) => {
            sessionIdRef.current = data.sessionId;
            setSessionId(data.sessionId);
          })
          .catch((err) => {
            console.warn('[Recording] Failed to start server session:', err);
            sessionIdRef.current = null;
            setSessionId(null);
          });
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);

          // Upload chunk to server
          if (serverSaveEnabled && sessionIdRef.current) {
            const idx = chunkIndexRef.current++;
            void uploadChunk(sessionIdRef.current, e.data, idx);
          }
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordingBlob(blob);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      setIsRecording(true);
    },
    [canvasRef, serverSaveEnabled, uploadChunk]
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Finalize server session
    if (serverSaveEnabled && sessionIdRef.current) {
      try {
        const res = await fetch(
          `${API_BASE}/api/recordings/session/${sessionIdRef.current}/finalize`,
          { method: 'POST' }
        );
        if (res.ok) {
          const data = await res.json();
          console.log('[Recording] Server finalized:', data.filename, `(${data.size} bytes)`);
        }
      } catch (err) {
        console.warn('[Recording] Failed to finalize server session:', err);
      }
    }

    sessionIdRef.current = null;
    setSessionId(null);
    setIsRecording(false);
  }, [serverSaveEnabled]);

  const downloadRecording = useCallback(() => {
    if (!recordingBlob) return;

    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connecting-dot-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [recordingBlob]);

  return {
    isRecording,
    duration,
    recordingBlob,
    sessionId,
    bytesUploaded,
    serverSaveEnabled,
    setServerSaveEnabled,
    startRecording,
    stopRecording,
    downloadRecording,
  };
};

export default useRecording;
