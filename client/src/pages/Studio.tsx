import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Track } from 'livekit-client';
import { API_BASE, COLORS, FONTS } from '../utils/constants';
import type { MultiCameraLayout, StreamTarget } from '../types';
import useStudioRoom from '../hooks/useStudioRoom';
import useMultiCamera from '../hooks/useMultiCamera';
import useRTMPStream from '../hooks/useRTMPStream';
import useRecording from '../hooks/useRecording';
import StudioCanvasMixer from '../components/StudioCanvasMixer';
import LogoWatermark from '../components/LogoWatermark';
import LiveSetup from '../components/LiveSetup';
import { findStudio, StudioPreset, workspaceHeaders } from '../lib/workspace';
import StudioDesk, { type DeskSource, type SavedDestinations } from '../components/StudioDesk';
import usePresentationMedia from '../hooks/usePresentationMedia';
import { DEFAULT_PROGRAM_STYLE, type BroadcastQuality, type ProgramStyle } from '../lib/studioMedia';
import type { BackgroundStatus } from '../lib/studioCamera';

type Phase = 'setup' | 'studio';

type SourceEntry = DeskSource;

const LAYOUTS: { value: MultiCameraLayout; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'side-by-side', label: 'Split' },
  { value: 'pip', label: 'Picture-in-Picture' },
];

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const Studio: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Role detection (guests arrive from the /join link) ─────────────
  const initialGuestName = typeof window !== 'undefined' ? sessionStorage.getItem('guestName') : null;
  const isGuest = new URLSearchParams(window.location.search).get('guest') === '1' || (typeof window !== 'undefined' ? sessionStorage.getItem('guestRole') : null) === 'guest';

  // ── Core state ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('setup');
  const [name, setName] = useState(initialGuestName ?? 'Host');
  const [showName] = useState(() => new URLSearchParams(window.location.search).get('title')?.slice(0, 80) || 'Connecting Dot Live');
  const [studio, setStudio] = useState<StudioPreset>(() => findStudio(new URLSearchParams(window.location.search).get('studio')).id);
  const [layout, setLayout] = useState<MultiCameraLayout>(() => findStudio(new URLSearchParams(window.location.search).get('studio')).layout);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [programStyle, setProgramStyle] = useState<ProgramStyle>(() => ({ ...DEFAULT_PROGRAM_STYLE, grade: { ...DEFAULT_PROGRAM_STYLE.grade }, lowerThird: { ...DEFAULT_PROGRAM_STYLE.lowerThird }, ticker: { ...DEFAULT_PROGRAM_STYLE.ticker } }));
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundStatus>('loading');
  const [quality, setQuality] = useState<BroadcastQuality>('1080p');
  const [savedDestinations, setSavedDestinations] = useState<SavedDestinations | null>(null);

  // Host local media (feeds the program canvas + audio mix)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const activeLocalStream = useRef<MediaStream | null>(null);
  activeLocalStream.current = localStream;
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);

  const [youtube, setYoutube] = useState({ key: '', enabled: true });
  const [facebook, setFacebook] = useState({ key: '', enabled: false });

  useEffect(() => {
    try {
      localStorage.removeItem('cd_stream_yt_key');
      localStorage.removeItem('cd_stream_fb_key');
    } catch {}
  }, []);

  const handleYoutubeKey = (key: string) => {
    setYoutube((p) => ({ ...p, key, enabled: key.trim().length > 0 || p.enabled }));
  };

  const handleFacebookKey = (key: string) => {
    setFacebook((p) => ({ ...p, key, enabled: key.trim().length > 0 || p.enabled }));
  };

  // ── Hooks ──────────────────────────────────────────────────────────
  const {
    room,
    connect,
    disconnect,
    remoteParticipants,
    isConnecting,
    toggleMute: toggleRoomMute,
    toggleCamera: toggleRoomCamera,
  } = useStudioRoom();
  const multiCam = useMultiCamera();
  const broadcast = useRTMPStream();
  const { isStreaming, streamDuration, setTargets, startStream, stopStream, error: streamError } = broadcast;
  const presentation = usePresentationMedia(room, setToast);
  const { isRecording, startRecording, stopRecording } = useRecording(canvasRef);

  useEffect(() => {
    if (isGuest) return;
    const controller = new AbortController();
    void fetch(`${API_BASE}/api/stream/destinations`, { headers: workspaceHeaders(), signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Saved publishing destinations are unavailable. Check the API connection.');
      setSavedDestinations(await response.json());
    }).catch((error) => { if (!controller.signal.aborted) setToast(error.message); });
    return () => controller.abort();
  }, [isGuest]);

  // ── Setup local camera/mic preview ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'setup') return;
    setMediaLoading(true);
    let disposed = false;
    let audioCtx: AudioContext | null = null;
    const mediaTimeout = setTimeout(() => {
      if (!disposed) setMediaLoading(false);
    }, 3000);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 }, ...(selectedVideo ? { deviceId: { exact: selectedVideo } } : {}) },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(selectedAudio ? { deviceId: { exact: selectedAudio } } : {}) },
        });
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream((prev) => {
          prev?.getTracks().forEach((t) => t.stop());
          return stream;
        });

        audioCtx = new AudioContext();
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (disposed) return;
          analyser.getByteFrequencyData(data);
          setAudioLevel(data.reduce((a, b) => a + b, 0) / data.length);
          requestAnimationFrame(tick);
        };
        tick();

        const all = await navigator.mediaDevices.enumerateDevices();
        if (!disposed) setDevices(all);
      } catch {
        if (!disposed) setToast('Unable to access camera/microphone. Check browser permissions.');
      } finally {
        clearTimeout(mediaTimeout);
        if (!disposed) setMediaLoading(false);
      }
    })();

    return () => {
      disposed = true;
      clearTimeout(mediaTimeout);
      audioCtx?.close().catch(() => {});
    };
  }, [phase, selectedVideo, selectedAudio]);

  useEffect(() => {
    if (previewRef.current && localStream) {
      previewRef.current.srcObject = localStream;
      previewRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // ── Audio mixer (host mic + all remote guests) ─────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioSrcMapRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const voiceInputRef = useRef<BiquadFilterNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const referenceAudioRef = useRef<{ video: HTMLVideoElement; source: MediaElementAudioSourceNode; gain: GainNode } | null>(null);

  const ensureAudioMix = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext({ sampleRate: 48000 });
      audioCtxRef.current = ctx;
      audioDestRef.current = ctx.createMediaStreamDestination();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 80;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 20;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.18;
      const gain = ctx.createGain();
      filter.connect(compressor).connect(gain).connect(audioDestRef.current);
      voiceInputRef.current = filter;
      voiceGainRef.current = gain;
    }
    return { ctx: audioCtxRef.current, dest: audioDestRef.current! };
  }, []);

  useEffect(() => {
    if (phase !== 'studio') return;
    const { ctx, dest } = ensureAudioMix();

    const wanted = new Map<string, MediaStreamTrack>();
    localStream?.getAudioTracks().forEach((t) => wanted.set(`host-${t.id}`, t));
    remoteParticipants.forEach((p) => {
      const track = p.getTrackPublication(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack;
      if (track) wanted.set(`guest-${p.identity}`, track);
      const screenAudio = p.getTrackPublication(Track.Source.ScreenShareAudio)?.audioTrack?.mediaStreamTrack;
      if (screenAudio && featuredId === `screen-${p.identity}`) wanted.set(`screen-${p.identity}`, screenAudio);
    });
    if (featuredId === 'screen') presentation.screen?.getAudioTracks().forEach((track) => wanted.set(`screen-${track.id}`, track));

    wanted.forEach((track, key) => {
      const previous = audioSrcMapRef.current.get(key);
      if (previous && previous.mediaStream.getAudioTracks()[0]?.id !== track.id) { previous.disconnect(); audioSrcMapRef.current.delete(key); }
      if (!audioSrcMapRef.current.has(key)) {
        try {
          const node = ctx.createMediaStreamSource(new MediaStream([track]));
          node.connect(key.startsWith('screen-') ? dest : voiceInputRef.current || dest);
          audioSrcMapRef.current.set(key, node);
        } catch {
          /* track already connected elsewhere */
        }
      }
    });
    audioSrcMapRef.current.forEach((node, key) => {
      if (!wanted.has(key)) {
        try {
          node.disconnect();
        } catch {
          /* noop */
        }
        audioSrcMapRef.current.delete(key);
      }
    });
  }, [phase, localStream, remoteParticipants, ensureAudioMix, presentation.screen, featuredId]);

  useEffect(() => {
    if (phase !== 'studio') return;
    const { ctx, dest } = ensureAudioMix();
    const video = presentation.clip?.video;
    if (referenceAudioRef.current?.video !== video) {
      referenceAudioRef.current?.source.disconnect();
      referenceAudioRef.current?.gain.disconnect();
      referenceAudioRef.current = null;
      if (video) {
        const source = ctx.createMediaElementSource(video);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(dest);
        gain.connect(ctx.destination);
        referenceAudioRef.current = { video, source, gain };
      }
    }
    const onAir = featuredId === 'reference';
    referenceAudioRef.current?.gain.gain.setTargetAtTime(onAir ? presentation.volume : 0, ctx.currentTime, 0.06);
    voiceGainRef.current?.gain.setTargetAtTime(onAir && presentation.playing ? 0.55 : 1, ctx.currentTime, 0.12);
  }, [phase, presentation.clip, presentation.volume, presentation.playing, featuredId, ensureAudioMix]);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      activeLocalStream.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep the streaming targets in sync with the destination panel ──
  useEffect(() => {
    const targets: StreamTarget[] = [
      {
        platform: 'youtube',
        rtmpKey: youtube.key.trim(),
        enabled: youtube.enabled && (youtube.key.trim().length > 0 || Boolean(savedDestinations?.youtube)),
        isConnected: false,
      },
      {
        platform: 'facebook',
        rtmpKey: facebook.key.trim(),
        enabled: facebook.enabled && (facebook.key.trim().length > 0 || Boolean(savedDestinations?.facebook)),
        isConnected: false,
      },
    ];
    setTargets(targets);
  }, [youtube, facebook, savedDestinations, setTargets]);

  // ── Build the unified list of program sources ──────────────────────
  const remoteSources = useMemo<SourceEntry[]>(() => {
    return remoteParticipants.flatMap((p) => {
      const publication = p.getTrackPublication(Track.Source.Camera);
      const cam = publication?.isMuted ? undefined : publication?.videoTrack?.mediaStreamTrack;
      const mic = p.getTrackPublication(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack;
      const stream = new MediaStream();
      if (cam) stream.addTrack(cam);
      if (mic) stream.addTrack(mic);
      const participantSources: SourceEntry[] = [{
        id: p.identity,
        label: p.name || p.identity,
        stream: stream.getTracks().length ? stream : null,
        isLocal: false,
        kind: 'guest' as const,
      }];
      const screen = p.getTrackPublication(Track.Source.ScreenShare)?.videoTrack?.mediaStreamTrack;
      if (screen) participantSources.push({ id: `screen-${p.identity}`, label: `${p.name || p.identity} presentation`, stream: new MediaStream([screen]), isLocal: false, kind: 'screen' });
      return participantSources;
    });
  }, [remoteParticipants]);

  const sources = useMemo<SourceEntry[]>(() => {
    const list: SourceEntry[] = [];
    if (localStream) {
      list.push({
        id: 'host',
        label: name || 'Host',
        stream: localStream,
        isLocal: true,
        kind: 'host',
      });
    }
    multiCam.cameras
      .filter((c) => c.enabled)
      .forEach((c) =>
        list.push({ id: c.id, label: c.label, stream: c.stream, isLocal: false, kind: 'camera' })
      );
    list.push(...remoteSources);
    if (presentation.screen) list.push({ id: 'screen', label: 'Screen share', stream: presentation.screen, isLocal: true, kind: 'screen' });
    if (presentation.clip) list.push({ id: 'reference', label: presentation.clip.name, stream: null, media: presentation.clip.video, isLocal: true, kind: 'clip' });

    // Featured source goes first (used by spotlight / PiP layouts).
    if (featuredId) {
      const idx = list.findIndex((s) => s.id === featuredId);
      if (idx > 0) {
        const [featured] = list.splice(idx, 1);
        list.unshift(featured);
      }
    }
    return list;
  }, [localStream, name, multiCam.cameras, remoteSources, featuredId, presentation.screen, presentation.clip]);

  const mixerSpeakers = sources;
  useEffect(() => {
    if (featuredId && !sources.some((source) => source.id === featuredId)) setFeaturedId(null);
  }, [featuredId, sources]);

  // ── Actions ────────────────────────────────────────────────────────
  const toggleMute = () => {
    const muted = !isMuted;
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    setIsMuted(muted);
    toggleRoomMute();
  };

  const toggleCamera = () => {
    const off = !isCameraOff;
    localStream?.getVideoTracks().forEach((track) => { track.enabled = !off; });
    setIsCameraOff(off);
    toggleRoomCamera();
  };

  const enterStudio = useCallback(async () => {
    if (!roomId) {
      setToast('Missing studio room. Return home and start a live event.');
      return;
    }
    if (!name.trim()) {
      setToast('Enter your name to continue.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          participantName: name.trim(),
          role: isGuest ? 'guest' : 'host',
        }),
      });
      if (!res.ok) {
        if (!isGuest) {
          setPhase('studio');
          setToast('Solo studio ready. Guest connections require LiveKit configuration.');
          return;
        }
        throw new Error('Guest connections are unavailable. Ask the host to check LiveKit configuration.');
      }
      const data = (await res.json()) as { token: string; livekitUrl?: string };
      await connect(roomId, name.trim(), data.token, data.livekitUrl, localStream);
      sessionStorage.removeItem('guestName');
      sessionStorage.removeItem('guestRole');
      setPhase('studio');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to enter the studio.');
    }
  }, [roomId, name, isGuest, connect, localStream]);

  const goLive = useCallback(async () => {
    if (!(youtube.enabled && (youtube.key || savedDestinations?.youtube)) && !(facebook.enabled && (facebook.key || savedDestinations?.facebook))) {
      setToast('Pair this browser with the saved publishing destinations first.');
      return;
    }
    const { ctx, dest } = ensureAudioMix();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const started = await startStream(canvasRef, dest.stream, quality);
    if (!started) return;
    if (recordEnabled) startRecording(roomId, showName);
  }, [youtube, facebook, savedDestinations, quality, ensureAudioMix, startStream, recordEnabled, startRecording, roomId, showName]);

  const shareScreen = async () => {
    if (await presentation.startScreen()) { setFeaturedId('screen'); setLayout('pip'); }
  };
  const loadClip = async (file: File) => {
    if (await presentation.loadClip(file)) { setFeaturedId('reference'); setLayout('pip'); }
  };
  const playClip = async () => {
    const { ctx } = ensureAudioMix();
    await ctx.resume().catch(() => {});
    if (!presentation.playing) { setFeaturedId('reference'); setLayout('pip'); }
    await presentation.toggleClip();
  };

  useEffect(() => {
    if (!isStreaming && isRecording) void stopRecording();
  }, [isStreaming, isRecording, stopRecording]);

  const endStream = useCallback(async () => {
    await stopStream();
    if (isRecording) await stopRecording();
  }, [stopStream, isRecording, stopRecording]);

  const leaveStudio = useCallback(async () => {
    if (isStreaming && !window.confirm('End the broadcast and leave this studio?')) return;
    if (isStreaming) await stopStream();
    if (isRecording) await stopRecording();
    activeLocalStream.current?.getTracks().forEach((track) => track.stop());
    disconnect();
    window.location.href = '/';
  }, [disconnect, isStreaming, isRecording, stopStream, stopRecording]);

  const copyInvite = useCallback(async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/studio/${roomId}?guest=1&studio=${studio}&title=${encodeURIComponent(showName)}`);
      setToast('Guest invite link copied.');
    } catch {
      setToast('Could not copy link.');
    }
  }, [roomId, studio, showName]);

  useEffect(() => {
    if (streamError) setToast(streamError);
  }, [streamError]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const readyToGoLive =
    Boolean(
      (youtube.enabled && (youtube.key.trim().length > 0 || Boolean(savedDestinations?.youtube))) ||
      (facebook.enabled && (facebook.key.trim().length > 0 || Boolean(savedDestinations?.facebook)))
    );

  // ── Render: Setup phase ────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <LiveSetup
        isGuest={isGuest}
        title={showName}
        studio={studio}
        onStudio={(value) => { setStudio(value); setLayout(findStudio(value).layout); }}
        name={name}
        onName={setName}
        previewRef={previewRef}
        localStream={localStream}
        mediaLoading={mediaLoading}
        devices={devices}
        selectedVideo={selectedVideo}
        selectedAudio={selectedAudio}
        onSelectVideo={setSelectedVideo}
        onSelectAudio={setSelectedAudio}
        isConnecting={isConnecting}
        onEnter={() => void enterStudio()}
        error={toast}
      />
    );
  }

  // ── Render: Studio phase ───────────────────────────────────────────
  return (
    <>
      <StudioCanvasMixer
        canvasRef={canvasRef}
        speakers={mixerSpeakers}
        overlays={[]}
        showName={showName}
        episodeNumber={1}
        isLive={isStreaming && broadcast.health?.status === 'live'}
        layout={layout}
        accentColor={findStudio(studio).accent}
        backgroundUrl={findStudio(studio).image}
        lowerThird={null}
        programStyle={programStyle}
        onBackgroundStatus={setBackgroundStatus}
      />
      <StudioDesk
        canvasRef={canvasRef} showName={showName} isGuest={isGuest}
        studio={studio} onStudio={setStudio} layout={layout} onLayout={setLayout}
        style={programStyle} onStyle={setProgramStyle} backgroundStatus={backgroundStatus}
        sources={sources} featuredId={featuredId} onFeature={setFeaturedId}
        devices={multiCam.availableDevices.filter((device) => !multiCam.cameras.some((camera) => camera.deviceId === device.deviceId))}
        onAddCamera={(device) => void multiCam.addCamera(device)} onRemoveCamera={multiCam.removeCamera}
        onInvite={() => void copyInvite()} isMuted={isMuted} isCameraOff={isCameraOff} onMute={toggleMute} onCamera={toggleCamera}
        presentation={presentation} onShare={() => void shareScreen()} onLoadClip={(file) => void loadClip(file)} onPlayClip={() => void playClip()}
        broadcast={broadcast} quality={quality} onQuality={setQuality} ready={readyToGoLive}
        onStart={() => void goLive()} onStop={() => void endStream()} onLeave={() => void leaveStudio()}
        saved={savedDestinations} destinations={{ youtube: youtube.enabled, facebook: facebook.enabled }}
        destinationKeys={{ youtube: youtube.key, facebook: facebook.key }}
        onDestination={(platform, enabled) => platform === 'youtube' ? setYoutube((previous) => ({ ...previous, enabled })) : setFacebook((previous) => ({ ...previous, enabled }))}
        onDestinationKey={(platform, key) => platform === 'youtube' ? setYoutube((previous) => ({ ...previous, key, enabled: key.trim().length > 0 || previous.enabled })) : setFacebook((previous) => ({ ...previous, key, enabled: key.trim().length > 0 || previous.enabled }))}
        record={recordEnabled} onRecord={setRecordEnabled} isRecording={isRecording}
        notice={toast} onDismiss={() => setToast(null)}
        onCopyPairing={() => {
          if (!savedDestinations) return;
          void navigator.clipboard.writeText(savedDestinations.publisherId).then(() => setToast('Publisher pairing ID copied.')).catch(() => setToast('Could not copy publisher pairing ID.'));
        }}
      />
    </>
  );
};

// ── Sub-components & styles ──────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  padding: 16,
};

const cardTitle: React.CSSProperties = {
  fontFamily: FONTS.ui,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 12,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: COLORS.white,
  fontFamily: FONTS.ui,
  fontSize: 13,
  outline: 'none',
};

const liveBtn: React.CSSProperties = {
  padding: '11px 22px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(180deg, #FF4D4D 0%, #C81E1E 100%)',
  color: '#fff',
  fontFamily: FONTS.display,
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: '0.08em',
  boxShadow: '0 8px 20px rgba(255,77,77,0.35)',
};

const dangerBtn: React.CSSProperties = {
  padding: '11px 22px',
  borderRadius: 12,
  border: '1px solid rgba(255,77,77,0.4)',
  background: 'rgba(255,77,77,0.12)',
  color: '#FF4D4D',
  fontFamily: FONTS.display,
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: '0.08em',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '11px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  fontFamily: FONTS.ui,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(0,168,255,0.35)',
  background: 'rgba(0,168,255,0.08)',
  color: COLORS.primaryBlue,
  fontFamily: FONTS.ui,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};

const pillBtn = (active: boolean, danger?: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: active ? (danger ? 'rgba(255,77,77,0.15)' : 'rgba(0,168,255,0.15)') : 'rgba(255,255,255,0.04)',
  color: active ? (danger ? '#FF4D4D' : COLORS.primaryBlue) : 'rgba(255,255,255,0.7)',
  fontFamily: FONTS.ui,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
});

interface DestinationRowProps {
  name: string;
  color: string;
  icon: string;
  targetUrl?: string;
  targetLabel?: string;
  enabled: boolean;
  streamKey: string;
  placeholder: string;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
  onKey: (k: string) => void;
}

const DestinationRow: React.FC<DestinationRowProps> = ({
  name,
  color,
  icon,
  targetUrl,
  targetLabel,
  enabled,
  streamKey,
  placeholder,
  disabled,
  onToggle,
  onKey,
}) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: COLORS.white, fontFamily: FONTS.ui, fontSize: 14, fontWeight: 800 }}>{name}</span>
        {targetUrl && (
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.ui, fontSize: 11, textDecoration: 'none' }}
          >
            {targetLabel || targetUrl} ↗
          </a>
        )}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 22,
            background: enabled ? color : 'rgba(255,255,255,0.15)',
            transition: 'background 0.2s',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </label>
    </div>
    <input
      type="password"
      value={streamKey}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onKey(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: COLORS.white,
        fontFamily: FONTS.ui,
        fontSize: 12,
        outline: 'none',
      }}
    />
  </div>
);

interface SetupScreenProps {
  roomId?: string;
  isGuest: boolean;
  name: string;
  onName: (v: string) => void;
  previewRef: React.RefObject<HTMLVideoElement>;
  localStream: MediaStream | null;
  audioLevel: number;
  devices: MediaDeviceInfo[];
  selectedVideo: string;
  selectedAudio: string;
  onSelectVideo: (v: string) => void;
  onSelectAudio: (v: string) => void;
  isConnecting: boolean;
  onEnter: () => void;
  toast: string | null;
}

const SetupScreen: React.FC<SetupScreenProps> = ({
  roomId,
  isGuest,
  name,
  onName,
  previewRef,
  localStream,
  audioLevel,
  devices,
  selectedVideo,
  selectedAudio,
  onSelectVideo,
  onSelectAudio,
  isConnecting,
  onEnter,
  toast,
}) => (
  <div
    style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 960,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 32,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28,
        padding: 'clamp(24px, 4vw, 48px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
      }}
    >
      {/* Preview */}
      <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {localStream ? (
            <video ref={previewRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>📷</div>
          )}
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #00A8FF)', transition: 'width 0.1s' }} />
          </div>
        </div>
        <select value={selectedVideo} onChange={(e) => onSelectVideo(e.target.value)} style={selectStyle}>
          <option value="">Default camera</option>
          {devices.filter((d) => d.kind === 'videoinput').map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
          ))}
        </select>
        <select value={selectedAudio} onChange={(e) => onSelectAudio(e.target.value)} style={selectStyle}>
          <option value="">Default microphone</option>
          {devices.filter((d) => d.kind === 'audioinput').map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
          ))}
        </select>
      </div>

      {/* Form */}
      <div style={{ width: 'clamp(280px, 32vw, 360px)', minWidth: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <LogoWatermark size="lg" variant="light" />
          <h1 style={{ fontFamily: FONTS.display, fontSize: 30, fontWeight: 900, color: COLORS.white, margin: '18px 0 6px' }}>
            {isGuest ? 'Join the Show' : 'Studio Setup'}
          </h1>
          <p style={{ fontFamily: FONTS.ui, fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
            Studio {roomId}
          </p>
        </div>

        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()}
          placeholder="Your name"
          style={{ ...selectStyle, fontSize: 15, fontWeight: 700, padding: '16px 18px' }}
        />

        {!isGuest && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(0,168,255,0.06)', border: '1px solid rgba(0,168,255,0.15)', color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.ui, fontSize: 12, lineHeight: 1.5 }}>
            Next: add cameras, connect YouTube/Facebook, then hit <strong style={{ color: COLORS.primaryBlue }}>Go Live</strong>.
          </div>
        )}

        <button
          onClick={onEnter}
          disabled={isConnecting}
          style={{
            padding: '18px',
            borderRadius: 16,
            border: 'none',
            background: 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)',
            color: '#fff',
            fontFamily: FONTS.display,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: '0.08em',
            cursor: isConnecting ? 'wait' : 'pointer',
            boxShadow: '0 12px 26px rgba(0,168,255,0.4)',
            opacity: isConnecting ? 0.6 : 1,
          }}
        >
          {isConnecting ? 'CONNECTING…' : isGuest ? 'JOIN STUDIO' : 'ENTER STUDIO'}
        </button>

        {toast && <div style={{ color: '#FF4D4D', fontFamily: FONTS.ui, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{toast}</div>}
      </div>
    </div>
  </div>
);

const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      padding: '14px 24px',
      borderRadius: 14,
      background: 'rgba(13,27,42,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: COLORS.white,
      fontFamily: FONTS.ui,
      fontSize: 13,
      fontWeight: 700,
      boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    }}
  >
    {message}
  </div>
);

export default Studio;
