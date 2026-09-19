import { Router, Request, Response } from 'express';
import { spawn, ChildProcess, execSync } from 'child_process';
import { requireWorkspace, workspaceOwner } from '../middleware/workspace';

const router = Router();

let ffmpegProcess: ChildProcess | null = null;
let streamOwner: string | null = null;
let streamDeadline: ReturnType<typeof setTimeout> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

interface StreamHealth {
  status: 'idle' | 'starting' | 'live' | 'stopping' | 'stopped' | 'error';
  frames: number;
  fps: number;
  seconds: number;
  speed: number;
  duplicateFrames: number;
  droppedFrames: number;
  bytesReceived: number;
  error: string | null;
}

const emptyHealth = (): StreamHealth => ({ status: 'idle', frames: 0, fps: 0, seconds: 0, speed: 0, duplicateFrames: 0, droppedFrames: 0, bytesReceived: 0, error: null });
let health = emptyHealth();

export const getFfmpegProcess = (owner = '') => owner && owner === streamOwner && health.status !== 'stopping' && health.status !== 'error' ? ffmpegProcess : null;

export function stopOwnedStream(owner: string) {
  if (owner !== streamOwner || !ffmpegProcess) return false;
  if (stopTimer) return true;
  const encoder = ffmpegProcess;
  if (health.status !== 'error') health.status = 'stopping';
  if (streamDeadline) clearTimeout(streamDeadline);
  streamDeadline = null;
  encoder.stdin?.end();
  stopTimer = setTimeout(() => {
    if (ffmpegProcess === encoder) encoder.kill('SIGKILL');
  }, 5000);
  stopTimer.unref();
  return true;
}

export function recordStreamInput(owner: string, bytes: number) {
  if (owner === streamOwner && ffmpegProcess) health.bytesReceived += bytes;
}

export function failOwnedStream(owner: string, message: string) {
  if (owner !== streamOwner || !ffmpegProcess) return;
  health.status = 'error';
  health.error = message;
  stopOwnedStream(owner);
}

export function redactStreamError(message: string): string {
  return message.replace(/rtmps?:\/\/[^\s'"|\]]+/gi, '[destination]');
}

export function parseStreamProgress(values: Record<string, string>) {
  const number = (key: string) => Math.max(0, Number.parseFloat(values[key]) || 0);
  return {
    frames: number('frame'), fps: number('fps'), seconds: number('out_time_us') / 1_000_000,
    speed: number('speed'), duplicateFrames: number('dup_frames'), droppedFrames: number('drop_frames'),
  };
}

export function buildStreamEncodingArgs(codec: 'h264' | 'vp8'): string[] {
  return [
    '-hide_banner', '-loglevel', 'warning', '-nostats', '-progress', 'pipe:1',
    '-i', 'pipe:0', '-map', '0:v:0', '-map', '0:a:0?',
    ...(codec === 'h264' ? ['-c:v', 'copy'] : [
      '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-threads', '2',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
      '-b:v', '5000k', '-minrate', '5000k', '-maxrate', '5000k', '-bufsize', '10000k',
      '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
    ]),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-af', 'aresample=async=1:first_pts=0',
  ];
}

router.use(requireWorkspace);

router.get('/destinations', (req, res) => {
  const publisherId = workspaceOwner(req);
  const authorized = process.env.STUDIO_PUBLISHER_WORKSPACE === publisherId;
  res.json({
    publisherId, authorized,
    youtube: authorized && Boolean(process.env.RTMP_YOUTUBE_KEY && !process.env.RTMP_YOUTUBE_KEY.startsWith('your_')),
    facebook: authorized && Boolean(process.env.RTMP_FACEBOOK_KEY && !process.env.RTMP_FACEBOOK_KEY.startsWith('your_')),
  });
});

router.get('/status', (req, res) => {
  res.json(workspaceOwner(req) === streamOwner ? health : emptyHealth());
});

function normalizeTarget(raw: string, baseUrl: string): string {
  const value = raw.trim();
  if (!/^[a-zA-Z0-9_-]{4,512}$/.test(value)) return '';
  return `${baseUrl}${value}`;
}

interface StreamDestinations {
  youtube?: string | boolean;
  facebook?: string | boolean;
  instagram?: string | boolean;
}

export function resolveStreamTargets(input: StreamDestinations, defaults: NodeJS.ProcessEnv = process.env): string[] {
  const destinations = [
    { value: input.youtube, saved: defaults.RTMP_YOUTUBE_KEY, base: 'rtmp://a.rtmp.youtube.com/live2/' },
    { value: input.facebook, saved: defaults.RTMP_FACEBOOK_KEY, base: 'rtmps://live-api-s.facebook.com:443/rtmp/' },
    { value: input.instagram, saved: undefined, base: 'rtmps://live-upload.instagram.com:443/rtmp/' },
  ];
  return destinations.flatMap(({ value, saved, base }) => {
    const key = value === true ? saved : typeof value === 'string' ? value : '';
    if (!key || key.startsWith('your_')) return [];
    const target = normalizeTarget(key, base);
    return target ? [target] : [];
  });
}

/** Quick check that ffmpeg is reachable. */
function ffmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// POST /api/stream/start
router.post('/start', (req: Request, res: Response) => {
  if (ffmpegProcess) {
    res.status(409).json({ error: 'A broadcast is already running. End it before starting another.' });
    return;
  }
  const { youtube, facebook, instagram, targets, codec = 'vp8' } = (req.body || {}) as StreamDestinations & { targets?: string[]; codec?: string };
  if (codec !== 'vp8' && codec !== 'h264') {
    res.status(400).json({ error: 'Unsupported capture codec.' });
    return;
  }
  if ((youtube === true || facebook === true) && process.env.STUDIO_PUBLISHER_WORKSPACE !== workspaceOwner(req)) {
    res.status(403).json({ error: 'This browser is not paired with the saved publishing destinations.' });
    return;
  }
  const resolvedTargets = resolveStreamTargets({ youtube, facebook, instagram });

  if (targets) {
    res.status(400).json({ error: 'Choose a supported destination and enter its stream key, not a custom server URL.' });
    return;
  }

  if (resolvedTargets.length === 0) {
    res.status(400).json({ error: 'No streaming targets provided' });
    return;
  }

  if (!ffmpegAvailable()) {
    res.status(500).json({ error: 'ffmpeg is not installed on this server. Streaming requires ffmpeg.' });
    return;
  }

  const teeOutputs = resolvedTargets
    .map((url) => `[f=flv:onfail=abort:flvflags=no_duration_filesize]${url}`)
    .join('|');

  const args = [
    ...buildStreamEncodingArgs(codec),
    ...(resolvedTargets.length === 1
      ? ['-f', 'flv', '-flvflags', 'no_duration_filesize', resolvedTargets[0]]
      : ['-f', 'tee', '-use_fifo', '1', '-fifo_options', 'queue_size=120', teeOutputs]),
  ];

  try {
    const encoder = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    ffmpegProcess = encoder;
    streamOwner = workspaceOwner(req);
    health = { ...emptyHealth(), status: 'starting' };
    const startedAt = Date.now();
    let lastFrameAt = startedAt;
    let pendingOutput = '';
    let progress: Record<string, string> = {};
    const watchdog = setInterval(() => {
      if (health.status === 'stopping' || health.status === 'error') return;
      const limit = health.frames ? 15000 : 30000;
      if (Date.now() - lastFrameAt > limit) {
        health.status = 'error';
        health.error = health.frames ? 'The relay stopped receiving frames. Check your connection and restart the broadcast.' : 'No video reached the relay. Check camera and browser permissions.';
        stopOwnedStream(workspaceOwner(req));
      }
    }, 1000);
    watchdog.unref();
    streamDeadline = setTimeout(() => stopOwnedStream(workspaceOwner(req)), 2 * 60 * 60 * 1000);
    streamDeadline.unref();

    encoder.stdout?.on('data', (chunk: Buffer) => {
      pendingOutput += chunk.toString();
      const lines = pendingOutput.split('\n');
      pendingOutput = lines.pop() || '';
      for (const line of lines) {
        const separator = line.indexOf('=');
        if (separator < 0) continue;
        const key = line.slice(0, separator);
        progress[key] = line.slice(separator + 1).trim();
        if (key === 'progress') {
          const next = parseStreamProgress(progress);
          if (next.frames > health.frames) lastFrameAt = Date.now();
          health = { ...health, ...next };
          if (health.status === 'starting' && next.frames > 0) health.status = 'live';
          progress = {};
        }
      }
    });

    encoder.stdin?.on('error', () => {});
    encoder.stderr?.on('data', (chunk: Buffer) => {
      console.warn('[FFmpeg-live]', redactStreamError(chunk.toString().trim()));
    });

    encoder.on('error', () => {
      health.status = 'error';
      health.error = 'The video encoder could not start.';
    });

    encoder.on('close', () => {
      clearInterval(watchdog);
      if (ffmpegProcess !== encoder) return;
      if (health.status !== 'stopping' && health.status !== 'error') {
        health.status = 'error';
        health.error = 'The destination disconnected. Check YouTube Live Control Room and restart the broadcast.';
      } else if (health.status === 'stopping') health.status = 'stopped';
      ffmpegProcess = null;
      if (streamDeadline) clearTimeout(streamDeadline);
      if (stopTimer) clearTimeout(stopTimer);
      streamDeadline = null;
      stopTimer = null;
    });

    res.json({ status: 'starting', targets: resolvedTargets.length, codec });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to start FFmpeg',
      details: err instanceof Error ? redactStreamError(err.message) : 'Unknown error',
    });
  }
});

// POST /api/stream/stop
router.post('/stop', async (req: Request, res: Response) => {
  if (ffmpegProcess && streamOwner !== workspaceOwner(req)) { res.status(403).json({ error: 'This broadcast belongs to another workspace.' }); return; }
  const encoder = ffmpegProcess;
  const stopped = stopOwnedStream(workspaceOwner(req));
  if (encoder && stopped) {
    await new Promise<void>((resolve) => {
      const deadline = setTimeout(resolve, 6000);
      encoder.once('close', () => { clearTimeout(deadline); resolve(); });
    });
  }
  res.json({ status: ffmpegProcess ? 'stopping' : 'stopped' });
});

export default router;
