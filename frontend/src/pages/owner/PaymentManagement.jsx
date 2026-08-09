import { useState, useEffect, useMemo } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const FILTERS = ['all', 'pending', 'received', 'online', 'upi', 'cash']

const STATUS_COLORS = {
  pending: { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  received: { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.2)' },
}

const PaymentManagement = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await ownerAPI.getOrders()
      setOrders(res.data.data)
    } catch (error) {
      toast.error('Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUTR = (utr, e) => {
    navigator.clipboard.writeText(utr)
    const btn = e.currentTarget
    const originalText = btn.innerText
    btn.innerText = 'Copied!'
    btn.style.color = '#34d399'
    setTimeout(() => {
      btn.innerText = originalText
      btn.style.color = '#06b6d4'
    }, 2000)
  }

  // Derived State
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filter === 'all') return true
      if (filter === 'pending') return o.payment_status === 'pending'
      if (filter === 'received') return o.payment_status === 'received'
      if (filter === 'upi') return o.payment_method === 'upi'
      if (filter === 'cash') return o.payment_method === 'cash'
      if (filter === 'online') return o.payment_method === 'online'
      return true
    })
  }, [orders, filter])

  const stats = useMemo(() => {
    return orders.reduce((acc, order) => {
      const amount = order.total_amount || 0
      if (order.payment_status === 'received') {
        acc.totalRevenue += amount
        if (order.payment_method === 'upi') acc.upiRevenue += amount
        if (order.payment_method === 'cash') acc.cashRevenue += amount
        if (order.payment_method === 'online') acc.onlineRevenue += amount
      } else if (order.payment_status === 'pending') {
        acc.pendingRevenue += amount
      }
      return acc
    }, { totalRevenue: 0, pendingRevenue: 0, upiRevenue: 0, cashRevenue: 0, onlineRevenue: 0 })
  }, [orders])

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, animation: 'fadeIn 0.4s ease' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px', fontFamily: "'Outfit',sans-serif", background: 'linear-gradient(135deg, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Payment Management
          </h1>
          <p style={{ fontSize: 15, color: '#9ca3af', margin: 0 }}>Track revenue, verify UPI transactions, and collect cash.</p>
        </div>
        <button onClick={() => { setLoading(true); fetchOrders() }}
          style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.1)'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.27l5.35 5.35"/></svg>
          Refresh
        </button>
      </div>

      {/* ── Summary Widgets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32, animation: 'slideUp 0.4s ease 0.1s both' }}>
        {[
          { label: 'Total Revenue (Received)', value: stats.totalRevenue, icon: '💰', color: '#10b981' },
          { label: 'Pending Collections', value: stats.pendingRevenue, icon: '⏳', color: '#f59e0b' },
          { label: 'UPI Revenue', value: stats.upiRevenue, icon: '📱', color: '#3b82f6' },
          { label: 'Online Revenue', value: stats.onlineRevenue, icon: '💳', color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(${parseInt(stat.color.slice(1,3),16)},${parseInt(stat.color.slice(3,5),16)},${parseInt(stat.color.slice(5,7),16)},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif" }}>₹{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8, animation: 'slideUp 0.4s ease 0.2s both' }}>
        {FILTERS.map(f => (
          <button
            key={f} onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', transition: 'all 0.2s',
              border: filter === f ? `1px solid rgba(6,182,212,0.4)` : '1px solid rgba(255,255,255,0.1)',
              background: filter === f ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)',
              color: filter === f ? '#06b6d4' : '#9ca3af'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Data Table ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden', animation: 'slideUp 0.4s ease 0.3s both' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Order ID</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Customer</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Amount</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Method</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Transaction ID (UTR)</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Date & Time</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading payments...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    No payments found for this filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const sc = STATUS_COLORS[order.payment_status] || STATUS_COLORS.pending
                  const isPaid = order.payment_status === 'received'
                  
                  return (
                    <tr key={order._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{order.order_number}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#e5e7eb', fontWeight: 500 }}>{order.customer_name || 'Guest'}</p>
                        {order.customer_phone && <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{order.customer_phone}</p>}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: 15, fontWeight: 800, color: '#fff' }}>₹{order.total_amount}</td>
                      <td style={{ padding: '16px 24px', fontSize: 13, color: '#e5e7eb', textTransform: 'uppercase', fontWeight: 600 }}>
                        {order.payment_method === 'online' ? <span style={{ color: '#10b981' }}>💳 Online</span> : order.payment_method === 'upi' ? <span style={{ color: '#3b82f6' }}>📱 UPI</span> : <span style={{ color: '#8b5cf6' }}>💵 Cash</span>}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {(order.payment_method === 'upi' || order.payment_method === 'online') && order.payment_transaction_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <code style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {order.payment_transaction_id}
                            </code>
                            <button onClick={(e) => handleCopyUTR(order.payment_transaction_id, e)} style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                              Copy
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: 13 }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: 13, color: '#e5e7eb', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {/* Manual override removed for automated payment flow */}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PaymentManagement
