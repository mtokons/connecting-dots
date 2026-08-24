import React, { useEffect, useMemo, useRef } from 'react';
import type { Overlay, MultiCameraLayout } from '../types';
import { COLORS } from '../utils/constants';

type SpeakerStreamEntry = {
  id: string;
  label: string;
  stream: MediaStream | null;
  isLocal: boolean;
};

const LOGO_STORAGE_KEY = 'connectingdot_logo';

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
}) => {
  const resolvedAccent = accentColor || COLORS.primaryBlue;
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const logoDataUrl = useMemo(() => {
    try {
      return localStorage.getItem(LOGO_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  const videoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Layout transition state
  const prevLayoutRef = useRef<MultiCameraLayout>(layout);
  const transitionRef = useRef<number>(1);

  useEffect(() => {
    // Keep a stable set of video elements per speaker id.
    const nextMap = new Map(videoElsRef.current);
    speakers.forEach((s) => {
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
        nextMap.delete(id);
      }
    });
    videoElsRef.current = nextMap;
  }, [speakers]);

  useEffect(() => {
    // Attach streams
    speakers.forEach((s) => {
      const v = videoElsRef.current.get(s.id);
      if (!v) return;
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

      // Handle layout transition
      if (prevLayoutRef.current !== layout) {
        transitionRef.current = 0;
        prevLayoutRef.current = layout;
      }
      if (transitionRef.current < 1) {
        transitionRef.current = Math.min(1, transitionRef.current + 0.04);
      }

      const W = canvas.width || 1920;
      const H = canvas.height || 1080;

      ctx.globalAlpha = transitionRef.current;

      // Background (subtle animated gradient)
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#050A15');
      g.addColorStop(0.6, '#08162F');
      g.addColorStop(1, '#050A15');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Glow orbs
      const orb1x = W * (0.25 + 0.02 * Math.sin(t * 0.7));
      const orb1y = H * (0.2 + 0.03 * Math.cos(t * 0.9));
      const orb2x = W * (0.75 + 0.02 * Math.cos(t * 0.6));
      const orb2y = H * (0.7 + 0.03 * Math.sin(t * 0.8));
      const orb = (x: number, y: number, r: number, color: string) => {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, color);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      };
      orb(orb1x, orb1y, Math.min(W, H) * 0.35, 'rgba(0,168,255,0.10)');
      orb(orb2x, orb2y, Math.min(W, H) * 0.40, 'rgba(0,87,168,0.10)');

      const pad = 48;
      const gap = 28;
      const topPad = 120;
      const bottomPad = 160;

      const active = speakers.filter((s) => s.stream);
      const count = Math.max(1, active.length);

      // Compute layout cells
      const cells = computeLayoutCells(layout, count, W, H, pad, topPad, bottomPad, gap);

      // Draw speaker cards
      const drawSpeakerCard = (
        cell: { x: number; y: number; w: number; h: number },
        s: SpeakerStreamEntry | null,
        isPip: boolean = false
      ) => {
        const { x, y, w: cellW, h: cellH } = cell;
        const radius = isPip ? 22 : 28;

        // Card background
        ctx.save();
        drawRoundedRect(ctx, x, y, cellW, cellH, radius);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();
        ctx.lineWidth = isPip ? 2 : 2;
        ctx.strokeStyle = isPip ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
        ctx.stroke();
        ctx.clip();

        // Video (cover)
        if (s?.stream) {
          const v = videoElsRef.current.get(s.id);
          const vw = v?.videoWidth ?? 0;
          const vh = v?.videoHeight ?? 0;
          if (v && vw > 0 && vh > 0) {
            const { sx, sy, sw, sh } = fitCover(vw, vh, cellW, cellH);
            ctx.drawImage(v, sx, sy, sw, sh, x, y, cellW, cellH);
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x, y, cellW, cellH);
          }
        } else {
          // Placeholder
          const gg = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
          gg.addColorStop(0, 'rgba(0,168,255,0.08)');
          gg.addColorStop(1, 'rgba(255,255,255,0.02)');
          ctx.fillStyle = gg;
          ctx.fillRect(x, y, cellW, cellH);
        }

        // Vignette
        const vg = ctx.createRadialGradient(
          x + cellW / 2, y + cellH / 2, 0,
          x + cellW / 2, y + cellH / 2, Math.max(cellW, cellH)
        );
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vg;
        ctx.fillRect(x, y, cellW, cellH);

        // Label bar
        const labelH = isPip ? 44 : 52;
        const fontSize = isPip ? 16 : 20;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y + cellH - labelH, cellW, labelH);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.fillText(s?.label ?? 'Waiting for speakers…', x + 18, y + cellH - (isPip ? 16 : 20));

        // Local badge
        if (s?.isLocal) {
          ctx.fillStyle = 'rgba(0,168,255,0.85)';
          drawRoundedRect(ctx, x + 18, y + 18, 78, 30, 12);
          ctx.fill();
          ctx.fillStyle = '#001529';
          ctx.font = '900 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
          ctx.fillText('LOCAL', x + 38, y + 38);
        }

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
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      drawRoundedRect(ctx, pad, 40, W - pad * 2, 56, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '900 22px Outfit, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText(showName.toUpperCase(), pad + 22, 76);

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '900 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText(`EP ${episodeNumber.toString().padStart(2, '0')} • CONNECTING DOT`, W - pad - 260, 76);

      // LIVE/OFF AIR indicator
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

      // Logo watermark (top-left, inside header)
      const logo = logoImageRef.current;
      if (logo && logo.complete && logo.naturalWidth > 0) {
        const maxH = 36;
        const scale = maxH / logo.naturalHeight;
        const lw = logo.naturalWidth * scale;
        const lh = logo.naturalHeight * scale;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logo, pad + 22, 52 - lh / 2 + 18, lw, lh);
        ctx.globalAlpha = 1;
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

      const ticker = overlays.find((o) => o.visible && o.type === 'ticker');
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
      if (lowerThird?.visible) {
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
        ctx.fillText(lowerThird.name, lx + 46, ly + 52);

        ctx.fillStyle = 'rgba(255,255,255,0.60)';
        ctx.font = '800 14px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(`${lowerThird.role.toUpperCase()} • ${lowerThird.city}`, lx + 46, ly + 78);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [canvasRef, speakers, overlays, showName, episodeNumber, isLive, lowerThird, layout]);

  return null;
};

export default StudioCanvasMixer;
