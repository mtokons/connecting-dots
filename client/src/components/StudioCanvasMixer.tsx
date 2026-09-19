import React, { useEffect, useRef } from 'react';
import type { Overlay, MultiCameraLayout } from '../types';
import { COLORS } from '../utils/constants';
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { CameraFrame, createPersonSegmenter, type BackgroundStatus } from '../lib/studioCamera';
import { containRect, DEFAULT_PROGRAM_STYLE, type ProgramStyle } from '../lib/studioMedia';

type SpeakerStreamEntry = {
  id: string;
  label: string;
  stream: MediaStream | null;
  isLocal: boolean;
  kind?: 'host' | 'camera' | 'guest' | 'screen' | 'clip';
  media?: HTMLVideoElement;
};

interface StudioCanvasMixerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  speakers: SpeakerStreamEntry[];
  overlays: Overlay[];
  showName: string;
  episodeNumber: number;
  isLive: boolean;
  layout?: MultiCameraLayout;
  lowerThird?: { name: string; role: string; city: string; visible: boolean } | null;
  accentColor?: string;
  backgroundUrl?: string;
  programStyle?: ProgramStyle;
  onBackgroundStatus?: (status: BackgroundStatus) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitCover(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;
  if (srcAR > dstAR) {
    const sh = srcH;
    const sw = sh * dstAR;
    const sx = (srcW - sw) / 2;
    return { sx, sy: 0, sw, sh };
  }
  const sw = srcW;
  const sh = sw / dstAR;
  const sy = (srcH - sh) / 2;
  return { sx: 0, sy, sw, sh };
}

/** Compute cell positions for each layout type */
function computeLayoutCells(
  layout: MultiCameraLayout,
  count: number,
  W: number,
  H: number,
  pad: number,
  topPad: number,
  bottomPad: number,
  gap: number
): { x: number; y: number; w: number; h: number }[] {
  const gridW = W - pad * 2;
  const gridH = H - topPad - bottomPad;

  switch (layout) {
    case 'single':
    case 'spotlight': {
      return [{ x: pad, y: topPad, w: gridW, h: gridH }];
    }

    case 'side-by-side': {
      const cellW = (gridW - gap) / 2;
      return [
        { x: pad, y: topPad, w: cellW, h: gridH },
        { x: pad + cellW + gap, y: topPad, w: cellW, h: gridH },
      ];
    }

    case 'triple': {
      const mainW = gridW * 0.62;
      const sideW = gridW - mainW - gap;
      const sideH = (gridH - gap) / 2;
      return [
        { x: pad, y: topPad, w: mainW, h: gridH },
        { x: pad + mainW + gap, y: topPad, w: sideW, h: sideH },
        { x: pad + mainW + gap, y: topPad + sideH + gap, w: sideW, h: sideH },
      ];
    }

    case 'quad': {
      const cellW = (gridW - gap) / 2;
      const cellH = (gridH - gap) / 2;
      return [
        { x: pad, y: topPad, w: cellW, h: cellH },
        { x: pad + cellW + gap, y: topPad, w: cellW, h: cellH },
        { x: pad, y: topPad + cellH + gap, w: cellW, h: cellH },
        { x: pad + cellW + gap, y: topPad + cellH + gap, w: cellW, h: cellH },
      ];
    }

    case 'pip-multi': {
      const pipW = Math.floor(W * 0.28);
      const pipH = Math.floor(pipW * 9 / 16);
      const cells: { x: number; y: number; w: number; h: number }[] = [
        { x: pad, y: topPad, w: gridW, h: gridH },
      ];
      // Stack PiP windows at bottom-right
      const pipCount = Math.min(count - 1, 3);
      for (let i = 0; i < pipCount; i++) {
        cells.push({
          x: W - pad - pipW - i * (pipW + gap),
          y: H - bottomPad - pipH - 10,
          w: pipW,
          h: pipH,
        });
      }
      return cells;
    }

    case 'pip': {
      const pipW = Math.floor(W * 0.34);
      const pipH = Math.floor(pipW * 9 / 16);
      return [
        { x: pad, y: topPad, w: gridW, h: gridH },
        { x: W - pad - pipW, y: H - bottomPad - pipH - 10, w: pipW, h: pipH },
      ];
    }

    case 'grid':
    default: {
      const cols = count <= 1 ? 1 : 2;
      const rows = count <= 2 ? 1 : 2;
      const cellW = (gridW - gap * (cols - 1)) / cols;
      const cellH = (gridH - gap * (rows - 1)) / rows;
      const cells: { x: number; y: number; w: number; h: number }[] = [];
      for (let i = 0; i < Math.min(count, cols * rows); i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        cells.push({
          x: pad + col * (cellW + gap),
          y: topPad + row * (cellH + gap),
          w: cellW,
          h: cellH,
        });
      }
      return cells;
    }
  }
}

const StudioCanvasMixer: React.FC<StudioCanvasMixerProps> = ({
  canvasRef,
  speakers,
  overlays,
  showName,
  episodeNumber,
  isLive,
  layout = 'grid',
  lowerThird,
  accentColor,
  backgroundUrl,
  programStyle = DEFAULT_PROGRAM_STYLE,
  onBackgroundStatus,
}) => {
  const resolvedAccent = accentColor || COLORS.primaryBlue;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    backgroundImageRef.current = null;
    if (!backgroundUrl) return;
    const image = new Image();
    image.src = backgroundUrl;
    backgroundImageRef.current = image;
    return () => { backgroundImageRef.current = null; };
  }, [backgroundUrl]);
  const logoDataUrl = '/sccg-logo.png';

  const videoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const cameraFramesRef = useRef(new Map<string, CameraFrame>());
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const segmentCursorRef = useRef(0);
  const segmentTimeRef = useRef(0);
  const sceneRef = useRef('');
  const transitionStartRef = useRef(0);
  const previousFrameRef = useRef<HTMLCanvasElement | null>(null);
  const logoCueRef = useRef(programStyle.logoCue);
  const logoStartRef = useRef(performance.now());
  const sharedBackground = programStyle.background === 'shared';

  useEffect(() => {
    if (!sharedBackground) { onBackgroundStatus?.('off'); return; }
    let disposed = false;
    let segmenter: ImageSegmenter | null = null;
    cameraFramesRef.current.clear();
    onBackgroundStatus?.('loading');
    void createPersonSegmenter().then((created) => {
      if (disposed) { created.close(); return; }
      segmenter = created;
      segmenterRef.current = created;
      onBackgroundStatus?.('ready');
    }).catch(() => { if (!disposed) onBackgroundStatus?.('unavailable'); });
    return () => {
      disposed = true;
      if (segmenterRef.current === segmenter) segmenterRef.current = null;
      segmenter?.close();
    };
  }, [sharedBackground, onBackgroundStatus]);

  useEffect(() => {
    // Keep a stable set of video elements per speaker id.
    const nextMap = new Map(videoElsRef.current);
    speakers.forEach((s) => {
      if (s.media) { nextMap.set(s.id, s.media); return; }
      if (!nextMap.has(s.id)) {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        nextMap.set(s.id, video);
      }
    });
    // Remove stale ones
    Array.from(nextMap.keys()).forEach((id) => {
      if (!speakers.some((s) => s.id === id)) {
        const video = nextMap.get(id);
        if (video?.srcObject) { video.pause(); video.srcObject = null; }
        nextMap.delete(id);
        cameraFramesRef.current.delete(id);
      }
    });
    videoElsRef.current = nextMap;
  }, [speakers]);

  useEffect(() => {
    // Attach streams
    speakers.forEach((s) => {
      const v = videoElsRef.current.get(s.id);
      if (!v || s.media) return;
      if (!s.stream) {
        if (v.srcObject) v.srcObject = null;
        return;
      }
      if (v.srcObject !== s.stream) {
        v.srcObject = s.stream;
        void v.play().catch(() => {});
      }
    });
  }, [speakers]);

  useEffect(() => () => {
    videoElsRef.current.forEach((video) => { if (video.srcObject) { video.pause(); video.srcObject = null; } });
    videoElsRef.current.clear();
    cameraFramesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!logoDataUrl) {
      logoImageRef.current = null;
      return;
    }
    const img = new Image();
    img.src = logoDataUrl;
    logoImageRef.current = img;
  }, [logoDataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const now = performance.now();
      const t = (now - startTimeRef.current) / 1000;

      const W = canvas.width || 1920;
      const H = canvas.height || 1080;
      const active = speakers.filter((speaker) => speaker.media || speaker.stream?.getVideoTracks().length);
      const scene = `${layout}:${backgroundUrl}:${active.map((speaker) => speaker.id).join(',')}`;
      if (sceneRef.current !== scene) {
        if (sceneRef.current) {
          const previous = previousFrameRef.current || document.createElement('canvas');
          previous.width = W;
          previous.height = H;
          previous.getContext('2d')?.drawImage(canvas, 0, 0);
          previousFrameRef.current = previous;
          transitionStartRef.current = now;
        }
        sceneRef.current = scene;
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#12241f';
      ctx.fillRect(0, 0, W, H);

      const backdrop = backgroundImageRef.current;
      if (backdrop?.complete && backdrop.naturalWidth > 0) {
        const crop = fitCover(backdrop.naturalWidth, backdrop.naturalHeight, W, H);
        ctx.drawImage(backdrop, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H);
      }

      const pad = 48;
      const gap = 28;
      const topPad = 120;
      const bottomPad = 160;

      const count = Math.max(1, active.length);

      // Compute layout cells
      const cells = computeLayoutCells(layout, count, W, H, pad, topPad, bottomPad, gap);
      const cameras = active.slice(0, cells.length).filter((speaker) => speaker.kind !== 'screen' && speaker.kind !== 'clip');
      if (sharedBackground && segmenterRef.current && cameras.length && now - segmentTimeRef.current > 1000 / Math.min(30, cameras.length * 12)) {
        segmentTimeRef.current = now;
        const speaker = cameras[segmentCursorRef.current++ % cameras.length];
        const video = videoElsRef.current.get(speaker.id);
        if (video && video.readyState >= 2 && video.videoWidth && speaker.stream?.getVideoTracks().some((track) => track.enabled && track.readyState === 'live')) {
          const frame = cameraFramesRef.current.get(speaker.id) || new CameraFrame();
          cameraFramesRef.current.set(speaker.id, frame);
          try {
            segmenterRef.current.segmentForVideo(video, performance.now(), (result) => {
              const mask = result.confidenceMasks?.[0];
              if (mask) frame.updateMatte(mask);
            });
          } catch {
            segmenterRef.current = null;
            onBackgroundStatus?.('unavailable');
          }
        }
      }

      // Draw speaker cards
      const drawSpeakerCard = (
        cell: { x: number; y: number; w: number; h: number },
        s: SpeakerStreamEntry | null,
        isPip: boolean = false
      ) => {
        const { x, y, w: cellW, h: cellH } = cell;
        const radius = 8;
        const presentation = s?.kind === 'screen' || s?.kind === 'clip';
        const cutout = sharedBackground && !presentation;

        // Card background
        ctx.save();
        drawRoundedRect(ctx, x, y, cellW, cellH, radius);
        ctx.fillStyle = presentation ? '#090d0c' : 'rgba(0,0,0,0.15)';
        if (!cutout) ctx.fill();
        ctx.lineWidth = isPip ? 2 : 2;
        ctx.strokeStyle = isPip ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
        if (!cutout) ctx.stroke();
        ctx.clip();

        if (s?.stream || s?.media) {
          const v = videoElsRef.current.get(s.id);
          const vw = v?.videoWidth ?? 0;
          const vh = v?.videoHeight ?? 0;
          if (v && vw > 0 && vh > 0 && (s.media || s.stream?.getVideoTracks().some((track) => track.enabled && track.readyState === 'live'))) {
            if (presentation) {
              const fit = containRect(vw, vh, cellW, cellH);
              ctx.drawImage(v, x + fit.x, y + fit.y, fit.width, fit.height);
            } else {
              const frame = cameraFramesRef.current.get(s.id) || new CameraFrame();
              cameraFramesRef.current.set(s.id, frame);
              const image = cutout && !segmenterRef.current ? null : frame.render(v, programStyle.grade, cutout, Math.max(cellW, cellH * vw / vh));
              if (image) {
                const { sx, sy, sw, sh } = fitCover(image.width, image.height, cellW, cellH);
                ctx.drawImage(image, sx, sy, sw, sh, x, y, cellW, cellH);
              }
            }
          }
        } else {
          // Placeholder
          const gg = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
          gg.addColorStop(0, 'rgba(0,168,255,0.08)');
          gg.addColorStop(1, 'rgba(255,255,255,0.02)');
          ctx.fillStyle = gg;
          ctx.fillRect(x, y, cellW, cellH);
        }

        if (presentation) { ctx.restore(); return; }
        const labelH = isPip ? 44 : 52;
        const hasLowerThird = programStyle.lowerThird.visible || lowerThird?.visible;
        if (hasLowerThird && x < pad + 720 && x + cellW > pad && y + cellH > H - 210 && y + cellH - labelH < H - 114) {
          ctx.restore();
          return;
        }
        const fontSize = isPip ? 16 : 20;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y + cellH - labelH, cellW, labelH);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.fillText(s?.label ?? 'Waiting for speakers', x + 18, y + cellH - (isPip ? 16 : 20), cellW - 36);

        ctx.restore();
      };

      if (active.length === 0) {
        drawSpeakerCard(
          cells[0] ?? { x: pad, y: topPad, w: W - pad * 2, h: H - topPad - bottomPad },
          { id: 'none', label: 'Add speakers in this room', stream: null, isLocal: false }
        );
      } else {
        cells.forEach((cell, idx) => {
          if (idx < active.length) {
            const isPip = (layout === 'pip' || layout === 'pip-multi') && idx > 0;
            drawSpeakerCard(cell, active[idx], isPip);
          }
        });
      }

      // ── Top header line ──────────────────────────────────
      ctx.fillStyle = 'rgba(0,0,0,0.64)';
      drawRoundedRect(ctx, pad, 32, W - pad * 2, 72, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Logo watermark (top-left, inside header)
      let titleX = pad + 22;
      const logo = logoImageRef.current;
      if (logo && logo.complete && logo.naturalWidth > 0) {
        const maxH = 56;
        const scale = maxH / logo.naturalHeight;
        const lw = logo.naturalWidth * scale;
        const lh = logo.naturalHeight * scale;
        if (logoCueRef.current !== programStyle.logoCue) { logoCueRef.current = programStyle.logoCue; logoStartRef.current = now; }
        const logoTime = (now - logoStartRef.current) / 1000;
        const reveal = programStyle.animateLogo ? Math.min(1, logoTime / 0.6) : 1;
        ctx.save();
        ctx.globalAlpha = reveal;
        ctx.drawImage(logo, pad + 14, 68 - lh / 2 + (1 - reveal) * 12, lw, lh);
        if (programStyle.animateLogo && logoTime % 12 < 1.2) {
          ctx.beginPath(); ctx.rect(pad + 14, 68 - lh / 2, lw, lh); ctx.clip();
          const sweep = (logoTime % 12) / 1.2;
          ctx.translate(pad + 14 + (lw + 50) * sweep - 50, 68 - lh / 2);
          ctx.transform(1, 0, -0.35, 1, 0, 0);
          ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(0, 0, 28, lh);
        }
        ctx.restore();
        titleX = pad + 14 + lw + 18;
      }

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '900 20px Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText(showName.toUpperCase(), titleX, 76, W - pad - titleX - 180);

      if (isLive) {
      const pillW = 140;
      const pillX = W - pad - pillW;
      const pillY = 40;
      drawRoundedRect(ctx, pillX, pillY, pillW, 56, 18);
      ctx.fillStyle = isLive ? 'rgba(255,77,77,0.85)' : 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = isLive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)';
      ctx.stroke();
      ctx.fillStyle = isLive ? '#fff' : 'rgba(255,255,255,0.55)';
      ctx.font = '900 14px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText(isLive ? 'LIVE' : 'OFF AIR', pillX + 54, 74);
      ctx.beginPath();
      ctx.arc(pillX + 32, 68, 6, 0, Math.PI * 2);
      ctx.fillStyle = isLive ? '#fff' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      }

      // ── Overlays ─────────────────────────────────────────
      const textOverlays = overlays.filter((o) => o.visible && o.type === 'text');
      textOverlays.forEach((o) => {
        const ox = clamp((o.x / 100) * W, 40, W - 40);
        const oy = clamp((o.y / 100) * H, 40, H - 40);
        ctx.font = `900 ${Math.max(14, o.fontSize)}px Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.fillStyle = o.color || COLORS.white;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fillText(o.content, ox, oy);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      });

      const ticker = programStyle.ticker.visible && programStyle.ticker.text.trim()
        ? { content: programStyle.ticker.text, fontSize: 24, color: '#ffffff' }
        : overlays.find((o) => o.visible && o.type === 'ticker');
      if (ticker) {
        const barH = 56;
        const ty = H - 88;
        drawRoundedRect(ctx, pad, ty, W - pad * 2, barH, 18);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.stroke();

        const text = ticker.content;
        ctx.font = `900 ${Math.max(16, ticker.fontSize)}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.fillStyle = ticker.color || resolvedAccent;
        const metrics = ctx.measureText(text);
        const textW = metrics.width;
        const speed = 180;
        const offset = (t * speed) % (textW + 220);
        const startX = pad + (W - pad * 2) - offset;
        const baselineY = ty + 36;

        ctx.save();
        ctx.beginPath();
        ctx.rect(pad + 18, ty + 10, W - pad * 2 - 36, barH - 20);
        ctx.clip();
        ctx.fillText(text, startX, baselineY);
        ctx.fillText(text, startX + textW + 220, baselineY);
        ctx.restore();
      }

      // Banner
      const banner = overlays.find((o) => o.visible && o.type === 'banner');
      if (banner) {
        const barW = W - pad * 2;
        const barH = 68;
        const bx = pad;
        const by = 104;
        drawRoundedRect(ctx, bx, by, barW, barH, 22);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.stroke();

        drawRoundedRect(ctx, bx + 18, by + 18, 10, barH - 36, 6);
        ctx.fillStyle = resolvedAccent;
        ctx.fill();

        ctx.fillStyle = banner.color || 'rgba(255,255,255,0.92)';
        ctx.font = `900 ${Math.max(18, banner.fontSize)}px Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        const msg = banner.content;
        const maxTextW = barW - 70;
        let rendered = msg;
        while (rendered.length > 0 && ctx.measureText(rendered + '…').width > maxTextW) {
          rendered = rendered.slice(0, -1);
        }
        if (rendered !== msg) rendered += '…';
        ctx.fillText(rendered, bx + 46, by + 44);
      }

      // Comment (pinned)
      const comment = overlays.find((o) => o.visible && o.type === 'comment');
      if (comment) {
        const p = (comment.payload ?? {}) as { author?: string; message?: string; platform?: string };
        const author = p.author ?? 'Viewer';
        const message = p.message ?? comment.content;
        const platform = p.platform ?? 'Live';

        const cardW = Math.min(760, W - pad * 2);
        const cardH = 150;
        const cx = pad;
        const cy = H - 380;
        drawRoundedRect(ctx, cx, cy, cardW, cardH, 26);
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.stroke();

        // platform pill
        drawRoundedRect(ctx, cx + 22, cy + 20, 110, 34, 14);
        ctx.fillStyle = 'rgba(0,168,255,0.20)';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '900 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(platform.toUpperCase(), cx + 40, cy + 42);

        // author
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '900 22px Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(author, cx + 22, cy + 84);

        // message (wrap)
        ctx.fillStyle = 'rgba(255,255,255,0.70)';
        ctx.font = '800 16px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        const words = message.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let line = '';
        const maxW = cardW - 44;
        words.forEach((w) => {
          const next = line ? `${line} ${w}` : w;
          if (ctx.measureText(next).width <= maxW) {
            line = next;
          } else {
            if (line) lines.push(line);
            line = w;
          }
        });
        if (line) lines.push(line);
        lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, cx + 22, cy + 114 + i * 22));
      }

      // Lower third
      const activeLowerThird = programStyle.lowerThird.visible ? programStyle.lowerThird : lowerThird;
      if (activeLowerThird?.visible) {
        const boxW = 720;
        const boxH = 96;
        const lx = pad;
        const ly = H - 210;
        drawRoundedRect(ctx, lx, ly, boxW, boxH, 22);
        ctx.fillStyle = 'rgba(0,0,0,0.60)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.stroke();

        drawRoundedRect(ctx, lx + 18, ly + 18, 10, boxH - 36, 6);
        ctx.fillStyle = resolvedAccent;
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '900 26px Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(activeLowerThird.name, lx + 46, ly + 52, boxW - 70);

        ctx.fillStyle = 'rgba(255,255,255,0.60)';
        ctx.font = '800 14px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText([activeLowerThird.role, activeLowerThird.city].filter(Boolean).join(' / '), lx + 46, ly + 78, boxW - 70);
      }

      const progress = clamp((now - transitionStartRef.current) / 450, 0, 1);
      if (previousFrameRef.current && progress < 1 && programStyle.transition !== 'cut') {
        const eased = progress * progress * (3 - 2 * progress);
        ctx.save();
        if (programStyle.transition === 'dissolve') ctx.globalAlpha = 1 - eased;
        else { ctx.beginPath(); ctx.rect(W * eased, 0, W * (1 - eased), H); ctx.clip(); }
        ctx.drawImage(previousFrameRef.current, 0, 0);
        ctx.restore();
        if (programStyle.transition === 'wipe') { ctx.fillStyle = resolvedAccent; ctx.fillRect(W * eased - 8, 0, 16, H); }
      }
      timerRef.current = setTimeout(draw, Math.max(0, 1000 / 30 - (performance.now() - now)));
    };

    draw();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [canvasRef, speakers, overlays, showName, episodeNumber, isLive, lowerThird, layout, backgroundUrl, resolvedAccent, programStyle, sharedBackground, onBackgroundStatus]);

  return null;
};

export default StudioCanvasMixer;
