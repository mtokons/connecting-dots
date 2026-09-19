import type { ImageSegmenter, MPMask } from '@mediapipe/tasks-vision';
import { bounded, cameraFilter, exposureGain, type CameraGrade } from './studioMedia';

export type BackgroundStatus = 'off' | 'loading' | 'ready' | 'unavailable';

export async function createPersonSegmenter(): Promise<ImageSegmenter> {
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
  const simd = await FilesetResolver.isSimdSupported();
  const files = simd ? {
    wasmLoaderPath: new URL('../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js', import.meta.url).href,
    wasmBinaryPath: new URL('../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm', import.meta.url).href,
  } : {
    wasmLoaderPath: new URL('../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js', import.meta.url).href,
    wasmBinaryPath: new URL('../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm', import.meta.url).href,
  };
  const create = (delegate: 'GPU' | 'CPU') => ImageSegmenter.createFromOptions(files, {
    baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite', delegate },
    canvas: document.createElement('canvas'), runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true,
  });
  try { return await create('GPU'); } catch { return create('CPU'); }
}

export class CameraFrame {
  readonly canvas = document.createElement('canvas');
  private context = this.canvas.getContext('2d')!;
  private matte = document.createElement('canvas');
  private matteContext = this.matte.getContext('2d')!;
  private mattePixels: ImageData | null = null;
  private sample = document.createElement('canvas');
  private sampleContext = this.sample.getContext('2d', { willReadFrequently: true })!;
  private lightGain = 1;
  private sampledAt = 0;

  constructor() {
    this.sample.width = 32;
    this.sample.height = 18;
  }

  updateMatte(mask: MPMask) {
    const confidence = mask.getAsFloat32Array();
    if (!this.mattePixels || this.matte.width !== mask.width || this.matte.height !== mask.height) {
      this.matte.width = mask.width;
      this.matte.height = mask.height;
      this.mattePixels = this.matteContext.createImageData(mask.width, mask.height);
    }
    const pixels = this.mattePixels.data;
    for (let index = 0; index < confidence.length; index++) {
      const value = bounded((confidence[index] - 0.15) / 0.7, 0, 1);
      const alpha = value * value * (3 - 2 * value) * 255;
      pixels[index * 4] = 255;
      pixels[index * 4 + 1] = 255;
      pixels[index * 4 + 2] = 255;
      pixels[index * 4 + 3] = alpha;
    }
    this.matteContext.putImageData(this.mattePixels, 0, 0);
  }

  render(video: HTMLVideoElement, grade: CameraGrade, shared: boolean, outputWidth = 1920): HTMLCanvasElement | null {
    if (!video.videoWidth || video.readyState < 2 || (shared && !this.mattePixels)) return null;
    const width = Math.min(video.videoWidth, Math.ceil(bounded(outputWidth, 320, 1920)));
    const height = Math.round(width * video.videoHeight / video.videoWidth);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const now = performance.now();
    if (grade.autoLight && now - this.sampledAt > 400) {
      this.sampledAt = now;
      this.sampleContext.drawImage(video, 0, 0, 32, 18);
      const sample = this.sampleContext.getImageData(0, 0, 32, 18).data;
      let total = 0;
      let count = 0;
      for (let row = 3; row < 15; row++) {
        for (let column = 8; column < 24; column++) {
          if (shared && this.mattePixels) {
            const maskIndex = (Math.floor(row / 18 * this.matte.height) * this.matte.width + Math.floor(column / 32 * this.matte.width)) * 4 + 3;
            if (this.mattePixels.data[maskIndex] < 180) continue;
          }
          const index = (row * 32 + column) * 4;
          total += sample[index] * 0.2126 + sample[index + 1] * 0.7152 + sample[index + 2] * 0.0722;
          count++;
        }
      }
      if (count) this.lightGain = exposureGain(total / count, this.lightGain);
    }
    const context = this.context;
    context.clearRect(0, 0, width, height);
    context.filter = cameraFilter(grade, grade.autoLight ? this.lightGain : 1);
    context.drawImage(video, 0, 0, width, height);
    context.filter = 'none';
    if (grade.warmth) {
      context.globalCompositeOperation = 'soft-light';
      context.globalAlpha = Math.abs(bounded(grade.warmth, -1, 1)) * 0.18;
      context.fillStyle = grade.warmth > 0 ? '#ffbc82' : '#9acbff';
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
    }
    if (shared) {
      context.globalCompositeOperation = 'destination-in';
      context.drawImage(this.matte, 0, 0, width, height);
    }
    context.globalCompositeOperation = 'source-over';
    return this.canvas;
  }
}