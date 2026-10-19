import React, { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { customerAPI, SOCKET_URL } from '../../services/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { playHardwareAlert } from '../../utils/hardwareAlerts'
import html2canvas from 'html2canvas'
import { Bell, FileText, CheckCircle2, Clock, AlertCircle, UtensilsCrossed, Receipt } from 'lucide-react'

const STATUS_STEPS = [
  { 
    key: 'new', 
    label: 'Order Placed', 
    icon: '📝', 
    desc: 'Your order was sent to the kitchen and is awaiting confirmation.' 
  },
  { 
    key: 'accepted', 
    label: 'Accepted', 
    icon: '👨‍🍳', 
    desc: 'The kitchen has accepted your order and added it to the queue.' 
  },
  { 
    key: 'preparing', 
    label: 'Preparing', 
    icon: '🔥', 
    desc: 'The chef is cooking your meal fresh and hot.' 
  },
  { 
    key: 'ready', 
    label: 'Ready', 
    icon: '🛍️', 
    desc: 'Your order is ready! A server will bring it or you can collect it from the counter.' 
  },
  { 
    key: 'completed', 
    label: 'Completed', 
    icon: '✅', 
    desc: 'Order complete! We hope you enjoyed your meal.' 
  },
]

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-primary)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Something went wrong loading your order.</h2>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, background: 'var(--accent-primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
          >
            Refresh Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const OrderTrackingContent = () => {
  const printRef = useRef(null)
  const { cafeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [orderNumber, setOrderNumber] = useState(searchParams.get('track') || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [myOrders, setMyOrders] = useState([])
  const [cafeDetails, setCafeDetails] = useState(null)
  const [alertSent, setAlertSent] = useState({ waiter: false, bill: false })

  useEffect(() => {
    let saved = []
    try {
      saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
    } catch (e) {
      localStorage.setItem('myOrders', '[]')
    }
    const cafeOrders = saved.filter(o => o.cafeId === cafeId)
    setMyOrders(cafeOrders)

    // Auto-track the most recent order if none in URL
    if (!orderNumber && cafeOrders.length > 0) {
      setOrderNumber(cafeOrders[0].orderNumber)
    }
  }, [cafeId, orderNumber])

  useEffect(() => {
    if (orderNumber) {
      trackOrder(orderNumber)
    }
  }, [orderNumber])

  // Live Socket.IO Updates
  useEffect(() => {
    if (!order) return
    const socket = io(SOCKET_URL)
    socket.emit('track-order', order.order_number)

    socket.on('order-status-update', (data) => {
      if (data.order_number === order.order_number) {
        setOrder(prev => ({ ...prev, order_status: data.status }))
        toast.success(`Order update: ${data.status.toUpperCase()}`, { 
          icon: '🔔',
          style: { borderRadius: '12px', background: '#1c1917', color: '#fff', fontSize: '13px' }
        })

        if (data.status === 'ready' || data.status === 'completed') {
          playHardwareAlert('ready')
        }

        if (data.status === 'completed') {
          try {
            const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
            const updated = saved.map(o => o.orderNumber === data.order_number ? { ...o, status: 'completed' } : o)
            localStorage.setItem('myOrders', JSON.stringify(updated))
          } catch (e) {}

          toast.success('Your order is complete! We would love your feedback.', { duration: 5000 })
        }
      }
    })

    return () => socket.disconnect()
  }, [order?.order_number])

  const trackOrder = async (num) => {
    setLoading(true)
    try {
      const res = await customerAPI.trackOrder(num)
      if (!cafeDetails) {
        customerAPI.getCafeMenu(cafeId).then(cRes => setCafeDetails(cRes.data.data.cafe)).catch(() => {})
      }

      setOrder(res.data.data)

      if (res.data.data.order_status === 'completed') {
        try {
          const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
          const updated = saved.map(o => o.orderNumber === res.data.data.order_number ? { ...o, status: 'completed' } : o)
          localStorage.setItem('myOrders', JSON.stringify(updated))
        } catch (e) {}
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Order not found.')
        try {
          const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
          const updated = saved.filter(o => o.orderNumber !== num)
          localStorage.setItem('myOrders', JSON.stringify(updated))
          setMyOrders(updated)
          if (orderNumber === num) setOrderNumber('')
        } catch (e) {}
      } else {
        toast.error('Error fetching order status.')
      }
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  // Staff assistance alert
  const handleStaffAlert = async (type) => {
    if (!order?.order_number) return
    try {
      await customerAPI.triggerStaffAlert(order.order_number, { type })
      setAlertSent(prev => ({ ...prev, [type]: true }))
      toast.success(type === 'waiter' ? 'Staff notified! A team member is coming to your table.' : 'Bill requested from the counter.', {
        icon: '🙋',
        duration: 3500
      })
      setTimeout(() => {
        setAlertSent(prev => ({ ...prev, [type]: false }))
      }, 30000)
    } catch (err) {
      toast.error('Failed to notify staff. Please alert the counter.')
    }
  }

  // Download PDF Receipt
  const handleDownloadPDF = async () => {
    if (!printRef.current) return
    printRef.current.style.display = 'block'
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Invoice_${order?.order_number || 'Order'}.pdf`)
      toast.success('Bill receipt downloaded! 📄')
    } catch (err) {
      toast.error('Failed to generate PDF')
    } finally {
      printRef.current.style.display = 'none'
    }
  }

  // Proper Step Index Calculation
  const getStepIndex = (status) => {
    const idx = STATUS_STEPS.findIndex(s => s.key === status)
    return idx >= 0 ? idx : 0
  }

  const currentStepIdx = order ? getStepIndex(order.order_status) : 0
  const currentStep = STATUS_STEPS[currentStepIdx] || STATUS_STEPS[0]

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.35s ease', paddingBottom: 120 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
          Track Order
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Follow your dining status in real time
        </p>
      </div>

      {/* ── Order Selector Tabs if user placed multiple orders ── */}
      {myOrders.length > 1 && (
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          overflowX: 'auto', 
          paddingBottom: 12, 
          scrollbarWidth: 'none', 
          marginBottom: 16 
        }}>
          {myOrders.map((o, idx) => {
            const active = orderNumber === o.orderNumber
            return (
              <button
                key={idx}
                onClick={() => setOrderNumber(o.orderNumber)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                  background: active ? 'var(--accent-bg-subtle)' : 'var(--bg-card)',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {o.tokenNumber || o.orderNumber}
              </button>
            )
          })}
        </div>
      )}

      {/* ── No Recent Orders Empty State ── */}
      {!order && myOrders.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--border-light)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <UtensilsCrossed size={32} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>No Active Orders</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', maxWidth: 280, marginInline: 'auto' }}>
            You haven't placed an order yet. Check out the menu and order your favorite dishes!
          </p>
          <button
            onClick={() => navigate(`/${cafeId}/menu`)}
            style={{
              padding: '12px 28px',
              borderRadius: 14,
              border: 'none',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: 'var(--accent-shadow)'
            }}
          >
            Explore Menu
          </button>
        </div>
      )}

      {/* ── Active Order Tracking Card ── */}
      {order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'cardAppear 0.3s ease both' }}>
          
          {/* Main Status Hero Card */}
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-medium)', 
            borderRadius: 24, 
            padding: 20, 
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header row: Token & Payment Badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block' }}>
                  Dining Token
                </span>
                <p style={{ 
                  fontSize: 28, 
                  fontWeight: 900, 
                  color: 'var(--accent-primary)', 
                  margin: '2px 0 0', 
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.5px'
                }}>
                  {order.token_number || `#${order.order_number.slice(-4)}`}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                  ID: {order.order_number}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  fontSize: 11, 
                  fontWeight: 800, 
                  padding: '5px 10px', 
                  borderRadius: 10, 
                  background: (order.payment_status === 'received' || order.payment_status === 'completed') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.12)', 
                  color: (order.payment_status === 'received' || order.payment_status === 'completed') ? '#10b981' : 'var(--accent-primary)', 
                  textTransform: 'uppercase',
                  display: 'inline-block'
                }}>
                  {(order.payment_status === 'received' || order.payment_status === 'completed') ? '✓ Paid' : 'Payment Pending'}
                </span>
                
                {order.table_number && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '6px 0 0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <UtensilsCrossed size={13} />
                    <span>Table {order.table_number}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Current Step Highlight Banner */}
            <div style={{ 
              background: 'var(--accent-bg-subtle)', 
              borderRadius: 16, 
              padding: '14px 16px', 
              marginBottom: 26,
              border: '1px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 26 }}>{currentStep.icon}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {currentStep.label}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0', lineHeight: 1.4 }}>
                  {currentStep.desc}
                </p>
              </div>
            </div>

            {/* ── Status Stepper Bar ── */}
            <div style={{ position: 'relative', marginBottom: 20, padding: '0 6px' }}>
              {/* Background Line */}
              <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: 20, 
                right: 20, 
                height: 3, 
                background: 'var(--border-medium)', 
                borderRadius: 2 
              }} />
              
              {/* Active Animated Progress Line */}
              <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: 20, 
                height: 3, 
                background: 'var(--accent-gradient)', 
                borderRadius: 2, 
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 
                width: `calc(${(currentStepIdx / (STATUS_STEPS.length - 1)) * 100}% - 40px)` 
              }} />

              {/* Step Bubbles */}
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {STATUS_STEPS.map((step, i) => {
                  const isCompleted = i <= currentStepIdx
                  const isCurrent = i === currentStepIdx

                  return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44 }}>
                      <div style={{
                        width: 40, 
                        height: 40, 
                        borderRadius: 14, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: 16, 
                        zIndex: 2, 
                        transition: 'all 0.3s ease',
                        background: isCompleted ? 'var(--accent-gradient)' : 'var(--bg-card)',
                        border: isCompleted ? 'none' : '2px solid var(--border-medium)',
                        color: isCompleted ? '#ffffff' : 'var(--text-tertiary)',
                        boxShadow: isCurrent ? '0 0 0 4px var(--accent-bg-subtle), var(--accent-shadow)' : 'none',
                        transform: isCurrent ? 'scale(1.12)' : 'scale(1)'
                      }}>
                        {step.icon}
                      </div>
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: isCurrent ? 800 : 600, 
                        color: isCompleted ? 'var(--text-primary)' : 'var(--text-tertiary)', 
                        marginTop: 8, 
                        textAlign: 'center',
                        lineHeight: 1.2
                      }}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ── Table Assistance Actions (Call Waiter / Request Bill) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => handleStaffAlert('waiter')}
              disabled={alertSent.waiter}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid var(--border-medium)',
                background: alertSent.waiter ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                color: alertSent.waiter ? '#10b981' : 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: alertSent.waiter ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.2s ease'
              }}
            >
              {alertSent.waiter ? <CheckCircle2 size={16} /> : <Bell size={16} />}
              <span>{alertSent.waiter ? 'Notified' : 'Call Waiter'}</span>
            </button>

            <button
              onClick={() => handleStaffAlert('bill')}
              disabled={alertSent.bill}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid var(--border-medium)',
                background: alertSent.bill ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                color: alertSent.bill ? '#10b981' : 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: alertSent.bill ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.2s ease'
              }}
            >
              {alertSent.bill ? <CheckCircle2 size={16} /> : <Receipt size={16} />}
              <span>{alertSent.bill ? 'Requested' : 'Request Bill'}</span>
            </button>
          </div>

          {/* ── Itemized Receipt Summary ── */}
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-medium)', 
            borderRadius: 20, 
            padding: 18, 
            boxShadow: 'var(--shadow-card)' 
          }}>
            <h2 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 14px' }}>
              Ordered Items
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 800, marginRight: 6 }}>{item.quantity}x</span>
                    {item.name}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--border-medium)', margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Total Amount</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)', fontFamily: "'Outfit', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                ₹{order.total_amount?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          {/* Action Row: Download PDF & Leave Review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {order.order_status === 'completed' && (
              <button
                onClick={() => navigate(`/${cafeId}/menu/feedback`)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: 'var(--accent-shadow)'
                }}
              >
                <span>⭐ Leave a Review for the Chef</span>
              </button>
            )}

            <button
              onClick={handleDownloadPDF}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
            >
              <FileText size={16} />
              <span>Download PDF Receipt</span>
            </button>
          </div>

        </div>
      )}

      {/* ── Hidden Printable Invoice for PDF Export ── */}
      {order && cafeDetails && (
        <div 
          ref={printRef}
          style={{
            display: 'none', 
            width: '210mm', 
            padding: '20mm', 
            background: '#ffffff', 
            color: '#1c1917', 
            fontFamily: 'sans-serif'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
            <h1 style={{ margin: '0 0 2mm', fontSize: '24px', fontWeight: 'bold' }}>{cafeDetails.name}</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{cafeDetails.address || 'Dining Receipt'}</p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8mm', fontSize: '13px' }}>
            <div>
              <p style={{ margin: '0 0 1mm' }}><strong>Token #:</strong> {order.token_number || 'N/A'}</p>
              <p style={{ margin: '0 0 1mm' }}><strong>Order #:</strong> {order.order_number}</p>
              <p style={{ margin: 0 }}><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 1mm' }}><strong>Table:</strong> {order.table_number || 'Dine-In'}</p>
              <p style={{ margin: 0 }}><strong>Payment:</strong> {order.payment_method?.toUpperCase()} ({order.payment_status?.toUpperCase()})</p>
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1c1917' }}>
                <th style={{ textAlign: 'left', padding: '2mm 0', fontSize: '13px' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '2mm 0', fontSize: '13px' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '2mm 0', fontSize: '13px' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '2mm 0', fontSize: '13px' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '2mm 0', fontSize: '13px' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '2mm 0', fontSize: '13px' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px' }}>
            <div style={{ width: '50%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1c1917', paddingTop: '2mm', fontWeight: 'bold', fontSize: '16px' }}>
                <span>Total Amount:</span>
                <span>₹{order.total_amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '12mm', fontSize: '12px', color: '#888' }}>
            <p>Thank you for dining with us!</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardAppear { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

const OrderTracking = () => (
  <ErrorBoundary>
    <OrderTrackingContent />
  </ErrorBoundary>
)

export default OrderTracking
