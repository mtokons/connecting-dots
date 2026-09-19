import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHash } from 'crypto';
import { workspaceChannel } from './workspaceChannel';

test('anonymous channel connections are isolated and reject unsolicited OAuth callbacks', async () => {
  const records = new Map<string, unknown>();
  const owner = `workspace:${createHash('sha256').update('a'.repeat(64)).digest('hex')}`;
  records.set(`youtube:${owner}`, { access_token: 'test-access', expiry: Date.now() + 600000, channelTitle: 'Test channel', channelId: 'UC-intended', targetHandle: '@sccg24x7' });
  records.set('youtube', { access_token: 'legacy-private-channel', expiry: Date.now() + 600000 });
  const channel = workspaceChannel({
    async getIntegration<Value>(key: string) { return (records.get(key) as Value) || null; },
    async setIntegration(key, value) { records.set(key, value); },
  });
  const app = express();
  app.use(channel.router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    assert.equal((await fetch(`${base}/status`)).status, 403);
    const mine = await fetch(`${base}/status`, { headers: { 'x-workspace-token': 'a'.repeat(64) } });
    assert.equal((await mine.json() as { connected: boolean }).connected, true);
    const other = await fetch(`${base}/status`, { headers: { 'x-workspace-token': 'b'.repeat(64) } });
    assert.equal((await other.json() as { connected: boolean }).connected, false);
    assert.equal((await fetch(`${base}/callback?code=invalid&state=invalid`)).status, 400);
    await assert.rejects(channel.getToken('unknown-workspace'));
    assert.equal(await channel.getToken(owner), 'test-access');
    records.set(`youtube:${owner}`, { access_token: 'old-unverified', expiry: Date.now() + 600000 });
    await assert.rejects(channel.getToken(owner), /Connect @sccg24x7/);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('OAuth saves only the required YouTube channel and consumes callback state', async () => {
  const previous = { ...process.env };
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.GOOGLE_REDIRECT_URI = 'https://example.test/callback';
  const records = new Map<string, unknown>();
  let authorizedId = 'UC-other';
  const request = (async (url: string | URL | Request) => {
    const address = String(url);
    if (address.includes('oauth2.googleapis.com')) return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 });
    if (address.includes('forHandle=')) {
      assert.equal(new URL(address).searchParams.get('forHandle'), '@sccg24x7');
      return Response.json({ items: [{ id: 'UC-intended' }] });
    }
    return Response.json({ items: [{ id: authorizedId, snippet: { title: 'SCCG' } }] });
  }) as typeof fetch;
  const channel = workspaceChannel({
    async getIntegration<Value>(key: string) { return (records.get(key) as Value) || null; },
    async setIntegration(key, value) { records.set(key, value); },
  }, request);
  const app = express();
  app.use(channel.router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = { 'x-workspace-token': 'c'.repeat(64) };
  try {
    for (const expectedStatus of [403, 200]) {
      const authorization = await fetch(`${base}/auth-url`, { headers }).then(response => response.json()) as { url: string };
      const state = new URL(authorization.url).searchParams.get('state');
      const callback = `${base}/callback?code=test&state=${state}`;
      assert.equal((await fetch(callback)).status, expectedStatus);
      assert.equal(records.size, expectedStatus === 403 ? 0 : 1);
      assert.equal((await fetch(callback)).status, 400);
      authorizedId = 'UC-intended';
    }
    const status = await fetch(`${base}/status`, { headers }).then(response => response.json()) as { connected: boolean; channelUrl: string };
    assert.equal(status.connected, true);
    assert.equal(status.channelUrl, 'https://www.youtube.com/@sccg24x7');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const name of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
});