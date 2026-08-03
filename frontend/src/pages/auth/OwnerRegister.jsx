import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI, publicAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Stage Config ──────────────────────────────────────────────────────────────
const STAGES = [
  {
    step: 1,
    title: 'Create Your Account',
    subtitle: 'Start your digital menu journey',
    image: '/images/stage1_account.png',
    imageCaption: 'Your café, digitalized',
    imageDesc: 'Join hundreds of café owners who switched to smart digital menus.',
  },
  {
    step: 2,
    title: 'Café Information',
    subtitle: 'Tell us where you are',
    image: '/images/stage2_cafe.png',
    imageCaption: 'Put your café on the map',
    imageDesc: 'Help customers find you and set up your digital presence in minutes.',
  },
  {
    step: 3,
    title: 'Choose Your Plan',
    subtitle: 'Pick what works for you',
    image: '/images/stage3_plan.png',
    imageCaption: 'Scale as you grow',
    imageDesc: 'Start with what you need. Upgrade anytime as your café grows.',
  },
]

// removed static PLANS, moved into component

// ─── Component ─────────────────────────────────────────────────────────────────
const OwnerRegister = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', address: '', plan_name: 'free'
  })
  const [errors, setErrors] = useState({ email: '', phone: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [trialDays, setTrialDays] = useState(14)
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const navigate = useNavigate()
  const { login } = useAuth()

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const stage = STAGES[step - 1]

  // Fetch trial days and prices from admin settings on mount
  useEffect(() => {
    publicAPI.getSettings()
      .then(res => {
        const d = res.data.data
        setTrialDays(d.trial_days || 14)
        if(d.starter_price) setStarterPrice(d.starter_price)
        if(d.pro_price) setProPrice(d.pro_price)
      })
      .catch(() => {})
  }, [])

  const PLANS = [
    {
      id: 'free',
      name: 'Free Trial',
      priceLabel: (days) => `${days} Days Free`,
      period: '',
      description: 'Full Pro features, no credit card required',
      features: ['Everything in Pro Plan', 'Advanced Analytics', 'Custom Branding', 'Multiple QR Codes', 'Priority Support'],
      color: '#34d399',
      gradient: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.05))',
      border: 'rgba(52,211,153,0.5)',
      icon: '🎁',
      iconBg: 'linear-gradient(135deg, #059669, #10b981)',
      badge: 'BEST FOR STARTERS',
      badgeBg: 'linear-gradient(135deg, #059669, #10b981)',
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      priceLabel: () => `₹${starterPrice}`,
      period: '/month',
      description: 'Basic features',
      features: ['Digital QR Menu', 'Order Management', 'Basic Analytics', 'Email Support'],
      color: '#818cf8',
      gradient: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(79,70,229,0.05))',
      border: 'rgba(129,140,248,0.5)',
      icon: 'S',
      iconBg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      priceLabel: () => `₹${proPrice}`,
      period: '/month',
      description: 'All features included',
      features: ['Everything in Starter', 'Advanced Analytics', 'Priority Support', 'Custom Branding', 'Multiple QR Codes'],
      color: '#fb923c',
      gradient: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(245,101,101,0.05))',
      border: 'rgba(251,146,60,0.5)',
      icon: 'P',
      iconBg: 'linear-gradient(135deg, #f97316, #ef4444)',
      badge: 'POPULAR',
      badgeBg: 'linear-gradient(135deg, #f97316, #ef4444)',
    },
  ]

  // ── Step navigation ──
  const handleEmailChange = (e) => {
    const val = e.target.value
    set('email', val)
    if (!val) return setErrors(p => ({ ...p, email: '' }))
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(val)) {
      setErrors(p => ({ ...p, email: 'Invalid email address format' }))
      return
    }
    
    setErrors(p => ({ ...p, email: '' }))
    clearTimeout(window.emailTimeout)
    window.emailTimeout = setTimeout(async () => {
      try {
        const res = await authAPI.checkAvailability({ email: val })
        if (res.data.data.emailExists) {
          setErrors(p => ({ ...p, email: 'Email is already taken' }))
        }
      } catch (err) {}
    }, 500)
  }

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    set('phone', val)
    if (!val) return setErrors(p => ({ ...p, phone: '' }))
    
    if (val.length < 10) {
      setErrors(p => ({ ...p, phone: 'Phone number must be at least 10 digits' }))
      return
    }
    if (val.length > 15) {
      setErrors(p => ({ ...p, phone: 'Phone number is too long' }))
      return
    }
    
    setErrors(p => ({ ...p, phone: '' }))
    clearTimeout(window.phoneTimeout)
    window.phoneTimeout = setTimeout(async () => {
      try {
        const res = await authAPI.checkAvailability({ phone: val })
        if (res.data.data.phoneExists) {
          setErrors(p => ({ ...p, phone: 'Phone number is already registered' }))
        }
      } catch (err) {}
    }, 500)
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { toast.error('Please fill all required fields'); return }
    if (errors.email) { toast.error(errors.email); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    setStep(2)
  }

  const handleStep2 = (e) => {
    e.preventDefault()
    if (!form.phone || !form.address) { toast.error('Please fill in your café details'); return }
    if (errors.phone) { toast.error(errors.phone); return }
    setStep(3)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.registerOwner({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        plan_name: form.plan_name,
      })
      toast.success('Café registered! Signing you in...')
      await login(form.email, form.password)
      navigate('/owner')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared input styles ──
  const input = {
    width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
    color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }
  const focus = e => e.target.style.borderColor = 'rgba(79,70,229,0.6)'
  const blur  = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'
  const label = { fontSize: 13, fontWeight: 600, color: '#d1d5db', display: 'block', marginBottom: 8 }
  const icon  = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }

  // ── Progress segments ──
  const ProgressBar = () => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: step >= s
              ? 'linear-gradient(90deg,#4f46e5,#06b6d4)'
              : 'rgba(255,255,255,0.08)',
            transition: 'background 0.4s'
          }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#4b5563', marginTop: 8 }}>
        Step {step} of 3 — {stage.subtitle}
      </p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* ─── LEFT PANEL (desktop only) ─── */}
      <div className="reg-left-panel" style={{
        display: 'none', flex: 1,
        background: 'linear-gradient(145deg, #0a1a2c 0%, #080f1e 50%, #080c14 100%)',
        padding: 0, flexDirection: 'column', borderRight: '1px solid rgba(79,70,229,0.15)',
        overflow: 'hidden', position: 'relative'
      }}>
        {/* Logo top-left */}
        <div style={{ position: 'absolute', top: 32, left: 32, display: 'flex', alignItems: 'center', gap: 10, zIndex: 2 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>QRMenu <span style={{ color: '#67e8f9' }}>Café</span></span>
        </div>

        {/* Stage image — full bleed */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {STAGES.map(s => (
            <img
              key={s.step}
              src={s.image}
              alt={s.imageCaption}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
                opacity: step === s.step ? 1 : 0,
                transition: 'opacity 0.6s ease',
                filter: 'brightness(0.6)'
              }}
            />
          ))}
          {/* Dark overlay gradient at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, #080c14 0%, transparent 100%)' }} />
        </div>

        {/* Bottom text */}
        <div style={{ position: 'absolute', bottom: 48, left: 40, right: 40, zIndex: 2 }}>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: step === s ? 24 : 8, height: 8, borderRadius: 4,
                background: step === s ? 'linear-gradient(90deg,#4f46e5,#06b6d4)' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.4s ease'
              }} />
            ))}
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 10px', fontFamily: "'Outfit',sans-serif", lineHeight: 1.2, transition: 'all 0.4s' }}>
            {stage.imageCaption}
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
            {stage.imageDesc}
          </p>
        </div>

        {/* Step list at top-right area */}
        <div style={{ position: 'absolute', top: 32, right: 32, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2 }}>
          {STAGES.map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                background: step >= s.step ? 'linear-gradient(135deg,#4f46e5,#06b6d4)' : 'rgba(255,255,255,0.1)',
                color: step >= s.step ? '#fff' : '#6b7280',
                border: step === s.step ? '2px solid rgba(6,182,212,0.5)' : 'none',
                boxShadow: step === s.step ? '0 0 12px rgba(79,70,229,0.6)' : 'none',
                transition: 'all 0.4s'
              }}>
                {step > s.step ? '✓' : s.step}
              </div>
              <span style={{ fontSize: 12, color: step >= s.step ? '#e5e7eb' : '#4b5563', fontWeight: step === s.step ? 600 : 400, transition: 'all 0.4s' }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <p style={{ position: 'absolute', bottom: 16, left: 40, fontSize: 11, color: '#374151', zIndex: 2 }}>
          © {new Date().getFullYear()} QRMenu SaaS Platform
        </p>
      </div>

      {/* ─── RIGHT PANEL — FORM ─── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        {/* Ambient glow */}
        <div style={{ position: 'fixed', top: '30%', left: '60%', transform: 'translate(-50%,-50%)', width: 500, height: 400, background: 'radial-gradient(ellipse, rgba(79,70,229,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
          {/* Back to home */}
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 28 }}
            onMouseEnter={e => e.currentTarget.style.color = '#67e8f9'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"/></svg>
            Back to Home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 8px 24px rgba(79,70,229,0.4)' }}>☕</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Café Registration</p>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif" }}>Register Your Café</h1>
              </div>
            </div>
            <ProgressBar />
          </div>

          {/* Form Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28 }}>

            {/* ══════════ STEP 1: Account ══════════ */}
            {step === 1 && (
              <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={label}>Café / Owner Name *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={icon}>🏪</span>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="Brew & Bite Café" required style={input} onFocus={focus} onBlur={blur} />
                  </div>
                </div>

                <div>
                  <label style={label}>Email Address *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={icon}>📧</span>
                    <input type="email" value={form.email} onChange={handleEmailChange}
                      placeholder="owner@mycafe.com" required style={{...input, borderColor: errors.email ? '#ef4444' : 'rgba(255,255,255,0.1)'}} onFocus={focus} onBlur={blur} />
                  </div>
                  {errors.email && <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.email}</span>}
                </div>

                <div>
                  <label style={label}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={icon}>🔒</span>
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min. 6 characters" required
                      style={{ ...input, paddingRight: 44 }} onFocus={focus} onBlur={blur} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6b7280', padding: 0 }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={label}>Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={icon}>🔑</span>
                    <input type="password" value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      placeholder="Re-enter password" required style={input} onFocus={focus} onBlur={blur} />
                  </div>
                </div>

                <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', boxShadow: '0 8px 24px rgba(79,70,229,0.35)', marginTop: 4, transition: 'transform 0.2s, opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  Continue to Café Details →
                </button>
              </form>
            )}

            {/* ══════════ STEP 2: Café Info ══════════ */}
            {step === 2 && (
              <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={label}>Phone Number *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={icon}>📞</span>
                    <input type="tel" value={form.phone} onChange={handlePhoneChange}
                      placeholder="9876543210" required style={{...input, borderColor: errors.phone ? '#ef4444' : 'rgba(255,255,255,0.1)'}} onFocus={focus} onBlur={blur} />
                  </div>
                  {errors.phone && <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.phone}</span>}
                </div>

                <div>
                  <label style={label}>Café Address *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: 14, fontSize: 16 }}>📍</span>
                    <textarea value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="123 MG Road, Bangalore, Karnataka" required rows={3}
                      style={{ ...input, paddingTop: 12, resize: 'none', fontFamily: 'inherit' }}
                      onFocus={focus} onBlur={blur} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)}
                    style={{ padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="submit"
                    style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', boxShadow: '0 8px 24px rgba(79,70,229,0.35)', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    Choose Plan →
                  </button>
                </div>
              </form>
            )}

            {/* ══════════ STEP 3: Plan Selection ══════════ */}
            {step === 3 && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PLANS.map(plan => (
                    <div key={plan.id} onClick={() => set('plan_name', plan.id)}
                      style={{
                        borderRadius: 14, padding: '16px', cursor: 'pointer', transition: 'all 0.25s',
                        background: form.plan_name === plan.id ? plan.gradient : 'rgba(255,255,255,0.02)',
                        border: `1.5px solid ${form.plan_name === plan.id ? plan.border : 'rgba(255,255,255,0.07)'}`,
                        position: 'relative',
                        transform: form.plan_name === plan.id ? 'scale(1.01)' : 'scale(1)',
                        boxShadow: form.plan_name === plan.id ? `0 4px 20px ${plan.border}` : 'none',
                      }}>
                      {plan.badge && (
                        <span style={{ position: 'absolute', top: -9, right: 14, background: plan.badgeBg, color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: 1.5, textTransform: 'uppercase' }}>{plan.badge}</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: plan.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: plan.id === 'free' ? 22 : 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {plan.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb' }}>{plan.name}</span>
                            <span style={{ fontSize: plan.id === 'free' ? 14 : 18, fontWeight: 800, color: plan.color }}>
                              {plan.priceLabel(trialDays)}<span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>{plan.period}</span>
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: plan.id === 'free' ? '#6ee7b7' : '#6b7280', margin: '2px 0 6px' }}>{plan.description}</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {plan.features.map(f => (
                              <span key={f} style={{ fontSize: 10, color: plan.id === 'free' && form.plan_name === 'free' ? '#6ee7b7' : '#9ca3af', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>✓ {f}</span>
                            ))}
                          </div>
                        </div>
                        {/* Radio */}
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.plan_name === plan.id ? plan.color : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.2s' }}>
                          {form.plan_name === plan.id && <div style={{ width: 9, height: 9, borderRadius: '50%', background: plan.color }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Note changes based on selected plan */}
                {form.plan_name === 'free' ? (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                    <p style={{ fontSize: 11, color: '#6ee7b7', margin: 0 }}>
                      🎁 You get <strong>full Pro features</strong> free for <strong>{trialDays} days</strong>. After trial ends, choose a plan to continue.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)' }}>
                    <p style={{ fontSize: 11, color: '#67e8f9', margin: 0 }}>
                      ℹ️ Your account will be reviewed. You'll receive a confirmation email once approved.
                    </p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button type="button" onClick={() => setStep(2)}
                    style={{ padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', opacity: loading ? 0.7 : 1, boxShadow: '0 8px 24px rgba(79,70,229,0.35)', transition: 'transform 0.2s' }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                        Registering...
                      </span>
                    ) : 'Register Café 🎉'}
                  </button>
                </div>
              </form>
            )}

          </div>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#4b5563' }}>
            Already registered?{' '}
            <Link to="/owner/login" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}>Sign in →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .reg-left-panel { display: flex !important; } }
        input::placeholder, textarea::placeholder { color: #4b5563; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

export default OwnerRegister
