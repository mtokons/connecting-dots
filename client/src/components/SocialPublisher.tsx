import React, { useEffect, useState } from 'react';
import { API_BASE, COLORS, FONTS, DEFAULT_HOST_KEY } from '../utils/constants';

interface Targets {
  discord: boolean;
  slack: boolean;
  telegram: boolean;
  webhook: boolean;
}

interface Props {
  defaultTitle?: string;
  defaultMessage?: string;
  defaultUrl?: string;
  defaultImageUrl?: string;
}

/**
 * One-click publisher to all configured social channels (Discord, Slack,
 * Telegram, generic webhook → chain to X / LinkedIn / Instagram via free
 * Zapier or Make.com tier). Targets the server `/api/social/publish`
 * endpoint, which fans out in parallel.
 */
const SocialPublisher: React.FC<Props> = ({ defaultTitle = '', defaultMessage = '', defaultUrl = '', defaultImageUrl = '' }) => {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [message, setMessage] = useState(defaultMessage);
  const [url, setUrl] = useState(defaultUrl);
  const [imageUrl, setImageUrl] = useState(defaultImageUrl);
  const [hostKey, setHostKey] = useState(DEFAULT_HOST_KEY);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/social/targets`)
      .then((r) => r.json())
      .then(setTargets)
      .catch(() => setTargets({ discord: false, slack: false, telegram: false, webhook: false }));
  }, []);

  const publish = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const r = await fetch(`${API_BASE}/api/social/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-host-key': hostKey },
        body: JSON.stringify({ title, message, url, imageUrl }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setStatus(`Sent to ${data.count} channels.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const noTargets = targets && !targets.discord && !targets.slack && !targets.telegram && !targets.webhook;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 24,
        fontFamily: FONTS.ui,
        color: '#fff',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
        AUTO PUBLISH
      </div>

      {targets && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['discord', 'slack', 'telegram', 'webhook'] as const).map((k) => (
            <span
              key={k}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 900,
                borderRadius: 999,
                background: targets[k] ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                color: targets[k] ? '#10B981' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${targets[k] ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}
            >
              {k}
            </span>
          ))}
        </div>
      )}

      {noTargets && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
          No social channels configured. Set <code>DISCORD_WEBHOOK_URL</code>, <code>SLACK_WEBHOOK_URL</code>, <code>TELEGRAM_BOT_TOKEN</code>+<code>TELEGRAM_CHAT_ID</code>, or <code>GENERIC_WEBHOOK_URL</code> in <code>server/.env</code>.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={fieldStyle} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" style={{ ...fieldStyle, minHeight: 80 }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" style={fieldStyle} />
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" style={fieldStyle} />
        {!DEFAULT_HOST_KEY && (
          <input value={hostKey} onChange={(e) => setHostKey(e.target.value)} placeholder="Host key" type="password" style={fieldStyle} />
        )}
        <button
          onClick={publish}
          disabled={busy || !title || !message || !hostKey || noTargets || false}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: COLORS.white,
            color: '#fff',
            fontWeight: 900,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy || !title || !message ? 0.6 : 1,
          }}
        >
          {busy ? 'PUBLISHING…' : 'PUBLISH NOW'}
        </button>
        {status && <div style={{ fontSize: 12, opacity: 0.8 }}>{status}</div>}
      </div>
    </div>
  );
};

const fieldStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
};

export default SocialPublisher;
