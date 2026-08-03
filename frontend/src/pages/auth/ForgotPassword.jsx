import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setSuccess(true)
      toast.success('Password reset link sent to your email!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const focus = e => e.target.style.borderColor = 'rgba(79,70,229,0.6)'
  const blur = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080c14', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* ── LEFT PANEL (Branding) ── */}
      <div className="owner-left-panel" style={{
        flex: 1, display: 'none', flexDirection: 'column', padding: '60px',
        background: 'linear-gradient(135deg, #0f172a 0%, #080c14 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 'auto', zIndex: 1 }}>
          ← Back to Home
        </Link>

        <div style={{ zIndex: 1, marginTop: 'auto', marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(139,92,246,0.3)' }}>
              <span style={{ fontSize: 32 }}>☕</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 4 }}>Café Owner</div>
              <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-1px' }}>Account Recovery</h1>
            </div>
          </div>
          <p style={{ fontSize: 18, color: '#9ca3af', lineHeight: 1.6, maxWidth: 440 }}>
            Don't worry, it happens to the best of us! Enter your registered email to receive a password reset link.
          </p>
        </div>

        <div style={{ marginTop: 'auto', zIndex: 1, fontSize: 13, color: '#6b7280' }}>
          © {new Date().getFullYear()} QRMenu SaaS. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Forgot Password?</h2>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 32 }}>
            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Check Your Email</h3>
                <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                  We've sent a password reset link to <strong style={{ color: '#fff' }}>{email}</strong>.
                </p>
                <Link to="/owner/login" style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 600, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  Return to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: 8 }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 14, top: 12, color: '#6b7280' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 4 10 8 10-8"/></svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="owner@mycafe.com"
                      style={inputStyle}
                      onFocus={focus} onBlur={blur}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1, transition: 'transform 0.2s',
                    boxShadow: '0 4px 14px rgba(6,182,212,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>
              Remember your password?{' '}
              <Link to="/owner/login" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .owner-left-panel { display: flex !important; } }
        input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  )
}
