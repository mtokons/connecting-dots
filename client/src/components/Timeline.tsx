import React, { useRef, useCallback, useEffect, useState } from 'react';
import { COLORS, FONTS } from '../utils/constants';

interface Marker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

interface TimelineProps {
  duration: number;
  currentTime: number;
  trimIn: number;
  trimOut: number;
  markers: Marker[];
  onSeek: (time: number) => void;
  onTrimInChange: (time: number) => void;
  onTrimOutChange: (time: number) => void;
  onAddMarker: (time: number, label: string) => void;
  onRemoveMarker: (id: string) => void;
  isPlaying: boolean;
}

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  trimIn,
  trimOut,
  markers,
  onSeek,
  onTrimInChange,
  onTrimOutChange,
  onAddMarker,
  onRemoveMarker,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'playhead' | 'trim-in' | 'trim-out' | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAddMarker, setShowAddMarker] = useState(false);
  const [markerLabel, setMarkerLabel] = useState('');

  const toPercent = (time: number) => (duration > 0 ? (time / duration) * 100 : 0);
  const fromPercent = (pct: number) => (pct / 100) * duration;

  const getTimeFromMouse = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      return fromPercent(pct);
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'playhead' | 'trim-in' | 'trim-out') => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(type);
    },
    []
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      const time = getTimeFromMouse(e);
      onSeek(time);
    },
    [dragging, getTimeFromMouse, onSeek]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const time = getTimeFromMouse(e);
      if (dragging === 'playhead') onSeek(time);
      else if (dragging === 'trim-in') onTrimInChange(Math.min(time, trimOut - 0.1));
      else if (dragging === 'trim-out') onTrimOutChange(Math.max(time, trimIn + 0.1));
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, getTimeFromMouse, onSeek, onTrimInChange, onTrimOutChange, trimIn, trimOut]);

  // Tick marks
  const tickCount = Math.max(2, Math.floor(duration / 10) + 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => (i * duration) / (tickCount - 1));

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: '12px 16px',
        fontFamily: FONTS.ui,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)' }}>
            TIMELINE
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.white }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            style={zoomBtnStyle}
          >
            −
          </button>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', width: 32, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            style={zoomBtnStyle}
          >
            +
          </button>

          {/* Add Marker */}
          <button
            onClick={() => setShowAddMarker(!showAddMarker)}
            style={{
              ...zoomBtnStyle,
              background: showAddMarker ? 'rgba(0,168,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: showAddMarker ? COLORS.white : 'rgba(255,255,255,0.5)',
              fontSize: 11,
              padding: '4px 10px',
            }}
          >
            🏷
          </button>
        </div>
      </div>

      {/* Add Marker Row */}
      {showAddMarker && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={markerLabel}
            onChange={(e) => setMarkerLabel(e.target.value)}
            placeholder="Chapter name…"
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 11,
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (markerLabel.trim()) {
                onAddMarker(currentTime, markerLabel.trim());
                setMarkerLabel('');
              }
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: COLORS.white,
              color: '#fff',
              fontSize: 10,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            ADD
          </button>
        </div>
      )}

      {/* Timeline Track */}
      <div
        ref={containerRef}
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          height: 56,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          overflow: 'hidden',
          cursor: 'pointer',
          transform: `scaleX(${zoom})`,
          transformOrigin: 'left',
        }}
      >
        {/* Trim region (dimmed outside) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${toPercent(trimIn)}%`,
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: `${100 - toPercent(trimOut)}%`,
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1,
          }}
        />

        {/* Active region */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${toPercent(trimIn)}%`,
            width: `${toPercent(trimOut) - toPercent(trimIn)}%`,
            height: '100%',
            background: 'rgba(0,168,255,0.06)',
            borderLeft: '2px solid rgba(0,168,255,0.5)',
            borderRight: '2px solid rgba(0,168,255,0.5)',
            zIndex: 2,
          }}
        />

        {/* Trim handles */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'trim-in')}
          style={{
            position: 'absolute',
            top: 0,
            left: `${toPercent(trimIn)}%`,
            width: 12,
            height: '100%',
            background: 'rgba(0,168,255,0.8)',
            borderRadius: '4px 0 0 4px',
            cursor: 'ew-resize',
            zIndex: 5,
            marginLeft: -6,
          }}
        />
        <div
          onMouseDown={(e) => handleMouseDown(e, 'trim-out')}
          style={{
            position: 'absolute',
            top: 0,
            left: `${toPercent(trimOut)}%`,
            width: 12,
            height: '100%',
            background: 'rgba(0,168,255,0.8)',
            borderRadius: '0 4px 4px 0',
            cursor: 'ew-resize',
            zIndex: 5,
            marginLeft: -6,
          }}
        />

        {/* Playhead */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'playhead')}
          style={{
            position: 'absolute',
            top: 0,
            left: `${toPercent(currentTime)}%`,
            width: 3,
            height: '100%',
            background: '#FF4D4D',
            zIndex: 10,
            cursor: 'ew-resize',
            boxShadow: '0 0 8px rgba(255,77,77,0.5)',
          }}
        >
          {/* Playhead handle */}
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: -5,
              width: 13,
              height: 10,
              background: '#FF4D4D',
              borderRadius: '3px 3px 0 0',
            }}
          />
        </div>

        {/* Markers */}
        {markers.map((m) => (
          <div
            key={m.id}
            style={{
              position: 'absolute',
              top: 0,
              left: `${toPercent(m.time)}%`,
              width: 2,
              height: '100%',
              background: m.color || '#F59E0B',
              zIndex: 8,
            }}
            title={`${m.label} (${formatTime(m.time)})`}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: 4,
                fontSize: 7,
                fontWeight: 800,
                color: m.color || '#F59E0B',
                whiteSpace: 'nowrap',
                background: 'rgba(0,0,0,0.6)',
                padding: '2px 4px',
                borderRadius: 3,
              }}
            >
              {m.label}
            </div>
          </div>
        ))}

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${toPercent(tick)}%`,
              width: 1,
              height: 8,
              background: 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Tick labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, transform: `scaleX(${zoom})`, transformOrigin: 'left' }}>
        {ticks.map((tick, i) => (
          <div key={i} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
            {formatTime(tick)}
          </div>
        ))}
      </div>

      {/* Markers List */}
      {markers.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {markers.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 10,
                fontWeight: 800,
                color: '#F59E0B',
              }}
            >
              <span onClick={() => onSeek(m.time)} style={{ cursor: 'pointer' }}>
                🏷 {m.label} ({formatTime(m.time)})
              </span>
              <button
                onClick={() => onRemoveMarker(m.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,77,77,0.6)',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                }}
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

const zoomBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 14,
  fontWeight: 900,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default Timeline;
