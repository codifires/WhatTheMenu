import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const INPUT = {
  width: '100%', padding: '14px 16px', borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'all 0.3s',
}

function InputField({ label, as, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, paddingLeft: 4 }}>{label}</label>
      {as === 'select' ? (
        <select style={INPUT} onFocus={e => {e.target.style.borderColor = 'rgba(245,158,11,0.6)'; e.target.style.background = 'rgba(245,158,11,0.05)'}} onBlur={e => {e.target.style.borderColor = 'var(--border-hover)'; e.target.style.background = 'var(--bg-input)'}} {...props}>
          {children}
        </select>
      ) : as === 'textarea' ? (
        <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 80 }} onFocus={e => {e.target.style.borderColor = 'rgba(245,158,11,0.6)'; e.target.style.background = 'rgba(245,158,11,0.05)'}} onBlur={e => {e.target.style.borderColor = 'var(--border-hover)'; e.target.style.background = 'var(--bg-input)'}} {...props} />
      ) : (
        <input style={INPUT} onFocus={e => {e.target.style.borderColor = 'rgba(245,158,11,0.6)'; e.target.style.background = 'rgba(245,158,11,0.05)'}} onBlur={e => {e.target.style.borderColor = 'var(--border-hover)'; e.target.style.background = 'var(--bg-input)'}} {...props} />
      )}
    </div>
  )
}

const CustomerFeedback = () => {
  const { cafeId } = useParams()
  const [orderId, setOrderId] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const myOrders = JSON.parse(localStorage.getItem('myOrders') || '[]').filter(o => o.cafeId === cafeId)

  const handleSubmit = async () => {
    if (!orderId) return toast.error('Please select or enter an order')
    if (rating === 0) return toast.error('Please select a rating')

    setLoading(true)
    try {
      await customerAPI.submitFeedback({
        order_number: orderId,
        rating,
        review
      })
      
      // Cleanup: Completely erase the order from localStorage now that feedback is given
      const saved = JSON.parse(localStorage.getItem('myOrders') || '[]')
      const updated = saved.filter(o => o.orderNumber !== orderId)
      localStorage.setItem('myOrders', JSON.stringify(updated))
      
      setSubmitted(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Outfit',sans-serif" }}>Thank You!</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 32px' }}>Your feedback helps us improve and serve you better.</p>
        <button
          onClick={() => { setSubmitted(false); setRating(0); setReview(''); setOrderId('') }}
          style={{ padding: '14px 28px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--border-hover)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--border-light)'}
        >
          Submit Another Review
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.4s ease', paddingBottom: 100 }}>
      
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Leave Feedback</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>How was your experience today?</p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, padding: 24 }}>
        
        <InputField label="Select Order" as={myOrders.length > 0 ? 'select' : 'input'} placeholder="Enter Order ID" value={orderId} onChange={e => setOrderId(e.target.value)}>
          {myOrders.length > 0 && (
            <>
              <option value="" style={{ color: '#000' }}>Select an order</option>
              {myOrders.map((o, i) => <option key={i} value={o.orderNumber} style={{ color: '#000' }}>{o.orderNumber}</option>)}
            </>
          )}
        </InputField>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 12, paddingLeft: 4 }}>Rating</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', background: 'var(--bg-card)', padding: 16, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
            {[1, 2, 3, 4, 5].map(star => {
              const active = star <= (hoverRating || rating)
              return (
                <div
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{ cursor: 'pointer', padding: 4, transition: 'transform 0.2s', transform: active ? 'scale(1.1)' : 'scale(1)' }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill={active ? 'var(--accent-primary)' : 'none'} stroke={active ? 'var(--accent-primary)' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s', filter: active ? 'drop-shadow(0 0 10px var(--accent-primary))' : 'none' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
              )
            })}
          </div>
        </div>

        <InputField label="Review (optional)" as="textarea" placeholder="Tell us about the food, service, or ambiance..." value={review} onChange={e => setReview(e.target.value)} />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: 'var(--accent-gradient)', color: 'var(--accent-text)', fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: 'var(--accent-shadow)', transition: 'transform 0.2s', opacity: loading ? 0.7 : 1, marginTop: 8 }}
          onMouseEnter={e => { if(!loading) e.currentTarget.style.transform='translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}

export default CustomerFeedback
