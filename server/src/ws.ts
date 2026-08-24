/**
 * WebSocket hub — replaces Socket.IO with native `ws`.
 *
 * Single connection per client. All events (chat, captions, stream chunks,
 * studio controls, reactions) multiplexed over typed JSON messages.
 * Binary messages (stream chunks) sent as raw ArrayBuffer.
 *
 * Protocol:
 *   Text frames: JSON { type: string, ...payload }
 *   Binary frames: raw MediaRecorder chunks (for RTMP relay)
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

// ─── Types ───────────────────────────────────────────────────

interface WsClient {
  ws: WebSocket;
  id: string;
  rooms: Set<string>;
  alive: boolean;
}

type MessageHandler = (client: WsClient, payload: any) => void;
type BinaryHandler = (client: WsClient, data: Buffer) => void;

// ─── Hub ─────────────────────────────────────────────────────

const clients = new Map<string, WsClient>();
const handlers = new Map<string, MessageHandler>();
let binaryHandler: BinaryHandler | null = null;

let wss: WebSocketServer;

export function initWs(server: HttpServer, allowedOrigins: string[]) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Origin check
    const origin = req.headers.origin || '';
    if (origin && !allowedOrigins.includes(origin) && !origin.startsWith('http://localhost')) {
      ws.close(4003, 'Origin not allowed');
      return;
    }

    const client: WsClient = { ws, id: uuidv4(), rooms: new Set(), alive: true };
    clients.set(client.id, client);
    console.log(`🔌 WS connected: ${client.id}`);

    ws.on('message', (raw: RawData, isBinary: boolean) => {
      if (isBinary) {
        // Binary = stream chunk
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
        binaryHandler?.(client, buf);
        return;
      }

      // Text = JSON command
      try {
        const msg = JSON.parse(raw.toString());
        const handler = handlers.get(msg.type);
        if (handler) handler(client, msg);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('pong', () => { client.alive = true; });

    ws.on('close', () => {
      clients.delete(client.id);
      console.log(`🔌 WS disconnected: ${client.id}`);
    });

    ws.on('error', () => {
      clients.delete(client.id);
    });

    // Confirm connection
    send(ws, { type: 'connected', clientId: client.id });
  });

  // Heartbeat: ping every 30s, terminate dead connections
  setInterval(() => {
    for (const [id, client] of clients) {
      if (!client.alive) {
        client.ws.terminate();
        clients.delete(id);
        continue;
      }
      client.alive = false;
      client.ws.ping();
    }
  }, 30_000);
}

// ─── Messaging Helpers ───────────────────────────────────────

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/** Broadcast to all clients in a room. */
export function broadcast(roomId: string, data: object, exclude?: string) {
  const json = JSON.stringify(data);
  for (const client of clients.values()) {
    if (client.rooms.has(roomId) && client.id !== exclude) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(json);
      }
    }
  }
}

/** Send to a specific client. */
export function sendTo(clientId: string, data: object) {
  const client = clients.get(clientId);
  if (client) send(client.ws, data);
}

// ─── Handler Registration ────────────────────────────────────

export function onMessage(type: string, handler: MessageHandler) {
  handlers.set(type, handler);
}

export function onBinary(handler: BinaryHandler) {
  binaryHandler = handler;
}

// ─── Built-in Handlers ──────────────────────────────────────

// Room join
onMessage('room:join', async (client, msg) => {
  const roomId = typeof msg.roomId === 'string' ? msg.roomId.trim() : '';
  if (!roomId) return;
  client.rooms.add(roomId);
  send(client.ws, { type: 'room:joined', roomId });

  // Send chat history
  try {
    const history = await db.listChat(roomId, 100);
    send(client.ws, { type: 'chat:history', messages: history });
  } catch { /* non-fatal */ }
});

// Chat message
onMessage('chat:message', async (client, msg) => {
  const roomId = typeof msg.roomId === 'string' ? msg.roomId.trim() : '';
  const message = typeof msg.message === 'string' ? msg.message.trim() : '';
  const author = typeof msg.author === 'string' ? msg.author.trim() : 'Guest';
  const platform = typeof msg.platform === 'string' ? msg.platform.trim() : 'Backstage';
  const channel = msg.channel === 'audience' ? 'audience' : 'backstage';

  if (!roomId || !message) return;

  const chatEvent = {
    id: `${Date.now()}-${uuidv4().slice(0, 8)}`,
    roomId, ts: Date.now(),
    author: author.slice(0, 60),
    message: message.slice(0, 1000),
    platform: platform.slice(0, 32),
    channel, pinned: false, deleted: false,
  };

  db.appendChat(chatEvent).catch(() => {});
  broadcast(roomId, { type: 'chat:message', ...chatEvent });
});

// Chat moderation
onMessage('chat:moderate', async (_client, msg) => {
  if (!msg.roomId || !msg.messageId) return;
  if (msg.action === 'delete') {
    await db.deleteChat(msg.messageId).catch(() => {});
  }
  broadcast(msg.roomId, { type: 'chat:moderation', messageId: msg.messageId, action: msg.action });
});

// Live captions
onMessage('captions:line', (client, msg) => {
  if (!msg.roomId || !msg.text) return;
  broadcast(msg.roomId, {
    type: 'captions:line', speaker: msg.speaker, text: msg.text, final: msg.final, ts: Date.now(),
  }, client.id);
});

// Studio controls (admin → all)
onMessage('studio:control', (_client, msg) => {
  if (!msg.roomId) return;
  broadcast(msg.roomId, { type: 'studio:command', command: msg.command, value: msg.value });
});

// Reactions
onMessage('reaction', (client, msg) => {
  if (!msg.roomId || !msg.emoji) return;
  broadcast(msg.roomId, { type: 'reaction', emoji: msg.emoji }, client.id);
});

// Stream stop signal
onMessage('stream:stop', () => {
  console.log('⏹️  Stream stop signal via WS');
});

export default { initWs, broadcast, sendTo, onMessage, onBinary };
