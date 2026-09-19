import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import { createVideoProjectsRouter } from './videoProjects';
import { VideoProjects } from '../services/videoProjects';
import { requireWorkspace } from '../middleware/workspace';

test('login-free workspace ownership and scoped phone transfer permissions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-api-'));
  const store = new VideoProjects(root);
  const app = express();
  app.use(express.json());
  app.use('/projects', createVideoProjectsRouter(store, requireWorkspace, async () => 'https://youtu.be/test'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/projects`;
  try {
    assert.equal((await fetch(base, { method: 'POST' })).status, 403);
    const created = await fetch(base, { method: 'POST', headers: { 'x-workspace-token': 'a'.repeat(64) } });
    assert.equal(created.status, 201);
    const project = await created.json() as { id: string; uploadToken: string };
    assert.equal((await fetch(`${base}/${project.id}`, { headers: { 'x-workspace-token': 'b'.repeat(64) } })).status, 404);
    assert.equal((await fetch(`${base}/${project.id}/transfer`)).status, 403);
    const headers = { 'x-upload-token': project.uploadToken, 'content-type': 'application/json' };
    const status = await fetch(`${base}/${project.id}/transfer`, { headers });
    assert.equal(status.status, 200);
    assert.equal('mediaToken' in (await status.json() as object), false);
    assert.equal((await fetch(`${base}/${project.id}/transfer/start`, { method: 'POST', headers,
      body: JSON.stringify({ name: 'clip.mp4', size: 3, fingerprint: 'a'.repeat(64) }) })).status, 200);
    const chunk = await fetch(`${base}/${project.id}/transfer/chunk`, { method: 'PUT',
      headers: { ...headers, 'content-type': 'application/octet-stream', 'x-upload-offset': '0' }, body: 'abc' });
    assert.equal(chunk.status, 200);
    assert.equal((await chunk.json() as { received: number }).received, 3);
    assert.equal((await fetch(`${base}/${project.id}/publish`, { method: 'POST', headers, body: '{}' })).status, 403);
    assert.equal((await fetch(`${base}/${project.id}`, { method: 'DELETE', headers: { 'x-workspace-token': 'a'.repeat(64) } })).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(root, { recursive: true, force: true });
  }
});