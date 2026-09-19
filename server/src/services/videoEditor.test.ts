import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { probeMedia, renderVideo, runMedia, validateEdit } from './videoEditor';

const edit = { segments: [{ start: 0, end: 1 }, { start: 2, end: 3 }], format: 'shorts', frame: 'studio', voice: true,
  overlays: [{ text: "Connecting Dot: 100% 'ready'", start: 0, end: 1.8, position: 'bottom', animation: 'fade' }] };

test('rejects invalid cuts and text timing', () => {
  assert.equal(validateEdit(edit, 3).segments.length, 2);
  assert.throws(() => validateEdit({ ...edit, segments: [{ start: 2, end: 1 }] }, 3));
  assert.throws(() => validateEdit({ ...edit, segments: [{ start: 0, end: 4 }] }, 3));
  assert.throws(() => validateEdit({ ...edit, segments: [{ start: 0, end: 2 }, { start: 1, end: 3 }] }, 3));
  assert.throws(() => validateEdit({ ...edit, overlays: [{ ...edit.overlays[0], end: 8 }] }, 3));
});

test('native render cuts, frames, animates text and preserves audio', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-editor-'));
  try {
    await runMedia('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '3', '-c:v', 'libx264', '-c:a', 'aac', '-f', 'mp4', path.join(directory, 'source')]);
    const source = await probeMedia(path.join(directory, 'source'));
    assert.equal(source.audio, true);
    await renderVideo(directory, source, edit, () => {});
    const result = await probeMedia(path.join(directory, 'render.mp4'));
    assert.equal(result.width, 1080);
    assert.equal(result.height, 1920);
    assert.equal(result.audio, true);
    assert.ok(Math.abs(result.duration - 2) < 0.2);
    await renderVideo(directory, { ...source, audio: false }, { ...edit, format: 'landscape', studio: 'sccg-interview', overlays: [] }, () => {});
    const silent = await probeMedia(path.join(directory, 'render.mp4'));
    assert.equal(silent.width, 1920);
    assert.equal(silent.audio, false);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});