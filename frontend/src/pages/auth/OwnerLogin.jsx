import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const OwnerLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [activeSessions, setActiveSessions] = useState([])
    const [deviceLimit, setDeviceLimit] = useState(1)
    const [selectedSessions, setSelectedSessions] = useState([])

    const toggleSession = (id) => {
      if (selectedSessions.includes(id)) {
        setSelectedSessions(selectedSessions.filter(sId => sId !== id))
      } else {
        setSelectedSessions([...selectedSessions, id])
      }
    }
  const { login } = useAuth()
  const navigate = useNavigate()

  
    const handleForceLogout = async () => {
        setLoading(true)
        try {
          const user = await login(email, password, true, selectedSessions)
          toast.success(`Welcome back, ${user.name}!`)
          navigate('/owner')
        } catch (error) {
          if (error.response?.data?.errorType === 'DEVICE_LIMIT_REACHED') {
            toast.error(error.response.data.message || 'Please select more devices to log out.')
            setActiveSessions(error.response?.data?.sessions || [])
          } else {
            toast.error(error.response?.data?.message || 'Login failed')
          }
        } finally {
        setLoading(false)
      }
    }
  
  const handleSubmit = async (e) => {
      e.preventDefault()
      if (!email || !password) { toast.error('Please fill in all fields'); return }
      setLoading(true)
      try {
        const user = await login(email, password)
        if (user.role !== 'owner') {
          toast.error('Access denied. This portal is for CafAc Owners only.')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          return
        }
        toast.success(`Welcome back, ${user.name}!`)
        navigate('/owner')
      } catch (error) {
        if (error.response?.data?.errorType === 'DEVICE_LIMIT_REACHED') {
          setLimitReached(true)
          setActiveSessions(error.response?.data?.sessions || [])
        } else {
          toast.error(error.response?.data?.message || 'Login failed')
        }
      } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-shell)', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      {/* Left panel */}
      <div style={{ display: 'none', flex: 1, background: 'var(--bg-panel-gradient)', padding: 48, flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid rgba(79,70,229,0.15)' }} className="owner-left-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>QRMenu <span style={{ color: '#67e8f9' }}>Café</span></span>
        </div>
        <div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>☕</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px', fontFamily: "'Outfit',sans-serif", lineHeight: 1.2 }}>Café Owner<br/>Dashboard</h2>
          <p style={{ fontSize: 15, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>Manage your digital menu, track orders in real-time, and delight your customers every day.</p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Manage menu items & categories', 'Receive live order notifications', 'Generate & share your QR code', 'View customer feedback & ratings'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(79,70,229,0.2)', color: '#67e8f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--border-hover)' }}>© {new Date().getFullYear()} QRMenu SaaS Platform</p>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 400, background: 'radial-gradient(ellipse, rgba(79,70,229,0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Back */}
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none', marginBottom: 32, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color='#67e8f9'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-tertiary)'}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"/></svg>
            Back to Home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79,70,229,0.4)', fontSize: 22 }}>
                ☕
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Café Owner</p>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit',sans-serif" }}>Owner Portal</h1>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Sign in to manage your café menu and orders.</p>
          </div>

                      {/* Form Card */}
            {limitReached ? (
              <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: '#f87171' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Device Limit Reached</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                  Your plan allows <strong>{deviceLimit}</strong> active device(s). Please select at least <strong>{Math.max(1, activeSessions.length - deviceLimit + 1)}</strong> device(s) to log out.
                </p>
                
                <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg-shell)', padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Currently Logged In ({activeSessions.length})</span>
                    <span>Selected: {selectedSessions.length}</span>
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {activeSessions.map((session, i) => {
                      const isSelected = selectedSessions.includes(session._id);
                      return (
                        <div key={session._id || i} onClick={() => toggleSession(session._id)} style={{ padding: '16px 20px', borderBottom: i === activeSessions.length - 1 ? 'none' : '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 16, background: isSelected ? 'rgba(248, 113, 113, 0.05)' : 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? '#f87171' : 'var(--border-medium)'}`, background: isSelected ? '#f87171' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-shell)', border: `1px solid ${isSelected ? 'rgba(248,113,113,0.3)' : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#f87171' : 'var(--text-tertiary)', flexShrink: 0 }}>
                             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.device_info || 'Unknown Device'}</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Last active: {new Date(session.last_active).toLocaleString()}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <button onClick={handleForceLogout} disabled={loading || selectedSessions.length < Math.max(1, activeSessions.length - deviceLimit + 1)} style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: (selectedSessions.length >= Math.max(1, activeSessions.length - deviceLimit + 1)) ? 'linear-gradient(135deg,#f87171,#ef4444)' : 'var(--bg-shell)', color: (selectedSessions.length >= Math.max(1, activeSessions.length - deviceLimit + 1)) ? '#fff' : 'var(--text-tertiary)', fontSize: 15, fontWeight: 700, cursor: (loading || selectedSessions.length < Math.max(1, activeSessions.length - deviceLimit + 1)) ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', boxShadow: (selectedSessions.length >= Math.max(1, activeSessions.length - deviceLimit + 1)) ? '0 4px 20px rgba(239, 68, 68, 0.4)' : 'none' }}>
                  {loading ? 'Logging out...' : `Log Out Selected (${selectedSessions.length}) & Continue`}
                </button>
                <button type="button" onClick={() => { setLimitReached(false); setSelectedSessions([]); }} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 12, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-shell)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>📧</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="owner@mycafe.com" autoComplete="email" required
                    style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor='rgba(79,70,229,0.6)'}
                    onBlur={e => e.target.style.borderColor='var(--border-hover)'} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔒</span>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" required
                    style={{ width: '100%', padding: '12px 44px 12px 42px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor='rgba(79,70,229,0.6)'}
                    onBlur={e => e.target.style.borderColor='var(--border-hover)'} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, padding: 0 }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Link to="/forgot-password" style={{ color: '#06b6d4', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', boxShadow: '0 8px 24px rgba(79,70,229,0.4)', opacity: loading ? 0.7 : 1, transition: 'transform 0.2s', marginTop: 4 }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Signing in...
                  </span>
                ) : 'Sign In to Owner Dashboard'}
              </button>
            </form>

            {/* Demo fill */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>Quick fill demo credentials</p>
              <button onClick={() => { setEmail('cafe@demo.com'); setPassword('cafe123') }}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(79,70,229,0.25)', background: 'rgba(79,70,229,0.08)', color: '#67e8f9', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Use Demo Café →
              </button>
            </div>
          </div>
            )}

          {/* Register & Admin links */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
              New to QRMenu?{' '}
              <Link to="/owner/register" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}>Register your café →</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .owner-left-panel { display: flex !important; } }
        input::placeholder { color: #4b5563; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

export default OwnerLogin
