import { randomBytes } from 'crypto';
import { Router } from 'express';
import { requireWorkspace, workspaceOwner } from '../middleware/workspace';

type Tokens = { access_token: string; refresh_token?: string; expiry: number; channelTitle?: string; channelId?: string; targetHandle?: string };
type Store = { getIntegration<T>(key: string): Promise<T | null>; setIntegration<T>(key: string, value: T): Promise<unknown> };

export function workspaceChannel(store: Store, request: typeof fetch = fetch) {
  const router = Router();
  const targetHandle = '@sccg24x7';
  const channelUrl = `https://www.youtube.com/${targetHandle}`;
  const matchesTarget = (tokens: Tokens | null) => Boolean(tokens?.channelId && tokens.targetHandle === targetHandle);
  const pending = new Map<string, { owner: string; expires: number }>();
  const key = (owner: string) => `youtube:${owner}`;
  const configured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
  const getToken = async (owner: string) => {
    const tokens = await store.getIntegration<Tokens>(key(owner));
    if (!tokens?.access_token || !matchesTarget(tokens)) throw new Error(`Connect ${targetHandle} in this workspace first.`);
    if (tokens.expiry > Date.now() + 30_000) return tokens.access_token;
    if (!tokens.refresh_token) throw new Error('Reconnect your YouTube channel.');
    const response = await request('https://oauth2.googleapis.com/token', {
      method: 'POST', signal: AbortSignal.timeout(30_000),
      body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token, grant_type: 'refresh_token' }),
    });
    if (!response.ok) throw new Error('Channel authorization expired. Reconnect YouTube.');
    const data = await response.json() as { access_token: string; expires_in: number };
    await store.setIntegration(key(owner), { ...tokens, access_token: data.access_token, expiry: Date.now() + data.expires_in * 1000 });
    return data.access_token;
  };

  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
  router.get('/callback', async (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const authorization = pending.get(state);
    pending.delete(state);
    if (!authorization || authorization.expires < Date.now() || typeof req.query.code !== 'string') {
      res.status(400).send('Channel connection expired or cancelled. Return to the editor and connect again.');
      return;
    }
    try {
      const response = await request('https://oauth2.googleapis.com/token', {
        method: 'POST', signal: AbortSignal.timeout(30_000),
        body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: process.env.GOOGLE_REDIRECT_URI!, grant_type: 'authorization_code' }),
      });
      if (!response.ok) throw new Error('Google authorization failed.');
      const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };
      const channelResponse = await request('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${data.access_token}` }, signal: AbortSignal.timeout(30_000),
      });
      if (!channelResponse.ok) throw new Error('Unable to verify your channel.');
      const channel = await channelResponse.json() as { items?: { id: string; snippet: { title: string } }[] };
      if (!channel.items?.length) throw new Error('No YouTube channel found.');
      const targetResponse = await request(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(targetHandle)}`, {
        headers: { Authorization: `Bearer ${data.access_token}` }, signal: AbortSignal.timeout(30_000),
      });
      if (!targetResponse.ok) throw new Error('Unable to verify the required channel.');
      const target = await targetResponse.json() as { items?: { id: string }[] };
      const channelId = target.items?.[0]?.id;
      if (!channelId || channel.items.length !== 1 || channel.items[0].id !== channelId) {
        res.status(403).send(`Authorize the ${targetHandle} YouTube channel. No connection was saved.`);
        return;
      }
      await store.setIntegration(key(authorization.owner), { ...data, expiry: Date.now() + data.expires_in * 1000,
        channelTitle: channel.items[0].snippet.title, channelId, targetHandle });
      res.type('html').send('<!doctype html><title>Channel connected</title><h1>YouTube connected</h1><p>Return to your editor and refresh the channel status.</p>');
    } catch { res.status(502).send('Could not connect YouTube. Return to the editor and retry.'); }
  });
  router.use(requireWorkspace);
  router.get('/status', async (req, res) => {
    try {
      const tokens = await store.getIntegration<Tokens>(key(workspaceOwner(req)));
      const connected = Boolean(tokens?.access_token && matchesTarget(tokens));
      res.json({ configured: configured(), connected, channelTitle: connected ? tokens?.channelTitle || targetHandle : null,
        targetHandle, channelUrl });
    } catch { res.status(500).json({ error: 'Could not read channel status.' }); }
  });
  router.get('/auth-url', (req, res) => {
    if (!configured()) { res.status(503).json({ error: 'YouTube connection is not configured on this server.' }); return; }
    for (const [state, entry] of pending) if (entry.expires < Date.now() || entry.owner === workspaceOwner(req)) pending.delete(state);
    if (pending.size >= 100) { res.status(429).json({ error: 'Too many channel connections in progress. Try later.' }); return; }
    const state = randomBytes(32).toString('hex');
    pending.set(state, { owner: workspaceOwner(req), expires: Date.now() + 10 * 60 * 1000 });
    const parameters = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code', scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload',
      state, access_type: 'offline', prompt: 'consent' });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${parameters}` });
  });
  router.post('/disconnect', async (req, res) => {
    try {
      await store.setIntegration(key(workspaceOwner(req)), { access_token: '', expiry: 0 });
      res.json({ disconnected: true });
    } catch { res.status(500).json({ error: 'Could not disconnect the channel.' }); }
  });
  return { router, getToken };
}