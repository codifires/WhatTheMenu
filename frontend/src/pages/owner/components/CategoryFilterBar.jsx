import React from 'react';

const CategoryFilterBar = ({ categories, activeCategory, onCategoryChange, counts = {} }) => {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 12,
      marginBottom: 16,
      scrollbarWidth: 'none'
    }}>
      <button
        onClick={() => onCategoryChange('')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
          border: activeCategory === '' ? '1px solid var(--brand-primary)' : '1px solid var(--border-medium)',
          background: activeCategory === '' ? 'var(--brand-primary)' : 'var(--bg-card)',
          color: activeCategory === '' ? '#ffffff' : 'var(--text-secondary)'
        }}
      >
        <span>All Items</span>
        {counts.all !== undefined && (
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 'var(--radius-full)',
            background: activeCategory === '' ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
            color: activeCategory === '' ? '#ffffff' : 'var(--text-primary)'
          }}>
            {counts.all}
          </span>
        )}
      </button>

      {categories.map(cat => {
        const isActive = activeCategory === cat._id
        const count = counts[cat._id]
        return (
          <button
            key={cat._id}
            onClick={() => onCategoryChange(cat._id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-medium)',
              background: isActive ? 'var(--brand-primary)' : 'var(--bg-card)',
              color: isActive ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <span>{cat.name}</span>
            {count !== undefined && (
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
                color: isActive ? '#ffffff' : 'var(--text-primary)'
              }}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  );
};

export default CategoryFilterBar;
