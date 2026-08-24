import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireHostKey } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * Audience + backstage chat persistence and moderation.
 * Realtime fan-out happens in `index.ts` via Socket.io; this REST surface
 * is for history loading, moderation, and AI-pinned highlights.
 */

// GET /api/chat/:roomId  — history (most recent N)
router.get('/:roomId', rateLimit({ windowMs: 10_000, max: 30 }), async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  try {
    const messages = await db.listChat(String(req.params.roomId), limit);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// POST /api/chat/:roomId  — REST send (mirrors socket event for non-WS clients)
router.post('/:roomId', rateLimit({ windowMs: 10_000, max: 60 }), async (req: Request, res: Response) => {
  const { author, message, platform, channel } = req.body as {
    author?: string;
    message?: string;
    platform?: string;
    channel?: 'audience' | 'backstage';
  };
  const text = (message ?? '').toString().trim();
  if (!text) {
    res.status(400).json({ error: 'message required' });
    return;
  }
  const event = {
    id: `${Date.now()}-${uuidv4().slice(0, 8)}`,
    roomId: req.params.roomId,
    ts: Date.now(),
    author: (author ?? 'Guest').toString().slice(0, 60),
    message: text.slice(0, 1000),
    platform: (platform ?? 'Web').toString().slice(0, 32),
    channel: channel === 'backstage' ? 'backstage' : 'audience',
    pinned: false,
    deleted: false,
  };
  try {
    await db.appendChat(event);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to persist message' });
  }
});

// DELETE /api/chat/:roomId/:messageId — moderation (host-key required)
router.delete('/:roomId/:messageId', requireHostKey, async (req, res) => {
  try {
    await db.deleteChat(String(req.params.messageId));
    res.json({ status: 'deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
