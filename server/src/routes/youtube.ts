import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { db } from '../db';
import { requireHostKey } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 256 * 1024 * 1024 } });

/**
 * YouTube Data API v3 — free quota OAuth integration.
 *
 * Provides:
 *   - OAuth 2.0 code flow (auth-url + callback)
 *   - List recent uploads on the connected channel
 *   - Edit video metadata (title, description, tags, privacy, chapters)
 *   - Resumable-style multipart upload of a recording
 *   - Post a comment on a live broadcast
 *
 * Tokens are stored via the DB abstraction under integration key `youtube`.
 * No client secret ever touches the browser.
 */

const oauthConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.upload',
].join(' ');

interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry: number; // epoch ms
  scope?: string;
  channelTitle?: string;
}

const loadTokens = () => db.getIntegration<StoredTokens>('youtube');
const saveTokens = (t: StoredTokens) => db.setIntegration('youtube', t);

const ensureFreshAccessToken = async (): Promise<string> => {
  const tokens = await loadTokens();
  if (!tokens) throw new Error('YouTube not connected. Visit /api/youtube/auth-url first.');
  if (tokens.expiry > Date.now() + 30_000) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error('Access token expired and no refresh_token available — reconnect.');

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = (await resp.json()) as any;
  if (!resp.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  const next: StoredTokens = {
    ...tokens,
    access_token: data.access_token,
    expiry: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  await saveTokens(next);
  return next.access_token;
};

// ─── OAuth ──────────────────────────────────────────────────

router.get('/auth-url', requireHostKey, (_req, res) => {
  if (!oauthConfigured()) {
    res.status(503).json({ error: 'GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI not configured' });
    return;
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).send('Missing code');
    return;
  }
  if (!oauthConfigured()) {
    res.status(503).send('Google OAuth not configured');
    return;
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    });
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));

    const tokens: StoredTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry: Date.now() + (data.expires_in ?? 3600) * 1000,
      scope: data.scope,
    };

    // Fetch channel title for display
    try {
      const c = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      const cd = (await c.json()) as any;
      tokens.channelTitle = cd?.items?.[0]?.snippet?.title;
    } catch {
      /* non-fatal */
    }

    await saveTokens(tokens);
    res.send(
      `<html><body style="font-family:system-ui;background:#050a15;color:#fff;display:grid;place-items:center;height:100vh"><div><h2>✅ YouTube connected${tokens.channelTitle ? ` — ${tokens.channelTitle}` : ''}</h2><p>You can close this window and return to the studio.</p></div></body></html>`
    );
  } catch (err) {
    res.status(500).send(`OAuth exchange failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
});

router.get('/status', requireHostKey, async (_req, res) => {
  const t = await loadTokens();
  res.json({
    configured: oauthConfigured(),
    connected: Boolean(t?.access_token),
    channelTitle: t?.channelTitle ?? null,
    expiresInSeconds: t ? Math.max(0, Math.floor((t.expiry - Date.now()) / 1000)) : 0,
  });
});

router.post('/disconnect', requireHostKey, async (_req, res) => {
  await saveTokens({ access_token: '', expiry: 0 });
  res.json({ status: 'disconnected' });
});

// ─── Video listing & editing ────────────────────────────────

router.get('/videos', requireHostKey, async (_req, res) => {
  try {
    const access = await ensureFreshAccessToken();
    // Get uploads playlist id
    const ch = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true',
      { headers: { Authorization: `Bearer ${access}` } }
    );
    const chData = (await ch.json()) as any;
    const uploads =
      chData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) {
      res.json({ videos: [] });
      return;
    }
    const items = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=${uploads}`,
      { headers: { Authorization: `Bearer ${access}` } }
    );
    const itemsData = (await items.json()) as any;
    const videos = (itemsData?.items ?? []).map((it: any) => ({
      videoId: it.contentDetails.videoId,
      title: it.snippet.title,
      description: it.snippet.description,
      publishedAt: it.snippet.publishedAt,
      thumbnail: it.snippet.thumbnails?.medium?.url,
    }));
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  }
});

router.patch('/videos/:id', requireHostKey, async (req, res) => {
  try {
    const access = await ensureFreshAccessToken();
    const { title, description, tags, categoryId, privacyStatus, chapters } = req.body as {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
      privacyStatus?: 'public' | 'unlisted' | 'private';
      chapters?: Array<{ time: string; label: string }>;
    };

    // Fetch existing snippet so we can patch only changed fields
    const current = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${req.params.id}`,
      { headers: { Authorization: `Bearer ${access}` } }
    );
    const cur = (await current.json()) as any;
    const item = cur?.items?.[0];
    if (!item) {
      res.status(404).json({ error: 'Video not found on connected channel' });
      return;
    }

    let nextDescription = description ?? item.snippet.description ?? '';
    if (chapters && chapters.length) {
      const chapterText =
        '\n\nChapters:\n' +
        chapters.map((c) => `${c.time} ${c.label}`).join('\n');
      // Remove an old "Chapters:" block if present, then append fresh.
      nextDescription = nextDescription.replace(/\n?Chapters:[\s\S]*$/i, '') + chapterText;
    }

    const body = {
      id: req.params.id,
      snippet: {
        title: title ?? item.snippet.title,
        description: nextDescription,
        tags: tags ?? item.snippet.tags,
        categoryId: categoryId ?? item.snippet.categoryId ?? '22',
      },
      status: privacyStatus
        ? { privacyStatus, selfDeclaredMadeForKids: false }
        : item.status,
    };

    const r = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    const data = (await r.json()) as any;
    if (!r.ok) {
      res.status(502).json({ error: 'Update failed', details: data });
      return;
    }
    res.json({ status: 'updated', video: data });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  }
});

// POST /api/youtube/comment — comment on a live broadcast / video
router.post('/comment', requireHostKey, async (req, res) => {
  const { videoId, text } = req.body as { videoId?: string; text?: string };
  if (!videoId || !text) {
    res.status(400).json({ error: 'videoId and text required' });
    return;
  }
  try {
    const access = await ensureFreshAccessToken();
    const r = await fetch(
      'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            videoId,
            topLevelComment: { snippet: { textOriginal: text } },
          },
        }),
      }
    );
    const data = (await r.json()) as any;
    if (!r.ok) {
      res.status(502).json({ error: 'Comment failed', details: data });
      return;
    }
    res.json({ status: 'posted', id: data.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  }
});

// POST /api/youtube/upload — multipart upload of a video file (free quota: ~6/day)
router.post('/upload', requireHostKey, upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file (multipart) required' });
    return;
  }
  try {
    const access = await ensureFreshAccessToken();
    const meta = {
      snippet: {
        title: (req.body.title as string) || `Connecting Dot — ${new Date().toISOString()}`,
        description: (req.body.description as string) || 'Recorded on Connecting Dot Studio.',
        tags: req.body.tags ? (req.body.tags as string).split(',').map((s) => s.trim()) : [],
        categoryId: (req.body.categoryId as string) || '22',
      },
      status: {
        privacyStatus: (req.body.privacyStatus as string) || 'unlisted',
        selfDeclaredMadeForKids: false,
      },
    };

    // Multipart related upload (RFC 1867) — simplest one-shot path on the free quota.
    const boundary = `cd_boundary_${Date.now()}`;
    const head =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(meta) +
      `\r\n--${boundary}\r\nContent-Type: ${req.file.mimetype || 'video/*'}\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;
    const body = Buffer.concat([Buffer.from(head, 'utf8'), req.file.buffer, Buffer.from(tail, 'utf8')]);

    const r = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': body.length.toString(),
        },
        body,
      }
    );
    const data = (await r.json()) as any;
    if (!r.ok) {
      res.status(502).json({ error: 'Upload failed', details: data });
      return;
    }
    res.json({ status: 'uploaded', videoId: data.id, url: `https://youtu.be/${data.id}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  } finally {
    if (req.file && (req.file as any).path && fs.existsSync((req.file as any).path)) {
      try {
        fs.unlinkSync((req.file as any).path);
      } catch {
        /* memory storage — no-op */
      }
    }
  }
});

export default router;
