import React from 'react';
import type { CaptionLine } from '../hooks/useLiveCaptions';
import { COLORS, FONTS } from '../utils/constants';

interface Props {
  lines: CaptionLine[];
  current: string;
  visible: boolean;
}

/**
 * Floating live-caption strip rendered above the canvas mixer.
 * Pure HTML overlay (canvas-burn-in is intentional left-out so users
 * can decide whether to ship captions to viewers or just to operators).
 */
const CaptionsOverlay: React.FC<Props> = ({ lines, current, visible }) => {
  if (!visible) return null;
  const last = lines[lines.length - 1];
  const display = current || last?.text || '';
  const speaker = current ? '' : last?.speaker || '';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 200,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '70%',
        padding: '14px 26px',
        background: 'rgba(5,10,21,0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: FONTS.ui,
        fontSize: 22,
        lineHeight: 1.35,
        fontWeight: 700,
        color: '#fff',
        textAlign: 'center',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        zIndex: 25,
        pointerEvents: 'none',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}
    >
      {speaker && (
        <span style={{ color: COLORS.white, fontSize: 12, letterSpacing: '0.2em', display: 'block', marginBottom: 4, fontWeight: 900 }}>
          {speaker.toUpperCase()}
        </span>
      )}
      {display || '…'}
    </div>
  );
};

export default CaptionsOverlay;
