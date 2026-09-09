import React, { useEffect, useState, useRef } from 'react';
import { COLORS, FONTS, API_BASE } from '../utils/constants';
import useRTMPStream from '../hooks/useRTMPStream';
import useRecording from '../hooks/useRecording';
import type { Overlay, StreamTarget, StudioSettings, MultiCameraLayout } from '../types';
import { useSocket } from '../contexts/SocketContext';
import YouTubeHub from './YouTubeHub';
import YouTubeConnectModal from './YouTubeConnectModal';

interface StreamPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  layout?: MultiCameraLayout;
  onLayoutChange?: (layout: MultiCameraLayout) => void;
  roomId?: string;
  displayName?: string;
  onAddOverlay?: (overlay: Overlay) => void;
  settings: StudioSettings;
  onSettingsChange: (settings: Partial<StudioSettings>) => void;
  onStreamingChange?: (isStreaming: boolean) => void;
}

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const platformConfig = {
  youtube: { name: 'YouTube', color: '#FF0000', icon: '▶️' },
  facebook: { name: 'Facebook', color: '#1877F2', icon: '📘' },
  instagram: { name: 'Instagram', color: '#E4405F', icon: '📸' },
  custom: { name: 'Custom RTMP', color: '#00A8FF', icon: '🛰️' },
} as const;

const StreamPanel: React.FC<StreamPanelProps> = ({ 
  canvasRef, 
  layout = 'grid', 
  onLayoutChange, 
  roomId, 
  displayName, 
  onAddOverlay,
  settings,
  onSettingsChange,
  onStreamingChange
}) => {
  const { isStreaming, streamDuration, streamTargets, setTargets, startStream, stopStream, error: streamError } =
    useRTMPStream();
  const { isRecording, duration: recDuration, recordingBlob, bytesUploaded, serverSaveEnabled, setServerSaveEnabled, startRecording, stopRecording, downloadRecording } =
    useRecording(canvasRef);

  // Notify parent when streaming state changes (skip initial mount)
  const streamingMountedRef = useRef(false);
  useEffect(() => {
    if (!streamingMountedRef.current) { streamingMountedRef.current = true; return; }
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  const [activeTab, setActiveTab] = useState<'master' | 'social' | 'brand'>('master');
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [youtubeData, setYoutubeData] = useState({
    channelName: '',
    videoId: '',
    streamKey: '',
    isConnected: false,
  });

  const [targets, setLocalTargets] = useState<StreamTarget[]>([
    { platform: 'youtube', rtmpKey: '', enabled: false, isConnected: false },
    { platform: 'facebook', rtmpKey: '', enabled: false, isConnected: false },
    { platform: 'instagram', rtmpKey: '', enabled: false, isConnected: false },
    { platform: 'custom', rtmpKey: '', rtmpUrl: '', enabled: false, isConnected: false },
  ]);

  const [chatMessages, setChatMessages] = useState<
    { id: string; ts: number; author: string; message: string; platform: string }[]
  >([]);
  const [chatDraft, setChatDraft] = useState('');
  const { send: wsSend, on: wsOn, joinRoom } = useSocket();

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);
    const offChat = wsOn('chat:message', (evt: any) => {
      if (!evt || typeof evt !== 'object') return;
      setChatMessages((prev) => [evt, ...prev].slice(0, 50));
    });
    const offHistory = wsOn('chat:history', (evt: any) => {
      if (evt?.messages) {
        setChatMessages(evt.messages.slice(-50).reverse());
      }
    });
    return () => { offChat(); offHistory(); };
  }, [roomId, joinRoom, wsOn]);

  const updateTarget = (index: number, updates: Partial<StreamTarget>) => {
    // Auto-enable the platform when a key/URL is entered
    const hasKey = ('rtmpKey' in updates && (updates.rtmpKey ?? '').trim().length > 0)
      || ('rtmpUrl' in updates && (updates.rtmpUrl ?? '').trim().length > 0);
    const merged = hasKey ? { ...updates, enabled: true } : updates;
    const updated = targets.map((t, i) => (i === index ? { ...t, ...merged } : t));
    setLocalTargets(updated);
    setTargets(updated);
  };

  const handleYouTubeConnect = (data: { channelName: string; videoId: string; streamKey: string }) => {
    setYoutubeData({ ...data, isConnected: true });
    setShowYouTubeModal(false);
    
    // Auto-update YouTube target
    const ytIndex = targets.findIndex(t => t.platform === 'youtube');
    if (ytIndex !== -1) {
      updateTarget(ytIndex, { rtmpKey: data.streamKey, enabled: true, isConnected: true });
    }
  };

  const inviteUrl = roomId ? `${window.location.origin}/join/${roomId}` : '';
  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // ignore
    }
  };

  const sendChat = () => {
    if (!roomId) return;
    const msg = chatDraft.trim();
    if (!msg) return;
    wsSend({
      type: 'chat:message',
      roomId,
      author: displayName || 'Host',
      message: msg,
      platform: 'Backstage',
    });
    setChatDraft('');
  };

  return (
    <div
      style={{
        width: '100%',
        background: 'linear-gradient(180deg, rgba(13,27,42,0.95) 0%, rgba(5,10,21,0.98) 100%)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        boxShadow: '-15px 0 50px rgba(0,0,0,0.7), inset 1px 0 0 rgba(255,255,255,0.1)',
        padding: 'clamp(16px, 2vw, 32px) clamp(12px, 1.5vw, 24px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflowY: 'auto',
        height: '100%',
        color: COLORS.white,
      }}
    >
      {/* Program Preview */}
      <div
        style={{
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Program
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isStreaming ? COLORS.liveRed : 'rgba(255,255,255,0.2)' }} />
            <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: isStreaming ? '#FF4D4D' : 'rgba(255,255,255,0.35)' }}>
              {isStreaming ? 'LIVE' : 'PREVIEW'}
            </div>
          </div>
        </div>

        <ProgramPreview canvasRef={canvasRef} />

        {/* Scene Switcher */}
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {([['grid', 'Grid'], ['spotlight', 'Spot'], ['pip', 'PiP'], ['side-by-side', 'Split'], ['quad', 'Quad']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => onLayoutChange?.(mode)}
              style={{
                padding: '8px 4px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: layout === mode ? 'rgba(0,168,255,0.18)' : 'rgba(255,255,255,0.05)',
                color: layout === mode ? COLORS.white : 'rgba(255,255,255,0.55)',
                fontFamily: FONTS.ui,
                fontSize: 8,
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Header - Broadcast Branding */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ paddingBottom: 10 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 22,
              color: COLORS.white,
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Studio Console
          </div>
        </div>

        {/* Tab System */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.3)',
          padding: 4,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
        }}>
          <button
            onClick={() => setActiveTab('master')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'master' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'master' ? COLORS.white : 'rgba(255,255,255,0.3)',
              fontFamily: FONTS.ui,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.2em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            MASTER
          </button>
          <button
            onClick={() => setActiveTab('social')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'social' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'social' ? COLORS.white : 'rgba(255,255,255,0.3)',
              fontFamily: FONTS.ui,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.2em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            SOCIAL
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === 'brand' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'brand' ? COLORS.white : 'rgba(255,255,255,0.3)',
              fontFamily: FONTS.ui,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.2em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            BRAND
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'master' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Guest invite */}
            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 18 }}>
              <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>
                Invite link (guests)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={inviteUrl}
                  readOnly
                  placeholder="Join the studio to generate"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 11,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => void copyInvite()}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(0,168,255,0.16)',
                    color: COLORS.white,
                    fontFamily: FONTS.ui,
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: 'pointer',
                    letterSpacing: '0.12em',
                  }}
                >
                  COPY
                </button>
              </div>
            </div>

            {/* Platform Distribution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ 
                fontFamily: FONTS.ui, 
                fontSize: 10, 
                fontWeight: 900, 
                color: 'rgba(255,255,255,0.3)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.2em' 
              }}>
                Destinations
              </div>
              
              {targets.map((target, index) => {
                const config = platformConfig[target.platform];
                return (
                  <div 
                    key={target.platform} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 12,
                      background: 'rgba(0,0,0,0.2)',
                      padding: 16,
                      borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.05)',
                      boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14 }}>{config.icon}</span>
                        <span style={{ fontFamily: FONTS.ui, fontSize: 13, fontWeight: 800, color: target.enabled ? config.color : 'rgba(255,255,255,0.3)' }}>
                          {config.name}
                        </span>
                      </div>
                      
                      <div
                        onClick={() => updateTarget(index, { enabled: !target.enabled })}
                        style={{
                          width: 44,
                          height: 22,
                          borderRadius: 11,
                          background: target.enabled ? COLORS.white : 'rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#FFF',
                            position: 'absolute',
                            top: 3,
                            left: target.enabled ? 25 : 3,
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          }}
                        />
                      </div>
                    </div>
                    
                    <input
                      type="password"
                      placeholder={target.platform === 'custom' ? 'RTMP URL (rtmp(s)://… including key)' : 'RTMP KEY'}
                      value={target.platform === 'custom' ? (target.rtmpUrl ?? '') : target.rtmpKey}
                      onChange={(e) =>
                        updateTarget(
                          index,
                          target.platform === 'custom'
                            ? { rtmpUrl: e.target.value }
                            : { rtmpKey: e.target.value }
                        )
                      }
                      style={{
                        fontFamily: FONTS.ui,
                        fontSize: 11,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        outline: 'none',
                        width: '100%',
                        color: COLORS.white,
                        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Local Recorder */}
            <div style={{ 
              padding: 20,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                Internal Recording
              </div>
              <button
                onClick={() => (isRecording ? stopRecording() : startRecording(roomId, settings.showName))}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  border: isRecording ? '1px solid rgba(255,77,77,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  background: isRecording ? 'rgba(255,77,77,0.1)' : 'rgba(255,255,255,0.05)',
                  color: isRecording ? '#FF4D4D' : COLORS.white,
                  fontFamily: FONTS.ui,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isRecording ? '#FF4D4D' : 'rgba(255,255,255,0.4)' }} />
                {isRecording ? formatDuration(recDuration) : 'START REC'}
              </button>
              {recordingBlob && (
                <button
                  onClick={downloadRecording}
                  style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', color: COLORS.white, fontFamily: FONTS.ui, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                >
                  SAVE MASTER
                </button>
              )}
            </div>
          </div>
        ) : activeTab === 'social' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
            <YouTubeHub 
              videoId={youtubeData.videoId} 
              onVideoIdChange={(id) => setYoutubeData(prev => ({ ...prev, videoId: id }))}
              isConnected={youtubeData.isConnected}
              onConnect={() => setShowYouTubeModal(true)}
            />

            {/* Backstage chat + pin to stream */}
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  Backstage chat
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    onClick={async () => {
                      if (chatMessages.length === 0) return;
                      try {
                        const res = await fetch(`${API_BASE}/api/ai/highlight`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ messages: chatMessages }),
                        });
                        const data = await res.json();
                        const msg = chatMessages.find(m => m.id === data.highlightId);
                        if (msg && onAddOverlay) {
                          onAddOverlay({
                            id: crypto.randomUUID?.() ?? `${Date.now()}`,
                            type: 'comment',
                            content: msg.message,
                            x: 0,
                            y: 0,
                            fontSize: 16,
                            color: COLORS.white,
                            visible: true,
                            payload: { author: msg.author, message: msg.message, platform: msg.platform },
                          });
                        }
                      } catch (err) {
                        console.error('AI Highlight failed:', err);
                      }
                    }}
                    style={{
                      background: 'rgba(0,168,255,0.1)',
                      border: '1px solid rgba(0,168,255,0.3)',
                      color: COLORS.white,
                      fontSize: 9,
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    AI SUGGEST ✨
                  </button>
                  <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: roomId ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
                    {roomId ? 'CONNECTED' : 'JOIN ROOM'}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chatMessages.length === 0 ? (
                  <div style={{ fontFamily: FONTS.ui, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: 20 }}>
                    Send a message, then click “SHOW” to put it on stream.
                  </div>
                ) : null}

                {chatMessages.map((m) => (
                  <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(0,168,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: COLORS.white }}>
                      {m.author.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontFamily: FONTS.ui, fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.85)' }}>{m.author}</div>
                        <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>{m.platform}</div>
                      </div>
                      <div style={{ fontFamily: FONTS.ui, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.4 }}>
                        {m.message}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!onAddOverlay) return;
                        onAddOverlay({
                          id: crypto.randomUUID?.() ?? `${Date.now()}`,
                          type: 'comment',
                          content: m.message,
                          x: 0,
                          y: 0,
                          fontSize: 16,
                          color: COLORS.white,
                          visible: true,
                          payload: { author: m.author, message: m.message, platform: m.platform },
                        });
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(0,168,255,0.18)',
                        color: COLORS.white,
                        fontFamily: FONTS.ui,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: '0.18em',
                        cursor: 'pointer',
                      }}
                    >
                      SHOW
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
                <input
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder="Type a backstage message…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendChat();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={!roomId}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: roomId ? 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)' : 'rgba(255,255,255,0.06)',
                    color: COLORS.white,
                    fontFamily: FONTS.ui,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    cursor: roomId ? 'pointer' : 'not-allowed',
                    opacity: roomId ? 1 : 0.6,
                  }}
                >
                  SEND
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Brand Settings */}
            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 20 }}>
              <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 20 }}>
                Studio Theme
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(['modern', 'classic', 'bubble', 'minimal'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => onSettingsChange({ theme: t })}
                    style={{
                      padding: '14px',
                      borderRadius: 16,
                      border: `1px solid ${settings.theme === t ? COLORS.white : 'rgba(255,255,255,0.08)'}`,
                      background: settings.theme === t ? 'rgba(0,168,255,0.1)' : 'rgba(255,255,255,0.05)',
                      color: settings.theme === t ? COLORS.white : COLORS.white,
                      fontFamily: FONTS.ui,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 20 }}>
              <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 20 }}>
                Brand Color
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[COLORS.white, '#FF4D4D', '#10B981', '#F59E0B', '#8B5CF6'].map(c => (
                  <div 
                    key={c}
                    onClick={() => onSettingsChange({ accentColor: c })}
                    style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 10, 
                      background: c, 
                      cursor: 'pointer',
                      border: settings.accentColor === c ? '2px solid white' : '2px solid rgba(255,255,255,0.1)',
                      boxShadow: settings.accentColor === c ? `0 0 15px ${c}` : 'none'
                    }} 
                  />
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 20 }}>
              <div style={{ fontFamily: FONTS.ui, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 20 }}>
                Studio Logo
              </div>
              {(() => {
                const savedLogo = (() => { try { return localStorage.getItem('connectingdot_logo'); } catch { return null; } })();
                return (
                  <>
                    {savedLogo && (
                      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={savedLogo} alt="Logo" style={{ height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)', padding: 4 }} />
                        <button
                          onClick={() => { localStorage.removeItem('connectingdot_logo'); onSettingsChange({ logoUrl: null }); }}
                          style={{
                            background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)',
                            borderRadius: 8, padding: '6px 12px', color: '#FF4D4D',
                            fontFamily: FONTS.ui, fontSize: 10, fontWeight: 800, cursor: 'pointer',
                          }}
                        >
                          REMOVE
                        </button>
                      </div>
                    )}
                    <label style={{
                      height: savedLogo ? 60 : 100,
                      borderRadius: 16,
                      border: '2px dashed rgba(255,255,255,0.15)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 8, cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2MB'); return; }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            try { localStorage.setItem('connectingdot_logo', dataUrl); } catch { /* quota */ }
                            onSettingsChange({ logoUrl: dataUrl });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      <span style={{ fontSize: 20 }}>📁</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>
                        {savedLogo ? 'CHANGE LOGO' : 'UPLOAD LOGO (PNG/JPG)'}
                      </span>
                    </label>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Main Broadcast Button */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {streamError && (
          <div style={{ fontFamily: FONTS.ui, fontSize: 11, color: '#FF4D4D', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 10, padding: '8px 12px', wordBreak: 'break-word' }}>
            {streamError}
          </div>
        )}
        <button
          onClick={() => {
            if (!isStreaming) {
              const hasEnabled = targets.some(t => t.enabled && (t.rtmpKey?.trim() || t.rtmpUrl?.trim()));
              if (!hasEnabled) {
                alert('Paste your stream key and enable the platform toggle before going live.');
                return;
              }
            }
            isStreaming ? stopStream() : startStream(canvasRef);
          }}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 20,
            border: 'none',
            background: isStreaming 
              ? 'linear-gradient(180deg, #FF4D4D 0%, #A00000 100%)' 
              : 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)',
            color: COLORS.white,
            fontFamily: FONTS.display,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: isStreaming
              ? '0 10px 30px rgba(255, 77, 77, 0.4), inset 0 2px 4px rgba(255,255,255,0.4)'
              : '0 10px 30px rgba(0, 168, 255, 0.4), inset 0 2px 4px rgba(255,255,255,0.4)',
          }}
        >
          {isStreaming ? 'STOP BROADCAST' : 'START BROADCAST'}
        </button>

        {isStreaming && (
          <div style={{ textAlign: 'center', fontFamily: FONTS.ui, fontSize: 16, color: '#FF4D4D', fontWeight: 900, letterSpacing: '0.2em' }}>
            {formatDuration(streamDuration)}
          </div>
        )}
      </div>

      {showYouTubeModal && (
        <YouTubeConnectModal 
          onClose={() => setShowYouTubeModal(false)}
          onConnect={handleYouTubeConnect}
          initialData={youtubeData}
        />
      )}
    </div>
  );
};

export default StreamPanel;

const ProgramPreview: React.FC<{ canvasRef: React.RefObject<HTMLCanvasElement> }> = ({ canvasRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // Use a low FPS capture for preview to keep CPU down.
    const stream = canvas.captureStream(15);
    streamRef.current = stream;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {});

    return () => {
      if (video.srcObject) video.srcObject = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [canvasRef]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.25)' }}>
        <video ref={videoRef} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
      </div>
    </div>
  );
};
