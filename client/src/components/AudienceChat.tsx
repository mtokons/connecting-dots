import React, { useMemo, useRef, useState, useEffect } from 'react';
import useAudienceChat from '../hooks/useAudienceChat';
import { COLORS, FONTS, API_BASE, DEFAULT_HOST_KEY } from '../utils/constants';

interface Props {
  roomId: string | undefined;
  /** Display name to send with each message. */
  author: string;
  /** Hosts/co-hosts get moderation buttons. */
  isHost?: boolean;
  /** Public audience chat by default; pass 'backstage' for the team channel. */
  channel?: 'audience' | 'backstage';
}

/**
 * Live audience chat panel — separate from the existing backstage chat.
 * - Real-time via socket.io (with persisted history on join).
 * - Hosts can pin (highlight) or delete messages.
 * - "AI Highlight" button asks the existing /api/ai/highlight endpoint
 *   to pick the most engaging recent message.
 */
const AudienceChat: React.FC<Props> = ({ roomId, author, isHost = false, channel = 'audience' }) => {
  const { messages, send, moderate } = useAudienceChat(roomId, channel);
  const [text, setText] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const visible = useMemo(() => messages.filter((m) => !m.deleted).slice(-200), [messages]);

  const requestAIHighlight = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/ai/highlight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: visible.slice(-15).map((m) => ({ id: m.id, author: m.author, message: m.message })),
        }),
      });
      const data = await r.json();
      if (data?.highlightId) setHighlightId(data.highlightId);
    } catch {
      /* non-fatal */
    }
  };

  const moderateWithKey = async (id: string, action: 'delete' | 'pin') => {
    moderate(id, action);
    // Also call REST so persistence is updated when running over Supabase
    if (action === 'delete') {
      try {
        const key = DEFAULT_HOST_KEY || prompt('Host key:') || '';
        if (!key) return;
        await fetch(`${API_BASE}/api/chat/${roomId}/${id}`, {
          method: 'DELETE',
          headers: { 'x-host-key': key },
        });
      } catch {
        /* socket fan-out already happened */
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONTS.ui, fontSize: 12, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}>
          {channel === 'audience' ? 'AUDIENCE CHAT' : 'BACKSTAGE'}
        </span>
        <button
          onClick={requestAIHighlight}
          style={{
            background: 'rgba(0,168,255,0.12)',
            border: '1px solid rgba(0,168,255,0.3)',
            color: COLORS.white,
            padding: '6px 12px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          ✨ AI HIGHLIGHT
        </button>
      </div>

      <div
        ref={scrollerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 16,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {visible.length === 0 && (
          <div style={{ opacity: 0.4, textAlign: 'center', padding: 24, fontSize: 12 }}>No messages yet.</div>
        )}
        {visible.map((m) => (
          <div
            key={m.id}
            style={{
              padding: 10,
              borderRadius: 12,
              background:
                m.id === highlightId
                  ? 'linear-gradient(135deg, rgba(0,168,255,0.2), rgba(0,87,168,0.1))'
                  : 'rgba(255,255,255,0.04)',
              border:
                m.id === highlightId
                  ? '1px solid rgba(0,168,255,0.4)'
                  : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.white }}>{m.author}</span>
              {isHost && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => moderate(m.id, 'pin')}
                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => moderateWithKey(m.id, 'delete')}
                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,77,77,0.1)', border: 'none', color: '#FF4D4D', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', wordBreak: 'break-word' }}>
              {m.message}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text, author);
          setText('');
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message…"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 16px',
            borderRadius: 12,
            border: 'none',
            background: COLORS.white,
            color: '#fff',
            fontWeight: 900,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
};

export default AudienceChat;
