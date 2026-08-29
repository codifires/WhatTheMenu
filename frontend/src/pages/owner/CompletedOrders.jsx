import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  completed: { bg: 'var(--success-light)', color: 'var(--success-text)', border: 'var(--success-border)' },
  cancelled: { bg: 'var(--danger-light)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
}

const CompletedOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => { fetchOrders() }, [selectedDate])

  const fetchOrders = async () => {
    try {
      // Fetch specifically completed and cancelled orders
      const res = await ownerAPI.getOrders({ status: 'completed', ...(selectedDate && { date: selectedDate }) })
      const validOrders = res.data.data.filter(order =>
        order.payment_status === 'received' ||
        order.payment_status === 'completed' ||
        order.payment_method === 'cash'
      )
      setOrders(validOrders)
    } catch {
      toast.error('Failed to load completed orders')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Order History</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>View all completed and past orders.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 12, padding: '8px 16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            onKeyDown={(e) => e.preventDefault()}
            style={{ background: 'transparent', border: 'none', color: selectedDate ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 14, outline: 'none', cursor: 'pointer', fontFamily: "'Inter',sans-serif", padding: 0 }}
          />
          {selectedDate && (
            <button onClick={() => setSelectedDate('')} style={{ background: 'transparent', border: 'none', color: 'var(--danger-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, marginLeft: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
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
            const sc = STATUS_COLORS[order.order_status] || STATUS_COLORS.completed
            const isPaid = order.payment_status === 'received' || order.payment_status === 'completed'

            return (
              <div key={order._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s, box-shadow 0.2s', animation: `slideUp 0.3s ease ${i * 0.05}s both` }}>

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

                {/* Customer & Items */}
                <div style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-input)', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{order.customer_name || 'Guest'}</p>
                  {order.customer_phone && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{order.customer_phone}</p>}
                  
                  {/* Ordered Items List */}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-medium)' }}>
                    {order.items && order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}x {item.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-medium)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>Total amount</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>₹{order.total_amount}</p>
                  </div>
                </div>

                {/* Payment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPaid ? 'var(--success-light)' : 'var(--warning-light)', color: isPaid ? 'var(--success-text)' : '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {isPaid ? '✓' : '⌛'} {order.payment_method} - {order.payment_status}
                  </span>

                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(order.created_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                  </span>
                </div>

              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border-medium)' }}>
          <span style={{ fontSize: 40, opacity: 0.5, display: 'block', marginBottom: 16 }}>📋</span>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px' }}>No Completed Orders</h3>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Completed orders will appear here.</p>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default CompletedOrders
 

 

