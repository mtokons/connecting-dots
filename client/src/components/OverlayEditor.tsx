import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { COLORS, FONTS } from '../utils/constants';
import type { Overlay } from '../types';

interface OverlayEditorProps {
  onAddOverlay: (overlay: Overlay) => void;
  onToggleLowerThird: () => void;
  isLowerThirdVisible: boolean;
  overlays: Overlay[];
  onRemoveOverlay: (id: string) => void;
  onUpdateOverlay: (id: string, updates: Partial<Overlay>) => void;
  onToggleOverlayVisibility: (id: string) => void;
}

const colorSwatches = [
  COLORS.white,
  COLORS.white,
  '#10B981',
  '#F59E0B',
  COLORS.liveRed,
  '#8B5CF6',
];

const fontSizes = [
  { label: 'S', value: 16 },
  { label: 'M', value: 24 },
  { label: 'L', value: 36 },
];

type GfxMode = null | 'text' | 'banner' | 'ticker';

const OverlayEditor: React.FC<OverlayEditorProps> = ({
  onAddOverlay,
  onToggleLowerThird,
  isLowerThirdVisible,
  overlays,
  onRemoveOverlay,
  onUpdateOverlay,
  onToggleOverlayVisibility,
}) => {
  const [activeColor, setActiveColor] = useState<string>(COLORS.white);
  const [activeFontSize, setActiveFontSize] = useState(24);
  const [gfxMode, setGfxMode] = useState<GfxMode>(null);
  const [inputText, setInputText] = useState('');
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [showOverlayList, setShowOverlayList] = useState(false);

  const handleAdd = () => {
    if (!inputText.trim() || !gfxMode) return;
    const overlay: Overlay = {
      id: uuidv4(),
      type: gfxMode === 'text' ? 'text' : gfxMode === 'banner' ? 'banner' : 'ticker',
      content: inputText.trim(),
      x: gfxMode === 'ticker' ? 0 : 50,
      y: gfxMode === 'ticker' ? 88 : gfxMode === 'banner' ? 8 : 50,
      color: activeColor,
      fontSize: activeFontSize,
      visible: true,
      payload: gfxMode === 'banner' ? { tone: 'info' } : undefined,
    };
    onAddOverlay(overlay);
    setInputText('');
    setGfxMode(null);
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    fontFamily: FONTS.ui,
    fontSize: 11,
    fontWeight: 800,
    padding: '7px 14px',
    borderRadius: 10,
    border: active ? '1px solid rgba(0,168,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: active
      ? 'linear-gradient(180deg, #0057A8 0%, #003875 100%)'
      : 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    color: COLORS.white,
    boxShadow: active
      ? '0 4px 15px rgba(0,87,168,0.5), inset 0 2px 4px rgba(255,255,255,0.3)'
      : '0 2px 6px rgba(0,0,0,0.3)',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  });

  const placeholderMap: Record<string, string> = {
    text: 'Enter text overlay content…',
    banner: 'Enter banner message…',
    ticker: 'Enter scrolling news text…',
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(5,10,21,0.98) 0%, rgba(13,27,42,0.98) 100%)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.7)',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Row 1: GFX buttons + color/size */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: FONTS.ui, fontSize: 9, fontWeight: 900, color: COLORS.white,
          textTransform: 'uppercase', letterSpacing: '0.3em', marginRight: 4,
        }}>GFX</span>

        <button style={btnStyle(gfxMode === 'text')} onClick={() => { setGfxMode(gfxMode === 'text' ? null : 'text'); setInputText(''); }}>
          + TEXT
        </button>
        <button style={btnStyle(gfxMode === 'banner')} onClick={() => { setGfxMode(gfxMode === 'banner' ? null : 'banner'); setInputText(''); }}>
          + BANNER
        </button>
        <button style={btnStyle(isLowerThirdVisible)} onClick={onToggleLowerThird}>
          LOWER 3RD
        </button>
        <button style={btnStyle(gfxMode === 'ticker')} onClick={() => { setGfxMode(gfxMode === 'ticker' ? null : 'ticker'); setInputText(''); }}>
          + TICKER
        </button>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

        {/* Tint Colors - applies to selected overlay or next new one */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: FONTS.ui, fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>TINT</span>
          {colorSwatches.map((c) => (
            <div
              key={c}
              onClick={() => {
                setActiveColor(c);
                if (selectedOverlayId) onUpdateOverlay(selectedOverlayId, { color: c });
              }}
              style={{
                width: 20, height: 20, borderRadius: 5, background: c, cursor: 'pointer',
                border: activeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: activeColor === c ? `0 0 8px ${c}` : 'none',
                transform: activeColor === c ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

        {/* Font Sizes - applies to selected overlay or next new one */}
        <div style={{ display: 'flex', gap: 3 }}>
          {fontSizes.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setActiveFontSize(f.value);
                if (selectedOverlayId) onUpdateOverlay(selectedOverlayId, { fontSize: f.value });
              }}
              style={{
                fontFamily: FONTS.ui, fontSize: 11, fontWeight: 900,
                padding: '5px 10px', borderRadius: 7, border: 'none',
                background: activeFontSize === f.value ? 'rgba(0,168,255,0.2)' : 'transparent',
                color: activeFontSize === f.value ? COLORS.white : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Overlay Layers Toggle */}
        {overlays.length > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />
            <button
              style={btnStyle(showOverlayList)}
              onClick={() => setShowOverlayList(!showOverlayList)}
            >
              LAYERS ({overlays.length})
            </button>
          </>
        )}
      </div>

      {/* Row 2: Inline text input when a GFX mode is active */}
      {gfxMode && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder={placeholderMap[gfxMode]}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 10,
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontFamily: FONTS.ui, fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!inputText.trim()}
            style={{
              ...btnStyle(true),
              opacity: inputText.trim() ? 1 : 0.4,
              padding: '9px 20px',
            }}
          >
            ADD {gfxMode.toUpperCase()}
          </button>
          <button
            onClick={() => { setGfxMode(null); setInputText(''); }}
            style={{ ...btnStyle(), padding: '9px 12px', fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Row 3: Active overlays list */}
      {showOverlayList && overlays.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0',
        }}>
          {overlays.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelectedOverlayId(selectedOverlayId === o.id ? null : o.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                background: selectedOverlayId === o.id ? 'rgba(0,168,255,0.15)' : 'rgba(255,255,255,0.03)',
                border: selectedOverlayId === o.id ? '1px solid rgba(0,168,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{
                fontFamily: FONTS.ui, fontSize: 8, fontWeight: 900,
                color: COLORS.white, textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {o.type}
              </span>
              <span style={{
                fontFamily: FONTS.ui, fontSize: 11, color: 'rgba(255,255,255,0.7)',
                maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {o.content}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleOverlayVisibility(o.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
                  fontSize: 11, color: o.visible ? '#10B981' : 'rgba(255,255,255,0.2)',
                }}
                title={o.visible ? 'Hide' : 'Show'}
              >
                {o.visible ? '👁' : '—'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveOverlay(o.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
                  fontSize: 11, color: '#FF4D4D',
                }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OverlayEditor;
