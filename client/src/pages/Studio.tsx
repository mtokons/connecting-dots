import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Track } from 'livekit-client';
import { API_BASE, COLORS, FONTS } from '../utils/constants';
import type { Speaker, StudioSettings, MultiCameraLayout } from '../types';
import useOverlays from '../hooks/useOverlays';
import useStudioRoom from '../hooks/useStudioRoom';
import useLiveCaptions from '../hooks/useLiveCaptions';
import useAutoDirector from '../hooks/useAutoDirector';
import useMultiCamera from '../hooks/useMultiCamera';
import { useSocket } from '../contexts/SocketContext';
import StudioBackground from '../components/StudioBackground';
import SpeakerCard from '../components/SpeakerCard';
import LowerThird from '../components/LowerThird';
import OverlayEditor from '../components/OverlayEditor';
import StreamPanel from '../components/StreamPanel';
import LogoWatermark from '../components/LogoWatermark';
import StudioCanvasMixer from '../components/StudioCanvasMixer';
import StudioControlBar from '../components/StudioControlBar';
import CaptionsOverlay from '../components/CaptionsOverlay';
import AudienceChat from '../components/AudienceChat';
import MultiCameraPublisher from '../components/MultiCameraPublisher';
import CameraSwitcher from '../components/CameraSwitcher';

type JoinRole = 'host' | 'co-host' | 'guest';

interface JoinFormState {
  name: string;
  city: string;
  role: JoinRole;
}

interface StudioSpeakerEntry {
  speaker: Speaker;
  stream: MediaStream | null;
  isLocal: boolean;
}

const Studio: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { send: wsSend, on: wsOn, joinRoom, connected: wsConnected } = useSocket();

  const [isLive, setIsLive] = useState(false);
  const [layout, setLayout] = useState<MultiCameraLayout>('grid');
  const [lowerThirdVisible, setLowerThirdVisible] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(false);
  const [sidePanel, setSidePanel] = useState<'mixer' | 'chat' | 'gear' | 'cameras'>('mixer');
  const [showGfx, setShowGfx] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number; ts: number }[]>([]);
  const [transitionMode, setTransitionMode] = useState<'cut' | 'crossfade'>('cut');

  // Multi-camera management
  const multiCamera = useMultiCamera();

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);

    const offCommand = wsOn('studio:command', (data: { command: string, value: any }) => {
      if (data.command === 'layout') setLayout(data.value);
      if (data.command === 'lowerThird') setLowerThirdVisible(data.value);
      if (data.command === 'settings') setStudioSettings((prev: any) => ({ ...prev, ...data.value }));
    });

    const offReaction = wsOn('reaction', (data: { emoji: string }) => {
      const id = `${Date.now()}-${Math.random()}`;
      const x = 10 + Math.random() * 80;
      setReactions(prev => [...prev, { id, emoji: data.emoji, x, ts: Date.now() }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
    });

    return () => { offCommand(); offReaction(); };
  }, [roomId, joinRoom, wsOn]);
  
  const [studioSettings, setStudioSettings] = useState<StudioSettings>({
    backgroundStyle: 'studio-dark',
    accentColor: COLORS.white,
    showName: 'Connecting Dot Podcast',
    episodeNumber: 1,
    logoUrl: null,
    theme: 'modern',
  });

  // Auto-fill for guests coming from invite link
  useEffect(() => {
    const guestName = sessionStorage.getItem('guestName');
    const guestRole = sessionStorage.getItem('guestRole');
    if (guestName) {
      setJoinForm(prev => ({ ...prev, name: guestName, role: (guestRole as JoinRole) || 'guest' }));
      sessionStorage.removeItem('guestName');
      sessionStorage.removeItem('guestRole');
    }
  }, []);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localSpeaker, setLocalSpeaker] = useState<Speaker | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(true);
  const [joinForm, setJoinForm] = useState<JoinFormState>({ name: '', city: '', role: 'host' });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const isGuestView = (localSpeaker?.role ?? joinForm.role) === 'guest';

  const { overlays, addOverlay, removeOverlay, updateOverlay, toggleOverlayVisibility } = useOverlays();
  const {
    connect,
    remoteParticipants,
    isConnecting,
    isConnected,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    updateParticipantMetadata,
    disconnect,
    room,
  } = useStudioRoom();

  // Live captions (Web Speech API → broadcast across the room)
  const captions = useLiveCaptions({
    roomId,
    speaker: localSpeaker?.name || joinForm.name || 'Speaker',
    enabled: captionsEnabled && isConnected,
  });

  useEffect(() => {
    let disposed = false;

    const setupLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: selectedVideo ? { deviceId: selectedVideo } : true, 
          audio: selectedAudio ? { deviceId: selectedAudio } : true 
        });
        
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        setLocalStream(stream);
        setMediaError(null);
        
        // Setup Audio Level Meter
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        const updateLevel = () => {
          if (disposed) return;
          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          requestAnimationFrame(updateLevel);
        };
        updateLevel();

        // Enumerate devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(allDevices);

        setLocalSpeaker((current) => ({
          id: 'local',
          name: current?.name || 'You',
          role: current?.role || 'host',
          city: current?.city || 'Studio',
          isMuted: audioTrack ? !audioTrack.enabled : false,
          isCameraOff: videoTrack ? !videoTrack.enabled : false,
          isSpeaking: true,
          isScreenSharing: false,
          isOnStage: current?.isOnStage ?? (joinForm.role === 'host' || joinForm.role === 'co-host'),
          videoTrack,
          audioTrack,
        }));
      } catch (error) {
        if (disposed) return;
        setMediaError('Unable to access camera and microphone. Check permissions.');
      }
    };

    void setupLocalMedia();

    return () => {
      disposed = true;
    };
  }, [selectedVideo, selectedAudio, joinForm.role]);

  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
      previewVideoRef.current.play().catch(err => console.error('Preview play error:', err));
    }
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [localStream]);

  const remoteSpeakerEntries = useMemo<StudioSpeakerEntry[]>(() => {
    return remoteParticipants.map((participant) => {
      const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
      const microphonePublication = participant.getTrackPublication(Track.Source.Microphone);
      const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
      const cameraTrack = cameraPublication?.videoTrack?.mediaStreamTrack;
      const microphoneTrack = microphonePublication?.audioTrack?.mediaStreamTrack;
      const remoteStream = new MediaStream();

      if (cameraTrack) {
        remoteStream.addTrack(cameraTrack);
      }

      if (microphoneTrack) {
        remoteStream.addTrack(microphoneTrack);
      }

      let metadata: { city?: string; role?: JoinRole; isOnStage?: boolean } = {};
      if (participant.metadata) {
        try {
          metadata = JSON.parse(participant.metadata) as { city?: string; role?: JoinRole; isOnStage?: boolean };
        } catch {
          metadata = {};
        }
      }

      return {
        speaker: {
          id: participant.identity,
          name: participant.name || participant.identity,
          role: metadata.role || 'guest',
          city: metadata.city || 'Remote guest',
          isMuted: microphonePublication?.isMuted ?? false,
          isCameraOff: !cameraTrack,
          isSpeaking: participant.isSpeaking,
          isScreenSharing: Boolean(screenSharePublication),
          isOnStage: metadata.isOnStage ?? false,
          videoTrack: cameraTrack,
          audioTrack: microphoneTrack,
        },
        stream: remoteStream.getTracks().length > 0 ? remoteStream : null,
        isLocal: false,
      };
    });
  }, [remoteParticipants]);

  const allSpeakers = useMemo<StudioSpeakerEntry[]>(() => {
    const entries: StudioSpeakerEntry[] = [];

    if (localSpeaker) {
      // Local speaker state needs to be synced with hook state
      const localWithStatus = {
        ...localSpeaker,
        isMuted,
        isCameraOff,
        isScreenSharing,
        isOnStage: localSpeaker.isOnStage ?? (localSpeaker.role === 'host' || localSpeaker.role === 'co-host'),
      };
      entries.push({ speaker: localWithStatus, stream: localStream, isLocal: true });
    }

    return entries.concat(remoteSpeakerEntries);
  }, [localSpeaker, localStream, remoteSpeakerEntries, isMuted, isCameraOff, isScreenSharing]);

  const activeSpeakers = useMemo(() => allSpeakers.filter(s => s.speaker.isOnStage), [allSpeakers]);
  const backstageSpeakers = useMemo(() => allSpeakers.filter(s => !s.speaker.isOnStage), [allSpeakers]);

  // Auto-director: switch layout based on who is speaking
  useAutoDirector({
    enabled: autoDirectorEnabled,
    speakers: activeSpeakers.map(({ speaker }) => ({
      id: speaker.id,
      isSpeaking: speaker.isSpeaking,
      isOnStage: speaker.isOnStage,
    })),
    currentLayout: layout,
    setLayout,
  });

  const speakerCount = activeSpeakers.length;
  const gridColumns = speakerCount <= 1 ? '1fr' : '1fr 1fr';
  const lowerThirdSpeaker =
    activeSpeakers.find((entry) => entry.speaker.isSpeaking)?.speaker ?? activeSpeakers[0]?.speaker ?? null;

  const mixerSpeakers = useMemo(() => {
    return activeSpeakers.map(({ speaker, stream, isLocal }) => ({
      id: speaker.id,
      label: `${speaker.name}${speaker.city ? ` • ${speaker.city}` : ''}`,
      stream,
      isLocal,
    }));
  }, [activeSpeakers]);

  const handleToggleStage = async (speaker: Speaker) => {
    const isHost = localSpeaker?.role === 'host' || localSpeaker?.role === 'co-host';
    if (!isHost && speaker.id !== 'local') return;

    const newMetadata = {
      role: speaker.role,
      city: speaker.city,
      isOnStage: !speaker.isOnStage
    };

    if (speaker.id === 'local') {
      setLocalSpeaker(prev => prev ? { ...prev, isOnStage: !prev.isOnStage } : null);
      // If we had a room method for local metadata, we'd call it here
    } else {
      await updateParticipantMetadata(speaker.id, JSON.stringify(newMetadata));
    }
  };

  const sendReaction = (emoji: string) => {
    if (wsConnected && roomId) {
      wsSend({ type: 'reaction', roomId, emoji });
    }
    // Also show locally
    const id = `${Date.now()}-${Math.random()}`;
    const x = 10 + Math.random() * 80;
    setReactions(prev => [...prev, { id, emoji, x, ts: Date.now() }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
  };

  const handleJoinStudio = async () => {
    if (!roomId) {
      setJoinError('Missing room ID. Return to the lobby and create a new studio room.');
      return;
    }

    if (!joinForm.name.trim()) {
      setJoinError('Enter your display name before joining the studio.');
      return;
    }

    try {
      setJoinError(null);

      const response = await fetch(`${API_BASE}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          participantName: joinForm.name.trim(),
          city: joinForm.city.trim(),
          role: joinForm.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to create the LiveKit access token.');
      }

      const data = (await response.json()) as { token: string; livekitUrl?: string };

      setLocalSpeaker((current) =>
        current
          ? {
              ...current,
              name: joinForm.name.trim(),
              city: joinForm.city.trim(),
              role: joinForm.role,
            }
          : {
              id: 'local',
              name: joinForm.name.trim(),
              city: joinForm.city.trim(),
              role: joinForm.role,
              isMuted: false,
              isCameraOff: false,
              isSpeaking: true,
              isScreenSharing: false,
              isOnStage: joinForm.role === 'host' || joinForm.role === 'co-host',
            }
      );

      await connect(roomId, joinForm.name.trim(), data.token, data.livekitUrl);
      setIsJoinModalVisible(false);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Failed to join the studio.');
    }
  };

  const handleStreamingChange = useCallback(
    (streaming: boolean) => {
      setIsLive(streaming);
      if (!roomId) return;
      const token = localStorage.getItem('cd_token');
      fetch(`${API_BASE}/api/episodes/by-room/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: streaming ? 'live' : 'recorded' }),
      }).catch(() => {});
    },
    [roomId]
  );

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: '#050a15',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <canvas ref={canvasRef} width={1920} height={1080} style={{ display: 'none' }} />

      <StudioCanvasMixer
        canvasRef={canvasRef}
        speakers={mixerSpeakers}
        overlays={overlays}
        showName={studioSettings.showName}
        episodeNumber={studioSettings.episodeNumber}
        isLive={isLive}
        layout={layout}
        accentColor={studioSettings.accentColor}
        lowerThird={
          lowerThirdSpeaker
            ? {
                name: lowerThirdSpeaker.name,
                role: lowerThirdSpeaker.role,
                city: lowerThirdSpeaker.city,
                visible: lowerThirdVisible,
              }
            : null
        }
      />

      <StudioBackground
        showName={studioSettings.showName}
        episodeNumber={studioSettings.episodeNumber}
        isLive={isLive}
        backgroundStyle={studioSettings.backgroundStyle}
        backgroundImageUrl={studioSettings.logoUrl}
      />

      {/* Live captions overlay (Web Speech API, free) */}
      <CaptionsOverlay lines={captions.lines} current={captions.current} visible={captionsEnabled} />

      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {/* Main Content Area */}
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 'clamp(100px, 10vh, 110px) clamp(16px, 3vw, 40px) clamp(70px, 8vh, 80px)',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {mediaError ? (
            <div
              style={{
                position: 'absolute',
                top: 110,
                left: 40,
                right: 40,
                zIndex: 21,
                padding: '20px 30px',
                borderRadius: 20,
                background: 'rgba(255, 77, 77, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 77, 77, 0.3)',
                color: '#FF4D4D',
                fontFamily: FONTS.ui,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ fontSize: 24 }}>⚠️</div>
              {mediaError}
            </div>
          ) : null}

          {/* Grid Layout for Speakers */}
          <div
            style={{
              flex: 1,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: gridColumns,
              gap: 24,
              alignContent: 'center',
              justifyContent: 'center',
              zIndex: 1,
              overflowY: 'auto',
              paddingBottom: backstageSpeakers.length > 0 ? 140 : 0,
            }}
          >
            {activeSpeakers.map(({ speaker, stream, isLocal }) => (
              <SpeakerCard 
                key={speaker.id} 
                speaker={speaker} 
                isLocal={isLocal} 
                stream={stream}
                isHost={localSpeaker?.role === 'host' || localSpeaker?.role === 'co-host'}
                onToggleStage={() => handleToggleStage(speaker)}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
              />
            ))}
          </div>

          {/* Floating Reactions */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25, overflow: 'hidden' }}>
            {reactions.map(r => (
              <div
                key={r.id}
                style={{
                  position: 'absolute',
                  left: `${r.x}%`,
                  bottom: 120,
                  fontSize: 32,
                  animation: 'reactionFloat 3s ease-out forwards',
                  pointerEvents: 'none',
                }}
              >
                {r.emoji}
              </div>
            ))}
          </div>

          {/* Backstage Guest Strip */}
          {backstageSpeakers.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: showGfx ? 110 : 60,
              left: 'clamp(8px, 2vw, 40px)',
              right: 'clamp(8px, 2vw, 40px)',
              display: 'flex',
              gap: 10,
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 14,
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflowX: 'auto',
              zIndex: 15,
              transition: 'bottom 0.3s ease',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 900, letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.4)', writingMode: 'vertical-lr',
                textOrientation: 'mixed', flexShrink: 0, padding: '4px 0',
                display: 'flex', alignItems: 'center',
              }}>BACKSTAGE</div>
              {backstageSpeakers.map(({ speaker, stream, isLocal }) => (
                <div key={speaker.id} style={{ width: 'clamp(120px, 13vw, 180px)', flexShrink: 0 }}>
                  <SpeakerCard 
                    speaker={speaker} 
                    isLocal={isLocal} 
                    stream={stream}
                    isHost={localSpeaker?.role === 'host' || localSpeaker?.role === 'co-host'}
                    onToggleStage={() => handleToggleStage(speaker)}
                    onToggleMute={toggleMute}
                    onToggleCamera={toggleCamera}
                  />
                </div>
              ))}
            </div>
          )}

          {lowerThirdSpeaker && (
            <LowerThird
              speakerName={lowerThirdSpeaker.name}
              role={lowerThirdSpeaker.role}
              city={lowerThirdSpeaker.city}
              visible={lowerThirdVisible}
            />
          )}

          {/* Bottom Control Area */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* GFX Editor (collapsible) */}
            {!isGuestView && showGfx && (
              <OverlayEditor
                onAddOverlay={addOverlay}
                onToggleLowerThird={() => setLowerThirdVisible((value) => !value)}
                isLowerThirdVisible={lowerThirdVisible}
                overlays={overlays}
                onRemoveOverlay={removeOverlay}
                onUpdateOverlay={updateOverlay}
                onToggleOverlayVisibility={toggleOverlayVisibility}
              />
            )}

            {/* Control Bar + Reactions */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0,
              background: 'linear-gradient(90deg, rgba(5,10,21,0.95) 0%, rgba(13,27,42,0.95) 100%)',
              backdropFilter: 'blur(30px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* GFX Toggle */}
              {!isGuestView && (
                <button
                  onClick={() => setShowGfx(!showGfx)}
                  style={{
                    padding: '14px 18px',
                    background: showGfx ? 'rgba(0,168,255,0.15)' : 'transparent',
                    border: 'none', borderRight: '1px solid rgba(255,255,255,0.06)',
                    color: showGfx ? COLORS.primaryBlue : 'rgba(255,255,255,0.5)',
                    fontFamily: FONTS.ui, fontSize: 9, fontWeight: 900,
                    letterSpacing: '0.15em', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  GFX
                </button>
              )}

              {/* Main Controls */}
              <div style={{ flex: 1 }}>
                <StudioControlBar 
                  isMuted={isMuted}
                  isCameraOff={isCameraOff}
                  isScreenSharing={isScreenSharing}
                  onToggleMute={toggleMute}
                  onToggleCamera={toggleCamera}
                  onToggleScreenShare={() => isScreenSharing ? stopScreenShare() : startScreenShare()}
                  onLeave={() => {
                    disconnect();
                    window.location.href = '/';
                  }}
                />
              </div>

              {/* Reaction Bar */}
              {!isGuestView && (
                <div style={{
                  display: 'flex', gap: 4, padding: '0 14px',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {['👏', '🔥', '❤️', '😂', '🎉', '👍'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      style={{
                        background: 'none', border: 'none', fontSize: 20,
                        cursor: 'pointer', padding: '8px 4px',
                        transition: 'transform 0.15s',
                      }}
                      onMouseDown={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.4)'; }}
                      onMouseUp={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Mixer Console / Audience Chat / Studio Gear */}
        <div
          style={{
            width: 'clamp(280px, 25vw, 360px)',
            height: '100%',
            zIndex: 30,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(5,10,21,0.6)',
          }}
        >
          {!isGuestView && (
            <div style={{ display: 'flex', gap: 4, padding: '12px 10px 0' }}>
              {([
                ['mixer', 'MIXER'],
                ['chat', 'CHAT'],
                ['cameras', 'CAMERAS'],
                ['gear', 'GEAR'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSidePanel(k)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 10,
                    border: 'none',
                    background: sidePanel === k ? COLORS.primaryBlue : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!isGuestView && sidePanel === 'mixer' && (
              <StreamPanel
                canvasRef={canvasRef}
                layout={layout}
                onLayoutChange={setLayout}
                roomId={roomId}
                displayName={joinForm.name.trim() || localSpeaker?.name || 'Host'}
                onAddOverlay={addOverlay}
                settings={studioSettings}
                onSettingsChange={(newSettings) => setStudioSettings((prev) => ({ ...prev, ...newSettings }))}
                onStreamingChange={handleStreamingChange}
              />
            )}

            {(isGuestView || sidePanel === 'chat') && (
              <AudienceChat
                roomId={roomId}
                author={joinForm.name.trim() || localSpeaker?.name || 'Host'}
                isHost={localSpeaker?.role === 'host' || localSpeaker?.role === 'co-host'}
                channel="audience"
              />
            )}

            {/* CAMERAS Tab */}
            {!isGuestView && sidePanel === 'cameras' && (
              <div style={{ display: 'grid', gap: 16, overflowY: 'auto' }}>
                <CameraSwitcher
                  currentLayout={layout}
                  onLayoutChange={setLayout}
                  cameras={multiCamera.cameras}
                  transitionMode={transitionMode}
                  onTransitionModeChange={setTransitionMode}
                />
                <MultiCameraPublisher
                  room={room}
                  cameras={multiCamera.cameras}
                  availableDevices={multiCamera.availableDevices}
                  onAddCamera={multiCamera.addCamera}
                  onRemoveCamera={multiCamera.removeCamera}
                  onToggleCamera={multiCamera.toggleCamera}
                  onSetProgram={multiCamera.setProgramCamera}
                  onSetLabel={multiCamera.setLabel}
                  onSetResolution={multiCamera.setResolution}
                />
              </div>
            )}

            {!isGuestView && sidePanel === 'gear' && (
              <div style={{ display: 'grid', gap: 16, overflowY: 'auto' }}>
                {/* Background Options */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 20, padding: 16, color: '#fff', fontFamily: FONTS.ui,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                    BACKGROUND
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([
                      { value: 'studio-dark', label: 'Dark Studio', preview: 'linear-gradient(135deg, #050a15, #0d1b2a)' },
                      { value: 'studio-light', label: 'Light Studio', preview: 'linear-gradient(135deg, #1a2a3a, #2a3a4a)' },
                      { value: 'blur', label: 'Blur', preview: 'linear-gradient(135deg, #1e3a5f, #0a1628)' },
                      { value: 'custom', label: 'Custom', preview: 'linear-gradient(135deg, #2d1b69, #0d1b2a)' },
                    ] as const).map(bg => (
                      <button
                        key={bg.value}
                        onClick={() => setStudioSettings(prev => ({ ...prev, backgroundStyle: bg.value }))}
                        style={{
                          padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                          background: bg.preview,
                          border: studioSettings.backgroundStyle === bg.value
                            ? '2px solid ' + COLORS.primaryBlue
                            : '1px solid rgba(255,255,255,0.08)',
                          color: '#fff', fontSize: 10, fontWeight: 800,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          boxShadow: studioSettings.backgroundStyle === bg.value
                            ? '0 0 15px rgba(0,168,255,0.3)' : 'none',
                        }}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom background image */}
                  {studioSettings.backgroundStyle === 'custom' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{
                        height: 80, borderRadius: 12, cursor: 'pointer',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                      }}
                        onClick={() => {
                          const url = prompt('Enter background image URL:');
                          if (url) setStudioSettings(prev => ({ ...prev, logoUrl: url }));
                        }}
                      >
                        📁 Upload / URL
                      </div>
                    </div>
                  )}

                  {/* Preset images */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
                    {[
                      { url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400', label: 'Studio' },
                      { url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', label: 'Podcast' },
                      { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400', label: 'Tech' },
                      { url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400', label: 'Gradient' },
                    ].map(img => (
                      <div
                        key={img.label}
                        onClick={() => setStudioSettings(prev => ({ ...prev, backgroundStyle: 'custom', logoUrl: img.url }))}
                        style={{
                          width: 56, height: 40, borderRadius: 8, flexShrink: 0,
                          backgroundImage: `url(${img.url})`, backgroundSize: 'cover',
                          cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        title={img.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Production Assist */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 20,
                    padding: 16,
                    color: '#fff',
                    fontFamily: FONTS.ui,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                    PRODUCTION ASSIST
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                    Live captions {captions.supported ? '' : '(unsupported)'}
                    <input
                      type="checkbox"
                      disabled={!captions.supported}
                      checked={captionsEnabled}
                      onChange={(e) => setCaptionsEnabled(e.target.checked)}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    Auto‑director (voice activity)
                    <input
                      type="checkbox"
                      checked={autoDirectorEnabled}
                      onChange={(e) => setAutoDirectorEnabled(e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Studio Entrance Modal - High-End Overlay */}
        {isJoinModalVisible && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(5,10,21,0.9)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            {/* Animated Background Mesh for Modal */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(0,168,255,0.1) 0%, transparent 70%)',
                opacity: 0.6,
                zIndex: -1,
              }}
            />

            <div
              style={{
                width: '100%',
                maxWidth: 1000,
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'clamp(24px, 3vw, 40px)',
                padding: 'clamp(24px, 4vw, 60px)',
                boxShadow: '0 50px 100px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                display: 'flex',
                gap: 'clamp(24px, 4vw, 60px)',
                flexWrap: 'wrap',
              }}
            >
              {/* Left Side: Preview */}
              <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ 
                  aspectRatio: '16/9', 
                  background: '#000', 
                  borderRadius: 24, 
                  overflow: 'hidden', 
                  position: 'relative',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                  {localStream && !isCameraOff ? (
                    <video 
                      ref={previewVideoRef}
                      autoPlay 
                      muted 
                      playsInline 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(0,168,255,0.1) 0%, transparent 70%)' }}>
                      <span style={{ fontSize: 60 }}>📷</span>
                    </div>
                  )}
                  
                  {/* Audio Meter Overlay */}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 20, 
                    left: 20, 
                    right: 20, 
                    height: 6, 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: 3, 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      width: `${Math.min(100, (audioLevel / 128) * 100)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #10B981, #00A8FF)',
                      transition: 'width 0.1s ease-out'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: 16,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: COLORS.white,
                      fontFamily: FONTS.ui,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  >
                    <option value="">DEFAULT CAMERA</option>
                    {devices.filter(d => d.kind === 'videoinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                  </select>

                  <select
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: 16,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: COLORS.white,
                      fontFamily: FONTS.ui,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  >
                    <option value="">DEFAULT MICROPHONE</option>
                    {devices.filter(d => d.kind === 'audioinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Side: Form */}
              <div style={{ width: 'clamp(280px, 30vw, 400px)', minWidth: 280 }}>
                <div style={{ marginBottom: 48, textAlign: 'center' }}>
                  <div style={{ marginBottom: 24, display: 'inline-block' }}>
                    <LogoWatermark size="lg" variant="light" />
                  </div>
                  <h1
                    style={{
                      fontFamily: FONTS.display,
                      fontSize: 36,
                      fontWeight: 900,
                      color: COLORS.white,
                      letterSpacing: '-0.02em',
                      marginBottom: 8,
                    }}
                  >
                    Green Room
                  </h1>
                  <p style={{ fontFamily: FONTS.ui, fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 800 }}>
                    Studio: {roomId}
                  </p>
                </div>

                <div style={{ display: 'grid', gap: 20 }}>
                  <input
                    value={joinForm.name}
                    onChange={(e) => setJoinForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ENTER YOUR NAME"
                    style={{
                      width: '100%',
                      padding: '18px 24px',
                      borderRadius: 16,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: COLORS.white,
                      fontFamily: FONTS.ui,
                      fontSize: 15,
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />

                  <input
                    value={joinForm.city}
                    onChange={(e) => setJoinForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="LOCATION (CITY, optional)"
                    style={{
                      width: '100%',
                      padding: '18px 24px',
                      borderRadius: 16,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: COLORS.white,
                      fontFamily: FONTS.ui,
                      fontSize: 15,
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />

                  {/* Only show role picker for admin users */}
                  {joinForm.role !== 'guest' && (
                    <select
                      value={joinForm.role}
                      onChange={(e) => setJoinForm(prev => ({ ...prev, role: e.target.value as JoinRole }))}
                      style={{
                        width: '100%',
                        padding: '18px 24px',
                        borderRadius: 16,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: COLORS.white,
                        fontFamily: FONTS.ui,
                        fontSize: 15,
                        fontWeight: 700,
                        outline: 'none',
                        appearance: 'none',
                      }}
                    >
                      <option value="host">HOST ROLE</option>
                      <option value="co-host">CO-HOST ROLE</option>
                      <option value="guest">GUEST ROLE</option>
                    </select>
                  )}

                  {joinForm.role === 'guest' && (
                    <div style={{
                      padding: '14px 20px', borderRadius: 16,
                      background: 'rgba(0,168,255,0.06)', border: '1px solid rgba(0,168,255,0.15)',
                      color: 'rgba(255,255,255,0.6)', fontSize: 13,
                      fontFamily: FONTS.ui, textAlign: 'center',
                    }}>
                      Joining as <strong style={{ color: COLORS.primaryBlue }}>Guest</strong> — the host will bring you on stage
                    </div>
                  )}

                  {joinError && (
                    <div style={{ color: '#FF4D4D', fontFamily: FONTS.ui, fontSize: 13, fontWeight: 800, textAlign: 'center', background: 'rgba(255,77,77,0.1)', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,77,77,0.2)' }}>
                      {joinError}
                    </div>
                  )}

                  <button
                    onClick={() => void handleJoinStudio()}
                    disabled={isConnecting || Boolean(mediaError)}
                    style={{
                      width: '100%',
                      padding: '20px',
                      borderRadius: 18,
                      border: 'none',
                      background: 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)',
                      color: COLORS.white,
                      fontFamily: FONTS.display,
                      fontSize: 18,
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      cursor: isConnecting ? 'wait' : 'pointer',
                      boxShadow: '0 15px 30px rgba(0,168,255,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                      transition: 'all 0.3s ease',
                      marginTop: 8,
                      opacity: (isConnecting || mediaError) ? 0.6 : 1,
                    }}
                  >
                    {isConnecting ? 'JOINING...' : 'ENTER STUDIO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Studio;
