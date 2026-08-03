import React from 'react';

const CategoryFilterBar = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, marginBottom: 12, scrollbarWidth: 'none' }}>
      <button
        onClick={() => onCategoryChange('')}
        style={{
          padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
          border: activeCategory === '' ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.1)',
          background: activeCategory === '' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
          color: activeCategory === '' ? '#67e8f9' : '#9ca3af'
        }}
      >
        All Items
      </button>
      {categories.map(cat => (
        <button
          key={cat._id} onClick={() => onCategoryChange(cat._id)}
          style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
            border: activeCategory === cat._id ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.1)',
            background: activeCategory === cat._id ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
            color: activeCategory === cat._id ? '#67e8f9' : '#9ca3af'
          }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilterBar;
