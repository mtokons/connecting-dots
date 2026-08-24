/**
 * Public/audience chat hook — separate channel from backstage.
 * Wraps the existing socket events so any page (Studio, viewer pages, etc.)
 * can render a public live-chat panel without re-implementing the protocol.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

export interface ChatMessage {
  id: string;
  roomId: string;
  ts: number;
  author: string;
  message: string;
  platform: string;
  channel: 'audience' | 'backstage';
  pinned?: boolean;
  deleted?: boolean;
}

interface UseAudienceChatReturn {
  messages: ChatMessage[];
  send: (text: string, author: string) => void;
  moderate: (messageId: string, action: 'delete' | 'pin') => void;
}

const useAudienceChat = (
  roomId: string | undefined,
  channel: 'audience' | 'backstage' = 'audience'
): UseAudienceChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { send: wsSend, on: wsOn, joinRoom } = useSocket();

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);

    const offHistory = wsOn('chat:history', (evt: any) => {
      const history = evt?.messages || evt;
      if (Array.isArray(history)) {
        setMessages(history.filter((m: ChatMessage) => m.channel === channel && !m.deleted));
      }
    });
    const offMessage = wsOn('chat:message', (msg: ChatMessage) => {
      if (msg.channel !== channel) return;
      setMessages((prev) => [...prev, msg]);
    });
    const offModeration = wsOn('chat:moderation', (p: { messageId: string; action: 'delete' | 'pin' }) => {
      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === p.messageId
              ? { ...m, deleted: p.action === 'delete', pinned: p.action === 'pin' ? true : m.pinned }
              : m
          )
          .filter((m) => !m.deleted)
      );
    });

    return () => { offHistory(); offMessage(); offModeration(); };
  }, [roomId, channel, joinRoom, wsOn]);

  const send = useCallback(
    (text: string, author: string) => {
      const trimmed = text.trim();
      if (!trimmed || !roomId) return;
      wsSend({
        type: 'chat:message',
        roomId,
        author,
        message: trimmed,
        platform: 'Web',
        channel,
      });
    },
    [roomId, channel, wsSend]
  );

  const moderate = useCallback(
    (messageId: string, action: 'delete' | 'pin') => {
      if (!roomId) return;
      wsSend({ type: 'chat:moderate', roomId, messageId, action });
    },
    [roomId, wsSend]
  );

  return { messages, send, moderate };
};

export default useAudienceChat;
