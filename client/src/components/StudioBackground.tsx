import React from 'react';
import { COLORS, FONTS } from '../utils/constants';
import LogoWatermark from './LogoWatermark';

interface StudioBackgroundProps {
  showName: string;
  episodeNumber: number;
  isLive: boolean;
  backgroundStyle?: 'studio-dark' | 'studio-light' | 'blur' | 'custom';
  backgroundImageUrl?: string | null;
}

const livePulseKeyframes = `
@keyframes livePulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
`;

const StudioBackground: React.FC<StudioBackgroundProps> = ({
  showName,
  episodeNumber,
  isLive,
  backgroundStyle = 'studio-dark',
  backgroundImageUrl,
}) => {
  const bgColors: Record<string, string> = {
    'studio-dark': '#000000',
    'studio-light': '#000000',
    'blur': '#000000',
    'custom': '#000000',
  };

  return (
    <>
      <style>{livePulseKeyframes}</style>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', background: bgColors[backgroundStyle] || '#050a15' }}>
        {/* Custom background image */}
        {backgroundStyle === 'custom' && backgroundImageUrl && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.3, filter: 'blur(2px)',
          }} />
        )}

        {/* Blur style */}
        {backgroundStyle === 'blur' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(0,87,168,0.2) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }} />
        )}
        {/* Layer 2 — 3D Mesh Gradient with Rotation */}
        <div
          style={{
            position: 'absolute',
            inset: '-100%',
            width: '300%',
            height: '300%',
            background: `
              radial-gradient(circle at 30% 30%, #003875 0%, transparent 40%),
              radial-gradient(circle at 70% 20%, #001529 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, #0d1b2a 0%, transparent 60%),
              radial-gradient(circle at 80% 80%, #0057A8 0%, transparent 40%)
            `,
            filter: 'blur(100px)',
            opacity: 0.8,
            animation: 'rotateBg 40s infinite linear',
          }}
        />

        {/* Layer 3 — Geometric 3D Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: 'perspective(1200px) rotateX(65deg) translateY(-150px) scale(3)',
            transformOrigin: 'top center',
            opacity: 0.4,
          }}
        />

        {/* TOP BAR - High-End Glassmorphism */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 90,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 15px 45px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 60px',
            zIndex: 10,
          }}
        >
          {/* Left — Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ filter: 'drop-shadow(0 0 15px rgba(0,168,255,0.4))' }}>
              <LogoWatermark size="sm" variant="light" />
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 24,
                  color: COLORS.white,
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  textTransform: 'uppercase',
                }}
              >
                {showName}
              </div>
              <div
                style={{
                  fontFamily: FONTS.ui,
                  fontSize: 11,
                  color: COLORS.primaryBlue,
                  fontWeight: 800,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                SCCG PROFESSIONAL STUDIO
              </div>
            </div>
          </div>

          {/* Right — Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '8px 20px',
                borderRadius: 12,
                fontFamily: FONTS.ui,
                fontSize: 13,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.05em',
              }}
            >
              EPISODE #{episodeNumber.toString().padStart(2, '0')}
            </div>
            
            {isLive ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'linear-gradient(135deg, #FF4D4D 0%, #A00000 100%)',
                  borderRadius: 12,
                  padding: '10px 24px',
                  boxShadow: '0 10px 25px rgba(255, 77, 77, 0.5), inset 0 2px 5px rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: COLORS.white,
                    boxShadow: '0 0 15px #FFF',
                    animation: 'livePulse 1.5s infinite',
                  }}
                />
                <span
                  style={{
                    fontFamily: FONTS.ui,
                    fontSize: 14,
                    fontWeight: 900,
                    color: COLORS.white,
                    letterSpacing: '0.15em',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  LIVE
                </span>
              </div>
            ) : (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: '10px 24px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                  }}
                />
                <span
                  style={{
                    fontFamily: FONTS.ui,
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.1em',
                  }}
                >
                  OFF AIR
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR - 3D Glow Strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%)',
            zIndex: 5,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingBottom: 20,
          }}
        >
          <div style={{ 
            width: '100%', 
            height: 1, 
            background: 'linear-gradient(90deg, transparent, rgba(0,168,255,0.4), transparent)',
            boxShadow: '0 0 15px rgba(0,168,255,0.3)'
          }} />
        </div>
      </div>
      <style>{`
        @keyframes rotateBg {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes livePulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 15px #FFF; }
          50% { transform: scale(1.5); opacity: 0.5; box-shadow: 0 0 25px #FFF; }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 15px #FFF; }
        }
      `}</style>
    </>
  );
};

export default StudioBackground;
