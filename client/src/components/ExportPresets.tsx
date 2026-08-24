import React from 'react';
import { COLORS, FONTS } from '../utils/constants';
import type { ExportPreset } from '../types';

interface Props {
  selected: ExportPreset | null;
  onSelect: (preset: ExportPreset) => void;
  disabled?: boolean;
}

const presets: ExportPreset[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    format: 'mp4',
    resolution: '1920x1080',
    codec: 'libx264',
    bitrate: '8000k',
    audioBitrate: '192k',
  },
  {
    id: 'instagram-reels',
    name: 'IG Reels',
    icon: '📱',
    format: 'mp4',
    resolution: '1080x1920',
    codec: 'libx264',
    bitrate: '6000k',
    audioBitrate: '128k',
    aspectRatio: '9:16',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    format: 'mp4',
    resolution: '1080x1920',
    codec: 'libx264',
    bitrate: '5000k',
    audioBitrate: '128k',
    aspectRatio: '9:16',
  },
  {
    id: 'podcast-audio',
    name: 'Podcast',
    icon: '🎙️',
    format: 'mp3',
    resolution: 'audio-only',
    codec: 'libmp3lame',
    bitrate: '0',
    audioBitrate: '320k',
  },
  {
    id: 'full-quality',
    name: 'Full HD',
    icon: '🎬',
    format: 'mp4',
    resolution: '1920x1080',
    codec: 'libx264',
    bitrate: '12000k',
    audioBitrate: '320k',
  },
  {
    id: 'web-optimized',
    name: 'Web',
    icon: '🌐',
    format: 'webm',
    resolution: '1280x720',
    codec: 'libvpx-vp9',
    bitrate: '3000k',
    audioBitrate: '128k',
  },
];

const ExportPresets: React.FC<Props> = ({ selected, onSelect, disabled = false }) => {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        fontFamily: FONTS.ui,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 12,
        }}
      >
        EXPORT PRESET
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {presets.map((p) => {
          const isSelected = selected?.id === p.id;

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              disabled={disabled}
              style={{
                padding: '12px 8px',
                borderRadius: 14,
                border: isSelected
                  ? `1px solid ${COLORS.primaryBlue}`
                  : '1px solid rgba(255,255,255,0.06)',
                background: isSelected ? 'rgba(0,168,255,0.1)' : 'rgba(255,255,255,0.03)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: 20 }}>{p.icon}</div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: isSelected ? COLORS.primaryBlue : 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.08em',
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase',
                }}
              >
                {p.format} • {p.resolution === 'audio-only' ? 'Audio' : p.resolution.split('x')[1] + 'p'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Preset Details */}
      {selected && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(0,168,255,0.05)',
            border: '1px solid rgba(0,168,255,0.1)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.6)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
          }}
        >
          <div>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Format:</strong> {selected.format.toUpperCase()}
          </div>
          <div>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Codec:</strong> {selected.codec}
          </div>
          <div>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Resolution:</strong> {selected.resolution}
          </div>
          <div>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Bitrate:</strong>{' '}
            {selected.bitrate === '0' ? 'N/A' : selected.bitrate}
          </div>
          {selected.aspectRatio && (
            <div>
              <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Aspect:</strong> {selected.aspectRatio}
            </div>
          )}
          <div>
            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Audio:</strong> {selected.audioBitrate}
          </div>
        </div>
      )}
    </div>
  );
};

export { presets as defaultPresets };
export default ExportPresets;
