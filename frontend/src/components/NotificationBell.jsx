import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'

function timeAgo(dateString) {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'Recently'
  }
}

export default function NotificationBell({ role = 'owner' }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const {
    notifications,
    unreadCount,
    soundEnabled,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    toggleSound
  } = useNotifications()

  const isAdmin = role === 'admin'

  // Tabs configured distinctly by role
  const tabs = isAdmin
    ? [
        { id: 'all', label: 'All' },
        { id: 'cafes', label: '🏪 Cafés' },
        { id: 'plans', label: '💳 Subscriptions' },
        { id: 'support', label: '🎧 Support' }
      ]
    : [
        { id: 'all', label: 'All' },
        { id: 'orders', label: '🛍️ Orders' },
        { id: 'plans', label: '💳 Plans' },
        { id: 'support', label: '🎧 Support' }
      ]

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const filteredNotifications = notifications.filter(n => {
    if (isAdmin) {
      // In Admin mode, NEVER show food order notifications
      if (n.type === 'order') return false
      if (filter === 'cafes') return n.type === 'cafe'
      if (filter === 'plans') return n.type === 'plan' || n.type === 'revenue'
      if (filter === 'support') return n.type === 'support' || n.type === 'system'
      return true
    } else {
      if (filter === 'orders') return n.type === 'order'
      if (filter === 'plans') return n.type === 'plan'
      if (filter === 'support') return n.type === 'support' || n.type === 'system'
      return true
    }
  })

  const handleItemClick = (item) => {
    markAsRead(item.id)
    if (item.link) {
      setOpen(false)
      navigate(item.link)
    }
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'cafe':
        return {
          icon: '🏪',
          bg: 'rgba(124, 58, 237, 0.12)',
          border: 'rgba(124, 58, 237, 0.3)',
          badgeColor: '#a78bfa'
        }
      case 'order':
        return {
          icon: '🛍️',
          bg: 'rgba(34, 197, 94, 0.12)',
          border: 'rgba(34, 197, 94, 0.3)',
          badgeColor: '#4ade80'
        }
      case 'plan':
      case 'revenue':
        return {
          icon: '💳',
          bg: 'rgba(168, 85, 247, 0.12)',
          border: 'rgba(168, 85, 247, 0.3)',
          badgeColor: '#c084fc'
        }
      case 'support':
        return {
          icon: '🎧',
          bg: 'var(--cyan-border-light)',
          border: 'rgba(6, 182, 212, 0.3)',
          badgeColor: 'var(--cyan-text)'
        }
      default:
        return {
          icon: '🔔',
          bg: 'rgba(99, 102, 241, 0.12)',
          border: 'rgba(99, 102, 241, 0.3)',
          badgeColor: '#818cf8'
        }
    }
  }

  const getActionLabel = (item) => {
    if (isAdmin) {
      if (item.type === 'cafe') return 'View Café →'
      if (item.type === 'plan' || item.type === 'revenue') return 'View Subscriptions →'
      if (item.type === 'support') return 'Manage Ticket →'
      return 'View →'
    } else {
      if (item.type === 'order') return 'View Order →'
      if (item.type === 'plan') return 'Manage Plan →'
      if (item.type === 'support') return 'View Ticket →'
      return 'View →'
    }
  }

  // Calculate unread count specifically for active role view
  const activeRoleUnreadCount = notifications.filter(n => {
    if (isAdmin && n.type === 'order') return false
    return !n.read
  }).length

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* ── Bell Trigger Button ── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title="Notifications"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: open ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-card-hover)',
          border: open ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: open ? '#a78bfa' : activeRoleUnreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          position: 'relative',
          transition: 'all 0.2s',
          outline: 'none'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(124, 58, 237, 0.12)'
          e.currentTarget.style.color = '#c4b5fd'
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--bg-card-hover)'
            e.currentTarget.style.color = activeRoleUnreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        {/* Dynamic Unread Badge */}
        {activeRoleUnreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: '#ef4444',
              border: '2px solid #080c14',
              color: 'var(--text-primary)',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
              animation: 'pulseBadge 2s infinite'
            }}
          >
            {activeRoleUnreadCount > 9 ? '9+' : activeRoleUnreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Drawer ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            background: '#0b1120',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 18,
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(124, 58, 237, 0.15)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                {isAdmin ? 'Admin Notifications' : 'Notifications'}
              </span>
              {activeRoleUnreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger-text)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20
                  }}
                >
                  {activeRoleUnreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: soundEnabled ? '#22c55e' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 4,
                  borderRadius: 6
                }}
              >
                {soundEnabled ? '🔔' : '🔕'}
              </button>

              {/* Mark all as read */}
              {activeRoleUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a78bfa',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              padding: '8px 12px',
              gap: 6,
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(0, 0, 0, 0.2)'
            }}
          >
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filter === t.id ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                  color: filter === t.id ? '#c4b5fd' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div
            style={{
              maxHeight: 380,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)'
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{isAdmin ? '👑' : '☕'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  You're all caught up!
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 260, margin: '0 auto', lineHeight: 1.4 }}>
                  {isAdmin
                    ? 'New café partner signups, subscription revenue, and support tickets will appear here in real-time.'
                    : 'Live orders, subscription alerts, and support updates will pop up here.'}
                </div>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const style = getTypeStyle(item.type)
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: item.read ? 'transparent' : 'rgba(124, 58, 237, 0.06)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      position: 'relative'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = item.read ? 'transparent' : 'rgba(124, 58, 237, 0.06)'
                    }}
                  >
                    {/* Unread Indicator Bar */}
                    {!item.read && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: '#7c3aed'
                        }}
                      />
                    )}

                    {/* Type Icon Badge */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0
                      }}
                    >
                      {style.icon}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: item.read ? 600 : 700,
                            color: item.read ? 'var(--text-primary)' : 'var(--text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.title}
                        </h4>
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8 }}>
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          margin: '0 0 6px',
                          lineHeight: 1.4
                        }}
                      >
                        {item.message}
                      </p>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.link && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: style.badgeColor,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2
                            }}
                          >
                            {getActionLabel(item)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeNotification(item.id)
                      }}
                      title="Dismiss"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: 2,
                        fontSize: 14,
                        borderRadius: 4,
                        opacity: 0.6
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#ef4444'
                        e.currentTarget.style.opacity = 1
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-tertiary)'
                        e.currentTarget.style.opacity = 0.6
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <button
                type="button"
                onClick={clearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                Clear all notifications
              </button>

              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                🟢 Real-Time Live
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pulse Keyframe Animation */}
      <style>{`
        @keyframes pulseBadge {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); box-shadow: 0 0 12px rgba(239, 68, 68, 0.9); }
          100% { transform: scale(1); }
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
