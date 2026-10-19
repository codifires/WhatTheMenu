import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { 
      toast.error('Please fill in all fields')
      return 
    }
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-shell, #090d16)', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Left Super Admin Branding Panel ── */}
      <div 
        className="admin-left-panel"
        style={{ 
          display: 'none', 
          flex: 1, 
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(15, 23, 42, 0.98) 100%)', 
          padding: '48px 56px', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          borderRight: '1px solid rgba(124, 58, 237, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        {/* Top Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)', color: '#ffffff' }}>
            <ShieldCheck size={22} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary, #ffffff)', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
            WhatTheMenu <span style={{ color: '#a78bfa' }}>Admin</span>
          </span>
        </div>

        {/* Center Overview */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', marginBottom: 24 }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary, #ffffff)', margin: '0 0 16px', fontFamily: "'Outfit', sans-serif", lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Platform Operations<br />& Super Admin
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.7, maxWidth: 440, margin: '0 0 36px' }}>
            Manage platform tenants, monitor recurring subscription billing, inspect system telemetry, and govern cafe lifecycle.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Enterprise multi-tenant restaurant management',
              'Automated subscription provisioning & billing ledger',
              'Real-time system logs & telemetry audit trail',
              'Global support ticket desk & media management'
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text-secondary, #cbd5e1)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ✓
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary, #64748b)', margin: 0, position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} WhatTheMenu SaaS. Super Admin Restricted Environment.
        </p>
      </div>

      {/* ── Right Form Container ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative' }}>
        
        <div style={{ position: 'fixed', top: '40%', left: '60%', transform: 'translate(-50%, -50%)', width: 450, height: 450, background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          
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
            onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary, #94a3b8)'}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)', color: '#ffffff' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block' }}>
                  Restricted Access
                </span>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary, #ffffff)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                  Super Admin Portal
                </h1>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
              Authorized platform administrator authentication only.
            </p>
          </div>

          <div style={{ background: 'var(--bg-card, #131b2e)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-card)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Email */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Admin Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary, #64748b)', pointerEvents: 'none' }} />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@whatthemenu.com" 
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
                    onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.target.style.boxShadow = 'none' }} 
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Admin Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary, #64748b)', pointerEvents: 'none' }} />
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••" 
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
                    onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.2)' }}
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
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', 
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)', 
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
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (min-width: 900px) { .admin-left-panel { display: flex !important; } }
      `}</style>
    </div>
  )
}

export default AdminLogin
