import React from 'react';

const INPUT = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-card-hover)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
};

export default function InputField({ label, ...props }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
      {props.as === 'select' ? (
        <select style={{ ...INPUT, cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} {...props}>
          {props.children}
        </select>
      ) : props.as === 'textarea' ? (
        <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 80 }} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} {...props} />
      ) : (
        <input style={INPUT} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} {...props} />
      )}
    </div>
  );
}
