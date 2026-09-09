import React, { useState } from 'react';
import { COLORS, FONTS } from '../utils/constants';
import LogoWatermark from './LogoWatermark';

interface YouTubeConnectModalProps {
  onClose: () => void;
  onConnect: (data: { channelName: string; videoId: string; streamKey: string }) => void;
  initialData?: { channelName: string; videoId: string; streamKey: string };
}

const YouTubeConnectModal: React.FC<YouTubeConnectModalProps> = ({ onClose, onConnect, initialData }) => {
  const [channelName, setChannelName] = useState(initialData?.channelName || '');
  const [videoId, setVideoId] = useState(initialData?.videoId || '');
  const [streamKey, setStreamKey] = useState(initialData?.streamKey || '');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(5,10,21,0.9)',
      backdropFilter: 'blur(50px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 500,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 40,
        padding: 60,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 50px 100px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.1)',
        position: 'relative',
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 30,
            right: 30,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 24,
            cursor: 'pointer',
            padding: 10,
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 20, display: 'inline-block' }}>
            <LogoWatermark size="sm" variant="light" />
          </div>
          <h2 style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 900, color: '#FFF', marginBottom: 10 }}>YouTube Streaming</h2>
          <p style={{ fontFamily: FONTS.ui, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Connect your live stream</p>
        </div>

        {/* Step-by-step guide */}
        <div style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 16, padding: '16px 20px', marginBottom: 28 }}>
          <p style={{ fontFamily: FONTS.ui, fontSize: 11, fontWeight: 900, color: '#FF6B6B', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>How to get your Stream Key</p>
          <ol style={{ fontFamily: FONTS.ui, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 2, margin: 0, paddingLeft: 18 }}>
            <li>Go to <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" style={{ color: COLORS.white }}>studio.youtube.com</a></li>
            <li>Click <strong style={{ color: '#fff' }}>Create → Go Live</strong></li>
            <li>Choose <strong style={{ color: '#fff' }}>Streaming software</strong></li>
            <li>Copy the <strong style={{ color: '#fff' }}>Stream key</strong> shown</li>
            <li>Copy the <strong style={{ color: '#fff' }}>Video ID</strong> from the page URL</li>
          </ol>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: COLORS.white, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>Channel Name <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>(display only)</span></label>
            <input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Your channel name"
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF',
                fontFamily: FONTS.ui,
                fontSize: 15,
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: COLORS.white, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>
              YouTube Stream Key <span style={{ color: '#FF6B6B', fontSize: 9 }}>* required</span>
            </label>
            <input
              type="password"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder="Paste stream key from YouTube Studio"
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${streamKey ? 'rgba(0,168,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: '#FFF',
                fontFamily: FONTS.ui,
                fontSize: 15,
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: COLORS.white, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>
              Video ID <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>(for live chat embed)</span>
            </label>
            <input
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ (from YouTube URL)"
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF',
                fontFamily: FONTS.ui,
                fontSize: 15,
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            disabled={!streamKey.trim()}
            onClick={() => onConnect({ channelName, videoId, streamKey })}
            style={{
              width: '100%',
              padding: '20px',
              borderRadius: 20,
              border: 'none',
              background: streamKey.trim()
                ? `linear-gradient(180deg, ${COLORS.youtube} 0%, #CC0000 100%)`
                : 'rgba(255,255,255,0.05)',
              color: streamKey.trim() ? COLORS.white : 'rgba(255,255,255,0.3)',
              fontFamily: FONTS.display,
              fontSize: 16,
              fontWeight: 900,
              cursor: streamKey.trim() ? 'pointer' : 'default',
              boxShadow: streamKey.trim() ? `0 16px 32px rgba(255,0,0,0.3)` : 'none',
              transition: 'all 0.2s',
              marginTop: 8,
            }}
            onMouseDown={(e) => streamKey.trim() && (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {streamKey.trim() ? 'CONNECT & SAVE KEY' : 'PASTE STREAM KEY FIRST'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeConnectModal;
