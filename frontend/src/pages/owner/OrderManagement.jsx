import { useState, useEffect, useMemo } from 'react'
import { ownerAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { io } from 'socket.io-client'
import {
  Bell,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  Search,
  AlertTriangle,
  ChefHat,
  X,
  CreditCard,
  DollarSign,
  Phone,
  User,
  MessageSquare,
  Ban
} from 'lucide-react'

const STATUS_FLOW = ['new', 'accepted', 'preparing', 'ready', 'completed']

const STATUS_CONFIG = {
  new: {
    label: 'New Order',
    bg: 'var(--status-new-bg)',
    color: 'var(--status-new-color)',
    border: 'var(--status-new-border)',
    actionLabel: 'Accept Order',
    actionBg: 'var(--brand-primary)',
    next: 'accepted'
  },
  accepted: {
    label: 'Accepted',
    bg: 'var(--status-accepted-bg)',
    color: 'var(--status-accepted-color)',
    border: 'var(--status-accepted-border)',
    actionLabel: 'Start Preparing',
    actionBg: 'var(--warning-main)',
    next: 'preparing'
  },
  preparing: {
    label: 'In Kitchen',
    bg: 'var(--status-preparing-bg)',
    color: 'var(--status-preparing-color)',
    border: 'var(--status-preparing-border)',
    actionLabel: 'Mark as Ready ✓',
    actionBg: 'var(--status-ready-color)',
    next: 'ready'
  },
  ready: {
    label: 'Ready for Table',
    bg: 'var(--status-ready-bg)',
    color: 'var(--status-ready-color)',
    border: 'var(--status-ready-border)',
    actionLabel: 'Complete Order ✓',
    actionBg: 'var(--success-main)',
    next: 'completed'
  },
  completed: {
    label: 'Completed',
    bg: 'var(--status-completed-bg)',
    color: 'var(--status-completed-color)',
    border: 'var(--status-completed-border)'
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'var(--status-cancelled-bg)',
    color: 'var(--status-cancelled-color)',
    border: 'var(--status-cancelled-border)'
  }
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'new' | 'accepted' | 'preparing' | 'ready'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchOrders()
  }, [])

  // Socket.io Real-Time Listener
  useEffect(() => {
    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, { auth: { token } })
    socket.emit('join-cafe', user?.id)

    socket.on('new-order', (payload) => {
      const order = payload.order || payload
      if (
        order.payment_status === 'received' ||
        order.payment_status === 'completed' ||
        order.payment_method === 'cash'
      ) {
        setOrders(prev => [order, ...prev.filter(o => o._id !== order._id)])
        toast.success(`🔔 New Order! Table ${order.table_number || 'Takeaway'} (#${order.daily_order_token || order.order_number?.slice(-3)})`, {
          duration: 5000,
          icon: '🛎️'
        })

        // Play alert tone if enabled
        if (soundEnabled && typeof Audio !== 'undefined') {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5
            gain.gain.setValueAtTime(0.2, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start()
            osc.stop(ctx.currentTime + 0.5)
          } catch {
            // Audio context not allowed without user gesture
          }
        }
      }
    })

    return () => socket.disconnect()
  }, [user, soundEnabled])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await ownerAPI.getOrders({ date: 'today' })
      // Keep active live orders (exclude completed & cancelled)
      const validOrders = res.data.data.filter(order =>
        (order.payment_status === 'received' ||
          order.payment_status === 'completed' ||
          order.payment_method === 'cash') &&
        order.order_status !== 'completed' &&
        order.order_status !== 'cancelled'
      )
      setOrders(validOrders)
    } catch {
      toast.error('Failed to load active kitchen orders')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Café: Order modification is disabled.', {
        style: { background: 'var(--text-primary)', color: 'var(--bg-main)', fontWeight: 'bold' }
      })
      return
    }

    try {
      await ownerAPI.updateOrderStatus(orderId, { order_status: newStatus })
      toast.success(`Order moved to: ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
      
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o._id !== orderId))
        if (selectedOrder?._id === orderId) setSelectedOrder(null)
      } else {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, order_status: newStatus } : o))
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(prev => ({ ...prev, order_status: newStatus }))
        }
      }
    } catch {
      toast.error('Failed to update order status')
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Café: Order cancellation disabled.')
      return
    }
    if (window.confirm('Are you sure you want to cancel this order?')) {
      handleStatusChange(orderId, 'cancelled')
    }
  }

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesFilter = filter === 'all' || order.order_status === filter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ||
        order.order_number?.toLowerCase().includes(q) ||
        String(order.daily_order_token).includes(q) ||
        String(order.table_number).toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.items?.some(it => it.name?.toLowerCase().includes(q))
      return matchesFilter && matchesSearch
    })
  }, [orders, filter, searchQuery])

  // Count badges
  const counts = useMemo(() => {
    const c = { all: orders.length, new: 0, accepted: 0, preparing: 0, ready: 0 }
    orders.forEach(o => {
      if (c[o.order_status] !== undefined) c[o.order_status]++
    })
    return c
  }, [orders])

  const handlePrintKOT = (order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>KOT - Table ${order.table_number}</title>
          <style>
            body { font-family: monospace; padding: 15px; margin: 0; font-size: 13px; color: #000; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .items td { padding: 4px 0; }
            .notes { background: #eee; padding: 6px; font-weight: bold; margin-bottom: 10px; }
            .footer { border-top: 1px dashed #000; padding-top: 8px; text-align: center; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">KITCHEN ORDER TICKET</h2>
            <p style="margin: 4px 0;">TOKEN: #${order.daily_order_token || order.order_number?.slice(-3)}</p>
            <p style="margin: 0; font-weight: bold;">TABLE: ${order.table_number || 'Takeaway'}</p>
            <p style="margin: 2px 0; font-size: 11px;">${new Date(order.created_at || Date.now()).toLocaleTimeString()}</p>
          </div>
          <table class="items">
            ${order.items?.map(it => `
              <tr>
                <td style="font-weight: bold; width: 30px;">${it.quantity}x</td>
                <td>${it.name}</td>
              </tr>
            `).join('')}
          </table>
          ${order.notes ? `<div class="notes">NOTE: ${order.notes}</div>` : ''}
          <div class="footer">
            Order #${order.order_number} · WhatTheMenu
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }}>
      
      {/* ─── 1. Header Bar with Actions & Audio Chime Indicator ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Live Kitchen Orders
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--success-light)',
              color: 'var(--success-main)',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid var(--success-border)'
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--success-main)',
                boxShadow: '0 0 8px var(--success-main)'
              }} />
              Socket.IO Live
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Real-time incoming orders from customer table QR scans.
          </p>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Chime sound is enabled for new orders' : 'Chime sound is muted'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: soundEnabled ? 'var(--brand-subtle)' : 'var(--bg-card)',
              border: `1px solid ${soundEnabled ? 'var(--brand-border)' : 'var(--border-medium)'}`,
              color: soundEnabled ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Bell size={15} />
            <span>{soundEnabled ? 'Sound ON' : 'Sound Muted'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Filter Tabs & Search Bar ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        marginBottom: 20
      }}>
        {/* Status Filter Pills */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          flex: 1
        }}>
          {[
            { id: 'all', label: 'All Live', count: counts.all },
            { id: 'new', label: 'New', count: counts.new },
            { id: 'accepted', label: 'Accepted', count: counts.accepted },
            { id: 'preparing', label: 'In Kitchen', count: counts.preparing },
            { id: 'ready', label: 'Ready', count: counts.ready }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 38,
                padding: '0 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                border: filter === tab.id ? '1px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                background: filter === tab.id ? 'var(--brand-primary)' : 'var(--bg-card)',
                color: filter === tab.id ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: filter === tab.id ? 'rgba(255, 255, 255, 0.25)' : 'var(--border-light)',
                color: filter === tab.id ? '#ffffff' : 'var(--text-primary)'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div style={{
          position: 'relative',
          minWidth: 240,
          flexShrink: 0
        }}>
          <Search size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search table, token, item..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 34,
              paddingRight: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* ─── 3. Orders Grid ─── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 240,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                animation: 'pulse 1.5s ease infinite'
              }}
            />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {filteredOrders.map(order => {
            const sc = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.new
            const isPaid = order.payment_status === 'received' || order.payment_status === 'completed'
            const isCash = order.payment_method === 'cash'
            const nextStatus = sc.next

            return (
              <div
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${order.order_status === 'new' ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: order.order_status === 'new' ? '0 4px 16px rgba(79, 70, 229, 0.15)' : 'var(--shadow-card)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = 'var(--brand-primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = order.order_status === 'new' ? 'var(--brand-border)' : 'var(--border-medium)'
                }}
              >
                {/* Order Header: Token, Table, Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--brand-subtle)',
                      border: '1px solid var(--brand-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.5px' }}>
                        TOKEN
                      </span>
                      <span style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: 'var(--text-primary)',
                        fontFamily: "'Outfit', sans-serif"
                      }}>
                        #{order.daily_order_token || order.order_number?.slice(-3) || '00'}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                        Table {order.table_number || 'Takeaway'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        #{order.order_number}
                      </span>
                    </div>
                  </div>

                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 12,
                    fontWeight: 700,
                    background: sc.bg,
                    color: sc.color,
                    border: `1px solid ${sc.border}`
                  }}>
                    {sc.label}
                  </span>
                </div>

                {/* Customer Info Snippet */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-shell)',
                  border: '1px solid var(--border-light)',
                  fontSize: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                    <User size={13} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {order.customer_name || 'Walk-in'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCash ? 'var(--warning-light)' : isPaid ? 'var(--success-light)' : 'var(--danger-light)',
                    color: isCash ? 'var(--warning-text)' : isPaid ? 'var(--success-text)' : 'var(--danger-text)',
                    border: `1px solid ${isCash ? 'var(--warning-border)' : isPaid ? 'var(--success-border)' : 'var(--danger-border)'}`
                  }}>
                    {isCash ? '💵 Cash' : isPaid ? '✓ Paid' : '⏳ Pending'}
                  </span>
                </div>

                {/* Items List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  flex: 1,
                  maxHeight: 140,
                  overflowY: 'auto'
                }}>
                  {order.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 13
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: 'var(--brand-primary)',
                          background: 'var(--brand-subtle)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {item.quantity}x
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {item.name}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Customer Special Note Warning */}
                {order.notes && (
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--warning-light)',
                    border: '1px solid var(--warning-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6
                  }}>
                    <MessageSquare size={14} color="var(--warning-text)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning-text)', lineHeight: 1.4 }}>
                      Note: {order.notes}
                    </span>
                  </div>
                )}

                {/* Action Footer */}
                <div style={{
                  borderTop: '1px solid var(--border-medium)',
                  paddingTop: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 'auto'
                }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block' }}>Total</span>
                    <span style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      fontFamily: "'Outfit', sans-serif"
                    }}>
                      ₹{order.total_amount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Quick Print KOT */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePrintKOT(order)
                      }}
                      title="Print KOT Ticket"
                      style={{
                        height: 36,
                        width: 36,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-shell)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={15} />
                    </button>

                    {/* Step Advance Button */}
                    {nextStatus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(order._id, nextStatus)
                        }}
                        style={{
                          height: 36,
                          padding: '0 16px',
                          borderRadius: 'var(--radius-md)',
                          background: sc.actionBg,
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'opacity 0.2s ease'
                        }}
                      >
                        {sc.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-medium)'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--brand-subtle)',
            color: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <ChefHat size={28} />
          </div>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 6px'
          }}>
            {searchQuery ? 'No Orders Match Your Search' : 'Kitchen All Clear'}
          </h3>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            maxWidth: 420,
            margin: '0 auto 20px'
          }}>
            {searchQuery
              ? 'Try adjusting your search query or clear the filter.'
              : 'There are currently no pending orders waiting in the queue. New table orders will ding here live.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* ─── 4. Detailed Order Modal ─── */}
      {selectedOrder && (() => {
        const sc = STATUS_CONFIG[selectedOrder.order_status] || STATUS_CONFIG.new
        const nextStatus = sc.next
        const isPaid = selectedOrder.payment_status === 'received' || selectedOrder.payment_status === 'completed'
        const isCash = selectedOrder.payment_method === 'cash'

        return (
          <div
            onClick={() => setSelectedOrder(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--overlay-bg)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 300,
              padding: 16
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: 480,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-dropdown)',
                padding: '24px'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    color: 'var(--text-primary)'
                  }}>
                    Order #{selectedOrder.order_number}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Placed at {new Date(selectedOrder.created_at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'var(--bg-shell)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 6
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Table & Customer Summary Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '14px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-shell)',
                border: '1px solid var(--border-medium)',
                marginBottom: 18
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Dining Table
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--brand-primary)' }}>
                    Table {selectedOrder.table_number || 'N/A'}
                  </p>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Token #{selectedOrder.daily_order_token || '00'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Customer Details
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedOrder.customer_name || 'Guest'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {selectedOrder.customer_phone || 'No phone'}
                  </p>
                </div>
              </div>

              {/* Special Instructions Note */}
              {selectedOrder.notes && (
                <div style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--warning-light)',
                  border: '1px solid var(--warning-border)',
                  marginBottom: 18
                }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: 'var(--warning-text)', textTransform: 'uppercase' }}>
                    Special Prep Instructions
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Order Items */}
              <div style={{ marginBottom: 20 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 10
                }}>
                  Items in this Order ({selectedOrder.items?.length || 0})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-shell)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: 'var(--brand-primary)',
                          background: 'var(--brand-subtle)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {item.quantity}x
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Payment Method */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderTop: '1px solid var(--border-medium)',
                marginBottom: 20
              }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Payment Method</span>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isCash ? '💵 Cash on Delivery' : '💳 UPI Payment'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Amount</span>
                  <p style={{
                    margin: '2px 0 0',
                    fontSize: 22,
                    fontWeight: 900,
                    fontFamily: "'Outfit', sans-serif",
                    color: 'var(--text-primary)'
                  }}>
                    ₹{selectedOrder.total_amount}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div style={{ display: 'flex', gap: 10 }}>
                {nextStatus && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder._id, nextStatus)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: sc.actionBg,
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {sc.actionLabel}
                  </button>
                )}

                <button
                  onClick={() => handlePrintKOT(selectedOrder)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 44,
                    padding: '0 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-shell)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={16} />
                  <span>Print KOT</span>
                </button>

                <button
                  onClick={() => handleCancelOrder(selectedOrder._id)}
                  title="Cancel & Reject Order"
                  style={{
                    height: 44,
                    width: 44,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger-border)',
                    color: 'var(--danger-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Ban size={18} />
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
