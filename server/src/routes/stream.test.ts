import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router, { buildStreamEncodingArgs, getFfmpegProcess, parseStreamProgress, redactStreamError, resolveStreamTargets, stopOwnedStream } from './stream';

test('native H.264 is copied and live input is not throttled a second time', () => {
  const native = buildStreamEncodingArgs('h264');
  const fallback = buildStreamEncodingArgs('vp8');
  assert.equal(native[native.indexOf('-c:v') + 1], 'copy');
  assert.equal(native.includes('-vf'), false);
  assert.equal(fallback[fallback.indexOf('-c:v') + 1], 'libx264');
  for (const args of [native, fallback]) {
    assert.equal(args.includes('-re'), false);
    assert.equal(args.includes('+nobuffer'), false);
    assert.equal(args.includes('-progress'), true);
    assert.equal(args.includes('0:a:0?'), true);
  }
});

test('progress uses seconds and destination errors never include stream keys', () => {
  assert.deepEqual(parseStreamProgress({ frame: '300', fps: '30.0', out_time_us: '10000000', speed: '1.0x', dup_frames: '0', drop_frames: '1' }), {
    frames: 300, fps: 30, seconds: 10, speed: 1, duplicateFrames: 0, droppedFrames: 1,
  });
  assert.equal(redactStreamError('Failed rtmps://host/live2/private-key?secret=123: Broken pipe'), 'Failed [destination] Broken pipe');
});

test('saved destinations require explicit selection and never override an off switch', () => {
  const defaults = { RTMP_YOUTUBE_KEY: 'test-youtube-key', RTMP_FACEBOOK_KEY: 'test-facebook-key' };
  assert.deepEqual(resolveStreamTargets({}, defaults), []);
  assert.deepEqual(resolveStreamTargets({ youtube: true, facebook: false }, defaults), ['rtmp://a.rtmp.youtube.com/live2/test-youtube-key']);
  assert.deepEqual(resolveStreamTargets({ youtube: 'manual-youtube', facebook: '' }, defaults), ['rtmp://a.rtmp.youtube.com/live2/manual-youtube']);
  assert.deepEqual(resolveStreamTargets({ youtube: 'rtmp://127.0.0.1/private' }, defaults), []);
  assert.deepEqual(resolveStreamTargets({ youtube: true }, { RTMP_YOUTUBE_KEY: 'your_youtube_stream_key_here' }), []);
});

test('login-free stream API rejects unscoped access and arbitrary relay targets', async () => {
  const app = express();
  app.use(express.json());
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    assert.equal((await fetch(`${base}/start`, { method: 'POST' })).status, 403);
    const headers = { 'content-type': 'application/json', 'x-workspace-token': 'c'.repeat(64) };
    assert.equal((await fetch(`${base}/start`, { method: 'POST', headers, body: JSON.stringify({ targets: ['rtmp://127.0.0.1/private'] }) })).status, 400);
    assert.equal((await fetch(`${base}/start`, { method: 'POST', headers, body: JSON.stringify({ youtube: 'rtmp://127.0.0.1/private' }) })).status, 400);
    assert.equal((await fetch(`${base}/start`, { method: 'POST', headers, body: JSON.stringify({ youtube: true }) })).status, 403);
    assert.equal((await fetch(`${base}/status`, { headers })).status, 200);
    const destinations = await (await fetch(`${base}/destinations`, { headers })).json() as Record<string, unknown>;
    assert.equal(destinations.authorized, false);
    assert.equal(destinations.youtube, false);
    assert.equal((await fetch(`${base}/stop`, { method: 'POST', headers })).status, 200);
    assert.equal(getFfmpegProcess('other-workspace'), null);
    assert.equal(stopOwnedStream('other-workspace'), false);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});