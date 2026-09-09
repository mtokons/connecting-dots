import React, { useState } from 'react';
import { API_BASE, COLORS, FONTS, DEFAULT_HOST_KEY } from '../utils/constants';

interface Props {
  mode: 'live' | 'recorded';
  recordingFilename?: string;
  recordingBlob?: Blob | null;
  defaultTitle?: string;
  defaultMessage?: string;
}

const platforms = [
  { key: 'discord', name: 'Discord', icon: '💬', color: '#5865F2' },
  { key: 'slack', name: 'Slack', icon: '📨', color: '#4A154B' },
  { key: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088CC' },
  { key: 'webhook', name: 'Webhook', icon: '🔗', color: '#00A8FF' },
] as const;

const SocialMediaPanel: React.FC<Props> = ({
  mode,
  recordingFilename,
  recordingBlob,
  defaultTitle = '',
  defaultMessage = '',
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [message, setMessage] = useState(defaultMessage);
  const [url, setUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [availableTargets, setAvailableTargets] = useState<Record<string, boolean> | null>(null);

  // Fetch available targets on mount
  React.useEffect(() => {
    fetch(`${API_BASE}/api/social/targets`)
      .then((r) => r.json())
      .then(setAvailableTargets)
      .catch(() => setAvailableTargets({ discord: false, slack: false, telegram: false, webhook: false }));
  }, []);

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const publish = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const hostKey = DEFAULT_HOST_KEY || '';
      const body: Record<string, unknown> = { title, message, url };

      if (scheduleEnabled && scheduleDate && scheduleTime) {
        body.scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
      }

      // If we have a recording blob, upload with media
      if (recordingBlob) {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('message', message);
        if (url) fd.append('url', url);
        fd.append('file', recordingBlob, `clip-${Date.now()}.mp4`);

        const r = await fetch(`${API_BASE}/api/social/publish`, {
          method: 'POST',
          headers: { 'x-host-key': hostKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setStatus(`Published to ${data.count} channels.`);
      } else {
        const r = await fetch(`${API_BASE}/api/social/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-host-key': hostKey },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setStatus(
          scheduleEnabled
            ? `Scheduled for ${scheduleDate} ${scheduleTime}`
            : `Published to ${data.count} channels.`
        );
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 20,
        fontFamily: FONTS.ui,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
          {mode === 'live' ? 'SOCIAL • LIVE' : 'SOCIAL • PUBLISH'}
        </div>
        {mode === 'recorded' && recordingFilename && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              background: 'rgba(16,185,129,0.12)',
              color: '#10B981',
              padding: '4px 10px',
              borderRadius: 8,
              letterSpacing: '0.1em',
            }}
          >
            📹 {recordingFilename.length > 20 ? recordingFilename.slice(0, 20) + '…' : recordingFilename}
          </div>
        )}
      </div>

      {/* Platform Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {platforms.map((p) => {
          const available = availableTargets?.[p.key] ?? false;
          const selected = selectedPlatforms.has(p.key);

          return (
            <button
              key={p.key}
              onClick={() => available && togglePlatform(p.key)}
              disabled={!available}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                border: selected ? `1px solid ${p.color}` : '1px solid rgba(255,255,255,0.08)',
                background: selected ? `${p.color}15` : 'rgba(0,0,0,0.2)',
                color: selected ? p.color : available ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                fontSize: 11,
                fontWeight: 800,
                cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.4,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{p.icon}</span>
              {p.name}
              {!available && <span style={{ fontSize: 8, opacity: 0.6 }}>(N/A)</span>}
            </button>
          );
        })}
      </div>

      {/* Content Fields */}
      <div style={{ display: 'grid', gap: 10 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          style={fieldStyle}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message — share your podcast highlights!"
          rows={3}
          style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link to episode (optional)"
          style={fieldStyle}
        />
      </div>

      {/* Schedule Toggle */}
      {mode === 'recorded' && (
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: 14,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              style={{ accentColor: COLORS.white }}
            />
            Schedule for later
          </label>
          {scheduleEnabled && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{ ...fieldStyle, flex: 1 }}
              />
            </div>
          )}
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={publish}
        disabled={busy || !title.trim() || !message.trim()}
        style={{
          padding: '14px 18px',
          borderRadius: 14,
          border: 'none',
          background: mode === 'live'
            ? 'linear-gradient(180deg, #FF4D4D 0%, #A00000 100%)'
            : 'linear-gradient(180deg, #00A8FF 0%, #0057A8 100%)',
          color: '#fff',
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: '0.1em',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy || !title.trim() || !message.trim() ? 0.6 : 1,
          boxShadow: mode === 'live'
            ? '0 8px 24px rgba(255,77,77,0.3)'
            : '0 8px 24px rgba(0,168,255,0.3)',
        }}
      >
        {busy
          ? 'PUBLISHING…'
          : scheduleEnabled
          ? '📅 SCHEDULE POST'
          : mode === 'live'
          ? '🔴 PUBLISH LIVE UPDATE'
          : '🚀 PUBLISH NOW'}
      </button>

      {/* Status */}
      {status && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: status.includes('fail') || status.includes('error') ? '#FF4D4D' : '#10B981',
            background: status.includes('fail') || status.includes('error')
              ? 'rgba(255,77,77,0.08)'
              : 'rgba(16,185,129,0.08)',
            padding: '10px 14px',
            borderRadius: 10,
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
};

const fieldStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
};

export default SocialMediaPanel;
