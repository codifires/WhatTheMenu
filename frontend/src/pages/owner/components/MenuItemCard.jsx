import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const MenuItemCard = ({ item, index, onEdit, onDelete, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative'
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{ ...style, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: isDragging ? 'none' : `fadeIn 0.3s ease ${index * 0.05}s both` }}
    >
      {/* Drag Handle & Image Box */}
      <div style={{ height: 160, background: 'var(--bg-card)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* 6-dot Drag Handle */}
        <div {...attributes} {...listeners} style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, cursor: 'grab', background: 'var(--overlay-bg)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
        {item.image ? (
          <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} className="menu-img" />
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>🍔</span>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)', color: item.is_veg ? 'var(--success-text)' : '#ef4444', border: `1px solid ${item.is_veg ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {item.is_veg ? 'VEG' : 'NON-VEG'}
        </div>
      </div>
      
      {/* Content Box */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--cyan-text)' }}>₹{item.price}</span>
        </div>
        
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, lineHeight: 1.5 }}>
          {item.description || 'No description provided.'}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-medium)' }}>
          <button
            onClick={() => onToggle(item._id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: item.availability ? 'var(--success-text)' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            <div style={{ width: 32, height: 18, borderRadius: 10, background: item.availability ? 'rgba(16,185,129,0.2)' : 'var(--border-hover)', position: 'relative', transition: 'background 0.3s' }}>
              <div style={{ position: 'absolute', top: 2, left: item.availability ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: item.availability ? 'var(--success-text)' : 'var(--text-secondary)', transition: 'left 0.3s' }} />
            </div>
            {item.availability ? 'In Stock' : 'Out of Stock'}
          </button>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(item)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--border-light)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button onClick={() => onDelete(item._id)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
