import React, { useEffect, useRef, useState } from 'react';
import { Room, Track, LocalVideoTrack, createLocalVideoTrack } from 'livekit-client';
import { COLORS, FONTS } from '../utils/constants';
import type { CameraSource } from '../types';

interface Props {
  room: Room | null;
  cameras: CameraSource[];
  availableDevices: MediaDeviceInfo[];
  onAddCamera: (deviceId: string, label?: string) => Promise<void>;
  onRemoveCamera: (id: string) => void;
  onToggleCamera: (id: string) => void;
  onSetProgram: (id: string) => void;
  onSetLabel: (id: string, label: string) => void;
  onSetResolution: (id: string, res: '720p' | '1080p' | '4k') => Promise<void>;
}

/** Small live video preview for a camera */
const CameraPreview: React.FC<{ stream: MediaStream | null }> = ({ stream }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
    return () => {
      if (ref.current) ref.current.srcObject = null;
    };
  }, [stream]);

  if (!stream) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        📷
      </div>
    );
  }

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      style={{
        width: '100%',
        aspectRatio: '16/9',
        objectFit: 'cover',
        borderRadius: 10,
        background: '#000',
      }}
    />
  );
};

const MultiCameraPublisher: React.FC<Props> = ({
  room,
  cameras,
  availableDevices,
  onAddCamera,
  onRemoveCamera,
  onToggleCamera,
  onSetProgram,
  onSetLabel,
  onSetResolution,
}) => {
  const [busy, setBusy] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [publishedTrackIds, setPublishedTrackIds] = useState<Set<string>>(new Set());

  // Get devices not yet in use
  const usedDeviceIds = new Set(cameras.map((c) => c.deviceId));
  const unusedDevices = availableDevices.filter((d) => !usedDeviceIds.has(d.deviceId));

  // Publish extra cameras to LiveKit room
  useEffect(() => {
    if (!room) return;

    cameras.forEach(async (cam) => {
      if (!cam.enabled || !cam.track || cam.isProgram) return;
      if (publishedTrackIds.has(cam.id)) return;

      try {
        const lvTrack = new LocalVideoTrack(cam.track);
        await room.localParticipant.publishTrack(lvTrack, {
          name: cam.label,
          source: Track.Source.Unknown,
          simulcast: true,
        });
        setPublishedTrackIds((prev) => new Set(prev).add(cam.id));
      } catch (err) {
        console.error(`Failed to publish camera ${cam.label}:`, err);
      }
    });
  }, [room, cameras, publishedTrackIds]);

  const handleAdd = async (deviceId: string) => {
    setBusy(true);
    try {
      await onAddCamera(deviceId);
    } finally {
      setBusy(false);
    }
  };

  const startEditLabel = (cam: CameraSource) => {
    setEditingLabel(cam.id);
    setLabelDraft(cam.label);
  };

  const saveLabel = (id: string) => {
    if (labelDraft.trim()) {
      onSetLabel(id, labelDraft.trim());
    }
    setEditingLabel(null);
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        fontFamily: FONTS.ui,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
          MULTI‑CAMERA ({cameras.length})
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: cameras.some((c) => c.isProgram && c.enabled) ? '#10B981' : 'rgba(255,255,255,0.3)',
            letterSpacing: '0.12em',
          }}
        >
          {cameras.filter((c) => c.enabled).length} ACTIVE
        </div>
      </div>

      {/* Camera Cards */}
      {cameras.map((cam) => (
        <div
          key={cam.id}
          style={{
            background: cam.isProgram
              ? 'rgba(0,168,255,0.08)'
              : 'rgba(0,0,0,0.2)',
            border: cam.isProgram
              ? '1px solid rgba(0,168,255,0.25)'
              : '1px solid rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: 10,
            opacity: cam.enabled ? 1 : 0.5,
            transition: 'all 0.2s ease',
          }}
        >
          {/* Preview */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <CameraPreview stream={cam.enabled ? cam.stream : null} />

            {/* Program badge */}
            {cam.isProgram && (
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: 'rgba(255,77,77,0.9)',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                PROGRAM
              </div>
            )}

            {/* Resolution badge */}
            <div
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 8,
                fontWeight: 800,
                padding: '3px 6px',
                borderRadius: 4,
              }}
            >
              {cam.resolution.toUpperCase()}
            </div>
          </div>

          {/* Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {editingLabel === cam.id ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => saveLabel(cam.id)}
                onKeyDown={(e) => e.key === 'Enter' && saveLabel(cam.id)}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0,168,255,0.3)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            ) : (
              <div
                onClick={() => startEditLabel(cam)}
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title="Click to rename"
              >
                {cam.label}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {/* Set as Program */}
            {!cam.isProgram && (
              <button
                onClick={() => onSetProgram(cam.id)}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,168,255,0.2)',
                  background: 'rgba(0,168,255,0.08)',
                  color: COLORS.primaryBlue,
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                SET LIVE
              </button>
            )}

            {/* Enable/Disable */}
            <button
              onClick={() => onToggleCamera(cam.id)}
              style={{
                flex: 1,
                padding: '5px 6px',
                borderRadius: 8,
                border: cam.enabled
                  ? '1px solid rgba(16,185,129,0.2)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: cam.enabled ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                color: cam.enabled ? '#10B981' : 'rgba(255,255,255,0.5)',
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {cam.enabled ? 'ON' : 'OFF'}
            </button>

            {/* Resolution */}
            <select
              value={cam.resolution}
              onChange={(e) => void onSetResolution(cam.id, e.target.value as '720p' | '1080p' | '4k')}
              style={{
                flex: 1,
                padding: '4px 4px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 9,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>

            {/* Remove */}
            <button
              onClick={() => onRemoveCamera(cam.id)}
              style={{
                padding: '5px 8px',
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,77,77,0.1)',
                color: '#FF4D4D',
                fontSize: 9,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      {/* Add Camera Dropdown */}
      {unusedDevices.length > 0 && (
        <select
          disabled={busy}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) void handleAdd(e.target.value);
            e.target.value = '';
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <option value="">+ Add camera…</option>
          {unusedDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
      )}

      {cameras.length === 0 && (
        <div style={{ fontSize: 11, opacity: 0.4, textAlign: 'center', padding: 8 }}>
          No cameras added. Select one above to begin.
        </div>
      )}
    </div>
  );
};

export default MultiCameraPublisher;
