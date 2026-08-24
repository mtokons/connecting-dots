import { Router, Request, Response } from 'express';
import { requireHostKey } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

/**
 * Auto-posting to free-tier social channels via webhooks.
 * Supported targets (any subset; configured via env):
 *   - Discord webhook
 *   - Slack incoming webhook
 *   - Telegram bot (BOT_TOKEN + CHAT_ID)
 *   - Generic JSON webhook (chain to Zapier / Make / IFTTT — fans out
 *     to X/Twitter, LinkedIn, Mastodon, etc. on their free tiers)
 */

interface PublishPayload {
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
  episodeId?: string;
}

const postDiscord = async (p: PublishPayload) => {
  if (!process.env.DISCORD_WEBHOOK_URL) return null;
  const body = {
    username: 'Connecting Dot Studio',
    embeds: [
      {
        title: p.title,
        description: p.message,
        url: p.url,
        image: p.imageUrl ? { url: p.imageUrl } : undefined,
        color: 0x00a8ff,
      },
    ],
  };
  const r = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { provider: 'discord', ok: r.ok, status: r.status };
};

const postSlack = async (p: PublishPayload) => {
  if (!process.env.SLACK_WEBHOOK_URL) return null;
  const text = `*${p.title}*\n${p.message}${p.url ? `\n<${p.url}|Watch / Read>` : ''}`;
  const r = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return { provider: 'slack', ok: r.ok, status: r.status };
};

const postTelegram = async (p: PublishPayload) => {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return null;
  const text = `*${p.title}*\n${p.message}${p.url ? `\n${p.url}` : ''}`;
  const r = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    }
  );
  return { provider: 'telegram', ok: r.ok, status: r.status };
};

const postGeneric = async (p: PublishPayload) => {
  if (!process.env.GENERIC_WEBHOOK_URL) return null;
  const r = await fetch(process.env.GENERIC_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  return { provider: 'webhook', ok: r.ok, status: r.status };
};

// POST /api/social/publish — fan out to every configured channel
router.post(
  '/publish',
  requireHostKey,
  rateLimit({ windowMs: 60_000, max: 10 }),
  async (req: Request, res: Response) => {
    const payload: PublishPayload = {
      title: (req.body.title || '').toString().slice(0, 200),
      message: (req.body.message || '').toString().slice(0, 2000),
      url: req.body.url ? req.body.url.toString() : undefined,
      imageUrl: req.body.imageUrl ? req.body.imageUrl.toString() : undefined,
      episodeId: req.body.episodeId ? req.body.episodeId.toString() : undefined,
    };

    if (!payload.title || !payload.message) {
      res.status(400).json({ error: 'title and message are required' });
      return;
    }

    const results = await Promise.all([
      postDiscord(payload).catch((e) => ({ provider: 'discord', ok: false, error: String(e) })),
      postSlack(payload).catch((e) => ({ provider: 'slack', ok: false, error: String(e) })),
      postTelegram(payload).catch((e) => ({ provider: 'telegram', ok: false, error: String(e) })),
      postGeneric(payload).catch((e) => ({ provider: 'webhook', ok: false, error: String(e) })),
    ]);

    const sent = results.filter(Boolean);
    res.json({ count: sent.length, results: sent });
  }
);

// GET /api/social/targets — which channels are wired up
router.get('/targets', (_req, res) => {
  res.json({
    discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
    slack: Boolean(process.env.SLACK_WEBHOOK_URL),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    webhook: Boolean(process.env.GENERIC_WEBHOOK_URL),
  });
});

export default router;
