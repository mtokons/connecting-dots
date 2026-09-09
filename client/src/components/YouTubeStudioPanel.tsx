import React, { useEffect, useState } from 'react';
import { API_BASE, COLORS, FONTS, DEFAULT_HOST_KEY } from '../utils/constants';

interface YTVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail?: string;
}

/**
 * YouTube Studio integration panel.
 * - Lists recent uploads on the connected channel.
 * - Edit metadata: title, description (with auto-injected chapter list), tags, privacy.
 * - Post comments on a live broadcast.
 * - Connect / disconnect via OAuth flow handled server-side.
 */
const YouTubeStudioPanel: React.FC = () => {
  const [hostKey, setHostKey] = useState(DEFAULT_HOST_KEY);
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    channelTitle: string | null;
  } | null>(null);
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [selected, setSelected] = useState<YTVideo | null>(null);
  const [edit, setEdit] = useState({ title: '', description: '', tags: '', privacyStatus: 'unlisted' });
  const [chapters, setChapters] = useState<Array<{ time: string; label: string }>>([]);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const headers = (extra: Record<string, string> = {}) => ({
    'x-host-key': hostKey,
    ...extra,
  });

  const refreshStatus = () =>
    fetch(`${API_BASE}/api/youtube/status`, { headers: headers() })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));

  useEffect(() => {
    if (hostKey) refreshStatus();
  }, [hostKey]);

  const connect = async () => {
    const r = await fetch(`${API_BASE}/api/youtube/auth-url`, { headers: headers() });
    const data = await r.json();
    if (data?.url) window.open(data.url, '_blank', 'width=520,height=720');
  };

  const disconnect = async () => {
    await fetch(`${API_BASE}/api/youtube/disconnect`, { method: 'POST', headers: headers() });
    refreshStatus();
    setVideos([]);
    setSelected(null);
  };

  const loadVideos = async () => {
    const r = await fetch(`${API_BASE}/api/youtube/videos`, { headers: headers() });
    const data = await r.json();
    setVideos(data.videos || []);
  };

  useEffect(() => {
    if (status?.connected) loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  const pickVideo = (v: YTVideo) => {
    setSelected(v);
    setEdit({
      title: v.title,
      description: v.description,
      tags: '',
      privacyStatus: 'unlisted',
    });
    setChapters([]);
  };

  const saveEdits = async () => {
    if (!selected) return;
    setMsg(null);
    const r = await fetch(`${API_BASE}/api/youtube/videos/${selected.videoId}`, {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: edit.title,
        description: edit.description,
        tags: edit.tags ? edit.tags.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        privacyStatus: edit.privacyStatus as 'public' | 'unlisted' | 'private',
        chapters: chapters.length ? chapters : undefined,
      }),
    });
    const data = await r.json();
    setMsg(r.ok ? 'Saved.' : `Error: ${data?.error || r.status}`);
  };

  const postComment = async () => {
    if (!selected || !comment.trim()) return;
    setMsg(null);
    const r = await fetch(`${API_BASE}/api/youtube/comment`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ videoId: selected.videoId, text: comment }),
    });
    const data = await r.json();
    setMsg(r.ok ? 'Comment posted.' : `Error: ${data?.error || r.status}`);
    if (r.ok) setComment('');
  };

  return (
    <div style={{ fontFamily: FONTS.ui, color: '#fff', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: FONTS.display, fontWeight: 900 }}>YouTube Studio</h3>
        {status && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              padding: '4px 10px',
              borderRadius: 999,
              background: status.connected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              color: status.connected ? '#10B981' : 'rgba(255,255,255,0.4)',
            }}
          >
            {status.connected ? `CONNECTED ${status.channelTitle ? `· ${status.channelTitle}` : ''}` : 'DISCONNECTED'}
          </span>
        )}
      </div>

      {!DEFAULT_HOST_KEY && (
        <input
          type="password"
          value={hostKey}
          onChange={(e) => setHostKey(e.target.value)}
          placeholder="Host key"
          style={inputStyle}
        />
      )}

      {!status?.configured && (
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> and <code>GOOGLE_REDIRECT_URI</code> in <code>server/.env</code> to enable YouTube.
        </div>
      )}

      {status?.configured && (
        <div style={{ display: 'flex', gap: 8 }}>
          {!status.connected ? (
            <button onClick={connect} style={btn}>CONNECT YOUTUBE</button>
          ) : (
            <>
              <button onClick={loadVideos} style={btn}>REFRESH VIDEOS</button>
              <button onClick={disconnect} style={{ ...btn, background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}>
                DISCONNECT
              </button>
            </>
          )}
        </div>
      )}

      {status?.connected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {videos.map((v) => (
              <button
                key={v.videoId}
                onClick={() => pickVideo(v)}
                style={{
                  textAlign: 'left',
                  background: selected?.videoId === v.videoId ? 'rgba(0,168,255,0.12)' : 'rgba(255,255,255,0.03)',
                  border:
                    selected?.videoId === v.videoId
                      ? '1px solid rgba(0,168,255,0.4)'
                      : '1px solid rgba(255,255,255,0.06)',
                  padding: 10,
                  borderRadius: 12,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.title}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5 }}>{new Date(v.publishedAt).toLocaleDateString()}</div>
                </div>
              </button>
            ))}
            {videos.length === 0 && <div style={{ opacity: 0.5, fontSize: 12 }}>No videos found.</div>}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {selected ? (
              <>
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} style={inputStyle} placeholder="Title" />
                <textarea
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: 120 }}
                  placeholder="Description"
                />
                <input value={edit.tags} onChange={(e) => setEdit({ ...edit, tags: e.target.value })} style={inputStyle} placeholder="Tags (comma separated)" />
                <select value={edit.privacyStatus} onChange={(e) => setEdit({ ...edit, privacyStatus: e.target.value })} style={inputStyle}>
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>

                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.6 }}>CHAPTERS</div>
                  {chapters.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={c.time}
                        onChange={(e) => setChapters(chapters.map((x, j) => (i === j ? { ...x, time: e.target.value } : x)))}
                        placeholder="00:00"
                        style={{ ...inputStyle, width: 80 }}
                      />
                      <input
                        value={c.label}
                        onChange={(e) => setChapters(chapters.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))}
                        placeholder="Intro"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={() => setChapters(chapters.filter((_, j) => j !== i))} style={{ ...btn, background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setChapters([...chapters, { time: '00:00', label: '' }])}
                    style={{ ...btn, background: 'rgba(255,255,255,0.05)' }}
                  >
                    + ADD CHAPTER
                  </button>
                </div>

                <button onClick={saveEdits} style={btn}>SAVE METADATA</button>

                <div style={{ marginTop: 8 }}>
                  <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Post a comment on this video…" style={inputStyle} />
                  <button onClick={postComment} style={{ ...btn, marginTop: 6 }}>POST COMMENT</button>
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.5 }}>Select a video to edit.</div>
            )}
            {msg && <div style={{ fontSize: 12, opacity: 0.8 }}>{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
};

const btn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: COLORS.white,
  color: '#fff',
  fontWeight: 900,
  cursor: 'pointer',
  fontSize: 12,
};

export default YouTubeStudioPanel;
