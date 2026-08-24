/**
 * Live captions via the browser's Web Speech API (free, no server cost).
 * Falls back gracefully when the API isn't available (Firefox, Safari < 14.1).
 *
 * The hook also forwards finalised lines through the provided socket so every
 * room participant — and any future "viewer" client — sees the same captions.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface Options {
  roomId: string | undefined;
  speaker: string;
  enabled: boolean;
  language?: string;
}

interface CaptionLine {
  ts: number;
  speaker: string;
  text: string;
  final?: boolean;
}

interface UseLiveCaptionsReturn {
  supported: boolean;
  listening: boolean;
  current: string;
  lines: CaptionLine[];
  start: () => void;
  stop: () => void;
}

const getRecognitionCtor = (): any =>
  (typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

const useLiveCaptions = ({
  roomId,
  speaker,
  enabled,
  language = 'en-US',
}: Options): UseLiveCaptionsReturn => {
  const Ctor = getRecognitionCtor();
  const supported = Boolean(Ctor);
  const recogRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [current, setCurrent] = useState('');
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const { send: wsSend, on: wsOn } = useSocket();

  useEffect(() => {
    if (!roomId) return;
    const off = wsOn('captions:line', (line: CaptionLine) => {
      setLines((prev) => [...prev.slice(-99), line]);
    });
    return off;
  }, [roomId, wsOn]);

  const start = useCallback(() => {
    if (!supported || recogRef.current) return;
    const recog = new Ctor();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = language;

    recog.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          const line: CaptionLine = { ts: Date.now(), speaker, text: text.trim(), final: true };
          setLines((prev) => [...prev.slice(-99), line]);
          setCurrent('');
          if (roomId) {
            wsSend({ type: 'captions:line', roomId, ...line });
          }
        } else {
          interim += text;
        }
      }
      if (interim) setCurrent(interim);
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => {
      setListening(false);
      recogRef.current = null;
    };

    recog.start();
    recogRef.current = recog;
    setListening(true);
  }, [Ctor, language, roomId, wsSend, speaker, supported]);

  const stop = useCallback(() => {
    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch {
        /* ignore */
      }
      recogRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (enabled) start();
    else stop();
    return stop;
  }, [enabled, start, stop]);

  return { supported, listening, current, lines, start, stop };
};

export default useLiveCaptions;
export type { CaptionLine };
