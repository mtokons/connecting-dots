import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, COLORS, FONTS } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';
import Header from '../components/Header';
import { Episode } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpisodeIdx, setActiveEpisodeIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/episodes`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setEpisodes(data);
        } else {
          console.warn('API returned non-array episodes:', data);
          setEpisodes([]);
        }
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchEpisodes();
  }, []);

  const liveEpisode = episodes.find(ep => ep.status === 'live');
  const upcomingEpisodes = episodes.filter(ep => ep.status === 'upcoming');
  const pastEpisodes = episodes.filter(ep => ep.status === 'recorded');

  const featuredEpisodes = liveEpisode ? [liveEpisode, ...upcomingEpisodes, ...pastEpisodes] : [...upcomingEpisodes, ...pastEpisodes];
  const activeEpisode = featuredEpisodes[activeEpisodeIdx];

  const handleNext = () => {
    if (featuredEpisodes.length === 0) return;
    setActiveEpisodeIdx((prev) => (prev + 1) % featuredEpisodes.length);
  };

  const handlePrev = () => {
    if (featuredEpisodes.length === 0) return;
    setActiveEpisodeIdx((prev) => (prev - 1 + featuredEpisodes.length) % featuredEpisodes.length);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.white, fontFamily: FONTS.ui }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: COLORS.primaryBlue, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
          <p style={{ fontWeight: 800, letterSpacing: '0.1em' }}>LOADING STUDIO DATA...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (featuredEpisodes.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', color: COLORS.white, fontFamily: FONTS.ui }}>
        <header style={{ padding: '30px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <LogoWatermark size="sm" variant="light" />
        </header>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 20px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 600 }}
          >
            <div style={{ fontSize: 80, marginBottom: 40 }}>🎙️</div>
            <h1 style={{ fontFamily: FONTS.display, fontSize: 48, fontWeight: 900, marginBottom: 24 }}>Welcome to Connecting Dot Studio</h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 40 }}>
              Your professional broadcasting command center is ready. To see the full studio design, please schedule your first episode from the admin dashboard.
            </p>
            <button 
              onClick={() => navigate('/admin')}
              style={{
                padding: '16px 32px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
                color: COLORS.white,
                fontWeight: 900,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                boxShadow: '0 10px 20px rgba(0,168,255,0.3)'
              }}
            >
              GO TO COMMAND CENTER
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      fontFamily: FONTS.ui,
      color: COLORS.white,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Premium Background Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle at 30% 30%, #003875 0%, transparent 40%), radial-gradient(circle at 70% 20%, #001529 0%, transparent 50%), radial-gradient(circle at 40% 80%, #0d1b2a 0%, transparent 60%), radial-gradient(circle at 80% 80%, #0057A8 0%, transparent 40%)',
          filter: 'blur(100px)',
          opacity: 0.5,
          animation: 'rotateMesh 30s linear infinite'
        }} />
        
        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: Math.random() * 100 + '%', y: Math.random() * 100 + '%' }}
            animate={{ 
              y: [null, '-=100px', '+=100px'],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 10 + Math.random() * 20, 
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              width: 2 + Math.random() * 4,
              height: 2 + Math.random() * 4,
              borderRadius: '50%',
              background: COLORS.primaryBlue,
              boxShadow: `0 0 10px ${COLORS.primaryBlue}`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes rotateMesh {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <Header />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 1, padding: '0 60px 60px' }}>
        
        {/* Featured Slider */}
        <div style={{ display: 'flex', gap: 60, alignItems: 'center', marginTop: 40, minHeight: 400 }}>
          {/* Left info */}
          <div style={{ flex: 1 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeEpisode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  {activeEpisode.status === 'live' && (
                    <span style={{ padding: '4px 12px', background: 'rgba(255, 77, 77, 0.2)', color: '#FF4D4D', borderRadius: 8, fontSize: 12, fontWeight: 900, border: '1px solid rgba(255,77,77,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4D4D', animation: 'pulse 1s infinite' }} />
                      LIVE NOW
                    </span>
                  )}
                  {activeEpisode.tags.map(tag => (
                    <span key={tag} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                      {tag}
                    </span>
                  ))}
                </div>
                
                <h1 style={{ 
                  fontFamily: FONTS.display, 
                  fontSize: 'clamp(50px, 8vw, 96px)', 
                  fontWeight: 900, 
                  lineHeight: 0.9, 
                  marginBottom: 32, 
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(to bottom, #fff 50%, #94A3B8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {activeEpisode.title}
                </h1>
                
                <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 32, maxWidth: 600 }}>
                  {activeEpisode.description}
                </p>
                
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(0,168,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      🎙️
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase' }}>Hosted by</div>
                      <div style={{ fontWeight: 800 }}>{activeEpisode.host}</div>
                    </div>
                  </div>
                  {activeEpisode.guest && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        ⭐
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase' }}>Special Guest</div>
                        <div style={{ fontWeight: 800 }}>{activeEpisode.guest}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                  {activeEpisode.status === 'live' && activeEpisode.roomId ? (
                    <button 
                      onClick={() => navigate(`/studio/${activeEpisode.roomId}`)}
                      style={{ padding: '16px 32px', borderRadius: 16, background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)', color: COLORS.white, fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: 16, boxShadow: '0 10px 20px rgba(0,168,255,0.3)' }}>
                      WATCH LIVE
                    </button>
                  ) : activeEpisode.roomId ? (
                    <button
                      onClick={() => navigate(`/join/${activeEpisode.id}`)}
                      style={{ padding: '16px 32px', borderRadius: 16, background: 'rgba(255,255,255,0.1)', color: COLORS.white, fontWeight: 900, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16 }}>
                      {activeEpisode.status === 'upcoming' ? 'JOIN AS GUEST' : 'WATCH REPLAY'}
                    </button>
                  ) : (
                    <button style={{ padding: '16px 32px', borderRadius: 16, background: 'rgba(255,255,255,0.1)', color: COLORS.white, fontWeight: 900, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16 }}>
                      {activeEpisode.status === 'upcoming' ? 'SET REMINDER' : 'WATCH REPLAY'}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Image/Slider */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeEpisode.id}
                initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateY: -20 }}
                transition={{ duration: 0.5, type: 'spring' }}
                style={{
                  width: '100%',
                  maxWidth: 600,
                  height: 400,
                  borderRadius: 32,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <img src={activeEpisode.imageUrl} alt={activeEpisode.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div style={{ position: 'absolute', bottom: 20, right: 40, display: 'flex', gap: 12 }}>
              <button onClick={handlePrev} style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: COLORS.white, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>←</button>
              <button onClick={handleNext} style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: COLORS.white, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>→</button>
            </div>
          </div>
        </div>

        {/* Schedule Calendar View */}
        <div style={{ marginTop: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <h2 style={{ fontFamily: FONTS.display, fontSize: 32, fontWeight: 900 }}>Upcoming Schedule</h2>
            <button style={{ background: 'transparent', color: COLORS.primaryBlue, border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>VIEW ALL EVENTS →</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {upcomingEpisodes.map((ep, idx) => (
              <motion.div 
                key={ep.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 24,
                  padding: 32,
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0,168,255,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, color: COLORS.primaryBlue, fontWeight: 900, letterSpacing: '0.1em' }}>
                    {new Date(ep.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>{ep.time}</div>
                </div>
                <h3 style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{ep.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎙️</div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{ep.host}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default Home;
