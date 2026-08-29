import React from 'react';

const CategoryFilterBar = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, marginBottom: 12, scrollbarWidth: 'none' }}>
      <button
        onClick={() => onCategoryChange('')}
        style={{
          padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
          border: activeCategory === '' ? '1px solid rgba(6,182,212,0.3)' : '1px solid var(--border-medium)',
          background: activeCategory === '' ? 'var(--cyan-border-medium)' : 'var(--bg-input)',
          color: activeCategory === '' ? '#67e8f9' : 'var(--text-secondary)'
        }}
      >
        All Items
      </button>
      {categories.map(cat => (
        <button
          key={cat._id} onClick={() => onCategoryChange(cat._id)}
          style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
            border: activeCategory === cat._id ? '1px solid rgba(6,182,212,0.3)' : '1px solid var(--border-medium)',
            background: activeCategory === cat._id ? 'var(--cyan-border-medium)' : 'var(--bg-input)',
            color: activeCategory === cat._id ? '#67e8f9' : 'var(--text-secondary)'
          }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilterBar;
