import React, { useEffect, useState } from 'react';
import { API_BASE, COLORS, FONTS } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';
import { useNavigate } from 'react-router-dom';
import { Episode } from '../types';
import useAuth from '../hooks/useAuth';

interface RoomInfo {
  sid: string;
  name: string;
  numParticipants: number;
  creationTime: number;
}

interface RecordingFile {
  filename: string;
  size: number;
  created: string;
}

interface StorageInfo {
  totalRecordings: number;
  totalBytes: number;
  recordingsDir: string;
}

const AdminDashboard: React.FC = () => {
  const { user, token, isAdmin, isLoading, login, logout } = useAuth();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Partial<Episode>>({
    title: '',
    host: '',
    guest: '',
    description: '',
    status: 'upcoming',
    tags: [],
    date: new Date().toISOString().split('T')[0],
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/livekit/rooms`);
      const data = await response.json();
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch {
      /* non-critical */
    }
  };

  const fetchEpisodes = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/episodes`);
      const data = await response.json();
      setEpisodes(Array.isArray(data) ? data : []);
    } catch {
      setEpisodes([]);
    }
  };

  const fetchRecordings = async () => {
    try {
      const rRes = await fetch(`${API_BASE}/api/recordings/list`);
      const rData = await rRes.json();
      setRecordings(Array.isArray(rData) ? rData : []);

      const sRes = await fetch(`${API_BASE}/api/recordings/storage-info`);
      const sData = await sRes.json();
      setStorageInfo(sData);
    } catch {
      /* non-critical */
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void fetchRooms();
      void fetchEpisodes();
      void fetchRecordings();
      const interval = setInterval(() => {
        void fetchRooms();
        void fetchRecordings();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveEpisode = async () => {
    if (!currentEpisode.title?.trim() || !currentEpisode.host?.trim()) {
      showToast('Title and Host are required', 'error');
      return;
    }
    try {
      const method = currentEpisode.id ? 'PUT' : 'POST';
      const url = currentEpisode.id
        ? `${API_BASE}/api/episodes/${currentEpisode.id}`
        : `${API_BASE}/api/episodes`;

      const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(currentEpisode),
      });

      if (response.ok) {
        showToast(currentEpisode.id ? 'Episode updated!' : 'Episode created!');
        setShowEpisodeModal(false);
        void fetchEpisodes();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/episodes/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (response.ok) {
        showToast('Episode deleted');
        void fetchEpisodes();
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteRecording = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/api/recordings/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        showToast('Recording file deleted');
        void fetchRecordings();
      } else {
        showToast('Failed to delete recording', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const getGuestLink = (episode: Episode) => {
    return `${window.location.origin}/join/${episode.id}`;
  };

  const copyToClipboard = async (text: string, episodeId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLink(episodeId);
    showToast('Guest link copied!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // ─── LOADING STATE ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.ui, fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  // ─── LOGIN SCREEN ──────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONTS.ui, padding: 20,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.02)', padding: '48px 40px', borderRadius: 32,
          border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center',
          width: '100%', maxWidth: 420,
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          <LogoWatermark size="md" variant="light" />
          <h2 style={{ color: COLORS.white, marginTop: 32, marginBottom: 8, fontSize: 24, fontWeight: 900 }}>
            Admin Access
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32, fontSize: 14 }}>
            Sign in to manage your studio
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              autoFocus
              style={inputStyle}
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              style={{ ...inputStyle, marginTop: 12 }}
            />
            {loginError && (
              <p style={{ color: '#FF4D4D', fontSize: 13, marginTop: 12 }}>{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none', marginTop: 20,
                background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
                color: COLORS.white, fontWeight: 900, cursor: 'pointer', fontSize: 15,
                opacity: loginLoading ? 0.6 : 1,
              }}
            >
              {loginLoading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bg, color: COLORS.white,
      fontFamily: FONTS.ui,
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 200,
          padding: '14px 24px', borderRadius: 14,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(255,77,77,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(255,77,77,0.3)'}`,
          color: toast.type === 'success' ? '#10B981' : '#FF4D4D',
          fontWeight: 700, fontSize: 14,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <LogoWatermark size="sm" variant="light" />
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 900, letterSpacing: '0.08em' }}>
            COMMAND CENTER
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setCurrentEpisode({
                title: '', host: user?.name || '', guest: '', description: '',
                status: 'upcoming', tags: [], date: new Date().toISOString().split('T')[0],
              });
              setShowEpisodeModal(true);
            }}
            style={btnPrimary}
          >
            + NEW EPISODE
          </button>
          <button onClick={() => navigate('/post')} style={btnGhost}>POST-PRODUCTION</button>
          <button onClick={() => { logout(); navigate('/'); }} style={{ ...btnGhost, color: '#FF4D4D', borderColor: 'rgba(255,77,77,0.2)' }}>
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, marginBottom: 32,
        }}>
          {[
            { label: 'Active Sessions', value: rooms.length, color: '#10B981' },
            { label: 'Storage Used', value: storageInfo ? formatBytes(storageInfo.totalBytes) : '...', color: '#EF4444' },
            { label: 'Saved Recordings', value: recordings.length, color: COLORS.primaryBlue },
            { label: 'Upcoming', value: episodes.filter(e => e.status === 'upcoming').length, color: '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.06)', padding: '24px 20px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                {stat.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, fontFamily: FONTS.display, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {/* Episodes */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>EPISODES ({episodes.length})</h2>
            {episodes.length === 0 ? (
              <p style={{ opacity: 0.3, fontSize: 14 }}>No episodes yet. Create your first one!</p>
            ) : (
              <div style={{ display: 'grid', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                {episodes.map(ep => (
                  <div key={ep.id} style={{
                    padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ep.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          {ep.date} &bull; {ep.host}{ep.guest ? ` + ${ep.guest}` : ''}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 900,
                        letterSpacing: '0.1em', flexShrink: 0, marginLeft: 12,
                        background: ep.status === 'live' ? 'rgba(255,77,77,0.15)' : ep.status === 'upcoming' ? 'rgba(0,168,255,0.12)' : 'rgba(255,255,255,0.06)',
                        color: ep.status === 'live' ? '#FF4D4D' : ep.status === 'upcoming' ? COLORS.primaryBlue : 'rgba(255,255,255,0.5)',
                      }}>
                        {ep.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Actions row */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/studio/${ep.roomId}`)}
                        style={{ ...btnSmall, background: 'rgba(0,168,255,0.1)', color: COLORS.primaryBlue }}
                      >
                        🎬 ENTER STUDIO
                      </button>
                      <button
                        onClick={() => copyToClipboard(getGuestLink(ep), ep.id)}
                        style={{ ...btnSmall, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
                      >
                        {copiedLink === ep.id ? '✅ COPIED!' : '🔗 GUEST LINK'}
                      </button>
                      <button
                        onClick={() => { setCurrentEpisode(ep); setShowEpisodeModal(true); }}
                        style={btnSmall}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Delete this episode?')) handleDeleteEpisode(ep.id); }}
                        style={{ ...btnSmall, color: '#FF4D4D' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recordings List */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>RECORDINGS STORAGE ({recordings.length})</h2>
            {recordings.length === 0 ? (
              <p style={{ opacity: 0.3, fontSize: 14 }}>No recordings found on local storage.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                {recordings.map(rec => (
                  <div key={rec.filename} style={{
                    padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.filename}>
                          📁 {rec.filename}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          {formatBytes(rec.size)} &bull; {new Date(rec.created).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a
                        href={`${API_BASE}/api/recordings/download/${encodeURIComponent(rec.filename)}`}
                        style={{ ...btnSmall, textDecoration: 'none', background: 'rgba(255,255,255,0.08)', display: 'inline-block', textAlign: 'center' }}
                      >
                        📥 DOWNLOAD
                      </a>
                      <button
                        onClick={() => handleDeleteRecording(rec.filename)}
                        style={{ ...btnSmall, color: '#FF4D4D', background: 'rgba(255,77,77,0.08)' }}
                      >
                        🗑️ DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live Rooms */}
          <section style={cardStyle}>
            <h2 style={sectionTitle}>ACTIVE SESSIONS ({rooms.length})</h2>
            {rooms.length === 0 ? (
              <p style={{ opacity: 0.3, fontSize: 14 }}>No active sessions right now.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {rooms.map(room => (
                  <div key={room.sid} style={{
                    padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: COLORS.primaryBlue, fontSize: 14 }}>{room.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.5 }}>{room.numParticipants} participants</div>
                    </div>
                    <button onClick={() => navigate(`/studio/${room.name}`)} style={{ ...btnSmall, background: 'rgba(0,168,255,0.1)', color: COLORS.primaryBlue }}>
                      JOIN
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Episode Modal */}
      {showEpisodeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowEpisodeModal(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 520, background: '#0d1117', padding: '36px 32px',
            borderRadius: 28, border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          }}>
            <h2 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 900, marginBottom: 28 }}>
              {currentEpisode.id ? 'Edit Episode' : 'New Episode'}
            </h2>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={labelStyle}>TITLE *</label>
                <input value={currentEpisode.title} onChange={e => setCurrentEpisode({ ...currentEpisode, title: e.target.value })} placeholder="Episode title" style={modalInput} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>HOST *</label>
                  <input value={currentEpisode.host} onChange={e => setCurrentEpisode({ ...currentEpisode, host: e.target.value })} placeholder="Host name" style={modalInput} />
                </div>
                <div>
                  <label style={labelStyle}>GUEST</label>
                  <input value={currentEpisode.guest || ''} onChange={e => setCurrentEpisode({ ...currentEpisode, guest: e.target.value })} placeholder="Guest name" style={modalInput} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea value={currentEpisode.description} onChange={e => setCurrentEpisode({ ...currentEpisode, description: e.target.value })} placeholder="What's this episode about?" style={{ ...modalInput, height: 80, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>STATUS</label>
                  <select value={currentEpisode.status} onChange={e => setCurrentEpisode({ ...currentEpisode, status: e.target.value as any })} style={modalInput}>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="recorded">Recorded</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>DATE</label>
                  <input type="date" value={currentEpisode.date} onChange={e => setCurrentEpisode({ ...currentEpisode, date: e.target.value })} style={modalInput} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>TIME</label>
                <input type="time" value={currentEpisode.time || ''} onChange={e => setCurrentEpisode({ ...currentEpisode, time: e.target.value })} style={modalInput} />
              </div>

              {/* Show guest link for existing episodes */}
              {currentEpisode.id && currentEpisode.roomId && (
                <div style={{
                  background: 'rgba(16,185,129,0.06)', borderRadius: 14, padding: '14px 16px',
                  border: '1px solid rgba(16,185,129,0.15)',
                }}>
                  <label style={{ ...labelStyle, color: '#10B981' }}>GUEST INVITE LINK</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      readOnly
                      value={`${window.location.origin}/join/${currentEpisode.id}`}
                      style={{ ...modalInput, flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}
                    />
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/join/${currentEpisode.id}`, currentEpisode.id!)}
                      style={{ ...btnSmall, padding: '10px 16px', background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
                    >
                      {copiedLink === currentEpisode.id ? '✅' : '📋'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={handleSaveEpisode} style={{ flex: 2, ...btnPrimary }}>
                  {currentEpisode.id ? 'UPDATE' : 'CREATE EPISODE'}
                </button>
                <button onClick={() => setShowEpisodeModal(false)} style={{ flex: 1, ...btnGhost }}>
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Shared Styles ────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 18px', borderRadius: 14,
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  color: COLORS.white, fontFamily: FONTS.ui, fontSize: 15, outline: 'none',
  boxSizing: 'border-box',
};

const modalInput: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff', fontFamily: FONTS.ui, fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.45)', marginBottom: 6,
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)', borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px',
};

const sectionTitle: React.CSSProperties = {
  marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.18em', fontWeight: 900,
};

const btnPrimary: React.CSSProperties = {
  padding: '12px 22px', borderRadius: 12,
  background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
  border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13,
  letterSpacing: '0.05em',
};

const btnGhost: React.CSSProperties = {
  padding: '12px 22px', borderRadius: 12,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: COLORS.white, cursor: 'pointer', fontWeight: 700, fontSize: 13,
};

const btnSmall: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8,
  background: 'rgba(255,255,255,0.04)', border: 'none',
  color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 11, fontWeight: 800,
};

export default AdminDashboard;
