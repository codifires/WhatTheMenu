import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { publicAPI, SOCKET_URL } from '../services/api'
import { io } from 'socket.io-client'

/* ─── tiny hook: count-up on mount ─── */
function useCountUp(target, duration = 1800) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setVal(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-time Orders',
    desc: 'New orders hit your dashboard the instant a customer places them. No refresh needed — Socket.io keeps you live.',
    color: '#7c3aed',
  },
  {
    icon: '✨',
    title: 'Live Demo Café',
    desc: 'Try our fully populated demo café before you even sign up. See exactly what your customers will experience!',
    color: '#10b981',
  },
  {
    icon: '📱',
    title: 'Scan & Browse — No App',
    desc: 'Customers scan your QR code and browse your full menu in their phone browser. Nothing to install.',
    color: '#6d28d9',
  },
  {
    icon: '🍽️',
    title: 'Rich Menu Builder',
    desc: 'Upload photos, set prices, tag veg/non-veg, toggle availability — all from a clean, simple dashboard.',
    color: '#4f46e5',
  },
  {
    icon: '💳',
    title: 'Cash & UPI Payments',
    desc: 'Display your UPI QR at checkout or let customers choose cash. Zero payment gateway fees.',
    color: '#7c3aed',
  },
  {
    icon: '⭐',
    title: 'Customer Feedback',
    desc: 'Auto-collect star ratings and reviews after each order. Know what customers love.',
    color: '#8b5cf6',
  },
  {
    icon: '📊',
    title: 'Daily Analytics',
    desc: "See today's revenue, pending orders, popular items, and ratings — all on one screen.",
    color: '#4f46e5',
  },
]

const STEPS = [
  { num: '01', icon: '🖊️', title: 'Build Your Menu', desc: 'Add items, photos and prices in minutes. No design skills needed.' },
  { num: '02', icon: '🖨️', title: 'Print Your QR Code', desc: 'Download and place your unique QR code on every table.' },
  { num: '03', icon: '🚀', title: 'Watch Orders Come In', desc: 'Accept, prepare and complete orders from your live dashboard.' },
]

const DEFAULT_PLANS = [
  {
    name: 'Basic',
    price: '₹199',
    period: '/mo',
    desc: '',
    features: ['Digital QR Menu', 'Basic Analytics', 'Up to 10 Menu Items'],
    cta: 'Select Basic',
    popular: false,
    id: 'basic',
    titleColor: 'var(--text-secondary)',
    btnBg: '#3b82f6',
    borderColor: 'var(--bg-card-hover)',
    tickColor: '#10b981'
  },
  {
    name: 'Starter',
    price: '₹299',
    period: '/mo',
    desc: '',
    features: ['Digital QR Menu', 'Basic Analytics', 'Up to 50 Menu Items', 'Email Support'],
    cta: 'Select Starter',
    popular: false,
    badge: 'Highly Recommended',
    badgeBg: '#10b981',
    id: 'starter',
    titleColor: '#10b981',
    btnBg: '#3b82f6',
    borderColor: 'rgba(16,185,129,0.3)',
    tickColor: '#10b981'
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/mo',
    desc: '',
    features: ['Everything in Starter', 'Unlimited Menu Items', 'Advanced Analytics', 'Priority Support', 'Custom Domain'],
    cta: 'Upgrade to Pro',
    popular: true,
    badge: 'Most Popular',
    badgeBg: '#7c3aed',
    id: 'pro',
    titleColor: '#a78bfa',
    btnBg: '#06b6d4',
    borderColor: 'rgba(124,58,237,0.4)',
    tickColor: '#a78bfa'
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [plans, setPlans] = useState(DEFAULT_PLANS)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [rawPrices, setRawPrices] = useState({
    basic_price: 199, starter_price: 299, pro_price: 499,
    yearly_discount_percentage: 20
  })
  const [realCafeCount, setRealCafeCount] = useState(0)
  
  const cafes  = useCountUp(realCafeCount)
  const orders = useCountUp(realCafeCount * 145)

  const fetchSettings = () => {
    publicAPI.getSettings().then(res => {
      const d = res.data?.data;
      if (d) {
        setRealCafeCount(d.cafe_count || 0)
        setRawPrices({
          basic_price: d.basic_price || 199,
          starter_price: d.starter_price || 299,
          pro_price: d.pro_price || 499,
          yearly_discount_percentage: d.yearly_discount_percentage || 20
        })
        
        const isYearly = billingCycle === 'yearly';
        const discount = d.yearly_discount_percentage || 20;
        const basicYearly = Math.round((d.basic_price || 199) * 12 * (1 - discount / 100));
        const starterYearly = Math.round((d.starter_price || 299) * 12 * (1 - discount / 100));
        const proYearly = Math.round((d.pro_price || 499) * 12 * (1 - discount / 100));

                setPlans([
          {
            ...DEFAULT_PLANS[0],
            price: `₹${isYearly ? basicYearly : (d.basic_price || 199)}`,
            period: isYearly ? '/year' : '/month',
            features: d.basic_features?.length > 0 ? d.basic_features : DEFAULT_PLANS[0].features
          },
          {
            ...DEFAULT_PLANS[1],
            price: `₹${isYearly ? starterYearly : (d.starter_price || 299)}`,
            period: isYearly ? '/year' : '/month',
            features: d.starter_features?.length > 0 ? d.starter_features : DEFAULT_PLANS[1].features
          },
          {
            ...DEFAULT_PLANS[2],
            price: `₹${isYearly ? proYearly : (d.pro_price || 499)}`,
            period: isYearly ? '/year' : '/month',
            features: d.pro_features?.length > 0 ? d.pro_features : DEFAULT_PLANS[2].features
          }
        ])
      }
    }).catch(() => {})
  }

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    
    fetchSettings()

    const socket = io(SOCKET_URL)
    socket.on('settings-updated', () => {
      fetchSettings()
    })
    
    return () => {
      window.removeEventListener('scroll', fn)
      socket.disconnect()
    }
  }, [billingCycle])

  useEffect(() => {
    const isYearly = billingCycle === 'yearly';
    const discount = rawPrices.yearly_discount_percentage;
    const basicYearly = Math.round(rawPrices.basic_price * 12 * (1 - discount / 100));
    const starterYearly = Math.round(rawPrices.starter_price * 12 * (1 - discount / 100));
    const proYearly = Math.round(rawPrices.pro_price * 12 * (1 - discount / 100));

    setPlans(prevPlans => prevPlans.map(p => {
      if (p.id === 'basic') {
        return { ...p, price: `₹${isYearly ? basicYearly : rawPrices.basic_price}`, period: isYearly ? '/yr' : '/mo' }
      }
      if (p.id === 'starter') {
        return { ...p, price: `₹${isYearly ? starterYearly : rawPrices.starter_price}`, period: isYearly ? '/yr' : '/mo' }
      }
      if (p.id === 'pro') {
        return { ...p, price: `₹${isYearly ? proYearly : rawPrices.pro_price}`, period: isYearly ? '/yr' : '/mo' }
      }
      return p;
    }))
  }, [billingCycle, rawPrices])

  return (
    <div style={{ background: 'var(--bg-shell)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(8,12,20,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src="/logo.png" alt="WTM Logo" style={{ height: 70, width: 70, objectFit: 'cover', borderRadius: '50%' }} />
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', fontFamily: "'Outfit',sans-serif", color: 'var(--text-primary)' }}>
              WTM
            </span>
          </Link>

          {/* Desktop links */}
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden-mobile">
            {['Features','How it works','Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color='var(--text-primary)'}
                onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>{l}</a>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/owner/login" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 4px' }}
              className="hidden-mobile">Owner Login</Link>
            <Link to="/owner/register" style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none',
              padding: '10px 22px', borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(124,58,237,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(124,58,237,0.4)' }}>
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Grid dots */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(124,58,237,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          {/* Live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 50, border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.1)', marginBottom: 32 }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>Platform is live — v1.0</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>
            The Smartest Way to<br />
            <span style={{ background: 'linear-gradient(135deg,#a78bfa,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Run Your Café Menu
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px', fontWeight: 400 }}>
            Go digital in minutes. Customers scan, browse, and order from their phone — no app needed. You manage everything from one powerful dashboard.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/owner/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 16px 40px rgba(124,58,237,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(124,58,237,0.45)' }}>
              Start For Free
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/></svg>
            </Link>
            <Link to="/owner/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
              fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'var(--bg-card-hover)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.borderColor='rgba(124,58,237,0.5)'; e.currentTarget.style.background='rgba(124,58,237,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.borderColor='var(--border-hover)'; e.currentTarget.style.background='var(--bg-card-hover)' }}>
              Owner Login
            </Link>
          </div>
        </div>

        {/* ── MOCK DASHBOARD CARD ── */}
        <div style={{ maxWidth: 900, margin: '64px auto 0', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{
            borderRadius: 24, overflow: 'hidden',
            border: '1px solid rgba(124,58,237,0.25)',
            background: 'rgba(12,15,28,0.8)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}>
            {/* Title bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.05)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }}/>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }}/>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }}/>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>Brew &amp; Bite Café — Dashboard</span>
            </div>
            {/* Dashboard body */}
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {[
                { label: "Today's Revenue", val: '₹4,820', icon: '💰', trend: '+12%', color: '#10b981' },
                { label: 'Orders Today', val: '34', icon: '📋', trend: '+5', color: '#6366f1' },
                { label: 'Pending', val: '6', icon: '⏳', trend: 'live', color: '#f59e0b' },
                { label: 'Avg Rating', val: '4.8 ★', icon: '⭐', trend: '+0.2', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: `${s.color}18`, padding: '2px 8px', borderRadius: 50 }}>{s.trend}</span>
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px', fontFamily: "'Outfit',sans-serif" }}>{s.val}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { name: 'Cappuccino × 3', table: 'Table 4', status: 'Preparing', col: '#f59e0b' },
                { name: 'Avocado Toast × 1', table: 'Table 2', status: 'Ready ✓', col: '#10b981' },
                { name: 'Cold Brew × 2', table: 'Table 7', status: 'New', col: '#6366f1' },
              ].map(o => (
                <div key={o.name} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{o.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>{o.table}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: o.col, background: `${o.col}18`, padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap' }}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      {realCafeCount >= 20 && (
        <section style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, textAlign: 'center' }}>
            {[
              { val: `${cafes}+`, label: 'Cafés Onboarded' },
              { val: `${orders.toLocaleString()}+`, label: 'Orders Processed' },
              { val: '4.9/5', label: 'Average Rating' },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '20px 32px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <p style={{ fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900, margin: '0 0 6px', fontFamily: "'Outfit',sans-serif", background: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.val}</p>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: '0 0 16px', fontFamily: "'Outfit',sans-serif" }}>Up and running in 3 steps</h2>
            <p style={{ fontSize: 16, color: 'var(--text-tertiary)', maxWidth: 500, margin: '0 auto' }}>No tech skills required. Faster than brewing a coffee.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{
                padding: '36px 32px', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'var(--bg-card)',
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.3s, border-color 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor='rgba(124,58,237,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='var(--border-medium)' }}>
                <div style={{ position: 'absolute', top: 20, right: 24, fontSize: 48, fontWeight: 900, color: 'rgba(124,58,237,0.08)', fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 32, marginBottom: 20 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Features</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif" }}>Everything your café needs</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                padding: '28px 28px', borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'var(--bg-card)',
                transition: 'transform 0.3s, border-color 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor=`${f.color}45`; e.currentTarget.style.boxShadow=`0 20px 60px ${f.color}12` }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='var(--border-medium)'; e.currentTarget.style.boxShadow='none' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18, background: `${f.color}15` }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif" }}>Available SaaS Plans</h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--border-light)', borderRadius: 100, padding: 6 }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: billingCycle === 'monthly' ? '#7c3aed' : 'transparent', color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: billingCycle === 'yearly' ? '#7c3aed' : 'transparent', color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Yearly <span style={{ fontSize: 12, background: '#10b981', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 50, fontWeight: 800 }}>SAVE {rawPrices.yearly_discount_percentage || 20}%</span>
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 32 }}>
            {plans.map(p => (
              <div key={p.name} style={{
                display: 'flex', flexDirection: 'column', padding: '36px 32px', borderRadius: 22, position: 'relative', height: '100%', boxSizing: 'border-box',
                border: `1px solid ${p.borderColor || 'var(--border-medium)'}`,
                background: p.popular ? 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(79,70,229,0.02))' : 'var(--bg-card)',
              }}>
                {(p.badge || p.popular) && (
                  <div style={{ position: 'absolute', top: -1, right: 28, transform: 'translateY(-50%)', padding: '5px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', background: p.badgeBg || '#7c3aed' }}>
                    {p.badge || 'Most Popular'}
                  </div>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: p.titleColor || 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>{p.name}</h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 28 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, fontFamily: "'Outfit',sans-serif" }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>{p.period}</span>
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.tickColor || '#10b981'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/owner/register" style={{
                  marginTop: 'auto', display: 'block', textAlign: 'center', padding: '14px', borderRadius: 14,
                  textDecoration: 'none', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                  background: p.btnBg || '#3b82f6',
                  border: 'none',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity='0.9' }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1' }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <section style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.18), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,50px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
            Your café deserves a{' '}
            <span style={{ background: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              smarter menu.
            </span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.7 }}>
            Set it up in 5 minutes. No tech knowledge required.
          </p>
          <Link to="/owner/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '16px 40px', borderRadius: 16, textDecoration: 'none',
            fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            boxShadow: '0 16px 50px rgba(124,58,237,0.5)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 24px 60px rgba(124,58,237,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 16px 50px rgba(124,58,237,0.5)' }}>
            Create Your Free Account
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/></svg>
          </Link>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 48 }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 300 }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', marginBottom: 8 }}>
                <img src="/logo.png" alt="WTM Logo" style={{ height: 120, width: 120, objectFit: 'cover', borderRadius: '50%' }} />
                {/* <span style={{ fontWeight: 900, fontSize: 32, fontFamily: "'Outfit',sans-serif", color: 'var(--text-primary)' }}>WTM</span> */}
              </Link>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>
                Empowering cafés with next-generation digital menus and seamless ordering.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>Product</span>
                <Link to="/owner/login" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-primary)'} onMouseOut={e=>e.target.style.color='var(--text-secondary)'}>Owner Login</Link>
                <Link to="/owner/register" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-primary)'} onMouseOut={e=>e.target.style.color='var(--text-secondary)'}>Register Café</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>Legal</span>
                <Link to="/terms" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-primary)'} onMouseOut={e=>e.target.style.color='var(--text-secondary)'}>Terms & Conditions</Link>
                <Link to="/privacy-policy" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-primary)'} onMouseOut={e=>e.target.style.color='var(--text-secondary)'}>Privacy Policy</Link>
                <Link to="/refund-policy" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-primary)'} onMouseOut={e=>e.target.style.color='var(--text-secondary)'}>Refund Policy</Link>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 32, display: 'flex', justifyContent: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>© {new Date().getFullYear()} What on the Menu. All rights reserved.</p>
          </div>

        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 3px; }
      `}</style>
    </div>
  )
}
