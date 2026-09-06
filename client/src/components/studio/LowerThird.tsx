import React from 'react';

interface LowerThirdProps {
  name: string;
  designation: string;
  company: string;
}

const LowerThird: React.FC<LowerThirdProps> = ({ name, designation, company }) => {
  return (
    <div style={{ position: 'absolute', bottom: 40, left: 40, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '16px 24px', borderRadius: 12, color: '#fff', borderLeft: '4px solid #00A8FF' }}>
      <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{name}</h3>
      <p style={{ margin: 0, fontSize: 16, opacity: 0.8 }}>{designation} | {company}</p>
    </div>
  );
};

export default LowerThird;
