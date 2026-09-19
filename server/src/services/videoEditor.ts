import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

export const editSchema = z.object({
  segments: z.array(z.object({ start: z.number().finite().min(0), end: z.number().finite().positive() }))
    .min(1).max(40),
  format: z.enum(['landscape', 'shorts']),
  frame: z.enum(['clean', 'studio']),
  voice: z.boolean(),
  studio: z.enum(['sccg-studio', 'sccg-interview', 'sccg-news', 'sccg-dark']).default('sccg-studio'),
  overlays: z.array(z.object({
    text: z.string().trim().min(1).max(100).refine((text) => !/[\r\n\x00-\x1f]/.test(text)),
    start: z.number().finite().min(0),
    end: z.number().finite().positive(),
    position: z.enum(['top', 'bottom']),
    animation: z.enum(['none', 'fade']),
  })).max(12),
});

export type Edit = z.infer<typeof editSchema>;
export type MediaInfo = { duration: number; width: number; height: number; audio: boolean };

export function validateEdit(value: unknown, duration: number): Edit {
  const edit = editSchema.parse(value);
  let previousEnd = 0;
  for (const segment of edit.segments) {
    if (segment.end - segment.start < 0.1 || segment.start < previousEnd || segment.end > duration + 0.02) {
      throw new Error('Keep scenes in source order, without overlap, and within the video duration.');
    }
    previousEnd = segment.end;
  }
  const outputDuration = edit.segments.reduce((total, segment) => total + segment.end - segment.start, 0);
  for (const overlay of edit.overlays) {
    if (overlay.end - overlay.start < 0.1 || overlay.end > outputDuration + 0.02) {
      throw new Error('Text timing must fit inside the edited video.');
    }
  }
  return edit;
}

export function runMedia(binary: string, args: string[], onProgress?: (seconds: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let error = '';
    let pending = '';
    const timeout = setTimeout(() => child.kill('SIGKILL'), 2 * 60 * 60 * 1000);
    child.stdout.on('data', (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-64 * 1024);
      pending += chunk.toString();
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('out_time_us=')) onProgress?.(Number(line.slice(12)) / 1_000_000);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => { error = (error + chunk.toString()).slice(-4096); });
    child.on('error', (cause) => { clearTimeout(timeout); reject(cause); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error(`${binary} failed (${code}): ${error.slice(-1200)}`));
    });
  });
}

export async function probeMedia(filename: string): Promise<MediaInfo> {
  const output = await runMedia(process.env.FFPROBE_PATH || 'ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', filename,
  ]);
  const data = JSON.parse(output);
  const video = data.streams?.find((stream: { codec_type: string }) => stream.codec_type === 'video');
  const duration = Number(data.format?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0 || duration > 7200) {
    throw new Error('Choose a playable video up to two hours long.');
  }
  return { duration, width: video.width, height: video.height,
    audio: data.streams.some((stream: { codec_type: string }) => stream.codec_type === 'audio') };
}

export async function renderVideo(directory: string, info: MediaInfo, value: unknown, onProgress: (percent: number) => void) {
  const edit = validateEdit(value, info.duration);
  const width = edit.format === 'landscape' ? 1920 : 1080;
  const height = edit.format === 'landscape' ? 1080 : 1920;
  const inset = edit.frame === 'studio' ? 48 : 0;
  const filters: string[] = [];
  const count = edit.segments.length;
  if (count > 1) {
    filters.push(`[0:v]split=${count}${edit.segments.map((_, index) => `[vs${index}]`).join('')}`);
    if (info.audio) filters.push(`[0:a]asplit=${count}${edit.segments.map((_, index) => `[as${index}]`).join('')}`);
  }
  edit.segments.forEach((segment, index) => {
    filters.push(`[${count > 1 ? `vs${index}` : '0:v'}]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS[v${index}]`);
    if (info.audio) filters.push(`[${count > 1 ? `as${index}` : '0:a'}]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}]`);
  });
  filters.push(`${edit.segments.map((_, index) => `[v${index}]${info.audio ? `[a${index}]` : ''}`).join('')}concat=n=${count}:v=1:a=${info.audio ? 1 : 0}[joined]${info.audio ? '[audio]' : ''}`);
  let visual: string;
  if (inset) {
    filters.push(`[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[backdrop]`);
    filters.push(`[joined]scale=${width - inset * 2}:${height - inset * 2}:force_original_aspect_ratio=decrease,setsar=1[footage]`);
    visual = '[backdrop][footage]overlay=x=(W-w)/2:y=(H-h)/2:shortest=1,fps=30';
  } else {
    visual = `[joined]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x111827,setsar=1,fps=30`;
  }
  const fontFile = process.env.VIDEO_FONT_PATH || (process.platform === 'darwin'
    ? '/System/Library/Fonts/Supplemental/Arial.ttf'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
  if (edit.overlays.length) await fs.access(fontFile);
  const escapedFont = fontFile.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
  for (const [index, overlay] of edit.overlays.entries()) {
    const textFile = path.join(directory, `text-${index}.txt`);
    const escapedFile = textFile.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
    const size = edit.format === 'landscape' ? 34 : 32;
    const wrapped = overlay.text.match(/.{1,28}(?:\s|$)|.{1,28}/g)?.map((line) => line.trim()).join('\n') || overlay.text;
    await fs.writeFile(textFile, wrapped, { mode: 0o600 });
    const alpha = overlay.animation === 'fade'
      ? `:alpha='min(1,min((t-${overlay.start})/0.25,(${overlay.end}-t)/0.25))'` : '';
    visual += `,drawtext=fontfile='${escapedFont}':textfile='${escapedFile}':expansion=none:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=16:x=(w-tw)/2:y=${overlay.position === 'top' ? 'h*0.12' : 'h*0.8-th'}:enable='between(t,${overlay.start},${overlay.end})'${alpha}`;
  }
  const logoFile = process.env.VIDEO_LOGO_PATH || path.resolve(__dirname, '../../assets/sccg-logo.png');
  let hasLogo = false;
  try {
    await fs.access(logoFile);
    hasLogo = true;
  } catch {
    hasLogo = false;
  }
  if (hasLogo) {
    const logoIndex = inset ? 2 : 1;
    const logoX = 48;
    const logoY = edit.format === 'landscape' ? 48 : 80;
    filters.push(`${visual}[prelogo]`);
    filters.push(`[prelogo][${logoIndex}:v]overlay=x=${logoX}:y=${logoY}[video]`);
  } else {
    filters.push(`${visual}[video]`);
  }
  if (info.audio) filters.push(`[audio]${edit.voice ? 'highpass=f=80,afftdn=nf=-25,acompressor=threshold=0.125:ratio=3,loudnorm=I=-14:LRA=7:TP=-1' : 'anull'}[sound]`);
  const total = edit.segments.reduce((sum, segment) => sum + segment.end - segment.start, 0);
  const args = ['-y', '-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-i', path.join(directory, 'source')];
  if (inset) args.push('-loop', '1', '-i', path.join(process.env.VIDEO_STUDIO_ASSETS || path.resolve(__dirname, '../../assets/studios'), `${edit.studio}.png`));
  if (hasLogo) args.push('-i', logoFile);
  args.push('-filter_complex_threads', '1', '-filter_complex', filters.join(';'), '-map', '[video]', '-t', String(total));
  if (info.audio) args.push('-map', '[sound]', '-c:a', 'aac', '-b:a', '192k');
  args.push('-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-fs', String(2 * 1024 ** 3), '-movflags', '+faststart', '-progress', 'pipe:1', path.join(directory, 'render.mp4'));
  await runMedia(process.env.FFMPEG_PATH || 'ffmpeg', args, (seconds) => onProgress(Math.min(99, Math.round(seconds / total * 100))));
  const output = await probeMedia(path.join(directory, 'render.mp4'));
  if (Math.abs(output.duration - total) > 0.2) throw new Error('Rendered duration differs from the edit. The output may exceed the 2 GB limit.');
  return edit;
}