import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const STATUS_STEPS = [
  { key: 'new', label: 'Placed', icon: '📝' },
  { key: 'accepted', label: 'Accepted', icon: '👨‍🍳' },
  { key: 'preparing', label: 'Preparing', icon: '🔥' },
  { key: 'ready', label: 'Ready', icon: '🛍️' },
  { key: 'completed', label: 'Done', icon: '✅' },
]

const OrderTracking = () => {
  const { cafeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('track') || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [myOrders, setMyOrders] = useState([])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
    const cafeOrders = saved.filter(o => o.cafeId === cafeId && o.status !== 'completed')
    setMyOrders(cafeOrders)

    // Auto-track the most recent order if none in URL
    if (!orderNumber && cafeOrders.length > 0) {
      setOrderNumber(cafeOrders[0].orderNumber)
    }
  }, [cafeId])

  useEffect(() => {
    if (orderNumber) trackOrder(orderNumber)
  }, [orderNumber])

  useEffect(() => {
    if (!order) return
    const socket = io(window.location.origin)
    socket.emit('track-order', order.order_number)
    socket.on('order-status-update', (data) => {
      if (data.order_number === order.order_number) {
        setOrder(prev => ({ ...prev, order_status: data.status }))
        toast.success(`Order update: ${data.status.toUpperCase()}`, { icon: '🔔' })
        
        if (data.status === 'completed') {
          // Mark in localStorage so it doesn't show in tracking anymore
          const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
          const updated = saved.map(o => o.orderNumber === data.order_number ? { ...o, status: 'completed' } : o)
          localStorage.setItem('myOrders', JSON.stringify(updated))
          
          toast.success('Your order is complete! Please leave a review.')
          setTimeout(() => navigate(`/menu/${cafeId}/feedback`), 2000)
        }
      }
    })
    return () => socket.disconnect()
  }, [order?.order_number])

  const trackOrder = async (num) => {
    setLoading(true)
    try {
      const res = await customerAPI.trackOrder(num)
      setOrder(res.data.data)
      
      if (res.data.data.order_status === 'completed') {
        const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
        const updated = saved.map(o => o.orderNumber === res.data.data.order_number ? { ...o, status: 'completed' } : o)
        localStorage.setItem('myOrders', JSON.stringify(updated))
        
        toast.success('Your order is complete! Please leave a review.')
        setTimeout(() => navigate(`/menu/${cafeId}/feedback`), 2000)
      }
    } catch (error) {
      toast.error('Order not found')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const getStepIndex = (status) => STATUS_STEPS.findIndex(s => s.key === status)

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.4s ease' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Track Order</h2>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Follow your order in real-time</p>
      </div>



      {/* ── Recent Orders ── */}
      {!order && myOrders.length > 0 && (
        <div style={{ animation: 'slideUp 0.3s ease' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px', paddingLeft: 4 }}>Recent Orders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myOrders.map((o, i) => (
              <button
                key={i} onClick={() => setOrderNumber(o.orderNumber)}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'block' }}>{o.orderNumber}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{new Date(o.createdAt).toLocaleDateString()} at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Order Details ── */}
      {order && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, padding: 24, animation: 'slideUp 0.4s ease both' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Token: {order.token_number || 'N/A'}</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 2px' }}>Order: {order.order_number}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: order.payment_status === 'received' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: order.payment_status === 'received' ? '#34d399' : '#fbbf24', textTransform: 'uppercase' }}>
                {order.payment_method} - {order.payment_status}
              </span>
            </div>
          </div>

          {order.payment_method === 'online' && (order.payment_status === 'pending' || order.payment_status === 'failed') ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(239,68,68,0.05)', borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f87171', margin: '0 0 8px' }}>Payment Incomplete</h3>
              <p style={{ fontSize: 14, color: '#d1d5db', margin: 0, lineHeight: 1.5, marginBottom: 24 }}>
                Your order is not confirmed because the payment was cancelled or failed. Please complete your payment to confirm your order.
              </p>
              <button
                onClick={handleRetryPayment}
                disabled={loading}
                style={{
                  padding: '12px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.4)', transition: 'transform 0.2s, box-shadow 0.2s', opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.6)' } }}
                onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,185,129,0.4)' } }}
              >
                {loading ? 'Initiating...' : 'Complete Payment'}
              </button>
            </div>
          ) : (
            <>
              {/* ── Status Stepper ── */}
              <div style={{ position: 'relative', marginBottom: 40, padding: '0 10px' }}>
                <div style={{ position: 'absolute', top: 20, left: 24, right: 24, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 20, left: 24, height: 2, background: 'linear-gradient(90deg, #f59e0b, #ea580c)', borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', width: `calc(${(getStepIndex(order.order_status) / (STATUS_STEPS.length - 1)) * 100}% - 48px)` }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {STATUS_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(order.order_status)
                    const isCompleted = i <= currentIdx
                    const isCurrent = i === currentIdx
                    return (
                      <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, zIndex: 2, transition: 'all 0.4s',
                          background: isCompleted ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : '#141823',
                          border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.1)',
                          color: isCompleted ? '#fff' : '#6b7280',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(245,158,11,0.2), 0 10px 20px rgba(245,158,11,0.3)' : 'none',
                          transform: isCurrent ? 'scale(1.1)' : 'scale(1)'
                        }}>
                          {step.icon}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isCompleted ? '#fff' : '#6b7280', marginTop: 8, textAlign: 'center', transition: 'color 0.4s' }}>{step.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Receipt ── */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>Order Summary</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {order.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, color: '#d1d5db' }}><span style={{ color: '#f59e0b', fontWeight: 700, marginRight: 8 }}>{item.quantity}x</span>{item.name}</span>
                      <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 0 16px' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Total Paid</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit',sans-serif" }}>₹{order.total_amount}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default OrderTracking
