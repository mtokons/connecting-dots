import React from 'react';
import { COLORS, FONTS } from '../utils/constants';

interface StudioControlBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

const StudioControlBar: React.FC<StudioControlBarProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}) => {
  const buttonStyle = (active: boolean, danger?: boolean): React.CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid rgba(255,255,255,0.1)',
    background: active 
      ? (danger ? 'linear-gradient(180deg, #FF4D4D 0%, #A00000 100%)' : 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)')
      : 'rgba(255,255,255,0.05)',
    boxShadow: active 
      ? `0 6px 15px ${danger ? 'rgba(255,77,77,0.3)' : 'rgba(0,168,255,0.3)'}` 
      : '0 2px 6px rgba(0,0,0,0.3)',
    color: COLORS.white,
  });

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '10px 20px',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Mic */}
      <div 
        style={buttonStyle(isMuted, true)} 
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? '🔇' : '🎙️'}
      </div>

      {/* Camera */}
      <div 
        style={buttonStyle(isCameraOff, true)} 
        onClick={onToggleCamera}
        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCameraOff ? '📷' : '📹'}
      </div>

      {/* Screen Share */}
      <div 
        style={buttonStyle(isScreenSharing)} 
        onClick={onToggleScreenShare}
        title="Share Screen"
      >
        🖥️
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)' }} />

      {/* Leave */}
      <div 
        style={{
          ...buttonStyle(false),
          width: 'auto',
          padding: '0 18px',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: FONTS.ui,
          letterSpacing: '0.1em',
          background: 'rgba(255, 77, 77, 0.1)',
          borderColor: 'rgba(255, 77, 77, 0.2)',
          color: '#FF4D4D',
        }} 
        onClick={onLeave}
      >
        LEAVE STUDIO
      </div>
    </div>
  );
};

export default StudioControlBar;
