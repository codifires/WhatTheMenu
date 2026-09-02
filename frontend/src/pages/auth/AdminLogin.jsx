import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role !== 'superadmin') {
        toast.error('Access denied. This portal is for Super Admins only.')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        return
      }
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/admin')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-shell)', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      {/* Left panel */}
      <div style={{ display: 'none', flex: 1, background: 'var(--bg-admin-gradient)', padding: 48, flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid rgba(124,58,237,0.15)' }} className="admin-left-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>QRMenu <span style={{ color: '#a78bfa' }}>Admin</span></span>
        </div>
        <div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>🛡️</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px', fontFamily: "'Outfit',sans-serif", lineHeight: 1.2 }}>Super Admin<br/>Control Panel</h2>
          <p style={{ fontSize: 15, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>Manage all cafés, subscriptions, and platform settings from one powerful admin interface.</p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Manage all registered cafés', 'Control subscription plans', 'View platform analytics', 'Handle café onboarding'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--border-hover)' }}>© {new Date().getFullYear()} QRMenu SaaS Platform</p>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* Glow */}
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 400, background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Back to home */}
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none', marginBottom: 32, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color='#a78bfa'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-tertiary)'}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"/></svg>
            Back to Home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Super Admin</p>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit',sans-serif" }}>Admin Portal</h1>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Sign in to manage the platform. Restricted access only.</p>
          </div>

          {/* Form Card */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Admin Email</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>📧</span>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@qrmenu.com" autoComplete="email" required
                    style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor='rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor='var(--border-hover)'}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" required
                    style={{ width: '100%', padding: '12px 44px 12px 42px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor='rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor='var(--border-hover)'}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, padding: 0 }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)', opacity: loading ? 0.7 : 1, transition: 'transform 0.2s, box-shadow 0.2s', marginTop: 4 }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(124,58,237,0.5)' }}}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(124,58,237,0.4)' }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Signing in...
                  </span>
                ) : 'Sign In to Admin Panel'}
              </button>
            </form>

            {/* End of Form Card */}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .admin-left-panel { display: flex !important; } }
        input::placeholder { color: #4b5563; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

export default AdminLogin
