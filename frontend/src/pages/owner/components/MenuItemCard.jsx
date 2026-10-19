import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, GripVertical, Check, AlertCircle, UtensilsCrossed } from 'lucide-react';

const MenuItemCard = ({ item, index, onEdit, onDelete, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative'
  };

  const isVeg = Boolean(item.is_veg);
  const isAvailable = Boolean(item.availability);

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-card)',
        border: `1px solid ${isAvailable ? 'var(--border-medium)' : 'var(--warning-border)'}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
      }}
    >
      {/* Drag Handle & Image Box */}
      <div style={{
        height: 160,
        background: 'var(--bg-shell)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* 6-dot Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 2,
            cursor: 'grab',
            background: 'var(--overlay-bg)',
            padding: '5px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            color: '#ffffff'
          }}
        >
          <GripVertical size={16} />
        </div>

        {/* Item Image */}
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isAvailable ? 'none' : 'grayscale(60%)'
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--text-tertiary)',
            gap: 4
          }}>
            <UtensilsCrossed size={28} style={{ opacity: 0.6 }} />
            <span style={{ fontSize: 11, fontWeight: 500 }}>No Image</span>
          </div>
        )}

        {/* Dietary Tag Badge */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 10,
          fontWeight: 800,
          background: 'var(--overlay-bg)',
          backdropFilter: 'blur(6px)',
          color: isVeg ? 'var(--success-text)' : 'var(--danger-text)',
          border: `1px solid ${isVeg ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: isVeg ? '50%' : 0,
            background: isVeg ? 'var(--success-text)' : 'var(--danger-text)'
          }} />
          <span>{isVeg ? 'VEG' : 'NON-VEG'}</span>
        </div>

        {/* Out of Stock Overlay Ribbon */}
        {!isAvailable && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(245, 158, 11, 0.92)',
            color: '#000000',
            textAlign: 'center',
            padding: '3px 0',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Out of Stock (86'd)
          </div>
        )}
      </div>
      
      {/* Content Box */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-primary)',
            lineHeight: 1.3
          }}>
            {item.name}
          </h3>
          <span style={{
            fontSize: 16,
            fontWeight: 900,
            fontFamily: "'Outfit', sans-serif",
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap'
          }}>
            ₹{item.price}
          </span>
        </div>
        
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5,
          minHeight: 36
        }}>
          {item.description || 'No description provided.'}
        </p>
        
        {/* Card Footer: Availability Switch + Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid var(--border-light)'
        }}>
          {/* Stock Toggle Switch */}
          <button
            onClick={() => onToggle(item._id)}
            title={isAvailable ? 'Click to mark Out of Stock' : 'Click to mark In Stock'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              color: isAvailable ? 'var(--success-text)' : 'var(--text-tertiary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              width: 34,
              height: 20,
              borderRadius: 10,
              background: isAvailable ? 'var(--success-main)' : 'var(--border-hover)',
              position: 'relative',
              transition: 'background 0.2s ease'
            }}>
              <div style={{
                position: 'absolute',
                top: 2,
                left: isAvailable ? 16 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'left 0.2s ease'
              }} />
            </div>
            <span>{isAvailable ? 'In Stock' : '86\'d'}</span>
          </button>
          
          {/* Edit & Delete Action Buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onEdit(item)}
              title="Edit dish details"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-shell)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)'
                e.currentTarget.style.color = 'var(--brand-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
            >
              <Edit2 size={14} />
            </button>

            <button
              onClick={() => onDelete(item._id)}
              title="Delete dish"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--danger-border)',
                background: 'var(--danger-light)',
                color: 'var(--danger-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-light)'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
