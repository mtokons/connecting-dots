import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONTS, BRAND } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';
import Header from '../components/Header';

const floatingDots = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  delay: `${(i * 0.35).toFixed(1)}s`,
  duration: `${5 + Math.random() * 4}s`,
}));

const floatKeyframes = `
@keyframes cdFloat {
  0% { transform: translateY(0); opacity: 0.08; }
  50% { opacity: 0.15; }
  100% { transform: translateY(-80px); opacity: 0; }
}
`;

const features = [
  {
    icon: '🎙️',
    title: 'Multi-Location Speakers',
    description: 'Connect hosts and guests from anywhere in Germany',
  },
  {
    icon: '📡',
    title: 'Live to All Platforms',
    description: 'Stream simultaneously to YouTube, Facebook and Instagram',
  },
  {
    icon: '🎨',
    title: 'Studio Branding',
    description: 'Professional SCCG-branded studio look on every show',
  },
];

const Lobby: React.FC = () => {
  const navigate = useNavigate();

  const generateRoomId = () => `room-${Math.random().toString(36).slice(2, 8)}`;

  const handleJoinRoom = () => {
    const roomId = prompt('Enter Room ID or Episode Invite Link:');
    if (roomId) {
      // Check if it's a full URL with /join/ path
      if (roomId.includes('/join/')) {
        window.location.href = roomId;
      } else {
        navigate(`/studio/${roomId}`);
      }
    }
  };

  return (
    <>
      <style>{floatKeyframes}</style>
      <div
        style={{
          minHeight: '100vh',
          background: COLORS.bg,
          fontFamily: FONTS.ui,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Advanced Mesh Gradient Background */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `
              radial-gradient(circle at 30% 30%, #003875 0%, transparent 40%),
              radial-gradient(circle at 70% 20%, #001529 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, #0d1b2a 0%, transparent 60%),
              radial-gradient(circle at 80% 80%, #0057A8 0%, transparent 40%)
            `,
            filter: 'blur(80px)',
            opacity: 0.6,
            zIndex: 0,
            animation: 'rotateBg 20s infinite linear',
          }}
        />
        
        <style>
          {`
            @keyframes rotateBg {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        <Header />

        {/* HERO SECTION */}
        <section
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            padding: '0 20px 100px',
          }}
        >
          <div style={{ animation: 'fadeIn 1s ease-out' }}>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 16,
                fontWeight: 900,
                color: COLORS.primaryBlue,
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                marginBottom: 20,
                textShadow: '0 0 20px rgba(0,168,255,0.5)',
              }}
            >
              NEXT GENERATION BROADCASTING
            </div>
            <h1
              style={{
                fontFamily: FONTS.display,
                fontSize: 'clamp(60px, 10vw, 120px)',
                color: COLORS.white,
                fontWeight: 900,
                lineHeight: 0.9,
                margin: 0,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(to bottom, #fff 40%, #94A3B8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CONNECTING<br />DOT.
            </h1>
            <p
              style={{
                fontFamily: FONTS.ui,
                fontSize: 24,
                color: COLORS.white,
                opacity: 0.6,
                marginTop: 32,
                maxWidth: 700,
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              The most advanced cloud-based professional studio for high-end podcasting and live broadcasting.
            </p>

            {/* CTA Buttons */}
            <div
              style={{
                marginTop: 60,
                display: 'flex',
                justifyContent: 'center',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => navigate('/admin')}
                style={{
                  background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: 16,
                  padding: '20px 48px',
                  fontFamily: FONTS.display,
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 15px 35px rgba(0,168,255,0.3), inset 0 2px 5px rgba(255,255,255,0.3)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  animation: 'fadeIn 1s ease-out 0.2s both',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(0,168,255,0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,168,255,0.3)';
                }}
              >
                Create Studio
              </button>
              <button
                onClick={handleJoinRoom}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  color: COLORS.white,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 16,
                  padding: '20px 48px',
                  fontFamily: FONTS.display,
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  animation: 'fadeIn 1s ease-out 0.4s both',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Join with ID
              </button>
            </div>
          </div>
          
          {/* Abstract 3D Element (CSS Only) */}
          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              width: '120%',
              height: '400px',
              background: 'radial-gradient(ellipse at center, rgba(0,168,255,0.15) 0%, transparent 70%)',
              transform: 'perspective(1000px) rotateX(60deg)',
              zIndex: -1,
            }}
          />
        </section>

        {/* FEATURES (Glass Cards) */}
        <section
          style={{
            padding: '100px 80px',
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 40,
              maxWidth: 1400,
              margin: '0 auto',
            }}
          >
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 32,
                  padding: 48,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                  transition: 'all 0.4s ease',
                  animation: `fadeIn 1s ease-out ${0.6 + idx * 0.2}s both`,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.borderColor = 'rgba(0,168,255,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, rgba(0,168,255,0.2), rgba(0,168,255,0.05))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    marginBottom: 32,
                    boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.1)',
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 28,
                    color: COLORS.white,
                    fontWeight: 800,
                    marginBottom: 16,
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontFamily: FONTS.ui,
                    fontSize: 17,
                    color: COLORS.white,
                    opacity: 0.5,
                    lineHeight: 1.6,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            padding: '60px 80px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1,
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <LogoWatermark size="sm" variant="light" />
          <span
            style={{
              fontFamily: FONTS.ui,
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500,
            }}
          >
            © 2026 Connecting Dot. All rights reserved.
          </span>
        </footer>
      </div>
    </>
  );
};

export default Lobby;
