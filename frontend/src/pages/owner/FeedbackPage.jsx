import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const FeedbackPage = () => {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchFeedback() }, [])

  const fetchFeedback = async () => {
    try {
      const res = await ownerAPI.getFeedback()
      setFeedback(res.data.data)
    } catch (error) {
      toast.error('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < rating ? '#f59e0b' : 'none'} stroke={i < rating ? '#f59e0b' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s' }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Customer Feedback</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Reviews and ratings from your customers.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
              {feedback.length > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : '0.0'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Average Rating</p>
          </div>
        </div>
      </div>

      {/* ── Feedback Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 160, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-light)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : feedback.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {feedback.map((fb, i) => (
            <div
              key={fb._id}
              style={{
                padding: '24px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, background 0.2s',
                animation: `slideUp 0.3s ease ${i * 0.05}s both`
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(79,70,229,0.1))', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#06b6d4', flexShrink: 0 }}>
                    {(fb.customer_name || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 2px', color: 'var(--text-primary)' }}>{fb.customer_name || 'Guest'}</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Order {fb.order_id?.order_number || 'N/A'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>{renderStars(fb.rating)}</div>
              </div>
              
              {fb.review ? (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5, flex: 1, fontStyle: 'italic' }}>"{fb.review}"</p>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 16px', flex: 1, fontStyle: 'italic' }}>No written review provided.</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-medium)', paddingTop: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(fb.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 20, border: '1px dashed var(--border-medium)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>No feedback yet</p>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Customer reviews will appear here.</p>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default FeedbackPage
