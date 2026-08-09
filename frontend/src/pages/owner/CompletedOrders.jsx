import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  completed: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
}

const CompletedOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      // Fetch specifically completed and cancelled orders
      const res = await ownerAPI.getOrders({ status: 'completed' })
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
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Order History</h1>
        <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>View all completed and past orders.</p>
      </div>

      {/* ── Orders Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 200, borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: 20, animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {orders.map((order, i) => {
            const sc = STATUS_COLORS[order.order_status] || STATUS_COLORS.completed
            const isPaid = order.payment_status === 'received' || order.payment_status === 'completed'

            return (
              <div key={order._id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s, box-shadow 0.2s', animation: `slideUp 0.3s ease ${i * 0.05}s both` }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit',sans-serif", display: 'block' }}>Order #{order.token_number || order.order_number.slice(-4)}</span>
                    <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', opacity: 0.5 }}>{order.order_number}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.bg, color: sc.color, textTransform: 'uppercase', border: `1px solid ${sc.border}` }}>
                    {order.order_status}
                  </span>
                </div>

                {/* Customer */}
                <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: '0 0 2px' }}>{order.customer_name || 'Guest'}</p>
                  {order.customer_phone && <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>{order.customer_phone}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Total amount</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>₹{order.total_amount}</p>
                  </div>
                </div>

                {/* Payment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPaid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: isPaid ? '#34d399' : '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {isPaid ? '✓' : '⌛'} {order.payment_method} - {order.payment_status}
                  </span>

                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 40, opacity: 0.5, display: 'block', marginBottom: 16 }}>📋</span>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#9ca3af', margin: '0 0 8px' }}>No Completed Orders</h3>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Completed orders will appear here.</p>
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
