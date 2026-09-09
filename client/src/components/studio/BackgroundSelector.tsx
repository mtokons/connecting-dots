import React from 'react';
import { BackgroundType } from '../../hooks/useVirtualBackground';
import { COLORS, FONTS } from '../../utils/constants';

interface BackgroundSelectorProps {
  selectedType: BackgroundType;
  onSelect: (type: BackgroundType) => void;
}

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ selectedType, onSelect }) => {
  const options: { id: BackgroundType; label: string }[] = [
    { id: 'original', label: 'Original' },
    { id: 'sccg-studio', label: 'SCCG Studio' },
    { id: 'sccg-interview', label: 'SCCG Interview' },
    { id: 'sccg-dark', label: 'SCCG Dark' },
    { id: 'blur', label: 'Blur' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: selectedType === opt.id ? COLORS.white : 'rgba(255,255,255,0.1)',
            border: `1px solid ${selectedType === opt.id ? COLORS.white : 'transparent'}`,
            color: COLORS.white,
            fontFamily: FONTS.ui,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default BackgroundSelector;
