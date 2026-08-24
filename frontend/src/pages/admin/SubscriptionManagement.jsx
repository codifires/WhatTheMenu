import { useState, useEffect } from 'react'
import { adminAPI, publicAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

const STATUS_COLORS = {
  active:    { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  suspended: { bg: 'rgba(239,68,68,0.10)',  color: '#f87171', border: 'rgba(239,68,68,0.25)' },
  expired:   { bg: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  pending:   { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
}

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [basicPrice, setBasicPrice] = useState(199)
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyCafeName, setHistoryCafeName] = useState('')

  useEffect(() => { 
    fetchSubscriptions() 
    fetchRequests()
    fetchPrices()

    const socket = io(SOCKET_URL)
    socket.emit('join-admin')

    socket.on('new-subscription-revenue', (data) => {
      toast.success(`⚡ New Subscription Payment: ${data.cafe_name} upgraded to ${data.plan_name?.toUpperCase()} (₹${data.amount})!`, {
        icon: '💰',
        duration: 5000
      })
      fetchSubscriptions()
      fetchRequests()
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const fetchPrices = async () => {
    try {
      const res = await publicAPI.getSettings()
      const d = res.data?.data
      if (d?.basic_price) setBasicPrice(d.basic_price)
        if (d?.starter_price) setStarterPrice(d.starter_price)
      if (d?.pro_price) setProPrice(d.pro_price)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const res = await adminAPI.getSubscriptions()
      setSubscriptions(res.data.data)
    } catch {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await adminAPI.getSubscriptionRequests()
      setRequests(res.data.data.filter(r => r.status === 'pending'))
    } catch (err) {
      console.error(err)
    }
  }

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveSubscriptionRequest(id)
      toast.success('Request approved successfully!')
      fetchRequests()
      fetchSubscriptions()
    } catch {
      toast.error('Failed to approve request')
    }
  }

  const fetchHistory = async (cafeId, cafeName) => {
    if (!cafeId) {
      toast.error('Cannot fetch history: Café details missing or deleted')
      return
    }
    try {
      const res = await adminAPI.getSubscriptionHistory(cafeId)
      setHistoryData(res.data.data)
      setHistoryCafeName(cafeName)
      setHistoryModalOpen(true)
    } catch {
      toast.error('Failed to load history')
    }
  }

  const handleReject = async (id) => {
    try {
      await adminAPI.rejectSubscriptionRequest(id)
      toast.success('Request rejected')
      fetchRequests()
    } catch {
      toast.error('Failed to reject request')
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await adminAPI.updateSubscription(id, { status })
      toast.success(`Subscription updated to ${status}`)
      fetchSubscriptions()
    } catch {
      toast.error('Failed to update subscription')
    }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Subscription Plans</h1>
        <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Manage and monitor café subscriptions.</p>
      </div>

      {/* Plans summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        
          {/* Basic Plan */}
          <div
            style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 8px 30px rgba(59,130,246,0.05)', transition: 'transform 0.2s', animation: 'slideUp 0.4s ease 0s both' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>
                B
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>Basic Plan</h3>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>The essentials</p>
              </div>
            </div>
            <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
              ₹{basicPrice}<span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, marginLeft: 4 }}>/month</span>
            </p>
          </div>

          {/* Starter Plan */}
        <div
          style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(124,58,237,0.1) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 8px 30px rgba(124,58,237,0.05)', transition: 'transform 0.2s', animation: 'slideUp 0.4s ease 0s both' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>
              S
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>Starter Plan</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Basic features</p>
            </div>
          </div>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
            ₹{starterPrice}<span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, marginLeft: 4 }}>/month</span>
          </p>
        </div>

        {/* Pro Plan */}
        <div
          style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(245,158,11,0.1) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 8px 30px rgba(245,158,11,0.05)', transition: 'transform 0.2s', animation: 'slideUp 0.4s ease 0.1s both' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>
              P
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>Pro Plan</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>All features included</p>
            </div>
          </div>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
            ₹{proPrice}<span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, marginLeft: 4 }}>/month</span>
          </p>
        </div>
      </div>

      {/* Pending Requests Table */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', fontFamily: "'Outfit',sans-serif", color: '#f59e0b' }}>Pending Verifications</h2>
          <div style={{ borderRadius: 20, background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.2)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
                    {['Café Details', 'Requested Plan', 'Amount', 'UTR Number', 'Date', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#f59e0b', textAlign: i === 5 ? 'right' : 'left', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'rgba(245,158,11,0.05)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                            {req.cafe_id?.name ? req.cafe_id.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: 0, whiteSpace: 'nowrap' }}>{req.cafe_id?.name || 'Unknown Café'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#a78bfa', textTransform: 'capitalize' }}>
                        {req.plan_name}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: '#d1d5db' }}>
                        ₹{req.amount}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, fontFamily: 'monospace', color: '#67e8f9', fontWeight: 600 }}>
                        {req.utr_number}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#9ca3af' }}>
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleReject(req._id)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                          <button onClick={() => handleApprove(req._id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>Approve</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', fontFamily: "'Outfit',sans-serif" }}>Active & Past Subscriptions</h2>
      <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Café Details', 'Plan Type', 'Amount', 'Duration', 'Dates', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#4b5563', textAlign: i === 6 ? 'right' : 'left', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.01)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '18px 20px' }}>
                        <div style={{ height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subscriptions.length > 0 ? (
                subscriptions.map(sub => {
                  const sc = STATUS_COLORS[sub.status] || STATUS_COLORS.pending
                  const isPro = sub.plan_name === 'pro'
                  return (
                    <tr key={sub._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      
                      {/* Café Details */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {sub.cafe_id?.name ? sub.cafe_id.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: 0, whiteSpace: 'nowrap' }}>{sub.cafe_id?.name || 'Unknown Café'}</p>
                            <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>ID: {sub._id.slice(-6)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan Type */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: isPro ? '#f59e0b' : '#a78bfa', padding: '4px 10px', borderRadius: 6, background: isPro ? 'rgba(245,158,11,0.1)' : 'rgba(124,58,237,0.1)', textTransform: 'capitalize' }}>
                          <span style={{ fontSize: 10 }}>{isPro ? '⭐' : '📦'}</span> {sub.plan_name}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: '#d1d5db' }}>
                        ₹{sub.price}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>
                          {(() => {
                            const start = new Date(sub.start_date);
                            const end = new Date(sub.end_date);
                            const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
                            if (diffDays > 300) return '1 Year';
                            if (diffDays >= 28 && diffDays <= 31) return '1 Month';
                            return `${diffDays} Days`;
                          })()}
                        </span>
                      </td>

                      {/* Dates */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}><span style={{ color: '#6b7280' }}>Start:</span> {new Date(sub.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span style={{ fontSize: 12, color: '#e5e7eb' }}><span style={{ color: '#6b7280' }}>End:</span> {new Date(sub.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>
                          {sub.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            onClick={() => fetchHistory(sub.cafe_id?._id, sub.cafe_id?.name)}
                            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#d1d5db', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          >
                            History
                          </button>
                          <select
                            value={sub.status}
                            onChange={(e) => handleStatusUpdate(sub._id, e.target.value)}
                            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', cursor: 'pointer', transition: 'border-color 0.2s', width: 110 }}
                            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                          >
                            <option value="active" style={{ background: '#0d1120' }}>Active</option>
                            <option value="suspended" style={{ background: '#0d1120' }}>Suspended</option>
                            <option value="expired" style={{ background: '#0d1120' }}>Expired</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>No subscriptions found</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>When cafés register, their subscriptions will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {historyModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0f172a', borderRadius: 24, width: '100%', maxWidth: 700, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>Subscription History: {historyCafeName}</h2>
              <button onClick={() => setHistoryModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 32, maxHeight: '60vh', overflowY: 'auto' }}>
              {historyData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', margin: '40px 0' }}>No history records found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {historyData.map((record, index) => (
                    <div key={record._id} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: record.plan_name === 'pro' ? '#f59e0b' : '#a78bfa', textTransform: 'capitalize' }}>
                            {record.plan_name} Plan
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: '#d1d5db' }}>
                            ₹{record.price}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                          {new Date(record.start_date).toLocaleDateString('en-IN')} — {new Date(record.end_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Purchased on</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                          {new Date(record.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default SubscriptionManagement
