import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  Coffee, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, 
  AlertCircle, CheckCircle2, Monitor, Smartphone, Tablet, 
  LogOut, KeyRound, Loader2, ShieldAlert
} from 'lucide-react'

const OwnerLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [activeSessions, setActiveSessions] = useState([])
  const [deviceLimit, setDeviceLimit] = useState(1)
  const [selectedSessions, setSelectedSessions] = useState([])
  const [requireOtp, setRequireOtp] = useState(false)
  const [otp, setOtp] = useState('')

  const toggleSession = (id) => {
    if (selectedSessions.includes(id)) {
      setSelectedSessions(selectedSessions.filter(sId => sId !== id))
    } else {
      setSelectedSessions([...selectedSessions, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedSessions.length === activeSessions.length) {
      setSelectedSessions([])
    } else {
      setSelectedSessions(activeSessions.map(s => s._id).filter(Boolean))
    }
  }

  const { login, verifyLoginOtp } = useAuth()
  const navigate = useNavigate()

  const handleForceLogout = async () => {
    setLoading(true)
    try {
      const res = await login(email, password, true, selectedSessions)
      if (res?.requireOtp) {
        setRequireOtp(true)
        setLimitReached(false)
        toast.success('Verification code sent to your registered email!', { duration: 5000 })
        return
      }
      toast.success(`Welcome back, ${res.name}!`)
      navigate('/owner')
    } catch (error) {
      if (error.response?.data?.errorType === 'DEVICE_LIMIT_REACHED') {
        toast.error(error.response.data.message || 'Please select more devices to log out.')
        setActiveSessions(error.response?.data?.sessions || [])
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) { 
      toast.error('Please enter the 6-digit OTP')
      return 
    }
    setLoading(true)
    try {
      const user = await verifyLoginOtp(email, otp, true, selectedSessions)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/owner')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { 
      toast.error('Please fill in all fields')
      return 
    }
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role !== 'owner') {
        toast.error('Access denied. This portal is for Café Owners only.')
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
        if (error.response?.data?.limit) setDeviceLimit(error.response.data.limit)
      } else {
        toast.error(error.response?.data?.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const getDeviceIcon = (info = '') => {
    const lower = info.toLowerCase()
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone size={18} />
    }
    if (lower.includes('ipad') || lower.includes('tablet')) {
      return <Tablet size={18} />
    }
    return <Monitor size={18} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-shell, #090d16)', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Left Branding Panel (Desktop Only) ── */}
      <div 
        className="owner-left-panel"
        style={{ 
          display: 'none', 
          flex: 1, 
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)', 
          padding: '48px 56px', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }} 
      >
        {/* Ambient Glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        {/* Top Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)', color: '#ffffff' }}>
            <Coffee size={22} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary, #ffffff)', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
            WhatTheMenu <span style={{ color: '#06b6d4' }}>Café</span>
          </span>
        </div>

        {/* Middle Feature Highlights */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', marginBottom: 24 }}>
            <Coffee size={28} />
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary, #ffffff)', margin: '0 0 16px', fontFamily: "'Outfit', sans-serif", lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Smart Restaurant<br />& QR Management
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.7, maxWidth: 440, margin: '0 0 36px' }}>
            Manage your digital menu in real-time, streamline kitchen orders, accept direct UPI payments, and delight your guests effortlessly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Real-time Kitchen Order System (KDS) & audio alerts',
              'Instant menu editing, category reordering & 86 items',
              'Table QR standee generator & instant downloads',
              'Direct 0% commission UPI & Razorpay payments'
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text-secondary, #cbd5e1)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={14} />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <p style={{ fontSize: 12, color: 'var(--text-tertiary, #64748b)', margin: 0, position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} WhatTheMenu SaaS. Designed for modern hospitality.
        </p>
      </div>

      {/* ── Right Form Container ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative' }}>
        
        {/* Ambient Center Glow */}
        <div style={{ position: 'fixed', top: '40%', left: '60%', transform: 'translate(-50%, -50%)', width: 450, height: 450, background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          
          {/* Back to Home Link */}
          <Link 
            to="/" 
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
            <span>Back to Home</span>
          </Link>

          {/* Form Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)', color: '#ffffff' }}>
                <Coffee size={22} />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#06b6d4', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block' }}>
                  Café Owner Portal
                </span>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary, #ffffff)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                  Sign in to your Café
                </h1>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
              Access your digital menu, active orders, and restaurant controls.
            </p>
          </div>

          {/* ── State 1: OTP Challenge Modal / Card ── */}
          {requireOtp ? (
            <div style={{ background: 'var(--bg-card, #131b2e)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: '#06b6d4' }}>
                <KeyRound size={26} />
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary, #ffffff)' }}>
                  Enter Verification Code
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                A 6-digit confirmation code was dispatched to <strong>{email}</strong> to authorize device logout.
              </p>

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    6-Digit Security OTP
                  </label>
                  <input 
                    type="text" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •" 
                    required
                    style={{ 
                      width: '100%', 
                      padding: '14px', 
                      borderRadius: 14, 
                      border: '1.5px solid rgba(255, 255, 255, 0.12)', 
                      background: 'var(--bg-input, #0b1120)', 
                      color: 'var(--text-primary, #ffffff)', 
                      fontSize: 22, 
                      outline: 'none', 
                      boxSizing: 'border-box', 
                      letterSpacing: '8px', 
                      textAlign: 'center',
                      fontFamily: "'Outfit', monospace"
                    }}
                    onFocus={e => e.target.style.borderColor = '#06b6d4'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'} 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || otp.length !== 6}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: 14, 
                    border: 'none', 
                    cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer', 
                    fontSize: 15, 
                    fontWeight: 800, 
                    color: '#ffffff', 
                    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', 
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)', 
                    opacity: (loading || otp.length !== 6) ? 0.65 : 1, 
                    transition: 'all 0.2s', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8 
                  }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <button 
                    type="button" 
                    onClick={() => setRequireOtp(false)} 
                    disabled={loading} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary, #64748b)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleForceLogout} 
                    disabled={loading} 
                    style={{ background: 'transparent', border: 'none', color: '#06b6d4', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>
              </form>
            </div>

          /* ── State 2: Device Limit Screen ── */
          ) : limitReached ? (
            <div style={{ background: 'var(--bg-card, #131b2e)', border: '1px solid rgba(248, 113, 113, 0.25)', borderRadius: 24, padding: 28, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, color: '#f87171' }}>
                <ShieldAlert size={26} />
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#ffffff' }}>
                  Device Limit Reached
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                Your current plan permits up to <strong>{deviceLimit}</strong> simultaneous session(s). Select at least <strong>{Math.max(1, activeSessions.length - deviceLimit + 1)}</strong> session(s) to log out and proceed.
              </p>
              
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Logged-in Devices ({activeSessions.length})</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    {selectedSessions.length === activeSessions.length && activeSessions.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {activeSessions.map((session, i) => {
                    const isSelected = selectedSessions.includes(session._id)
                    return (
                      <div 
                        key={session._id || i} 
                        onClick={() => toggleSession(session._id)} 
                        style={{ 
                          padding: '12px 16px', 
                          borderBottom: i === activeSessions.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.06)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12, 
                          background: isSelected ? 'rgba(248, 113, 113, 0.08)' : 'transparent', 
                          cursor: 'pointer', 
                          transition: 'all 0.15s ease' 
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${isSelected ? '#f87171' : 'rgba(255, 255, 255, 0.25)'}`, background: isSelected ? '#f87171' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ffffff' }}>
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#f87171' : 'var(--text-tertiary, #94a3b8)', flexShrink: 0 }}>
                          {getDeviceIcon(session.device_info)}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-primary, #ffffff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session.device_info || 'Active Session'}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>
                            Last seen: {new Date(session.last_active).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <button
                onClick={handleForceLogout}
                disabled={loading || selectedSessions.length < Math.min(activeSessions.length, Math.max(1, activeSessions.length - deviceLimit + 1))}
                style={{
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: 14, 
                  border: 'none',
                  background: (selectedSessions.length >= Math.min(activeSessions.length, Math.max(1, activeSessions.length - deviceLimit + 1))) ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: 14, 
                  fontWeight: 800,
                  cursor: (loading || selectedSessions.length < Math.min(activeSessions.length, Math.max(1, activeSessions.length - deviceLimit + 1))) ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, 
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                <span>Log Out Selected ({selectedSessions.length}) & Continue</span>
              </button>

              <button 
                type="button" 
                onClick={() => { setLimitReached(false); setSelectedSessions([]) }} 
                disabled={loading} 
                style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: 'var(--text-tertiary, #94a3b8)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}
              >
                Cancel
              </button>
            </div>

          /* ── State 3: Standard Login Form ── */
          ) : (
            <div style={{ background: 'var(--bg-card, #131b2e)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-card)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                
                {/* Email Field */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Email Address
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

                {/* Password Field */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>
                      Password
                    </label>
                    <Link to="/forgot-password" style={{ color: '#06b6d4', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      Forgot Password?
                    </Link>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary, #64748b)', pointerEvents: 'none' }} />
                    <input 
                      type={showPass ? 'text' : 'password'} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      autoComplete="current-password" 
                      required
                      style={{ 
                        width: '100%', 
                        padding: '12px 42px 12px 42px', 
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
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #94a3b8)', padding: 4, display: 'flex', alignItems: 'center' }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit CTA */}
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    height: 48, 
                    borderRadius: 12, 
                    border: 'none', 
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    fontSize: 15, 
                    fontWeight: 800, 
                    color: '#ffffff', 
                    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', 
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)', 
                    opacity: loading ? 0.75 : 1, 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Credentials Strip */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary, #64748b)', margin: '0 0 10px' }}>
                  Quick testing with demo credentials
                </p>
                <button 
                  onClick={() => { setEmail('cafe@demo.com'); setPassword('cafe123') }}
                  style={{ 
                    padding: '8px 18px', 
                    borderRadius: 10, 
                    border: '1px solid rgba(6, 182, 212, 0.25)', 
                    background: 'rgba(6, 182, 212, 0.08)', 
                    color: '#06b6d4', 
                    fontSize: 12, 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)'}
                >
                  Fill Demo Café Credentials →
                </button>
              </div>
            </div>
          )}

          {/* Registration Link */}
          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary, #94a3b8)', margin: 0 }}>
              New restaurant owner?{' '}
              <Link to="/owner/register" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 700 }}>
                Register your café free →
              </Link>
            </p>
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

export default OwnerLogin
