import React from 'react';
import { COLORS, FONTS } from '../utils/constants';
import type { MultiCameraLayout, CameraSource } from '../types';

interface Props {
  currentLayout: MultiCameraLayout;
  onLayoutChange: (layout: MultiCameraLayout) => void;
  cameras: CameraSource[];
  transitionMode: 'cut' | 'crossfade';
  onTransitionModeChange: (mode: 'cut' | 'crossfade') => void;
}

const layouts: { value: MultiCameraLayout; label: string; icon: string; shortcut: string; minCameras: number }[] = [
  { value: 'single', label: 'Single', icon: '▣', shortcut: '1', minCameras: 1 },
  { value: 'side-by-side', label: 'Split', icon: '◫', shortcut: '2', minCameras: 2 },
  { value: 'triple', label: 'Triple', icon: '⊞', shortcut: '3', minCameras: 2 },
  { value: 'quad', label: 'Quad', icon: '⊞', shortcut: '4', minCameras: 3 },
  { value: 'pip-multi', label: 'PiP+', icon: '◱', shortcut: '5', minCameras: 2 },
  { value: 'grid', label: 'Grid', icon: '▦', shortcut: '6', minCameras: 1 },
  { value: 'spotlight', label: 'Spot', icon: '◉', shortcut: '7', minCameras: 1 },
  { value: 'pip', label: 'PiP', icon: '◲', shortcut: '8', minCameras: 2 },
];

/** Mini layout thumbnail SVG */
const LayoutThumb: React.FC<{ layout: MultiCameraLayout; active: boolean }> = ({ layout, active }) => {
  const fg = active ? COLORS.primaryBlue : 'rgba(255,255,255,0.25)';
  const w = 44;
  const h = 28;
  const r = 3;
  const g = 2;

  const rects: { x: number; y: number; w: number; h: number }[] = (() => {
    switch (layout) {
      case 'single':
        return [{ x: 1, y: 1, w: w - 2, h: h - 2 }];
      case 'side-by-side':
        return [
          { x: 1, y: 1, w: (w - g) / 2 - 1, h: h - 2 },
          { x: (w + g) / 2, y: 1, w: (w - g) / 2 - 1, h: h - 2 },
        ];
      case 'triple':
        return [
          { x: 1, y: 1, w: w * 0.62, h: h - 2 },
          { x: w * 0.62 + g, y: 1, w: w * 0.38 - g - 1, h: (h - g) / 2 - 1 },
          { x: w * 0.62 + g, y: (h + g) / 2, w: w * 0.38 - g - 1, h: (h - g) / 2 - 1 },
        ];
      case 'quad':
        return [
          { x: 1, y: 1, w: (w - g) / 2 - 1, h: (h - g) / 2 - 1 },
          { x: (w + g) / 2, y: 1, w: (w - g) / 2 - 1, h: (h - g) / 2 - 1 },
          { x: 1, y: (h + g) / 2, w: (w - g) / 2 - 1, h: (h - g) / 2 - 1 },
          { x: (w + g) / 2, y: (h + g) / 2, w: (w - g) / 2 - 1, h: (h - g) / 2 - 1 },
        ];
      case 'pip-multi':
        return [
          { x: 1, y: 1, w: w - 2, h: h - 2 },
          { x: w - 16, y: h - 12, w: 14, h: 10 },
          { x: w - 32, y: h - 12, w: 14, h: 10 },
        ];
      case 'grid':
        return [
          { x: 1, y: 1, w: (w - g) / 2 - 1, h: h - 2 },
          { x: (w + g) / 2, y: 1, w: (w - g) / 2 - 1, h: h - 2 },
        ];
      case 'spotlight':
        return [{ x: 1, y: 1, w: w - 2, h: h - 2 }];
      case 'pip':
        return [
          { x: 1, y: 1, w: w - 2, h: h - 2 },
          { x: w - 16, y: h - 12, w: 14, h: 10 },
        ];
      default:
        return [{ x: 1, y: 1, w: w - 2, h: h - 2 }];
    }
  })();

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {rects.map((rect, i) => (
        <rect
          key={i}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          rx={r}
          fill={i === 0 ? fg : active ? 'rgba(0,168,255,0.4)' : 'rgba(255,255,255,0.12)'}
          stroke={active ? 'rgba(0,168,255,0.5)' : 'rgba(255,255,255,0.1)'}
          strokeWidth={0.5}
        />
      ))}
    </svg>
  );
};

const CameraSwitcher: React.FC<Props> = ({
  currentLayout,
  onLayoutChange,
  cameras,
  transitionMode,
  onTransitionModeChange,
}) => {
  const enabledCount = cameras.filter((c) => c.enabled).length;

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= layouts.length) {
        const layout = layouts[idx - 1];
        if (enabledCount >= layout.minCameras) {
          onLayoutChange(layout.value);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onLayoutChange, enabledCount]);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        fontFamily: FONTS.ui,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          LAYOUT
        </div>

        {/* Transition Mode Toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2 }}>
          {(['cut', 'crossfade'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onTransitionModeChange(mode)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: 'none',
                background: transitionMode === mode ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: transitionMode === mode ? '#fff' : 'rgba(255,255,255,0.35)',
                fontSize: 8,
                fontWeight: 900,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {layouts.map((l) => {
          const isActive = currentLayout === l.value;
          const isDisabled = enabledCount < l.minCameras;

          return (
            <button
              key={l.value}
              onClick={() => !isDisabled && onLayoutChange(l.value)}
              disabled={isDisabled}
              style={{
                padding: '8px 4px 4px',
                borderRadius: 10,
                border: isActive
                  ? `1px solid ${COLORS.primaryBlue}`
                  : '1px solid rgba(255,255,255,0.06)',
                background: isActive ? 'rgba(0,168,255,0.1)' : 'rgba(0,0,0,0.2)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.3 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease',
              }}
              title={`${l.label} (${l.shortcut}) — needs ${l.minCameras}+ cameras`}
            >
              <LayoutThumb layout={l.value} active={isActive} />
              <div
                style={{
                  fontSize: 7,
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  color: isActive ? COLORS.primaryBlue : 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                }}
              >
                {l.label}
              </div>
              <div
                style={{
                  fontSize: 7,
                  color: 'rgba(255,255,255,0.2)',
                  fontWeight: 800,
                }}
              >
                {l.shortcut}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CameraSwitcher;
