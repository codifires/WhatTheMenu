import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { customerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { ArrowRight } from 'lucide-react'

const INPUT = {
  width: '100%', padding: '14px 16px', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
}

function InputField({ label, as, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, letterSpacing: 0.2 }}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          style={{ ...INPUT, resize: 'vertical', minHeight: 74 }}
          onFocus={e => {e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.background = 'var(--accent-bg-subtle)'; e.target.style.boxShadow = 'var(--accent-shadow)'}}
          onBlur={e => {e.target.style.borderColor = 'var(--border-medium)'; e.target.style.background = 'var(--bg-input)'; e.target.style.boxShadow = 'none'}}
          {...props}
        />
      ) : (
        <input
          style={INPUT}
          onFocus={e => {e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.background = 'var(--accent-bg-subtle)'; e.target.style.boxShadow = 'var(--accent-shadow)'}}
          onBlur={e => {e.target.style.borderColor = 'var(--border-medium)'; e.target.style.background = 'var(--bg-input)'; e.target.style.boxShadow = 'none'}}
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
  const [form, setForm] = useState({ customer_name: '', table_number: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [cafe, setCafe] = useState(null)

  useEffect(() => {
    if (items.length === 0) {
      navigate(`/${cafeId}/menu/cart`)
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
      toast.error('⚠️ Demo Template: Real orders and payments are disabled.', { style: { background: 'var(--text-primary)', color: '#000', fontWeight: 'bold' } })
      return
    }

    if (!cafe?.razorpay_key_id) {
      toast.error('This café has not configured Razorpay yet.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        cafe_id: cafeId,
        customer_name: form.customer_name || 'Guest',
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

      const res = await customerAPI.createRazorpayOrder(payload)
      
      if (res.data?.success) {
        const { order_id, razorpay_key_id, amount, cafe_name } = res.data.data
        
        const options = {
          key: razorpay_key_id,
          amount: amount,
          currency: 'INR',
          name: cafe_name,
          description: 'Food Order Payment',
          order_id: order_id,
          handler: async function (response) {
            try {
              const verifyRes = await customerAPI.verifyRazorpayPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
              
              if (verifyRes.data?.success) {
                // Save order tracking info locally
                const savedOrders = JSON.parse(localStorage.getItem('myOrders') || '[]')
                savedOrders.unshift({ orderNumber: verifyRes.data.data.order_number, cafeId, createdAt: new Date().toISOString() })
                localStorage.setItem('myOrders', JSON.stringify(savedOrders.slice(0, 20)))

                toast.success('⚡ Payment Successful! Placing your order... 🎉', { duration: 4000 })
                clearCart()
                navigate(`/${cafeId}/menu/orders?track=${verifyRes.data.data.order_number}`)
              } else {
                toast.error('Payment verification failed.')
              }
            } catch (err) {
              toast.error(err.response?.data?.message || 'Payment verification failed.')
            }
          },
          prefill: {
            name: form.customer_name || 'Guest',
            contact: ''
          },
          theme: {
            color: 'var(--accent-primary)'
          },
          modal: {
            ondismiss: function() {
              toast('Payment cancelled. Your cart items are preserved!', { icon: '🛒' })
            }
          }
        }
        
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          toast.error(response.error.description || 'Payment failed.')
        });
        rzp.open();
        
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate Razorpay payment')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.4s ease', paddingBottom: 130, maxWidth: 500, margin: '0 auto' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-card-hover)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--border-medium)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--bg-card-hover)'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 2px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Checkout</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Review dining details & payment</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        


        {/* ── Dining Details ── */}
        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📍</span>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Dining Details</h3>
          </div>
          <InputField label="Your Name (Optional)" placeholder="Enter your full name" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
          <InputField label="Table Number (If dining in)" placeholder="e.g. Table 4 or Takeaway" value={form.table_number} onChange={e => setForm({...form, table_number: e.target.value})} />
          <InputField label="Special Instructions" as="textarea" placeholder="e.g. Less spicy, extra napkins, warm water..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>

        {/* ── Payment Method ── */}
        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Payment Method</h3>
          </div>
          
          {/* Razorpay Option */}
          {cafe?.razorpay_key_id ? (
            <div
              style={{
                padding: '16px', borderRadius: 18, marginBottom: 12, cursor: 'default',
                border: '2px solid var(--accent-primary)',
                background: 'linear-gradient(180deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 100%)',
                boxShadow: '0 0 20px rgba(245,158,11,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  💳
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24', margin: 0 }}>Pay Online</p>
                    <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(16,185,129,0.2)', color: 'var(--success-text)', padding: '2px 6px', borderRadius: 4 }}>Recommended</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Cards, UPI, Wallets (via Razorpay)</p>
                </div>
              </div>

              <div style={{ width: 22, height: 22, borderRadius: 50, background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', fontSize: 12, fontWeight: 900 }}>
                ✓
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', borderRadius: 18, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-text)', fontSize: 13, textAlign: 'center' }}>
              Online payments are currently disabled for this café.
            </div>
          )}
        </div>

        {/* ── Bill Summary ── */}
        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🧾</span>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Bill Summary</h3>
          </div>
          {items.map(item => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}><span style={{ color: 'var(--accent-primary)', fontWeight: 700, marginRight: 8 }}>{item.quantity}x</span>{item.name}</span>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border-medium)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Taxes & Charges {taxPercentage > 0 ? `(${taxPercentage}%)` : ''}</span>
            <span style={{ fontSize: 13, color: taxAmount > 0 ? 'var(--text-primary)' : '#10b981', fontWeight: 600 }}>
              {taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : 'Included'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Total Payable</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-primary)', fontFamily: "'Outfit',sans-serif" }}>₹{grandTotal.toFixed(2)}</span>
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
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block' }}>Total to Pay</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>₹{grandTotal.toFixed(2)}</span>
            </div>
            <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>Taxes Included</span>
          </div>

          {/* Action Button on Right */}
          <button
            onClick={handleProceed}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 16, border: 'none',
              background: 'var(--accent-gradient)',
              color: 'var(--text-primary)', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
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
                <span>💳</span>
                <span>Pay Online</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </div>
      </div>



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
