import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router, { buildStreamEncodingArgs, getFfmpegProcess, parseStreamProgress, redactStreamError, resolveLabeledTargets, resolveStreamTargets, stopOwnedStream } from './stream';

test('stream encoding is optimized and live input is not throttled a second time', () => {
  const h264 = buildStreamEncodingArgs('h264');
  const vp8 = buildStreamEncodingArgs('vp8');
  // Browser H.264 is copied (no CPU transcode → always realtime for YouTube/Facebook)
  assert.equal(h264[h264.indexOf('-c:v') + 1], 'copy');
  assert.equal(h264.includes('libx264'), false);
  // VP8 fallback is transcoded to H.264
  assert.equal(vp8[vp8.indexOf('-c:v') + 1], 'libx264');
  for (const args of [h264, vp8]) {
    assert.equal(args.includes('-re'), false);
    assert.equal(args.includes('+nobuffer'), false);
    assert.equal(args.includes('-progress'), true);
    assert.equal(args.includes('0:a:0?'), true);
    assert.equal(args[args.indexOf('-c:a') + 1], 'aac');
  }
});

test('progress tracks media time and output bytes for copy liveness; errors never include keys', () => {
  assert.deepEqual(parseStreamProgress({ frame: '300', fps: '30.0', out_time_us: '10000000', speed: '1.0x', dup_frames: '0', drop_frames: '1', total_size: '2048' }), {
    frames: 300, fps: 30, seconds: 10, speed: 1, duplicateFrames: 0, droppedFrames: 1, outputBytes: 2048,
  });
  // Copy path reports frame=0 but still advances media time + bytes → must be detectable as flowing
  const copy = parseStreamProgress({ frame: '0', fps: '0.0', out_time_us: '5000000', total_size: '1024' });
  assert.equal(copy.frames, 0);
  assert.ok(copy.seconds > 0 && copy.outputBytes > 0);
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

test('labeled targets name each destination for per-destination status', () => {
  const defaults = { RTMP_YOUTUBE_KEY: 'yt-key', RTMP_FACEBOOK_KEY: 'fb-key' };
  assert.deepEqual(resolveLabeledTargets({ youtube: true, facebook: true }, defaults), [
    { name: 'YouTube', url: 'rtmp://a.rtmp.youtube.com/live2/yt-key' },
    { name: 'Facebook', url: 'rtmps://live-api-s.facebook.com:443/rtmp/fb-key' },
  ]);
  assert.deepEqual(resolveLabeledTargets({ facebook: true }, defaults).map((t) => t.name), ['Facebook']);
});

test('login-free stream API rejects unscoped access and arbitrary relay targets', async () => {
  const originalPublisher = process.env.STUDIO_PUBLISHER_WORKSPACE;
  process.env.STUDIO_PUBLISHER_WORKSPACE = 'workspace:locked-owner';
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
  } finally {
    process.env.STUDIO_PUBLISHER_WORKSPACE = originalPublisher;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});