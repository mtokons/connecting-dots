import { test, expect, type Page, type WebSocketRoute } from '@playwright/test';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createRequire } from 'node:module';
import { selectCaptureProfile, cameraFilter, exposureGain, containRect, DEFAULT_CAMERA_GRADE } from '../src/lib/studioMedia';

const { buildStreamEncodingArgs, parseStreamProgress } = createRequire(import.meta.url)('../../server/dist/routes/stream.js') as typeof import('../../server/src/routes/stream');

const initialHealth = { status: 'starting', frames: 0, fps: 0, speed: 0, seconds: 0, bytesReceived: 0, duplicateFrames: 0, droppedFrames: 0, error: null as string | null };

async function services(page: Page, options: {
  start?: (body: Record<string, unknown>) => void;
  binary?: (chunk: Buffer) => void;
  end?: () => void;
  stopped?: () => Promise<unknown>;
  health?: () => typeof initialHealth;
  authorized?: boolean;
} = {}) {
  let bytes = 0;
  let active = false;
  let socket: WebSocketRoute | undefined;
  const starts: Record<string, unknown>[] = [];
  await page.route('**/api-config.json', (route) => route.fulfill({ json: { apiBase: 'http://127.0.0.1:5188' } }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/livekit/token') return route.fulfill({ status: 503, json: { error: 'Local-only test' } });
    if (url.pathname === '/api/stream/destinations') return route.fulfill({ json: { publisherId: 'workspace:test-publisher', authorized: options.authorized !== false, youtube: options.authorized !== false, facebook: options.authorized !== false } });
    if (url.pathname === '/api/stream/start') {
      const body = route.request().postDataJSON();
      starts.push(body); active = true; bytes = 0; options.start?.(body);
      return route.fulfill({ json: { status: 'starting' } });
    }
    if (url.pathname === '/api/stream/status') return route.fulfill({ json: options.health?.() || { ...initialHealth, status: active ? bytes ? 'live' : 'starting' : 'stopped', frames: bytes ? 90 : 0, fps: bytes ? 30 : 0, bytesReceived: bytes } });
    if (url.pathname === '/api/stream/stop') {
      active = false; options.end?.(); await options.stopped?.();
      return route.fulfill({ json: { status: 'stopped' } });
    }
    return route.fulfill({ status: 404, json: { error: 'Network publishing is blocked in studio tests.' } });
  });
  await page.routeWebSocket(/\/ws(?:\?|$)/, (route) => {
    socket = route;
    route.onMessage((message) => {
      if (typeof message === 'string') {
        const command = JSON.parse(message);
        if (command.type === 'stream:stop') {
          options.end?.();
          route.send(JSON.stringify({ type: 'stream:drained', requestId: command.requestId }));
        }
      } else { bytes += message.length; options.binary?.(message); }
    });
  });
  return { starts, disconnect: () => socket?.close(), bytes: () => bytes };
}

async function enter(page: Page) {
  await page.goto('/studio/browser-verification?studio=sccg-studio&title=SCCG%20Live%20Desk');
  await expect.poll(() => page.locator('.live-camera-preview video').evaluate((video: HTMLVideoElement) => video.videoWidth).catch(() => 0)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Open live studio' }).click();
  await expect(page.locator('.studio-desk')).toBeVisible();
}

async function canvasSample(page: Page, region = { x: 500, y: 180, width: 500, height: 500 }) {
  return page.getByLabel('Program output').evaluate((canvas: HTMLCanvasElement, area) => {
    const pixels = canvas.getContext('2d')!.getImageData(area.x, area.y, area.width, area.height).data;
    let brightness = 0;
    let opaque = 0;
    let hash = 0;
    const colors = new Set<number>();
    for (let index = 0; index < pixels.length; index += 160) {
      brightness += pixels[index] + pixels[index + 1] + pixels[index + 2];
      if (pixels[index + 3] === 255) opaque++;
      hash = (hash * 31 + pixels[index] + pixels[index + 1] * 3 + pixels[index + 2] * 7) >>> 0;
      colors.add(pixels[index] << 16 | pixels[index + 1] << 8 | pixels[index + 2]);
    }
    return { brightness, opaque, hash, colors: colors.size };
  }, region);
}

test('capture profiles, bounded grading and uncropped presentation geometry', () => {
  // H.264-in-WebM is preferred so the server can copy without re-encoding
  expect(selectCaptureProfile(() => true).codec).toBe('h264');
  expect(selectCaptureProfile((mime) => mime.includes('vp8')).codec).toBe('vp8');
  expect(selectCaptureProfile((mime) => mime.includes('webm')).height).toBe(1080);
  expect(selectCaptureProfile(() => true, '720p').bitrate).toBe(3_000_000);
  expect(selectCaptureProfile(() => true).keyFrameIntervalMs).toBe(2000);
  expect(() => selectCaptureProfile(() => false)).toThrow(/supported broadcast codec/);
  expect(cameraFilter(DEFAULT_CAMERA_GRADE)).toContain('contrast(1.04)');
  expect(cameraFilter({ ...DEFAULT_CAMERA_GRADE, exposure: 100, saturation: 100 })).toContain('saturate(1.4)');
  expect(exposureGain(0)).toBe(1);
  expect(exposureGain(32)).toBeGreaterThan(1);
  expect(exposureGain(255)).toBeLessThan(1);
  expect(containRect(900, 1600, 1600, 900)).toEqual({ x: 546.875, y: 0, width: 506.25, height: 900 });
});

test('setup waits for a pending camera before opening the studio', async ({ page }) => {
  await services(page);
  await page.addInitScript(() => {
    const state = window as typeof window & { releaseTestCameras: (() => void)[] };
    state.releaseTestCameras = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      await new Promise<void>((resolve) => state.releaseTestCameras.push(resolve));
      return original(constraints);
    };
  });
  await page.goto('/studio/camera-readiness');
  await expect(page.getByRole('button', { name: 'Preparing camera...' })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { releaseTestCameras: (() => void)[] }).releaseTestCameras.length)).toBeGreaterThan(0);
  await page.evaluate(() => (window as typeof window & { releaseTestCameras: (() => void)[] }).releaseTestCameras.forEach((release) => release()));
  await page.getByRole('button', { name: 'Open live studio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Feature Host', exact: true })).toBeVisible();
});

test('shared background, graphics and responsive desk render into the program', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await services(page);
  await enter(page);
  await expect(page.getByText('Person background removal active')).toBeVisible({ timeout: 45000 });
  await expect.poll(async () => (await canvasSample(page)).colors).toBeGreaterThan(50);
  await page.screenshot({ path: info.outputPath('studio-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Camera frames', exact: true }).click();
  const before = await canvasSample(page);
  await page.getByRole('slider', { name: 'Exposure', exact: true }).focus();
  await page.getByRole('slider', { name: 'Exposure', exact: true }).press('End');
  await expect(page.getByRole('slider', { name: 'Exposure', exact: true })).toHaveValue('0.6');
  await expect.poll(async () => (await canvasSample(page)).hash).not.toBe(before.hash);
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await page.getByLabel('Speaker name', { exact: true }).fill('SCCG speaker');
  await page.getByLabel('Title or reference', { exact: true }).fill('Community update');
  const lowerThirdBefore = await canvasSample(page, { x: 60, y: 880, width: 660, height: 50 });
  await page.getByLabel('Show lower third', { exact: true }).check();
  await expect.poll(async () => (await canvasSample(page, { x: 60, y: 880, width: 660, height: 50 })).hash).not.toBe(lowerThirdBefore.hash);
  await page.getByLabel('Text or reference', { exact: true }).fill('SCCG / Live community presentation');
  await page.getByLabel('Show ticker', { exact: true }).check();
  const logoBefore = await canvasSample(page, { x: 62, y: 40, width: 144, height: 54 });
  await page.getByRole('button', { name: 'Replay logo animation' }).click();
  await expect.poll(async () => (await canvasSample(page, { x: 62, y: 40, width: 144, height: 54 })).hash).not.toBe(logoBefore.hash);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('tab', { name: 'Graphics', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('studio-mobile.png'), fullPage: true });
  await page.getByRole('tab', { name: 'Publish', exact: true }).click();
  await expect(page.getByLabel('Publish to YouTube')).toBeChecked();
  await expect(page.getByLabel('Publish to Facebook')).not.toBeChecked();
  expect(await page.locator('input[type=password]').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('reference clips and screen shares are real controllable program sources', async ({ page }, info) => {
  await services(page);
  await enter(page);
  await page.getByRole('button', { name: 'Camera frames', exact: true }).click();
  const clip = info.outputPath('reference.mp4');
  const generated = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=360x640:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=400:sample_rate=48000', '-t', '5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-y', clip]);
  expect(generated.status).toBe(0);
  await page.getByRole('tab', { name: 'Present', exact: true }).click();
  await page.getByLabel('Reference video', { exact: true }).setInputFiles(clip);
  await expect(page.getByRole('button', { name: 'Feature reference.mp4' })).toBeVisible();
  await page.getByRole('button', { name: 'Play reference video', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause reference video', exact: true })).toBeVisible();
  await expect.poll(() => page.getByRole('slider', { name: 'Reference video position' }).inputValue().then(Number)).toBeGreaterThan(0.3);
  await page.getByRole('button', { name: 'Pause reference video', exact: true }).click();
  await page.getByLabel('Loop video').check();
  await page.getByRole('button', { name: 'Restart reference video' }).click();
  await page.evaluate(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, 1280, 720);
      context.fillStyle = '#276749'; context.fillRect(40, 40, 500, 640);
      context.fillStyle = '#bd3044'; context.fillRect(720, 40, 520, 640);
      return canvas.captureStream(30);
    };
  });
  await page.getByRole('button', { name: 'Share screen or tab', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Feature Screen share' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Picture in picture', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.getByLabel('Program output').evaluate((canvas: HTMLCanvasElement) => {
    const pixel = canvas.getContext('2d')!.getImageData(550, 500, 1, 1).data;
    return pixel[1] > pixel[0] + 20 && pixel[1] > pixel[2];
  })).toBe(true);
  await page.screenshot({ path: info.outputPath('studio-presentation.png'), fullPage: true });
  await page.getByRole('button', { name: 'Stop sharing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Feature Screen share' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove reference video' }).click();
  await expect(page.getByRole('button', { name: 'Feature reference.mp4' })).toHaveCount(0);
});

test('actual studio capture relays to RTMP with YouTube-ready keyframes and ordered shutdown', async ({ page }, info) => {
  let encoder: ChildProcessWithoutNullStreams | null = null;
  let finished: Promise<number | null> = Promise.resolve(null);
  let health = { ...initialHealth };
  let errors = '';
  let pending = '';
  let values: Record<string, string> = {};
  let startedCodec = '';
  const output = info.outputPath('program.flv');
  const end = () => { if (encoder?.stdin.writable && !encoder.stdin.writableEnded) encoder.stdin.end(); };
  const network = await services(page, {
    start: (body) => {
      expect(body.youtube).toBe(true);
      startedCodec = String(body.codec);
      // Mirror the exact server pipeline: copy for h264, transcode for vp8
      encoder = spawn('ffmpeg', [...buildStreamEncodingArgs(startedCodec as 'h264' | 'vp8'), '-f', 'flv', '-y', output]);
      finished = new Promise((resolve) => encoder!.once('close', resolve));
      encoder.stderr.on('data', (data: Buffer) => { errors += data.toString(); });
      encoder.stdout.on('data', (data: Buffer) => {
        pending += data.toString();
        const lines = pending.split('\n'); pending = lines.pop() || '';
        for (const line of lines) {
          const separator = line.indexOf('='); if (separator < 0) continue;
          const key = line.slice(0, separator); values[key] = line.slice(separator + 1).trim();
          if (key === 'progress') { health = { ...health, ...parseStreamProgress(values), status: 'live' }; values = {}; }
        }
      });
    },
    binary: (chunk) => { health.bytesReceived += chunk.length; encoder?.stdin.write(chunk); },
    end, stopped: () => finished, health: () => health,
  });
  try {
    await enter(page);
    await page.getByRole('button', { name: 'Camera frames', exact: true }).click();
    await page.getByRole('button', { name: 'Go live', exact: true }).click();
    await expect(page.getByRole('button', { name: 'End broadcast', exact: true })).toBeVisible();
    await expect.poll(() => health.seconds, { timeout: 50000 }).toBeGreaterThan(10);
    await expect(page.locator('.desk-air-status')).toContainText('TRANSMITTING');
    await page.getByRole('button', { name: 'End broadcast', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Go live', exact: true })).toBeEnabled();
    expect(await finished).toBe(0);
    expect(network.starts).toHaveLength(1);
    expect(errors).not.toMatch(/error|invalid|broken pipe|non.monoton/i);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], { encoding: 'utf8' });
    expect(probe.status).toBe(0);
    const metadata = JSON.parse(probe.stdout);
    const video = metadata.streams.find((stream: { codec_type: string }) => stream.codec_type === 'video');
    const audio = metadata.streams.find((stream: { codec_type: string }) => stream.codec_type === 'audio');
    expect(video.codec_name).toBe('h264');
    expect(audio.codec_name).toBe('aac');
    expect(Number(audio.sample_rate)).toBe(48000);
    // Keyframe interval is the critical YouTube requirement: must be <= ~2s and start immediately
    const packets = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', output], { encoding: 'utf8' });
    const keyTimes = packets.stdout.trim().split('\n').filter((row) => row.includes('K'))
      .map((row) => parseFloat(row.split(',')[0])).filter((n) => !Number.isNaN(n));
    expect(keyTimes.length).toBeGreaterThan(2);
    expect(keyTimes[0]).toBeLessThan(1);
    const maxGap = Math.max(...keyTimes.slice(1).map((t, i) => t - keyTimes[i]));
    expect(maxGap).toBeLessThan(2.5);
    console.log(JSON.stringify({ codec: startedCodec, video: video.codec_name, height: video.height, duration: metadata.format.duration, keyframes: keyTimes.length, maxKeyframeGap: Number(maxGap.toFixed(2)), firstKeyframe: Number(keyTimes[0].toFixed(3)) }));
  } finally { end(); if (encoder && encoder.exitCode === null) encoder.kill('SIGTERM'); }
});

test('unpaired publishers cannot start and disconnected streams leave transmitting state', async ({ page }) => {
  const network = await services(page);
  await enter(page);
  await page.getByRole('button', { name: 'Camera frames', exact: true }).click();
  await page.getByRole('button', { name: 'Go live', exact: true }).click();
  await expect.poll(network.bytes).toBeGreaterThan(0);
  network.disconnect();
  await expect(page.getByRole('alert')).toContainText(/connection was lost/i);
  await expect(page.getByRole('button', { name: 'Go live', exact: true })).toBeVisible();
  await expect(page.locator('.desk-air-status')).not.toContainText('TRANSMITTING');
  await services(page, { authorized: false });
  await enter(page);
  await page.getByRole('button', { name: 'Camera frames', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Go live', exact: true })).toBeDisabled();
});