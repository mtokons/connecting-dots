import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { uploadVideoFile } from './youtubeUpload';

test('YouTube transfer resumes at acknowledged offset and returns confirmed video ID', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-youtube-'));
  const filename = path.join(root, 'render.mp4');
  await fs.writeFile(filename, 'abcdef');
  let requests = 0;
  const mockFetch: typeof fetch = async (_url, options) => {
    requests++;
    if (requests === 1) {
      assert.equal(options?.method, 'POST');
      assert.equal(JSON.parse(String(options?.body)).status.privacyStatus, 'private');
      return new Response(null, { status: 200, headers: { location: 'https://www.googleapis.com/upload/session' } });
    }
    const headers = options?.headers as Record<string, string>;
    if (requests === 2) {
      assert.equal(headers['Content-Range'], 'bytes 0-5/6');
      const chunks: Buffer[] = [];
      for await (const chunk of options?.body as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
      assert.equal(Buffer.concat(chunks).toString(), 'abcdef');
      throw new Error('Connection interrupted after server accepted 3 bytes');
    }
    if (requests === 3) {
      assert.equal(headers['Content-Range'], 'bytes */6');
      return new Response(null, { status: 308, headers: { range: 'bytes=0-2' } });
    }
    assert.equal(headers['Content-Range'], 'bytes 3-5/6');
    const chunks: Buffer[] = [];
    for await (const chunk of options?.body as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), 'def');
    return Response.json({ id: 'video_123' });
  };
  try {
    assert.equal(await uploadVideoFile(filename, { title: 'Test', description: '', privacyStatus: 'private', madeForKids: false },
      async () => 'test-access-token', mockFetch), 'https://youtu.be/video_123');
    assert.equal(requests, 4);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});