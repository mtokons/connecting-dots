import { Router, Request, Response } from 'express';
import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';

const router = Router();

let ffmpegProcess: ChildProcess | null = null;

export const getFfmpegProcess = () => ffmpegProcess;

function normalizeTarget(raw: string, baseUrl: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('rtmp://') || value.startsWith('rtmps://')) return value;
  return `${baseUrl}${value.replace(/^\/+/, '')}`;
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
  const { youtube, facebook, instagram, targets } = req.body as {
    youtube?: string;
    facebook?: string;
    instagram?: string;
    targets?: string[];
  };

  const resolvedTargets: string[] = [];

  if (youtube) {
    const target = normalizeTarget(youtube, 'rtmp://a.rtmp.youtube.com/live2/');
    if (target) resolvedTargets.push(target);
  }
  if (facebook) {
    const target = normalizeTarget(facebook, 'rtmps://live-api-s.facebook.com:443/rtmp/');
    if (target) resolvedTargets.push(target);
  }
  if (instagram) {
    const target = normalizeTarget(instagram, 'rtmps://live-upload.instagram.com:443/rtmp/');
    if (target) resolvedTargets.push(target);
  }

  if (Array.isArray(targets)) {
    targets
      .filter((t) => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        // Basic protocol allowlist to avoid accidental local file writes etc.
        if (t.startsWith('rtmp://') || t.startsWith('rtmps://')) {
          resolvedTargets.push(t);
        }
      });
  }

  if (resolvedTargets.length === 0) {
    res.status(400).json({ error: 'No streaming targets provided' });
    return;
  }

  if (!ffmpegAvailable()) {
    res.status(500).json({ error: 'ffmpeg is not installed on this server. Streaming requires ffmpeg.' });
    return;
  }

  // Kill existing process if any
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
    ffmpegProcess = null;
  }

  // Build tee output for multiple targets
  const teeOutputs = resolvedTargets
    .map((url) => `[f=flv]${url}`)
    .join('|');

  const args = [
    // Input: tell ffmpeg the container is webm (piped from browser MediaRecorder)
    '-f', 'webm',
    '-analyzeduration', '2000000', // 2 s probe window
    '-probesize', '2000000',
    '-i', 'pipe:0',

    // Map video (required) and audio (optional — may not exist if mic was denied)
    '-map', '0:v:0',
    '-map', '0:a?:0',

    // Video: transcode VP8/VP9 → H.264 for RTMP
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-b:v', '2500k',
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=1280:720',  // scale to 720p — 1080p at real-time transcode often stalls
    '-g', '60',               // 2-second keyframe interval at 30 fps
    '-keyint_min', '60',

    // Audio: transcode Opus → AAC
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',

    '-f', 'tee',
    teeOutputs,
  ];

  try {
    ffmpegProcess = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      // FFmpeg logs to stderr
      console.log('[FFmpeg]', data.toString().slice(0, 200));
    });

    ffmpegProcess.on('error', (err) => {
      console.error('[FFmpeg] spawn error:', err.message);
      ffmpegProcess = null;
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`[FFmpeg] Process exited with code ${code}`);
      ffmpegProcess = null;
    });

    res.json({ status: 'streaming', targets: resolvedTargets.length });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to start FFmpeg',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// POST /api/stream/stop
router.post('/stop', (_req: Request, res: Response) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
    ffmpegProcess = null;
    res.json({ status: 'stopped' });
  } else {
    res.json({ status: 'already stopped' });
  }
});

export default router;
