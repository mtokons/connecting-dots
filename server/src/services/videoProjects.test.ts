import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { VideoProjects, tokenMatches, MAX_VIDEO_BYTES, MAX_PROJECTS, ProjectError } from './videoProjects';
import { runMedia } from './videoEditor';

test('upload offsets, restart recovery, quotas, and token comparisons', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-projects-'));
  try {
    const store = new VideoProjects(root);
    const project = await store.create('admin@example.test');
    assert.equal(store.list('other@example.test').length, 0);
    assert.ok(tokenMatches(project.uploadToken, project.uploadToken));
    assert.equal(tokenMatches('invalid', project.uploadToken), false);
    assert.throws(() => store.directory('../../etc'), ProjectError);
    await assert.rejects(store.beginUpload(project.id, 'test.mp4', MAX_VIDEO_BYTES + 1, 'a'.repeat(64)));
    await store.beginUpload(project.id, 'test.mp4', 6, 'a'.repeat(64));
    await store.exclusive(project.id, (current) => store.append(current, 0, Buffer.from('abc')));
    await assert.rejects(store.exclusive(project.id, (current) => store.append(current, 0, Buffer.from('abc'))));
    await assert.rejects(store.finishUpload(project.id));
    const reloaded = new VideoProjects(root);
    await reloaded.initialized;
    assert.equal(reloaded.get(project.id).received, 3);
    await reloaded.exclusive(project.id, (current) => reloaded.append(current, 3, Buffer.from('def')));
    assert.equal((await fs.readFile(path.join(root, project.id, 'source'))).toString(), 'abcdef');
    for (let index = 0; index < MAX_PROJECTS - 1; index++) await reloaded.create('admin@example.test');
    await assert.rejects(reloaded.create('admin@example.test'));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('cleanup protects active uploads and removes expired scratch files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-cleanup-'));
  try {
    const store = new VideoProjects(root);
    const project = await store.create('admin@example.test');
    await store.exclusive(project.id, async () => {
      await store.cleanup(project.expiresAt + 1);
      assert.equal(store.get(project.id).id, project.id);
      await assert.rejects(store.remove(project.id));
    });
    await store.cleanup(project.expiresAt + 1);
    assert.throws(() => store.get(project.id));
    assert.deepEqual(await fs.readdir(root), []);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('video upload, saved edits, render, publishing retry and automatic media purge', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-workflow-'));
  const settle = (store: VideoProjects, id: string, expected: string) => new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 30_000;
    let checking = false;
    const interval = setInterval(() => {
      if (checking) return;
      if (Date.now() > deadline) { clearInterval(interval); reject(new Error(`Job did not reach ${expected}`)); return; }
      checking = true;
      void store.exclusive(id, async (project) => {
        if (project.status === expected) { clearInterval(interval); resolve(); }
      }).catch(() => {}).finally(() => { checking = false; });
    }, 20);
  });
  try {
    const filename = path.join(root, 'fixture.mp4');
    await runMedia('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440',
      '-t', '3', '-c:v', 'libx264', '-c:a', 'aac', filename]);
    const data = await fs.readFile(filename);
    const store = new VideoProjects(path.join(root, 'projects'));
    const project = await store.create('admin@example.test');
    await store.beginUpload(project.id, 'fixture.mp4', data.length, 'b'.repeat(64));
    await store.exclusive(project.id, (current) => store.append(current, 0, data));
    await store.finishUpload(project.id);
    await store.updateEdit(project.id, { ...project.edit, segments: [{ start: 0, end: 1 }, { start: 2, end: 3 }],
      format: 'shorts', voice: true, overlays: [{ text: 'Channel', start: 0, end: 1.5, position: 'top', animation: 'fade' }] });
    await store.startRender(project.id);
    await assert.rejects(store.remove(project.id));
    await settle(store, project.id, 'rendered');
    await fs.access(path.join(store.directory(project.id), 'render.mp4'));
    await store.publish(project.id, async () => { throw new Error('Simulated YouTube outage'); });
    await settle(store, project.id, 'rendered');
    await fs.access(path.join(store.directory(project.id), 'source'));
    await store.publish(project.id, async (output) => {
      assert.ok((await fs.stat(output)).size > 0);
      return 'https://youtu.be/test-video';
    });
    await settle(store, project.id, 'published');
    assert.deepEqual(await fs.readdir(store.directory(project.id)), ['project.json']);
    assert.equal(project.youtubeUrl, 'https://youtu.be/test-video');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});