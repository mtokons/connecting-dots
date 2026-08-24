import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE, COLORS, FONTS } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';
import type { Episode } from '../types';

const GuestJoin: React.FC = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/episodes/${episodeId}`);
        if (!res.ok) throw new Error('Episode not found');
        const data = await res.json();
        setEpisode(data);
      } catch {
        setError('This episode link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    if (episodeId) void fetchEpisode();
  }, [episodeId]);

  const handleJoin = () => {
    if (!name.trim()) return;
    // Use roomId if set, otherwise fall back to episode.id (they're equivalent in production)
    const roomId = episode?.roomId || episode?.id;
    if (!roomId) {
      setError('This episode is not yet open for joining. Contact the host.');
      return;
    }
    // Store guest name for the studio to pick up
    sessionStorage.setItem('guestName', name.trim());
    sessionStorage.setItem('guestRole', 'guest');
    navigate(`/studio/${roomId}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: COLORS.white, fontFamily: FONTS.ui }}>
          <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: COLORS.primaryBlue, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          <p style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: 14 }}>LOADING...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', maxWidth: 500, color: COLORS.white, fontFamily: FONTS.ui }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>😕</div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 32, fontWeight: 900, marginBottom: 16 }}>
            Link Not Found
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 32 }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 28px', borderRadius: 14,
              background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
              color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 15,
            }}
          >
            GO TO HOME
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 40%, rgba(0,168,255,0.08) 0%, transparent 60%)',
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(40px)',
          borderRadius: 32,
          padding: '48px 40px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <LogoWatermark size="sm" variant="light" />
        </div>

        {/* Episode info */}
        <div style={{
          background: 'rgba(0,168,255,0.06)',
          borderRadius: 20,
          padding: '24px 20px',
          marginBottom: 32,
          border: '1px solid rgba(0,168,255,0.1)',
        }}>
          <p style={{
            fontFamily: FONTS.ui, fontSize: 11, fontWeight: 900,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: COLORS.primaryBlue, marginBottom: 8,
          }}>
            YOU'RE INVITED TO
          </p>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: 24, fontWeight: 900,
            color: COLORS.white, lineHeight: 1.2, marginBottom: 12,
          }}>
            {episode.title}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>
            Hosted by <strong style={{ color: COLORS.white }}>{episode.host}</strong>
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            {episode.date}{episode.time ? ` • ${episode.time}` : ''}
          </p>
        </div>

        {/* Name input */}
        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 900,
            color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: '0.1em',
          }}>
            YOUR NAME
          </label>
          <input
            type="text"
            placeholder="Enter your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: COLORS.white,
              fontFamily: FONTS.ui,
              fontSize: 16,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={!name.trim()}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 16,
            background: name.trim()
              ? 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)'
              : 'rgba(255,255,255,0.05)',
            color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            fontFamily: FONTS.display,
            fontSize: 16,
            fontWeight: 900,
            border: 'none',
            cursor: name.trim() ? 'pointer' : 'default',
            boxShadow: name.trim() ? '0 10px 30px rgba(0,168,255,0.3)' : 'none',
            transition: 'all 0.3s',
            letterSpacing: '0.05em',
          }}
        >
          JOIN STUDIO
        </button>

        {error && (
          <p style={{ marginTop: 12, fontSize: 13, color: '#FF6B6B', textAlign: 'center', background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 10, padding: '8px 12px' }}>
            {error}
          </p>
        )}

        <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          You'll be placed in the backstage until the host brings you on stage.
        </p>
      </motion.div>
    </div>
  );
};

export default GuestJoin;
