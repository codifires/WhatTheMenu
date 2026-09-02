import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ThemeToggle from '../../components/ThemeToggle';
import { Utensils, Lock, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function SetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { login } = useAuth() // Or we just redirect them to /owner/login after

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      return setError('Passwords do not match')
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters')
    }

    setLoading(true)
    try {
      const res = await api.post(`/auth/set-password/${token}`, { password })
      // The API returns the token and user data, logging them in!
      localStorage.setItem('token', res.data.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.data.user))
      
      setSuccess(true)
      setTimeout(() => {
        // Hard reload to initialize auth context properly
        window.location.href = '/owner'
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired link. Please contact the administrator.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'var(--border-light)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }
  const focus = e => e.target.style.borderColor = 'rgba(79,70,229,0.6)'
  const blur  = e => e.target.style.borderColor = 'var(--border-hover)'
  const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }
  const iconStyle  = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-shell)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Effects */}
      <div style={{ position: 'fixed', top: '10%', left: '20%', transform: 'translate(-50%,-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '10%', transform: 'translate(50%,50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(79,70,229,0.4)' }}>
            <span style={{ fontSize: 32 }}>☕</span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Outfit',sans-serif" }}>
            Welcome to QRMenu
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Set a secure password to access your Owner Dashboard
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, backdropFilter: 'blur(10px)' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(52,211,153,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span style={{ fontSize: 32 }}>✅</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Password Set Successfully!</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Logging you into your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--danger-text)', margin: 0 }}>{error}</p>
                </div>
              )}

              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>🔒</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={focus} onBlur={blur}
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>🔑</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={focus} onBlur={blur}
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700,
                  color: 'var(--text-primary)', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                  opacity: loading ? 0.7 : 1, boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
                  marginTop: 8, transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {loading ? 'Saving...' : 'Save & Login →'}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  )
}
