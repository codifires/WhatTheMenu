import React from 'react';

const MenuHeader = ({ onAddNew }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Menu Items</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Create and manage your café's menu offerings.</p>
      </div>
      <button
        onClick={onAddNew}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}
        onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add New Item
      </button>
    </div>
  );
};

export default MenuHeader;
