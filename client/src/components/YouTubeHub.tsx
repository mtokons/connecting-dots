import React, { useState } from 'react';
import { COLORS, FONTS } from '../utils/constants';

interface YouTubeHubProps {
  videoId: string;
  onVideoIdChange: (id: string) => void;
  isConnected: boolean;
  onConnect: () => void;
}

const YouTubeHub: React.FC<YouTubeHubProps> = ({ videoId, onVideoIdChange, isConnected, onConnect }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'stats'>('chat');

  if (!isConnected) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        textAlign: 'center',
        gap: 20,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 30,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 24, 
          background: 'rgba(255,0,0,0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid rgba(255,0,0,0.2)',
          boxShadow: '0 0 30px rgba(255,0,0,0.1)'
        }}>
          <span style={{ fontSize: 40 }}>▶️</span>
        </div>
        <div>
          <h3 style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Connect YouTube</h3>
          <p style={{ fontFamily: FONTS.ui, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Link your YouTube account to monitor live chat and stream health directly in the studio.
          </p>
        </div>
        <button
          onClick={onConnect}
          style={{
            padding: '14px 28px',
            borderRadius: 16,
            border: 'none',
            background: `linear-gradient(180deg, ${COLORS.youtube} 0%, #CC0000 100%)`,
            color: COLORS.white,
            fontFamily: FONTS.ui,
            fontSize: 14,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: `0 10px 20px ${COLORS.youtube}30`,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          LINK ACCOUNT
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      {/* Mini Stats Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 12 
      }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Viewers</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#10B981' }}>1.2K</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Health</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#00A8FF' }}>EXCELLENT</div>
        </div>
      </div>

      {/* Chat Section */}
      <div style={{ 
        flex: 1, 
        background: 'rgba(0,0,0,0.4)', 
        borderRadius: 24, 
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Chat</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.youtube, animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: COLORS.youtube }}>LIVE</span>
          </div>
        </div>

        {videoId ? (
          <iframe
            src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', gap: 12 }}>
            <span style={{ fontSize: 24, opacity: 0.5 }}>💬</span>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.ui }}>
              Enter a Video ID to sync live chat
            </div>
            <input
              value={videoId}
              onChange={(e) => onVideoIdChange(e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF',
                fontSize: 12,
                outline: 'none',
                textAlign: 'center'
              }}
            />
          </div>
        )}
      </div>

      {/* Settings Row */}
      <div style={{ display: 'flex', gap: 12 }}>
         <button 
           onClick={() => onVideoIdChange('')}
           style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
         >
           RESET CHAT
         </button>
         <button 
           onClick={onConnect}
           style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
         >
           ACCOUNT
         </button>
      </div>
    </div>
  );
};

export default YouTubeHub;
