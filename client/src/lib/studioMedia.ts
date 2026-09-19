export type BroadcastQuality = '1080p' | '720p';

export interface CameraGrade {
  autoLight: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

export interface ProgramStyle {
  background: 'shared' | 'camera';
  grade: CameraGrade;
  transition: 'cut' | 'dissolve' | 'wipe';
  animateLogo: boolean;
  logoCue: number;
  lowerThird: { name: string; role: string; city: string; visible: boolean };
  ticker: { text: string; visible: boolean };
}

export const DEFAULT_CAMERA_GRADE: CameraGrade = { autoLight: true, exposure: 0, contrast: 1.04, saturation: 1.04, warmth: 0 };
export const DEFAULT_PROGRAM_STYLE: ProgramStyle = {
  background: 'shared', grade: DEFAULT_CAMERA_GRADE, transition: 'dissolve', animateLogo: true, logoCue: 0,
  lowerThird: { name: '', role: '', city: '', visible: false }, ticker: { text: '', visible: false },
};

export function bounded(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function cameraFilter(grade: CameraGrade, lightGain = 1): string {
  const brightness = 2 ** bounded(grade.exposure, -0.6, 0.6) * bounded(lightGain, 0.8, 1.45);
  return `brightness(${brightness}) contrast(${bounded(grade.contrast, 0.8, 1.25)}) saturate(${bounded(grade.saturation, 0.6, 1.4)})`;
}

export function exposureGain(luminance: number, previous = 1): number {
  if (luminance < 8) return previous;
  const target = bounded(128 / luminance, 0.8, 1.45);
  return previous + (target - previous) * 0.15;
}

export function containRect(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.min(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight));
  return { x: (width - sourceWidth * scale) / 2, y: (height - sourceHeight * scale) / 2, width: sourceWidth * scale, height: sourceHeight * scale };
}

export function selectCaptureProfile(isSupported: (mime: string) => boolean, quality: BroadcastQuality = '1080p') {
  // Prefer H.264-in-WebM: the browser encodes H.264 (usually hardware accelerated) so the
  // server can remux with `-c:v copy` (no CPU-bound transcode → guaranteed realtime delivery,
  // which is what YouTube/Facebook need to leave the "Preparing stream" state).
  const h264 = ['video/webm;codecs=h264,opus', 'video/webm;codecs=h264'].find(isSupported);
  const mimeType = h264 || ['video/webm;codecs=vp8,opus', 'video/webm'].find(isSupported);
  if (!mimeType) throw new Error('This browser cannot record a supported broadcast codec. Use current Chrome, Edge or Safari.');
  const fullHD = quality === '1080p';
  return {
    mimeType,
    codec: h264 ? ('h264' as const) : ('vp8' as const),
    width: fullHD ? 1920 : 1280,
    height: fullHD ? 1080 : 720,
    bitrate: fullHD ? 4_500_000 : 3_000_000,
    fps: 30,
    keyFrameIntervalMs: 2000,
    label: `${fullHD ? '1080p' : '720p'} / 30 fps${h264 ? '' : ' (VP8)'}`,
  };
}