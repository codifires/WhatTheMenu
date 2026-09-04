import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  active: { bg: 'var(--success-light)', color: 'var(--success-text)', border: 'rgba(16,185,129,0.2)' },
  expired: { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger-text)', border: 'rgba(239,68,68,0.2)' },
  cancelled: { bg: 'var(--warning-light)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' }
}

const AdminPayments = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchPayments(page)
  }, [page])

  const fetchPayments = async (p) => {
    setLoading(true)
    try {
      const res = await adminAPI.getAllPayments({ page: p, limit: 15 })
      setPayments(res.data.data)
      setTotalPages(res.data.pagination.pages)
    } catch {
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }}>
      <div style={{ marginBottom: 28, animation: 'slideUp 0.4s ease' }}>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Subscription Payments Ledger
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>
          Comprehensive record of all café subscription transactions.
        </p>
      </div>

      <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', animation: 'slideUp 0.5s ease' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Café Details', 'Plan Type', 'Amount', 'Date', 'Transaction ID', 'Status'].map((h, i) => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.01)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} style={{ padding: '18px 20px' }}>
                        <div style={{ height: 13, borderRadius: 4, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length > 0 ? (
                payments.map(payment => {
                  const sc = STATUS_COLORS[payment.status] || STATUS_COLORS.expired
                  const isPro = payment.plan_name === 'pro_plus'
                  return (
                    <tr key={payment._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      
                      {/* Café Details */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {payment.cafe_id?.name ? payment.cafe_id.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>{payment.cafe_id?.name || 'Unknown Café'}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{payment.cafe_id?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan Type */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: isPro ? '#f59e0b' : '#a78bfa', padding: '4px 10px', borderRadius: 6, background: isPro ? 'var(--warning-light)' : 'rgba(124,58,237,0.1)', textTransform: 'capitalize' }}>
                          {isPro ? 'Pro Plus Plan' : payment.plan_name === 'starter' ? 'Temp Pro Plus Plan' : 'Temp Pro Plus Plan'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#67e8f9' }}>
                        ₹{payment.price}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {new Date(payment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Transaction ID */}
                      <td style={{ padding: '16px 20px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {payment.razorpay_payment_id || 'N/A'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          Success
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-tertiary)', margin: '0 0 6px' }}>No payments found</p>
                    <p style={{ fontSize: 13, color: 'var(--border-hover)', margin: 0 }}>Subscription payments will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, background: page === 1 ? 'transparent' : 'var(--border-light)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 6, background: page === totalPages ? 'transparent' : 'var(--border-light)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}

export default AdminPayments
