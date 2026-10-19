import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { customerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle2, CreditCard, Banknote, UtensilsCrossed, Receipt } from 'lucide-react'

const INPUT_STYLE = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-main)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
}

function InputField({ label, as, optional, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span>{label}</span>
        {optional && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>(Optional)</span>}
      </label>
      {as === 'textarea' ? (
        <textarea
          style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 74 }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-bg-subtle)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
          {...props}
        />
      ) : (
        <input
          style={INPUT_STYLE}
          onFocus={e => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-bg-subtle)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
          {...props}
        />
      )}
    </div>
  )
}

const Checkout = () => {
  const { cafeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { items, totalAmount, clearCart } = useCart()

  // Dining form fields pre-populated from table detection and saved notes
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    table_number: () => searchParams.get('table') || localStorage.getItem('customer_table') || '',
    notes: () => localStorage.getItem('order_notes') || ''
  })

  const [loading, setLoading] = useState(false)
  const [cafe, setCafe] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState('online') // 'online' | 'cash'

  useEffect(() => {
    if (items.length === 0) {
      navigate(`/${cafeId}/menu/cart`)
      return
    }

    customerAPI.getCafeMenu(cafeId)
      .then(res => {
        const c = res.data.data.cafe
        setCafe(c)
        // If razorpay is not configured, default to 'cash'
        if (!c.razorpay_key_id) {
          setSelectedMethod('cash')
        }
      })
      .catch(() => {})
  }, [cafeId, items.length, navigate])

  const taxPercentage = cafe?.tax_percentage || 0
  const taxAmount = (totalAmount * taxPercentage) / 100
  const grandTotal = totalAmount + taxAmount

  // Save successful order into customer's local order history
  const recordOrderLocally = (orderNumber, tokenNumber) => {
    try {
      const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
      const updated = [
        {
          orderNumber,
          tokenNumber: tokenNumber || '',
          cafeId,
          createdAt: new Date().toISOString()
        },
        ...saved.filter(o => o.orderNumber !== orderNumber)
      ].slice(0, 25)
      localStorage.setItem('myOrders', JSON.stringify(updated))
      localStorage.removeItem('order_notes')
    } catch (e) {
      console.error('Error saving order history:', e)
    }
  }

  // Handle Order Placement (Razorpay Online OR Pay at Counter)
  const handleProceed = async () => {
    if (cafe?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Real orders and payments are disabled in demo mode.', {
        style: { background: '#1c1917', color: '#ffffff', fontWeight: 'bold' }
      })
      return
    }

    // Common payload for order
    const payload = {
      cafe_id: cafeId,
      customer_name: (typeof form.customer_name === 'function' ? form.customer_name() : form.customer_name) || 'Guest',
      customer_phone: (typeof form.customer_phone === 'function' ? form.customer_phone() : form.customer_phone) || '',
      table_number: (typeof form.table_number === 'function' ? form.table_number() : form.table_number) || '',
      notes: (typeof form.notes === 'function' ? form.notes() : form.notes) || '',
      items: items.map(item => ({
        menu_item_id: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    }

    // Path 1: Pay Online via Razorpay
    if (selectedMethod === 'online' && cafe?.razorpay_key_id) {
      setLoading(true)
      try {
        const res = await customerAPI.createRazorpayOrder(payload)
        
        if (res.data?.success) {
          const { order_id, razorpay_key_id, amount, cafe_name, order_number } = res.data.data
          
          const options = {
            key: razorpay_key_id,
            amount: amount,
            currency: 'INR',
            name: cafe_name || 'Restaurant Order',
            description: `Order #${order_number}`,
            order_id: order_id,
            handler: async function (response) {
              try {
                const verifyRes = await customerAPI.verifyRazorpayPayment({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                })
                
                if (verifyRes.data?.success) {
                  const confirmedOrderNum = verifyRes.data.data.order_number
                  recordOrderLocally(confirmedOrderNum, verifyRes.data.data.token_number)
                  toast.success('⚡ Payment Successful! Order placed 🎉', { duration: 4000 })
                  clearCart()
                  navigate(`/${cafeId}/menu/orders?track=${confirmedOrderNum}`)
                } else {
                  toast.error('Payment verification failed.')
                }
              } catch (err) {
                toast.error(err.response?.data?.message || 'Payment verification failed.')
              }
            },
            prefill: {
              name: payload.customer_name,
              contact: payload.customer_phone
            },
            theme: {
              color: '#ea580c'
            },
            modal: {
              ondismiss: function () {
                toast('Payment window closed. Your items are still in cart.', { icon: '🛒' })
              }
            }
          }
          
          if (window.Razorpay) {
            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', function (response) {
              toast.error(response.error?.description || 'Payment failed. Please try again.')
            })
            rzp.open()
          } else {
            toast.error('Razorpay gateway failed to load. Please try Pay at Counter.')
          }
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to initiate online payment')
      } finally {
        setLoading(false)
      }
      return
    }

    // Path 2: Pay at Counter / Direct Order
    setLoading(true)
    try {
      const directPayload = {
        ...payload,
        payment_method: 'cash'
      }
      const res = await customerAPI.placeOrder(directPayload)
      if (res.data?.success) {
        const orderData = res.data.data
        recordOrderLocally(orderData.order_number, orderData.token_number)
        toast.success(`🎉 Order placed! Token ${orderData.token_number || orderData.order_number}`, { duration: 4000 })
        clearCart()
        navigate(`/${cafeId}/menu/orders?track=${orderData.order_number}`)
      } else {
        toast.error(res.data?.message || 'Failed to place order.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order. Please check with staff.')
    } finally {
      setLoading(false)
    }
  }

  const tableVal = typeof form.table_number === 'function' ? form.table_number() : form.table_number
  const notesVal = typeof form.notes === 'function' ? form.notes() : form.notes
  const nameVal = typeof form.customer_name === 'function' ? form.customer_name() : form.customer_name
  const phoneVal = typeof form.customer_phone === 'function' ? form.customer_phone() : form.customer_phone

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.35s ease', paddingBottom: 130, maxWidth: 500, margin: '0 auto' }}>
      
      {/* ── Top Header Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back to cart"
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-medium)', 
            color: 'var(--text-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            boxShadow: 'var(--shadow-card)',
            transition: 'all 0.15s ease' 
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
            Checkout
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Verify dining details & choose payment
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* ── Dining Details Card ── */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-medium)', 
          borderRadius: 20, 
          padding: 18, 
          boxShadow: 'var(--shadow-card)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📍</span>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
              Dining Details
            </h2>
          </div>

          <InputField 
            label="Table Number / Dine-in Spot" 
            placeholder="e.g. Table 4 or Takeaway" 
            value={tableVal} 
            onChange={e => {
              setForm({ ...form, table_number: e.target.value })
              localStorage.setItem('customer_table', e.target.value)
            }} 
          />

          <InputField 
            label="Your Name" 
            placeholder="e.g. Rahul Sharma" 
            optional
            value={nameVal} 
            onChange={e => setForm({ ...form, customer_name: e.target.value })} 
          />

          <InputField 
            label="Mobile Number" 
            placeholder="For order SMS & updates" 
            optional
            type="tel"
            value={phoneVal} 
            onChange={e => setForm({ ...form, customer_phone: e.target.value })} 
          />

          <InputField 
            label="Special Cooking Instructions" 
            as="textarea" 
            optional
            placeholder="e.g. Less spicy, extra napkins, serve cutlery..." 
            value={notesVal} 
            onChange={e => {
              setForm({ ...form, notes: e.target.value })
              localStorage.setItem('order_notes', e.target.value)
            }} 
          />
        </div>

        {/* ── Payment Method Selector ── */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-medium)', 
          borderRadius: 20, 
          padding: 18, 
          boxShadow: 'var(--shadow-card)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
              Payment Method
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Option A: Pay Online (Razorpay) */}
            {cafe?.razorpay_key_id ? (
              <div
                onClick={() => setSelectedMethod('online')}
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: selectedMethod === 'online' ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                  background: selectedMethod === 'online' ? 'var(--accent-bg-subtle)' : 'var(--bg-card)',
                  boxShadow: selectedMethod === 'online' ? 'var(--shadow-card)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    width: 42, 
                    height: 42, 
                    borderRadius: 12, 
                    background: selectedMethod === 'online' ? 'var(--accent-primary)' : 'var(--border-light)', 
                    color: selectedMethod === 'online' ? '#ffffff' : 'var(--text-primary)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}>
                    <CreditCard size={20} />
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: selectedMethod === 'online' ? 'var(--accent-primary)' : 'var(--text-primary)', margin: 0 }}>
                        Pay Online (UPI / Cards / Netbanking)
                      </p>
                      <span style={{ fontSize: 9, fontWeight: 800, background: '#10b981', color: '#ffffff', padding: '2px 6px', borderRadius: 6 }}>
                        Recommended
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      Instant confirmation via GPay, PhonePe, Paytm, or Card
                    </p>
                  </div>
                </div>

                <div style={{ 
                  width: 22, 
                  height: 22, 
                  borderRadius: '50%', 
                  border: selectedMethod === 'online' ? '6px solid var(--accent-primary)' : '2px solid var(--border-hover)',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }} />
              </div>
            ) : null}

            {/* Option B: Pay at Counter / Direct Order */}
            <div
              onClick={() => setSelectedMethod('cash')}
              style={{
                padding: '14px',
                borderRadius: 14,
                cursor: 'pointer',
                border: selectedMethod === 'cash' ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                background: selectedMethod === 'cash' ? 'var(--accent-bg-subtle)' : 'var(--bg-card)',
                boxShadow: selectedMethod === 'cash' ? 'var(--shadow-card)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 42, 
                  height: 42, 
                  borderRadius: 12, 
                  background: selectedMethod === 'cash' ? 'var(--accent-primary)' : 'var(--border-light)', 
                  color: selectedMethod === 'cash' ? '#ffffff' : 'var(--text-primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Banknote size={20} />
                </div>
                
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: selectedMethod === 'cash' ? 'var(--accent-primary)' : 'var(--text-primary)', margin: 0 }}>
                    Pay at Counter / Direct Order
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Send order directly to kitchen & pay cash or scan UPI at the counter
                  </p>
                </div>
              </div>

              <div style={{ 
                width: 22, 
                height: 22, 
                borderRadius: '50%', 
                border: selectedMethod === 'cash' ? '6px solid var(--accent-primary)' : '2px solid var(--border-hover)',
                background: '#ffffff',
                boxSizing: 'border-box'
              }} />
            </div>
          </div>
        </div>

        {/* ── Order Summary Breakdown ── */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-medium)', 
          borderRadius: 20, 
          padding: 18, 
          boxShadow: 'var(--shadow-card)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Receipt size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
              Order Review
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {items.map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Taxes & Fees {taxPercentage > 0 ? `(${taxPercentage}%)` : ''}</span>
            <span style={{ color: taxAmount > 0 ? 'var(--text-primary)' : '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : 'Included'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Total Payable</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)', fontFamily: "'Outfit', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

      </div>

      {/* ── Fixed Bottom Checkout Dock ── */}
      <div style={{
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 100,
        background: 'var(--nav-bg)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-medium)', 
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        padding: '12px 16px 18px', 
        display: 'flex', 
        justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          
          {/* Price Preview */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
              Total Payable
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Action Button */}
          <button
            onClick={handleProceed}
            disabled={loading}
            style={{
              flex: 1, 
              height: 50, 
              borderRadius: 16, 
              border: 'none',
              background: 'var(--accent-gradient)',
              color: '#ffffff', 
              fontSize: 15, 
              fontWeight: 800, 
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.16), var(--accent-shadow)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
              opacity: loading ? 0.75 : 1
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
          >
            {loading ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                <span>Placing Order...</span>
              </>
            ) : selectedMethod === 'online' ? (
              <>
                <span>Pay Online</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Place Order</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default Checkout
