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

type Phase = 'setup' | 'studio';

interface SourceEntry {
  id: string;
  label: string;
  stream: MediaStream | null;
  isLocal: boolean;
  kind: 'host' | 'camera' | 'guest';
}

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
  const isGuest = (typeof window !== 'undefined' ? sessionStorage.getItem('guestRole') : null) === 'guest';

  // ── Core state ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('setup');
  const [name, setName] = useState(initialGuestName ?? '');
  const [showName] = useState('Connecting Dot Podcast');
  const [layout, setLayout] = useState<MultiCameraLayout>('grid');
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [recordEnabled, setRecordEnabled] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Host local media (feeds the program canvas + audio mix)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Streaming destinations
  const [youtube, setYoutube] = useState({ key: '', enabled: false });
  const [facebook, setFacebook] = useState({ key: '', enabled: false });

  // ── Hooks ──────────────────────────────────────────────────────────
  const {
    connect,
    disconnect,
    remoteParticipants,
    isConnecting,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
  } = useStudioRoom();
  const multiCam = useMultiCamera();
  const { isStreaming, streamDuration, setTargets, startStream, stopStream, error: streamError } =
    useRTMPStream();
  const { isRecording, startRecording, stopRecording } = useRecording(canvasRef);

  // ── Setup local camera/mic preview ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'setup') return;
    let disposed = false;
    let audioCtx: AudioContext | null = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
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
      }
    })();

    return () => {
      disposed = true;
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

  const ensureAudioMix = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      audioDestRef.current = ctx.createMediaStreamDestination();
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
    });

    wanted.forEach((track, key) => {
      if (!audioSrcMapRef.current.has(key)) {
        try {
          const node = ctx.createMediaStreamSource(new MediaStream([track]));
          node.connect(dest);
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
  }, [phase, localStream, remoteParticipants, ensureAudioMix]);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      localStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep the streaming targets in sync with the destination panel ──
  useEffect(() => {
    const targets: StreamTarget[] = [
      {
        platform: 'youtube',
        rtmpKey: youtube.key.trim(),
        enabled: youtube.enabled && youtube.key.trim().length > 0,
        isConnected: false,
      },
      {
        platform: 'facebook',
        rtmpKey: facebook.key.trim(),
        enabled: facebook.enabled && facebook.key.trim().length > 0,
        isConnected: false,
      },
    ];
    setTargets(targets);
  }, [youtube, facebook, setTargets]);

  // ── Build the unified list of program sources ──────────────────────
  const remoteSources = useMemo<SourceEntry[]>(() => {
    return remoteParticipants.map((p) => {
      const cam = p.getTrackPublication(Track.Source.Camera)?.videoTrack?.mediaStreamTrack;
      const mic = p.getTrackPublication(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack;
      const stream = new MediaStream();
      if (cam) stream.addTrack(cam);
      if (mic) stream.addTrack(mic);
      return {
        id: p.identity,
        label: p.name || p.identity,
        stream: stream.getTracks().length ? stream : null,
        isLocal: false,
        kind: 'guest' as const,
      };
    });
  }, [remoteParticipants]);

  const sources = useMemo<SourceEntry[]>(() => {
    const list: SourceEntry[] = [];
    if (localStream) {
      list.push({
        id: 'host',
        label: `${name || 'Host'} (You)`,
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

    // Featured source goes first (used by spotlight / PiP layouts).
    if (featuredId) {
      const idx = list.findIndex((s) => s.id === featuredId);
      if (idx > 0) {
        const [featured] = list.splice(idx, 1);
        list.unshift(featured);
      }
    }
    return list;
  }, [localStream, name, multiCam.cameras, remoteSources, featuredId]);

  const mixerSpeakers = useMemo(
    () => sources.map((s) => ({ id: s.id, label: s.label, stream: s.stream, isLocal: s.isLocal })),
    [sources]
  );

  // ── Actions ────────────────────────────────────────────────────────
  const patchEpisodeStatus = useCallback(
    (status: 'live' | 'recorded') => {
      if (!roomId) return;
      const token = localStorage.getItem('cd_token');
      fetch(`${API_BASE}/api/episodes/by-room/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    },
    [roomId]
  );

  const enterStudio = useCallback(async () => {
    if (!roomId) {
      setToast('Missing studio room. Return to the dashboard and open an episode.');
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
      if (!res.ok) throw new Error('Could not create studio access token.');
      const data = (await res.json()) as { token: string; livekitUrl?: string };
      await connect(roomId, name.trim(), data.token, data.livekitUrl);
      sessionStorage.removeItem('guestName');
      sessionStorage.removeItem('guestRole');
      setPhase('studio');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to enter the studio.');
    }
  }, [roomId, name, isGuest, connect]);

  const goLive = useCallback(async () => {
    if (!youtube.enabled && !facebook.enabled) {
      setToast('Connect YouTube or Facebook first (add a stream key).');
      return;
    }
    const { ctx, dest } = ensureAudioMix();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    await startStream(canvasRef, dest.stream);
    if (recordEnabled) startRecording(roomId, showName);
    patchEpisodeStatus('live');
  }, [youtube.enabled, facebook.enabled, ensureAudioMix, startStream, recordEnabled, startRecording, roomId, showName, patchEpisodeStatus]);

  const endStream = useCallback(async () => {
    await stopStream();
    if (isRecording) await stopRecording();
    patchEpisodeStatus('recorded');
  }, [stopStream, isRecording, stopRecording, patchEpisodeStatus]);

  const leaveStudio = useCallback(() => {
    disconnect();
    window.location.href = isGuest ? '/' : '/admin';
  }, [disconnect, isGuest]);

  const copyInvite = useCallback(async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
      setToast('Guest invite link copied.');
    } catch {
      setToast('Could not copy link.');
    }
  }, [roomId]);

  useEffect(() => {
    if (streamError) setToast(streamError);
  }, [streamError]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const readyToGoLive =
    (youtube.enabled && youtube.key.trim().length > 0) ||
    (facebook.enabled && facebook.key.trim().length > 0);

  // ── Render: Setup phase ────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <SetupScreen
        roomId={roomId}
        isGuest={isGuest}
        name={name}
        onName={setName}
        previewRef={previewRef}
        localStream={localStream}
        audioLevel={audioLevel}
        devices={devices}
        selectedVideo={selectedVideo}
        selectedAudio={selectedAudio}
        onSelectVideo={setSelectedVideo}
        onSelectAudio={setSelectedAudio}
        isConnecting={isConnecting}
        onEnter={() => void enterStudio()}
        toast={toast}
      />
    );
  }

  // ── Render: Studio phase ───────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.bg, overflow: 'hidden' }}>
      {/* Hidden 1080p compositor + visible preview share the same canvas */}
      <StudioCanvasMixer
        canvasRef={canvasRef}
        speakers={mixerSpeakers}
        overlays={[]}
        showName={showName}
        episodeNumber={1}
        isLive={isStreaming}
        layout={layout}
        accentColor={COLORS.primaryBlue}
        lowerThird={null}
      />

      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(5,10,21,0.9)',
        }}
      >
        <LogoWatermark size="sm" variant="light" />
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.white, fontFamily: FONTS.display, fontWeight: 900, fontSize: 16 }}>{showName}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.ui, fontSize: 11, letterSpacing: '0.1em' }}>
            STUDIO {roomId}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isStreaming ? COLORS.liveRed : 'rgba(255,255,255,0.25)' }} />
          <span style={{ fontFamily: FONTS.ui, fontWeight: 900, fontSize: 12, letterSpacing: '0.15em', color: isStreaming ? '#FF4D4D' : 'rgba(255,255,255,0.4)' }}>
            {isStreaming ? `LIVE • ${formatDuration(streamDuration)}` : 'OFFLINE'}
          </span>
        </div>

        {!isGuest &&
          (isStreaming ? (
            <button onClick={() => void endStream()} style={dangerBtn}>
              END STREAM
            </button>
          ) : (
            <button
              onClick={() => void goLive()}
              disabled={!readyToGoLive}
              title={readyToGoLive ? 'Start broadcasting' : 'Connect YouTube or Facebook first'}
              style={{ ...liveBtn, opacity: readyToGoLive ? 1 : 0.45, cursor: readyToGoLive ? 'pointer' : 'not-allowed' }}
            >
              ● GO LIVE
            </button>
          ))}
        <button onClick={leaveStudio} style={ghostBtn}>
          Leave
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Program monitor */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, minWidth: 0, gap: 14 }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              background: '#000',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                padding: '4px 12px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: FONTS.ui,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.15em',
              }}
            >
              PROGRAM
            </div>
          </div>

          {/* Layout + local controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
              LAYOUT
            </span>
            {LAYOUTS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLayout(l.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: layout === l.value ? 'rgba(0,168,255,0.2)' : 'rgba(255,255,255,0.04)',
                  color: layout === l.value ? COLORS.primaryBlue : 'rgba(255,255,255,0.6)',
                  fontFamily: FONTS.ui,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {l.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={toggleMute} style={pillBtn(isMuted, true)}>
              {isMuted ? '🔇 Muted' : '🎙️ Mic'}
            </button>
            <button onClick={toggleCamera} style={pillBtn(isCameraOff, true)}>
              {isCameraOff ? '📷 Cam Off' : '📹 Cam'}
            </button>
          </div>
        </main>

        {/* Right rail */}
        <aside
          style={{
            width: 'clamp(300px, 26vw, 380px)',
            flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(5,10,21,0.6)',
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Sources */}
          <section style={card}>
            <div style={cardTitle}>SOURCES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: featuredId === s.id ? 'rgba(0,168,255,0.12)' : 'rgba(255,255,255,0.03)',
                    border: featuredId === s.id ? `1px solid ${COLORS.primaryBlue}` : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{s.kind === 'guest' ? '🌐' : s.kind === 'camera' ? '🎥' : '⭐'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: COLORS.white, fontFamily: FONTS.ui, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.label}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.ui, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {s.kind}
                    </div>
                  </div>
                  <button
                    onClick={() => setFeaturedId(featuredId === s.id ? null : s.id)}
                    title="Feature this source (spotlight / PiP)"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: featuredId === s.id ? COLORS.primaryBlue : 'rgba(255,255,255,0.08)',
                      color: featuredId === s.id ? '#001529' : 'rgba(255,255,255,0.7)',
                      fontFamily: FONTS.ui,
                      fontSize: 10,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    {featuredId === s.id ? 'FEATURED' : 'FEATURE'}
                  </button>
                  {s.kind === 'camera' && (
                    <button
                      onClick={() => multiCam.removeCamera(s.id)}
                      title="Remove camera"
                      style={{ padding: '5px 8px', borderRadius: 8, border: 'none', background: 'rgba(255,77,77,0.15)', color: '#FF4D4D', fontWeight: 900, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {sources.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.ui, fontSize: 12 }}>No sources yet.</div>
              )}
            </div>

            {/* Add a physical camera */}
            {!isGuest && (
              <div style={{ marginTop: 12 }}>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      void multiCam.addCamera(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={selectStyle}
                >
                  <option value="">+ Add a camera…</option>
                  {multiCam.availableDevices
                    .filter((d) => !multiCam.cameras.some((c) => c.deviceId === d.deviceId))
                    .map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                </select>
                <button onClick={() => void copyInvite()} style={{ ...outlineBtn, width: '100%', marginTop: 8 }}>
                  🔗 Copy guest invite link
                </button>
              </div>
            )}
          </section>

          {/* Destinations */}
          {!isGuest && (
            <section style={card}>
              <div style={cardTitle}>GO LIVE TO</div>
              <DestinationRow
                name="YouTube"
                color={COLORS.youtube}
                icon="▶️"
                enabled={youtube.enabled}
                streamKey={youtube.key}
                placeholder="YouTube stream key"
                onToggle={(v) => setYoutube((p) => ({ ...p, enabled: v }))}
                onKey={(k) => setYoutube((p) => ({ ...p, key: k, enabled: k.trim().length > 0 || p.enabled }))}
                disabled={isStreaming}
              />
              <DestinationRow
                name="Facebook"
                color={COLORS.facebook}
                icon="📘"
                enabled={facebook.enabled}
                streamKey={facebook.key}
                placeholder="Facebook stream key"
                onToggle={(v) => setFacebook((p) => ({ ...p, enabled: v }))}
                onKey={(k) => setFacebook((p) => ({ ...p, key: k, enabled: k.trim().length > 0 || p.enabled }))}
                disabled={isStreaming}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.ui, fontSize: 12 }}>
                <input type="checkbox" checked={recordEnabled} disabled={isStreaming} onChange={(e) => setRecordEnabled(e.target.checked)} />
                Also record this session
              </label>
            </section>
          )}

          {isGuest && (
            <section style={card}>
              <div style={cardTitle}>YOU'RE IN THE STUDIO</div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.ui, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                The host controls the broadcast. Keep your camera framed and your mic on — you're part of the show.
              </p>
            </section>
          )}
        </aside>
      </div>

      {toast && <Toast message={toast} />}
    </div>
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
      <span style={{ flex: 1, color: COLORS.white, fontFamily: FONTS.ui, fontSize: 14, fontWeight: 800 }}>{name}</span>
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
