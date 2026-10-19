import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Coffee, Store, Mail, Lock, KeyRound, Eye, EyeOff, 
  Phone, MapPin, ArrowLeft, ArrowRight, Sparkles, 
  Check, CheckCircle2, Gift, Zap, Crown, Loader2
} from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import { authAPI, publicAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Stage Config ──────────────────────────────────────────────────────────────
const STAGES = [
  {
    step: 1,
    title: 'Account Setup',
    subtitle: 'Start your digital menu journey',
    image: '/images/stage1_account.png',
    imageCaption: 'Your café, digitalized',
    imageDesc: 'Join hundreds of forward-thinking café owners who switched to smart, interactive QR menus.',
  },
  {
    step: 2,
    title: 'Café Information',
    subtitle: 'Tell us where you are',
    image: '/images/stage2_cafe.png',
    imageCaption: 'Put your café on the map',
    imageDesc: 'Help customers discover your brand and set up your digital storefront in minutes.',
  },
  {
    step: 3,
    title: 'Choose Plan',
    subtitle: 'Pick what works for you',
    image: '/images/stage3_plan.png',
    imageCaption: 'Scale as you grow',
    imageDesc: 'Start with what you need today. Upgrade seamlessly as your orders and tables expand.',
  },
]

const OwnerRegister = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', address: '', plan_name: 'starter'
  })
  const [errors, setErrors] = useState({ email: '', phone: '' })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [trialDays, setTrialDays] = useState(14)
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const navigate = useNavigate()
  const { login } = useAuth()

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const stage = STAGES[step - 1]

  useEffect(() => {
    publicAPI.getSettings()
      .then(res => {
        const d = res.data?.data || {}
        if (d.trial_days) setTrialDays(d.trial_days)
        if (d.starter_price) setStarterPrice(d.starter_price)
        if (d.pro_price) setProPrice(d.pro_price)
      })
      .catch(() => {})
  }, [])

  const PLANS = [
    {
      id: 'starter',
      name: 'Free Trial',
      priceLabel: `${trialDays} Days Free`,
      period: '',
      description: 'Full Pro features, no credit card required',
      features: ['Full Pro Features Access', 'Live Order KDS & Sound Alerts', 'Custom QR Code Standees', 'Up to 50 Menu Items', 'Community & Email Support'],
      color: '#10b981',
      badge: 'RECOMMENDED',
      icon: Gift,
      iconClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      activeRing: 'border-emerald-500/50 bg-emerald-500/5'
    },
    {
      id: 'pro',
      name: 'Starter Plan',
      priceLabel: `₹${starterPrice}`,
      period: '/month',
      description: 'Essential toolkit for growing cafés',
      features: ['Digital QR Menu & Tables', 'Real-time Order Management', 'Basic Sales & Item Analytics', 'Standard Email Support'],
      color: '#6366f1',
      icon: Zap,
      iconClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      activeRing: 'border-indigo-500/50 bg-indigo-500/5'
    },
    {
      id: 'pro_plus',
      name: 'Pro Plus Plan',
      priceLabel: `₹${proPrice}`,
      period: '/month',
      description: 'Advanced operations & high-volume dining',
      features: ['Everything in Starter Plan', 'Unlimited Menu Items & Tables', 'Advanced Multi-Metric Analytics', 'Custom Domain & Full Branding', 'Priority 24/7 Phone Support'],
      color: '#f59e0b',
      badge: 'POPULAR',
      icon: Crown,
      iconClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      activeRing: 'border-amber-500/50 bg-amber-500/5'
    },
  ]

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
        if (res.data?.data?.emailExists) {
          setErrors(p => ({ ...p, email: 'Email is already registered' }))
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
        if (res.data?.data?.phoneExists) {
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
      toast.success('Café registered successfully! Logging you in...')
      await login(form.email, form.password)
      navigate('/owner')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-shell)] text-[var(--text-primary)] flex font-sans">
      {/* ─── LEFT PANEL (Desktop only) ─── */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-900 border-r border-[var(--border-medium)] flex-col overflow-hidden">
        {/* Brand header */}
        <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold font-heading tracking-tight text-white">
            WhatThe<span className="text-cyan-400">Menu</span>
          </span>
        </div>

        {/* Backdrop visual */}
        <div className="absolute inset-0">
          {STAGES.map(s => (
            <img
              key={s.step}
              src={s.image}
              alt={s.imageCaption}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 filter brightness-[0.4] ${
                step === s.step ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/70 to-transparent" />
        </div>

        {/* Step indicator top right */}
        <div className="absolute top-8 right-8 flex flex-col gap-2 z-20">
          {STAGES.map(s => (
            <div key={s.step} className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s.step 
                  ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/30' 
                  : 'bg-white/10 text-white/40'
              }`}>
                {step > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
              </div>
              <span className={`text-xs font-medium transition-colors ${
                step === s.step ? 'text-white' : 'text-white/40'
              }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <div className="mt-auto p-12 relative z-20 max-w-lg">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? 'w-8 bg-cyan-400' : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>
          <h2 className="text-2xl font-black text-white font-heading mb-2">
            {stage.imageCaption}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {stage.imageDesc}
          </p>
          <div className="mt-8 text-xs text-slate-400">
            © {new Date().getFullYear()} WhatTheMenu SaaS Platform. All rights reserved.
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL (Form) ─── */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Theme Toggle Top Right */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest block">
                  Café Onboarding
                </span>
                <h1 className="text-2xl font-black tracking-tight font-heading">
                  Register Your Café
                </h1>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                      step >= s ? 'bg-gradient-to-r from-indigo-500 to-cyan-400' : 'bg-[var(--border-medium)]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-[var(--text-secondary)]">
                <span>Step {step} of 3</span>
                <span className="font-semibold text-[var(--text-primary)]">{stage.title}</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-xl">
            {/* STEP 1: Account */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Café or Owner Name *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Brew & Roast Artisanal Café"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={handleEmailChange}
                      placeholder="owner@mycafe.com"
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none transition-colors ${
                        errors.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[var(--border-medium)] focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-rose-400 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-10 pr-11 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-11 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <span>Continue to Café Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Café Details */}
            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder="e.g. 9876543210"
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none transition-colors ${
                        errors.phone ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[var(--border-medium)] focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-rose-400 mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Physical Café Address *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-3.5 pointer-events-none" />
                    <textarea
                      required
                      rows={3}
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                      placeholder="e.g. Shop 4B, 100 Feet Road, Indiranagar, Bengaluru, Karnataka"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500 transition-colors resize-none font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Choose Plan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Plan Selection */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  {PLANS.map(plan => {
                    const PlanIcon = plan.icon
                    const isSelected = form.plan_name === plan.id
                    return (
                      <div
                        key={plan.id}
                        onClick={() => set('plan_name', plan.id)}
                        className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? `${plan.activeRing} ring-2 ring-indigo-500 shadow-md` 
                            : 'border-[var(--border-medium)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
                        }`}
                      >
                        {plan.badge && (
                          <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            {plan.badge}
                          </span>
                        )}

                        <div className="flex items-start gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${plan.iconClass}`}>
                            <PlanIcon className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-2">
                              <h3 className="text-sm font-bold truncate">{plan.name}</h3>
                              <div className="text-right flex-shrink-0">
                                <span className="text-base font-extrabold text-[var(--text-primary)]">
                                  {plan.priceLabel}
                                </span>
                                {plan.period && (
                                  <span className="text-xs text-[var(--text-secondary)]">{plan.period}</span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-2.5">
                              {plan.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {plan.features.slice(0, 3).map(feat => (
                                <span
                                  key={feat}
                                  className="inline-flex items-center gap-1 text-[11px] bg-[var(--bg-input)] px-2 py-0.5 rounded-md text-[var(--text-secondary)] border border-[var(--border-medium)]"
                                >
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>{feat}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                            isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-[var(--border-medium)]'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Instant Free Trial:</strong> You get complete Pro features access for {trialDays} days. No payment details required to start.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-3 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Café...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Café</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
            Already registered?{' '}
            <Link to="/owner/login" className="text-cyan-400 hover:text-cyan-300 font-semibold ml-1">
              Sign in to Dashboard →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default OwnerRegister
