import React from 'react';

const BrandOverlay: React.FC = () => {
  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
      <img src="/branding/sccg-logo.png" alt="SCCG Logo" style={{ width: 100, height: 'auto', opacity: 0.8 }} />
    </div>
  );
};

export default BrandOverlay;
