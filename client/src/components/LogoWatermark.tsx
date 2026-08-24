import React, { useEffect, useState } from 'react';
import { COLORS, FONTS } from '../utils/constants';

interface LogoWatermarkProps {
  size: 'sm' | 'md' | 'lg';
  variant: 'dark' | 'light' | 'watermark';
}

const sizeMap = {
  sm: { circle: 24, dot: 7, title: 14, sub: 8 },
  md: { circle: 36, dot: 11, title: 20, sub: 10 },
  lg: { circle: 48, dot: 14, title: 28, sub: 13 },
};

const pulseKeyframes = `
@keyframes cdPulse {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
`;

const LOGO_STORAGE_KEY = 'connectingdot_logo';

const LogoWatermark: React.FC<LogoWatermarkProps> = ({ size, variant }) => {
  const [storedLogo, setStoredLogo] = useState<string | null>(null);
  const s = sizeMap[size];

  useEffect(() => {
    const syncLogo = () => {
      setStoredLogo(localStorage.getItem(LOGO_STORAGE_KEY));
    };

    syncLogo();
    window.addEventListener('storage', syncLogo);

    return () => {
      window.removeEventListener('storage', syncLogo);
    };
  }, []);

  const titleColor =
    variant === 'dark' ? COLORS.darkBlue : COLORS.white;
  const subColor =
    variant === 'dark'
      ? COLORS.silver
      : variant === 'light'
        ? COLORS.primaryBlue
        : 'rgba(255,255,255,0.5)';

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: variant === 'watermark' ? 0.4 : 1,
        }}
      >
        {storedLogo ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <div style={{
              padding: size === 'sm' ? '4px 8px' : '8px 16px',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(10px)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
            }}>
              <img
                src={storedLogo}
                alt="Connecting Dot logo"
                style={{
                  width: size === 'sm' ? 80 : size === 'md' ? 140 : 200,
                  maxHeight: size === 'sm' ? 32 : size === 'md' ? 48 : 64,
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))'
                }}
              />
            </div>
            <span
              style={{
                fontFamily: FONTS.ui,
                fontSize: s.sub,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: subColor,
                fontWeight: 900,
                paddingLeft: 4,
              }}
            >
              BROADCAST NETWORK
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* 3D Modern Logo Icon */}
            <div
              style={{
                width: s.circle * 1.2,
                height: s.circle * 1.2,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #0057A8 0%, #003875 100%)',
                position: 'relative',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 20px rgba(0,87,168,0.4), inset 0 2px 4px rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div
                style={{
                  width: s.dot * 1.2,
                  height: s.dot * 1.2,
                  borderRadius: '50%',
                  background: COLORS.white,
                  boxShadow: '0 0 15px #FFF',
                  animation: 'cdPulse 2s infinite ease-in-out',
                }}
              />
            </div>

            {/* Premium Typography */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: FONTS.display,
                  fontSize: s.title,
                  fontWeight: 900,
                  color: titleColor,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  textShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  textTransform: 'uppercase',
                }}
              >
                Connecting Dot
              </span>
              <span
                style={{
                  fontFamily: FONTS.ui,
                  fontSize: s.sub,
                  letterSpacing: '0.4em',
                  textTransform: 'uppercase',
                  color: subColor,
                  fontWeight: 900,
                  marginTop: 4,
                  opacity: 0.8,
                }}
              >
                SCCG NETWORK
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LogoWatermark;
