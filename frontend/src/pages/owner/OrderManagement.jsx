import { useState, useEffect } from 'react'
import { ownerAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { io } from 'socket.io-client'

const STATUS_FLOW = ['new', 'accepted', 'preparing', 'ready', 'completed']
const STATUS_COLORS = {
  new: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  accepted: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  preparing: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  ready: { bg: 'var(--cyan-border-light)', color: 'var(--cyan-text)', border: 'rgba(6,182,212,0.25)' },
  completed: { bg: 'var(--success-light)', color: 'var(--success-text)', border: 'var(--success-border)' },
  cancelled: { bg: 'var(--danger-light)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
}

const OrderManagement = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const { user } = useAuth()

  useEffect(() => { fetchOrders() }, [filter])

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socket.emit('join-cafe', user?.id)
    socket.on('new-order', (payload) => {
      const order = payload.order || payload;
      if (order.payment_status === 'received' || order.payment_status === 'completed' || order.payment_method === 'cash') {
        setOrders(prev => [order, ...prev])
        toast.success(`New order received! #${order.order_number}`, { icon: '🔔' })
      }
    })
    return () => socket.disconnect()
  }, [user])

  const fetchOrders = async () => {
    try {
      const params = { date: 'today' }
      if (filter) params.status = filter
      const res = await ownerAPI.getOrders(params)
      // Filter out 'completed' and 'cancelled' orders from Live Kitchen
      const validOrders = res.data.data.filter(order =>
        (order.payment_status === 'received' ||
          order.payment_status === 'completed' ||
          order.payment_method === 'cash') &&
        order.order_status !== 'completed' &&
        order.order_status !== 'cancelled'
      )
      setOrders(validOrders)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Order modifications are disabled.', { style: { background: 'var(--text-primary)', color: 'var(--bg-main)', fontWeight: 'bold' } })
      return
    }
    
    try {
      await ownerAPI.updateOrderStatus(orderId, { order_status: newStatus })
      toast.success(`Order moved to: ${newStatus}`)
      fetchOrders()
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, order_status: newStatus }))
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const getNextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current)
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Live Orders</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Manage today's incoming café orders in real-time.</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none', flex: 1 }}>
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
            border: filter === '' ? '1px solid rgba(6,182,212,0.3)' : '1px solid var(--border-medium)',
            background: filter === '' ? 'var(--cyan-border-medium)' : 'var(--bg-input)',
            color: filter === '' ? '#67e8f9' : 'var(--text-secondary)'
          }}
        >
          All Orders
        </button>
        {STATUS_FLOW.filter(s => s !== 'completed').map(s => (
          <button
            key={s} onClick={() => setFilter(s)}
            style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', transition: 'all 0.2s',
              border: filter === s ? `1px solid ${STATUS_COLORS[s].border}` : '1px solid var(--border-medium)',
              background: filter === s ? STATUS_COLORS[s].bg : 'var(--bg-input)',
              color: filter === s ? STATUS_COLORS[s].color : 'var(--text-secondary)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
        <button 
          onClick={fetchOrders}
          style={{ 
            marginBottom: 16,
            padding: '8px 16px', 
            borderRadius: 10, 
            background: 'var(--cyan-border-medium)', 
            border: '1px solid rgba(6,182,212,0.3)', 
            color: '#67e8f9', 
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          Reload
        </button>
      </div>

      {/* ── Orders Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 200, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: 20, animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {orders.map((order, i) => {
            const sc = STATUS_COLORS[order.order_status] || STATUS_COLORS.new
            const isPaid = order.payment_status === 'received'
            const nextStatus = getNextStatus(order.order_status)

            return (
              <div key={order._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', animation: `slideUp 0.3s ease ${i * 0.05}s both` }} onClick={() => setSelectedOrder(order)} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--overlay-bg)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit',sans-serif", display: 'block' }}>Order #{order.token_number || order.order_number.slice(-4)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace', opacity: 0.5 }}>{order.order_number}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.bg, color: sc.color, textTransform: 'uppercase', border: `1px solid ${sc.border}` }}>
                    {order.order_status}
                  </span>
                </div>

                {/* Customer */}
                <div style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-input)', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{order.customer_name || 'Guest'}</p>
                  {order.customer_phone && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{order.customer_phone}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>Total amount</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>₹{order.total_amount}</p>
                  </div>
                </div>

                {/* Payment & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: (isPaid || order.payment_status === 'completed') ? 'var(--success-light)' : 'var(--warning-light)', color: (isPaid || order.payment_status === 'completed') ? 'var(--success-text)' : '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {(isPaid || order.payment_status === 'completed') ? '✓' : '⌛'} {order.payment_method} - {order.payment_status}
                  </span>

                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    {nextStatus && (
                      <button onClick={() => handleStatusChange(order._id, nextStatus)}
                        style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', boxShadow: '0 2px 10px rgba(6,182,212,0.3)', transition: 'transform 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {nextStatus} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border-medium)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>No orders found</p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Waiting for new orders to arrive.</p>
        </div>
      )}

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (() => {
        const modalSc = STATUS_COLORS[selectedOrder.order_status] || STATUS_COLORS.new
        const isPaid = selectedOrder.payment_status === 'received'
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setSelectedOrder(null)}>
            <div style={{ width: '100%', maxWidth: 500, background: 'var(--bg-shell)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 24, padding: 32, boxShadow: '0 40px 100px var(--overlay-bg)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", color: '#f59e0b' }}>Token: {selectedOrder.token_number || selectedOrder.order_number.slice(-4)}</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Order: {selectedOrder.order_number}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: modalSc.bg, color: modalSc.color, border: `1px solid ${modalSc.border}`, textTransform: 'capitalize' }}>
                  {selectedOrder.order_status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--bg-input)', borderRadius: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Customer</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedOrder.customer_name || 'Guest'}</p>
                  {selectedOrder.customer_phone && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{selectedOrder.customer_phone}</p>
                  )}
                </div>
                {selectedOrder.table_number && (
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Table</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>#{selectedOrder.table_number}</p>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Payment</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: isPaid ? 'var(--success-text)' : '#fbbf24', margin: 0, textTransform: 'capitalize' }}>{selectedOrder.payment_status}</p>
                </div>
              </div>

              {selectedOrder.payment_method === 'upi' && selectedOrder.payment_transaction_id && (
                <div style={{ marginBottom: 24, padding: '16px', background: 'rgba(6,182,212,0.05)', borderRadius: 16, border: '1px solid rgba(6,182,212,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>UPI Transaction ID (UTR)</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: 1 }}>{selectedOrder.payment_transaction_id}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(selectedOrder.payment_transaction_id);
                      e.currentTarget.innerText = 'Copied!';
                      setTimeout(() => { if (e.target) e.target.innerText = 'Copy' }, 2000);
                    }}
                    style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--cyan-bg-light)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cyan-border-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--cyan-bg-light)'}
                  >
                    Copy
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px', borderBottom: '1px solid var(--border-medium)', paddingBottom: 8 }}>Order Items</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#06b6d4', background: 'var(--cyan-bg-light)', padding: '2px 8px', borderRadius: 6 }}>{item.quantity}x</span>
                        <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid var(--border-medium)', marginBottom: 24 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Amount</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>₹{selectedOrder.total_amount}</span>
              </div>

              <button onClick={() => setSelectedOrder(null)}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--border-light)'}>
                Close Details
              </button>
            </div>
          </div>
        )
      })()}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default OrderManagement
