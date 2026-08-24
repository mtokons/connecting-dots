import React from 'react';
import { COLORS, FONTS } from '../utils/constants';

interface LowerThirdProps {
  speakerName: string;
  role: string;
  city: string;
  visible: boolean;
}

const LowerThird: React.FC<LowerThirdProps> = ({ speakerName, role, city, visible }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 160,
        left: 0,
        transform: visible ? 'translateX(0)' : 'translateX(-110%)',
        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex',
        alignItems: 'stretch',
        maxWidth: 520,
        zIndex: 10,
        filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))',
      }}
    >
      {/* 3D Left accent bar */}
      <div
        style={{
          width: 8,
          background: 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)',
          flexShrink: 0,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
          boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.4), inset -2px 0 4px rgba(0,0,0,0.3)',
        }}
      />

      {/* Main body - 3D Glass */}
      <div
        style={{
          background: 'linear-gradient(90deg, rgba(5,10,21,0.95) 0%, rgba(13,27,42,0.95) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '16px 24px 16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderBottom: '1px solid rgba(0,0,0,0.5)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gloss overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: '40%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            fontWeight: 800,
            color: COLORS.white,
            lineHeight: 1.2,
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: '0.01em',
          }}
        >
          {speakerName}
        </div>
        <div
          style={{
            fontFamily: FONTS.ui,
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 4,
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '0.02em',
          }}
        >
          {role} <span style={{ color: '#00A8FF', margin: '0 4px' }}>|</span> {city}
        </div>
      </div>

      {/* Right section - Metallic block */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0057A8 0%, #003875 100%)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '1px solid rgba(0,168,255,0.5)',
          borderBottom: '1px solid rgba(0,0,0,0.8)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          borderTopRightRadius: 6,
          borderBottomRightRadius: 6,
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.3), inset -1px -1px 2px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        {/* Shine effect */}
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
            pointerEvents: 'none',
            borderRadius: 'inherit',
          }}
        />

        <span
          style={{
            fontFamily: FONTS.ui,
            fontSize: 9,
            color: COLORS.white,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            fontWeight: 800,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            position: 'relative',
          }}
        >
          SCCG
        </span>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFF 0%, #E0E0E0 100%)',
            marginTop: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8)',
            border: '1px solid rgba(0,0,0,0.2)',
            position: 'relative',
          }}
        />
      </div>
    </div>
  );
};

export default LowerThird;
