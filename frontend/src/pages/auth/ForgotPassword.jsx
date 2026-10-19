import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { KeyRound, Mail, ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-shell, #090d16)', color: 'var(--text-primary, #ffffff)', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Left Branding Panel ── */}
      <div 
        className="owner-left-panel" 
        style={{
          flex: 1, 
          display: 'none', 
          flexDirection: 'column', 
          padding: '60px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)', 
          position: 'relative', 
          overflow: 'hidden',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        
        <Link 
          to="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            color: 'var(--text-secondary, #94a3b8)', 
            textDecoration: 'none', 
            fontSize: 14, 
            fontWeight: 600, 
            zIndex: 1,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div style={{ zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(79, 70, 229, 0.35)', color: '#ffffff' }}>
              <KeyRound size={28} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#06b6d4', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                Security & Access
              </span>
              <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.5px' }}>
                Account Recovery
              </h1>
            </div>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.7, maxWidth: 440, margin: 0 }}>
            Enter your registered café owner email to receive a secure password reset link. You will be back in your dashboard in moments.
          </p>
        </div>

        <div style={{ zIndex: 1, fontSize: 12, color: 'var(--text-tertiary, #64748b)' }}>
          © {new Date().getFullYear()} WhatTheMenu SaaS. Protected by industry-standard encryption.
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative' }}>
        
        <div style={{ position: 'fixed', top: '40%', left: '60%', transform: 'translate(-50%, -50%)', width: 450, height: 450, background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          
          <Link 
            to="/owner/login" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              fontSize: 13, 
              fontWeight: 600,
              color: 'var(--text-tertiary, #94a3b8)', 
              textDecoration: 'none', 
              marginBottom: 28, 
              transition: 'color 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary, #94a3b8)'}
          >
            <ArrowLeft size={16} />
            <span>Back to Owner Login</span>
          </Link>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 6px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.5px', color: 'var(--text-primary, #ffffff)' }}>
              Forgot Password?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
              No worries, we will send you instructions to reset your password.
            </p>
          </div>

          <div style={{ background: 'var(--bg-card, #131b2e)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-card)' }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, color: 'var(--text-primary, #ffffff)', fontFamily: "'Outfit', sans-serif" }}>
                  Check Your Inbox
                </h3>
                <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  We've sent a password reset link to <strong style={{ color: '#ffffff' }}>{email}</strong>. Please check your inbox or spam folder.
                </p>
                <Link 
                  to="/owner/login" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '13px', 
                    background: 'var(--accent-gradient, linear-gradient(135deg, #4f46e5, #06b6d4))', 
                    borderRadius: 12, 
                    color: '#ffffff', 
                    textDecoration: 'none', 
                    fontWeight: 700, 
                    fontSize: 14,
                    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)'
                  }}
                >
                  <span>Return to Sign In</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Registered Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary, #64748b)', pointerEvents: 'none' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="owner@mycafe.com"
                      autoComplete="email"
                      required
                      style={{ 
                        width: '100%', 
                        padding: '12px 14px 12px 42px', 
                        borderRadius: 12, 
                        border: '1px solid rgba(255, 255, 255, 0.12)', 
                        background: 'var(--bg-input, #0b1120)', 
                        color: 'var(--text-primary, #ffffff)', 
                        fontSize: 14, 
                        outline: 'none', 
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                        fontFamily: 'inherit'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
                    opacity: loading ? 0.75 : 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 6
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (min-width: 900px) { .owner-left-panel { display: flex !important; } }
      `}</style>
    </div>
  )
}
