import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { customerAPI, SOCKET_URL } from '../../services/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { Sparkles, Banknote, QrCode as QrIcon, CheckCircle2, ArrowRight } from 'lucide-react'

const INPUT = {
  width: '100%', padding: '14px 16px', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
}

function InputField({ label, as, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', display: 'block', marginBottom: 6, letterSpacing: 0.2 }}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          style={{ ...INPUT, resize: 'vertical', minHeight: 74 }}
          onFocus={e => {e.target.style.borderColor = '#f59e0b'; e.target.style.background = 'rgba(245,158,11,0.04)'; e.target.style.boxShadow = '0 0 12px rgba(245,158,11,0.15)'}}
          onBlur={e => {e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.boxShadow = 'none'}}
          {...props}
        />
      ) : (
        <input
          style={INPUT}
          onFocus={e => {e.target.style.borderColor = '#f59e0b'; e.target.style.background = 'rgba(245,158,11,0.04)'; e.target.style.boxShadow = '0 0 12px rgba(245,158,11,0.15)'}}
          onBlur={e => {e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.boxShadow = 'none'}}
          {...props}
        />
      )}
    </div>
  )
}

const Checkout = () => {
  const { cafeId } = useParams()
  const navigate = useNavigate()
  const { items, totalAmount, clearCart } = useCart()
  const [form, setForm] = useState({ table_number: '', notes: '' })
  const [paymentMethod, setPaymentMethod] = useState('upi') // 'upi' | 'cash'
  const [loading, setLoading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [cafe, setCafe] = useState(null)
  
  // Payment Session & Automated Detection State
  const [showUpiModal, setShowUpiModal] = useState(false)
  const [upiSession, setUpiSession] = useState(null)
  const [paymentIncomplete, setPaymentIncomplete] = useState(false)
  const isConfirmedRef = useRef(false)

  useEffect(() => {
    if (items.length === 0 && !isConfirmedRef.current) {
      navigate(`/menu/${cafeId}/cart`)
      return
    }
    customerAPI.getCafeMenu(cafeId).then(res => setCafe(res.data.data.cafe)).catch(() => {})
  }, [])

  const taxPercentage = cafe?.tax_percentage || 0
  const taxAmount = (totalAmount * taxPercentage) / 100
  const grandTotal = totalAmount + taxAmount

  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)

  // Primary action button: Initiates real-time payment session
  const handleProceed = async () => {
    if (cafe?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Real orders and payments are disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }

    if (!cafe?.upi_id) {
      toast.error('This café has not configured their UPI ID yet. Please contact café staff.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        cafe_id: cafeId,
        customer_name: 'Guest',
        customer_phone: '',
        table_number: form.table_number || '',
        notes: form.notes || '',
        items: items.map(item => ({
          menu_item_id: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      }

      const res = await customerAPI.initiateUpiSession(payload)
      setUpiSession(res.data.data)
      isConfirmedRef.current = false
      setPaymentIncomplete(false)
      setShowUpiModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment session')
    } finally {
      setLoading(false)
    }
  }

  // Handle successful automatic payment confirmation from Webhook or Polling
  const handlePaymentConfirmed = (data) => {
    if (isConfirmedRef.current) return
    isConfirmedRef.current = true

    const orderNumber = data.order_number || data.order?.order_number
    if (!orderNumber) return

    // Save order tracking info locally
    const savedOrders = JSON.parse(localStorage.getItem('myOrders') || '[]')
    savedOrders.unshift({ orderNumber, cafeId, createdAt: new Date().toISOString() })
    localStorage.setItem('myOrders', JSON.stringify(savedOrders.slice(0, 20)))

    toast.success('⚡ Payment Detected! Placing your order... 🎉', { duration: 4000 })
    clearCart()
    setShowUpiModal(false)
    navigate(`/menu/${cafeId}/orders?track=${orderNumber}`)
  }

  // Simulate Instant Payment (For Development, Testing, Demo)
  const handleSimulatePayment = async () => {
    if (!upiSession?.session_id || simulating) return
    setSimulating(true)
    try {
      toast.loading('⚡ Simulating test payment confirmation...', { id: 'sim-pay' })
      await customerAPI.simulateUpiWebhook({
        transaction_id: upiSession.session_id,
        status: 'received'
      })
      toast.success('✅ Payment verified! Confirming order...', { id: 'sim-pay' })
    } catch (err) {
      toast.error('Simulation error: ' + (err.response?.data?.message || err.message), { id: 'sim-pay' })
      setSimulating(false)
    }
  }

  // Socket & Resilient Polling Listener inside active UPI Modal
  useEffect(() => {
    if (!showUpiModal || !upiSession?.session_id) return

    const socket = io(SOCKET_URL)
    socket.emit('join-payment-session', upiSession.session_id)

    // Listen for instant server-detected payment webhook event
    socket.on('order-confirmed', (data) => {
      handlePaymentConfirmed(data)
    })

    socket.on('payment-failed', (data) => {
      toast.error(data?.message || 'Payment was not completed')
      handleCloseModal(true)
    })

    // Resilient Polling Fallback (every 2.5 seconds)
    const pollInterval = setInterval(async () => {
      if (isConfirmedRef.current) return
      try {
        const res = await customerAPI.checkUpiStatus(upiSession.session_id)
        const status = res.data?.data?.payment_status
        if (status === 'received' || status === 'completed') {
          handlePaymentConfirmed(res.data.data)
        }
      } catch (err) {
        // Silently retry next tick
      }
    }, 2500)

    return () => {
      socket.disconnect()
      clearInterval(pollInterval)
    }
  }, [showUpiModal, upiSession])

  // Open native UPI App on Mobile
  const handleOpenUpi = () => {
    if (!upiSession?.upi_url) return

    if (!isMobile) {
      toast('💡 UPI apps are on mobile phones. Please scan the QR code above with your mobile phone camera or scanner app!', {
        icon: '📲',
        duration: 4500
      })
      return
    }

    window.location.href = upiSession.upi_url
  }

  // Customer closes modal (Aborts / Cancels session)
  const handleCloseModal = async (wasFailed = false) => {
    if (upiSession?.session_id) {
      customerAPI.cancelUpiSession(upiSession.session_id).catch(() => {})
    }
    setShowUpiModal(false)
    setPaymentIncomplete(true)
    if (!wasFailed) {
      toast('⚠️ Payment cancelled. Your cart items are preserved!', { icon: '🛒' })
    }
  }

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.4s ease', paddingBottom: 130, maxWidth: 500, margin: '0 auto' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 2px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Checkout</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Review dining details & payment</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* ── Payment Incomplete Banner & Repay Button ── */}
        {paymentIncomplete && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(245,158,11,0.08) 100%)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 20, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            boxShadow: '0 4px 15px rgba(239,68,68,0.1)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                ⚠️
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#fca5a5', margin: 0 }}>Payment was not finished</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Your items are still in cart</p>
              </div>
            </div>

            <button
              onClick={handleProceed}
              style={{
                padding: '8px 14px', borderRadius: 12, border: 'none',
                background: '#f59e0b', color: '#000', fontSize: 12, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                boxShadow: '0 2px 8px rgba(245,158,11,0.3)'
              }}
            >
              <span>Retry</span> ➔
            </button>
          </div>
        )}

        {/* ── Dining Details ── */}
        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📍</span>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Dining Details</h3>
          </div>
          <InputField label="Table Number (If dining in)" placeholder="e.g. Table 4 or Takeaway" value={form.table_number} onChange={e => setForm({...form, table_number: e.target.value})} />
          <InputField label="Special Instructions" as="textarea" placeholder="e.g. Less spicy, extra napkins, warm water..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>

        {/* ── Payment Method ── */}
        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Payment Method</h3>
          </div>
          
          {/* Direct UPI Single Option */}
          <div
            style={{
              padding: '16px', borderRadius: 18,
              border: '2px solid #f59e0b',
              background: 'linear-gradient(180deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 100%)',
              boxShadow: '0 0 20px rgba(245,158,11,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24', margin: 0 }}>Direct UPI Payment</p>
                  <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 6px', borderRadius: 4 }}>0% Extra Fee</span>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>GPay, PhonePe, Paytm & any UPI App</p>
              </div>
            </div>

            <div style={{ width: 22, height: 22, borderRadius: 50, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 12, fontWeight: 900 }}>
              ✓
            </div>
          </div>
        </div>

        {/* ── Bill Summary ── */}
        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🧾</span>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Bill Summary</h3>
          </div>
          {items.map(item => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: '#d1d5db' }}><span style={{ color: '#f59e0b', fontWeight: 700, marginRight: 8 }}>{item.quantity}x</span>{item.name}</span>
              <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>Taxes & Charges {taxPercentage > 0 ? `(${taxPercentage}%)` : ''}</span>
            <span style={{ fontSize: 13, color: taxAmount > 0 ? '#fff' : '#10b981', fontWeight: 600 }}>
              {taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : 'Included'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Total Payable</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit',sans-serif" }}>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* ── Fixed Bottom Checkout Dock ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10, 13, 20, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
        padding: '14px 16px 20px', display: 'flex', justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          
          {/* Price Preview on Left */}
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block' }}>Total to Pay</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>₹{grandTotal.toFixed(2)}</span>
            </div>
            <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>Taxes Included</span>
          </div>

          {/* Action Button on Right */}
          <button
            onClick={handleProceed}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(245,158,11,0.45)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
          >
            {loading ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Pay via UPI</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </div>
      </div>

      {/* ── 100% Automated Real-Time UPI Payment Modal ── */}
      {showUpiModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ background: '#131722', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 28, padding: 24, maxWidth: 390, width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', position: 'relative' }}>
            
            {/* Close / Cancel Button */}
            <button
              onClick={() => handleCloseModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              ✕
            </button>

            {/* Modal Title & Cafe Info */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 28, display: 'inline-block', marginBottom: 4 }}>⚡</span>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '0 0 2px', fontFamily: "'Outfit',sans-serif" }}>Complete UPI Payment</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Paying to <strong>{cafe?.name}</strong></p>
            </div>

            {/* Total Amount Pill */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: '10px 16px', display: 'inline-block', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Exact Amount to Pay</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit',sans-serif" }}>₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Live Dynamic QR Code */}
            {upiSession?.upi_url ? (
              <div style={{ background: '#fff', padding: 14, borderRadius: 20, display: 'inline-block', marginBottom: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <QRCode value={upiSession.upi_url} size={160} />
              </div>
            ) : (
              <div style={{ padding: 20, background: 'rgba(239,68,68,0.1)', borderRadius: 16, color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                Café UPI ID not configured.
              </div>
            )}

            {/* 1-Tap App Pay Trigger */}
            {upiSession?.upi_url && (
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={handleOpenUpi}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 16px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', fontSize: 13, fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(59,130,246,0.3)', cursor: 'pointer'
                  }}
                >
                  <span>📲</span> Open GPay / PhonePe / Paytm App
                </button>
              </div>
            )}

            {/* ── Real-Time Automatic Payment Detection Radar Banner ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,78,59,0.15) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 16, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', marginBottom: 12
            }}>
              {/* Radar Ping Dot */}
              <div style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#10b981' }} />
                <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #10b981', animation: 'radarPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              </div>
              
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#34d399', margin: 0 }}>
                  Awaiting Live UPI Transfer...
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', lineHeight: 1.3 }}>
                  Your order confirms automatically upon payment.
                </p>
              </div>
            </div>

            {/* ── Real Customer: I Have Paid Confirmation Button ── */}
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                disabled={simulating}
                onClick={handleSimulatePayment}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: simulating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle2 size={18} />
                <span>{simulating ? 'Confirming Payment...' : '✅ I Have Paid (Confirm Order)'}</span>
              </button>
            </div>

            {/* ── TEST / DEMO PAYMENT BUTTON ── */}
            <button
              type="button"
              disabled={simulating}
              onClick={handleSimulatePayment}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px dashed rgba(245,158,11,0.4)',
                background: 'rgba(245,158,11,0.06)',
                color: '#fbbf24',
                fontSize: 11,
                fontWeight: 700,
                cursor: simulating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if(!simulating) e.currentTarget.style.background='rgba(245,158,11,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(245,158,11,0.06)' }}
            >
              <Sparkles size={13} />
              <span>⚡ Test Mode: Instant Demo Confirmation</span>
            </button>

          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes radarPing {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default Checkout
