import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { useState, useEffect } from 'react'
import { publicAPI, SOCKET_URL } from '../services/api'
import { io } from 'socket.io-client'
import {
  QrCode,
  Zap,
  CreditCard,
  SlidersHorizontal,
  Layers,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Clock,
  ShieldCheck,
  ChefHat,
  Smartphone,
  UtensilsCrossed,
  Plus,
  Minus,
  ShoppingBag,
  Bell,
  CheckCircle2,
  Printer,
  HelpCircle,
  TrendingUp
} from 'lucide-react'

// Default SaaS pricing tiers fallback
const DEFAULT_PLANS = [
  {
    name: 'Starter',
    price: '₹199',
    period: '/mo',
    desc: 'Perfect for small cafés and quick-service food counters',
    features: [
      'Digital QR Menu with table linking',
      'Up to 25 menu items & 3 categories',
      'Direct customer browsing — no app',
      'Cash & direct UPI payment options',
      'Daily orders overview & basic stats',
      'Email support'
    ],
    cta: 'Start with Starter',
    popular: false,
    id: 'basic',
    badge: null
  },
  {
    name: 'Pro',
    price: '₹299',
    period: '/mo',
    desc: 'The complete digital ordering system for busy dine-in restaurants',
    features: [
      'Everything in Starter, plus:',
      'Unlimited menu items & categories',
      'Real-time live kitchen dispatch (KDS)',
      'Instant audio chimes on new orders',
      'One-click item 86\'ing (out-of-stock toggle)',
      'Customer feedback & star ratings',
      'Priority chat & email support'
    ],
    cta: 'Start 14-Day Free Trial',
    popular: true,
    id: 'pro',
    badge: 'Most Popular'
  },
  {
    name: 'Pro Plus',
    price: '₹499',
    period: '/mo',
    desc: 'Advanced controls and maximum capacity for high-volume venues',
    features: [
      'Everything in Pro, plus:',
      'Multi-counter and multi-device sync',
      'Custom restaurant branding & logo on menu',
      'Detailed revenue & dish analytics',
      'Exportable sales reports & KOT printing',
      'Dedicated 24/7 onboarding manager',
      'Early access to new features'
    ],
    cta: 'Get Pro Plus',
    popular: false,
    id: 'pro_plus',
    badge: null
  }
]

// 3-Step Onboarding Workflow
const STEPS = [
  {
    num: '01',
    icon: UtensilsCrossed,
    title: 'Build Your Menu in Minutes',
    desc: 'Add your categories, items, dietary tags (Veg / Non-Veg), photos, and prices from a clean, intuitive owner dashboard.'
  },
  {
    num: '02',
    icon: QrCode,
    title: 'Print Table QR Cards',
    desc: 'Download ready-to-print branded QR codes linked to each table. Place them on dining tables, bar tops, or pickup counters.'
  },
  {
    num: '03',
    icon: Bell,
    title: 'Receive & Prepare Live Orders',
    desc: 'Guests scan with their phone camera to browse and order. New tickets ping your kitchen screen in real time with zero delays.'
  }
]

// 6 Core Features for Restaurant Owners
const FEATURES = [
  {
    icon: Smartphone,
    title: '100% App-Free for Diners',
    desc: 'Zero barriers. Diners scan with their default iPhone or Android camera to access the menu instantly in their mobile browser.',
    tag: 'Frictionless'
  },
  {
    icon: Zap,
    title: 'Instant Kitchen Synchronization',
    desc: 'Powered by real-time WebSockets. When a customer confirms their cart, the order alerts your kitchen screen immediately.',
    tag: 'Real-Time'
  },
  {
    icon: CreditCard,
    title: 'Direct UPI & Counter Cash (0% Commission)',
    desc: 'Display your restaurant\'s own UPI QR code or accept cash at the counter. Keep 100% of your earnings with zero gateway cuts.',
    tag: 'Zero Fees'
  },
  {
    icon: SlidersHorizontal,
    title: 'Instant 86\'ing & Price Updates',
    desc: 'Sold out of fresh pasta? Toggle item availability off in one click. Update prices and specials instantly without reprinting paper.',
    tag: 'Dynamic'
  },
  {
    icon: Layers,
    title: 'Table-Specific QR Tracking',
    desc: 'Each QR code is permanently paired with a specific table number. Your servers always know exactly where food needs to be delivered.',
    tag: 'Accurate'
  },
  {
    icon: BarChart3,
    title: 'Daily Turnover & Dish Analytics',
    desc: 'Gain instant clarity on peak dining hours, top-selling plates, average fulfillment time, and daily revenue on your live dashboard.',
    tag: 'Insights'
  }
]

// Restaurant Owner FAQs
const FAQS = [
  {
    q: 'Do my diners need to download an app or create an account?',
    a: 'No app download or sign-up is ever required. Diners simply point their smartphone camera at the QR code on the table, and your interactive digital menu opens immediately in Safari, Chrome, or any mobile browser.'
  },
  {
    q: 'How do payments work? Do you take a commission on food orders?',
    a: 'We take 0% commission on your orders. You can display your own restaurant UPI QR code for direct bank settlement, or allow diners to pay cash / card at the billing counter.'
  },
  {
    q: 'What hardware do I need to run WhatTheMenu?',
    a: 'No special hardware is required. You can manage orders and menus from any existing phone, iPad, Android tablet, laptop, or desktop POS computer with an internet browser.'
  },
  {
    q: 'Can I change menu prices or mark items out-of-stock during busy service?',
    a: 'Yes! From your owner dashboard or smartphone, you can mark any item as unavailable (86\'d) in one tap. The customer menu updates immediately for everyone currently browsing.'
  },
  {
    q: 'Can I create unique QR codes for different dining tables?',
    a: 'Yes. WhatTheMenu generates individual QR codes for Table 1, Table 2, Patio 4, etc. When a customer orders, the ticket arrives in your kitchen pre-tagged with their exact table number.'
  },
  {
    q: 'How fast can I set up my restaurant?',
    a: 'Most restaurant and café owners are fully live in under 15 minutes. Just register your account, add your menu categories and items, and download your printable QR codes.'
  }
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [plans, setPlans] = useState(DEFAULT_PLANS)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [contactEmail, setContactEmail] = useState('support@whatthemenu.com')
  const [rawPrices, setRawPrices] = useState({
    starter_price: 199,
    pro_price: 299,
    pro_plus_price: 499,
    yearly_discount_percentage: 20
  })

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(0)

  // Interactive Product Demo State
  const [demoView, setDemoView] = useState('customer') // 'customer' | 'kitchen'
  const [demoCart, setDemoCart] = useState({ 1: 1, 2: 1 })
  const [demoOrders, setDemoOrders] = useState([
    { id: '#104', table: 'Table 4', items: 'Hazelnut Truffle Latte × 1, Woodfired Margherita × 1', time: 'Just now', status: 'Preparing', badgeColor: '#f59e0b' },
    { id: '#103', table: 'Table 2', items: 'Crispy Truffle Fries × 2', time: '4m ago', status: 'Ready', badgeColor: '#0d9488' },
    { id: '#102', table: 'Table 7', items: 'Cold Brew Nitro × 2, Avocado Sourdough × 1', time: '12m ago', status: 'Completed', badgeColor: '#10b981' }
  ])

  const demoItems = [
    { id: 1, name: 'Hazelnut Truffle Latte', category: 'Coffee', price: 220, isVeg: true, rating: '4.9 ★', desc: 'Espresso with steamed oat milk, roasted hazelnut syrup & cocoa dust.' },
    { id: 2, name: 'Woodfired Margherita', category: 'Bites', price: 380, isVeg: true, rating: '4.8 ★', desc: 'San Marzano tomato coulis, fresh buffalo mozzarella, virgin olive oil & sweet basil.' },
    { id: 3, name: 'Crispy Truffle Fries', category: 'Sides', price: 190, isVeg: true, rating: '4.7 ★', desc: 'Hand-cut russet potatoes tossed with black truffle oil and aged parmesan.' }
  ]

  const cartTotal = Object.entries(demoCart).reduce((sum, [id, qty]) => {
    const item = demoItems.find(i => i.id === Number(id))
    return sum + (item ? item.price * qty : 0)
  }, 0)

  const cartCount = Object.values(demoCart).reduce((a, b) => a + b, 0)

  const handleAddDemoItem = (id) => {
    setDemoCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const handleRemoveDemoItem = (id) => {
    setDemoCart(prev => {
      const updated = { ...prev }
      if (updated[id] > 1) {
        updated[id] -= 1
      } else {
        delete updated[id]
      }
      return updated
    })
  }

  const handleSimulateOrder = () => {
    const newOrder = {
      id: `#${Math.floor(105 + Math.random() * 20)}`,
      table: 'Table 4',
      items: Object.entries(demoCart).map(([id, qty]) => {
        const item = demoItems.find(i => i.id === Number(id))
        return `${item?.name} × ${qty}`
      }).join(', '),
      time: 'Just now',
      status: 'Preparing',
      badgeColor: '#f59e0b'
    }
    setDemoOrders(prev => [newOrder, ...prev.slice(0, 3)])
    setDemoView('kitchen')
  }

  const handleUpdateOrderStatus = (orderId, newStatus, newColor) => {
    setDemoOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, badgeColor: newColor } : o))
  }

  // Fetch settings from public API
  const fetchSettings = () => {
    publicAPI.getSettings().then(res => {
      const d = res.data?.data
      if (d) {
        setContactEmail(d.contact_email || 'support@whatthemenu.com')
        setRawPrices({
          starter_price: d.starter_price || 199,
          pro_price: d.pro_price || 299,
          pro_plus_price: d.pro_plus_price || 499,
          yearly_discount_percentage: d.yearly_discount_percentage || 20
        })

        const isYearly = billingCycle === 'yearly'
        const discount = d.yearly_discount_percentage || 20
        const starterYearly = Math.round((d.starter_price || 199) * 12 * (1 - discount / 100))
        const proYearly = Math.round((d.pro_price || 299) * 12 * (1 - discount / 100))
        const proPlusYearly = Math.round((d.pro_plus_price || 499) * 12 * (1 - discount / 100))

        setPlans([
          {
            ...DEFAULT_PLANS[0],
            price: `₹${isYearly ? starterYearly : (d.starter_price || 199)}`,
            period: isYearly ? '/yr' : '/mo',
            features: d.starter_features?.length > 0 ? d.starter_features : DEFAULT_PLANS[0].features
          },
          {
            ...DEFAULT_PLANS[1],
            price: `₹${isYearly ? proYearly : (d.pro_price || 299)}`,
            period: isYearly ? '/yr' : '/mo',
            features: d.pro_features?.length > 0 ? d.pro_features : DEFAULT_PLANS[1].features
          },
          {
            ...DEFAULT_PLANS[2],
            price: `₹${isYearly ? proPlusYearly : (d.pro_plus_price || 499)}`,
            period: isYearly ? '/yr' : '/mo',
            features: d.pro_plus_features?.length > 0 ? d.pro_plus_features : DEFAULT_PLANS[2].features
          }
        ])
      }
    }).catch(() => {})
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    fetchSettings()

    const socket = io(SOCKET_URL)
    socket.on('settings-updated', () => fetchSettings())

    return () => {
      window.removeEventListener('scroll', handleScroll)
      socket.disconnect()
    }
  }, [billingCycle])

  useEffect(() => {
    const isYearly = billingCycle === 'yearly'
    const discount = rawPrices.yearly_discount_percentage || 20
    const starterPrice = isYearly
      ? Math.round(rawPrices.starter_price * 12 * (1 - discount / 100))
      : rawPrices.starter_price
    const proPrice = isYearly
      ? Math.round(rawPrices.pro_price * 12 * (1 - discount / 100))
      : rawPrices.pro_price
    const proPlusPrice = isYearly
      ? Math.round((rawPrices.pro_plus_price || 499) * 12 * (1 - discount / 100))
      : (rawPrices.pro_plus_price || 499)

    setPlans(prev => prev.map(p => {
      if (p.id === 'basic') return { ...p, price: `₹${starterPrice}`, period: isYearly ? '/yr' : '/mo' }
      if (p.id === 'pro') return { ...p, price: `₹${proPrice}`, period: isYearly ? '/yr' : '/mo' }
      if (p.id === 'pro_plus') return { ...p, price: `₹${proPlusPrice}`, period: isYearly ? '/yr' : '/mo' }
      return p
    }))
  }, [billingCycle, rawPrices])

  return (
    <div style={{
      background: 'var(--bg-shell)',
      color: 'var(--text-primary)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      minHeight: '100vh',
      overflowX: 'hidden'
    }}>

      {/* ═══════════════════════════════════════════════════
          1. STICKY MODERN NAVBAR
          ═══════════════════════════════════════════════════ */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? 'var(--bg-topbar)' : 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? 'var(--border-medium)' : 'var(--border-light)'}`,
        transition: 'all 0.25s ease'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand Logo & Name */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 0 2px var(--brand-border), 0 4px 12px rgba(79, 70, 229, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--brand-primary)'
            }}>
              <img src="/logo.png" alt="WhatTheMenu Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.4px',
                lineHeight: 1.1
              }}>
                WhatTheMenu
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--brand-primary)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Restaurant QR OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Live Demo', href: '#live-preview' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'FAQs', href: '#faqs' }
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  padding: '6px 2px'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/contact-us"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                padding: '6px 2px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Contact
            </Link>
          </nav>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />

            <Link
              to="/owner/login"
              className="hidden-mobile"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-card)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)'
                e.currentTarget.style.background = 'var(--brand-subtle)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
            >
              Owner Login
            </Link>

            <Link
              to="/owner/register"
              className="hidden-mobile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff',
                textDecoration: 'none',
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-gradient)',
                boxShadow: '0 2px 10px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(79, 70, 229, 0.45)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(79, 70, 229, 0.35)'
              }}
            >
              Start Free Trial
              <ArrowRight size={15} />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              className="visible-mobile"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: 8,
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          MOBILE MENU DRAWER
          ═══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div style={{
          position: 'fixed',
          top: 70,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99,
          background: 'var(--bg-shell)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderTop: '1px solid var(--border-medium)',
          overflowY: 'auto'
        }}>
          {[
            { label: 'Features', href: '#features' },
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Live Product Demo', href: '#live-preview' },
            { label: 'Pricing Plans', href: '#pricing' },
            { label: 'Frequently Asked Questions', href: '#faqs' }
          ].map(item => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-light)'
              }}
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/contact-us"
            onClick={() => setMobileOpen(false)}
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '12px 0',
              borderBottom: '1px solid var(--border-light)'
            }}
          >
            Contact Support
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <Link
              to="/owner/register"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-gradient)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Start 14-Day Free Trial
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/owner/login"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Owner Sign In
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          2. HERO SECTION
          ═══════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        paddingTop: 140,
        paddingBottom: 72,
        overflow: 'hidden',
        borderBottom: '1px solid var(--border-light)'
      }}>
        {/* Subtle Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(79, 70, 229, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          
          {/* Trust Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-subtle)',
            border: '1px solid var(--brand-border)',
            marginBottom: 24
          }}>
            <Sparkles size={15} color="var(--brand-primary)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)' }}>
              Next-Gen Restaurant QR Ordering · 0% Commission
            </span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(32px, 5.5vw, 62px)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
            fontFamily: "'Outfit', sans-serif",
            margin: '0 0 20px',
            color: 'var(--text-primary)'
          }}>
            Turn Table Scans Into Direct Orders<br />
            <span style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              With Zero Commissions.
            </span>
          </h1>

          {/* Concise Supporting Copy */}
          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto 36px',
            fontWeight: 400
          }}>
            Empower diners to scan, browse, and place table orders right from their phone browser — with zero app downloads. Instant kitchen alerts, error-free orders, and direct UPI or counter cash settlement.
          </p>

          {/* Primary & Secondary CTAs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 44
          }}>
            <Link
              to="/owner/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 32px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-gradient)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(79, 70, 229, 0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(79, 70, 229, 0.4)'
              }}
            >
              Start Free 14-Day Trial
              <ArrowRight size={17} />
            </Link>

            <a
              href="#live-preview"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid var(--border-medium)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)'
                e.currentTarget.style.background = 'var(--brand-subtle)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
            >
              <Smartphone size={17} color="var(--brand-primary)" />
              Try Live Interactive Demo
            </a>
          </div>

          {/* Trust Highlights Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            flexWrap: 'wrap',
            paddingTop: 8,
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--success-main)" />
              <span>No credit card required</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--success-main)" />
              <span>5-minute setup</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--success-main)" />
              <span>0% commission on orders</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--success-main)" />
              <span>Works on any smartphone or tablet</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          3. INTERACTIVE LIVE PRODUCT DEMO (DINER + KITCHEN)
          ═══════════════════════════════════════════════════ */}
      <section id="live-preview" style={{
        padding: '80px 24px',
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--brand-primary)',
              display: 'inline-block',
              marginBottom: 8
            }}>
              Interactive Experience
            </span>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 800,
              margin: '0 0 12px',
              color: 'var(--text-primary)'
            }}>
              See Exactly How It Works in Service
            </h2>
            <p style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              maxWidth: 620,
              margin: '0 auto 28px'
            }}>
              Try the customer QR ordering menu below, or switch to the kitchen display to see live order tickets dispatch in real time.
            </p>

            {/* View Toggle Tabs */}
            <div style={{
              display: 'inline-flex',
              padding: 4,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <button
                onClick={() => setDemoView('customer')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'all 0.2s ease',
                  background: demoView === 'customer' ? 'var(--brand-primary)' : 'transparent',
                  color: demoView === 'customer' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                <Smartphone size={16} />
                Diner Mobile View (Table #04)
              </button>
              <button
                onClick={() => setDemoView('kitchen')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'all 0.2s ease',
                  background: demoView === 'kitchen' ? 'var(--brand-primary)' : 'transparent',
                  color: demoView === 'kitchen' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                <ChefHat size={16} />
                Live Kitchen Screen (Owner KDS)
              </button>
            </div>
          </div>

          {/* Interactive Demo Container */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px',
            boxShadow: 'var(--shadow-card)',
            minHeight: 520,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>

            {demoView === 'customer' ? (
              /* ─── CUSTOMER PHONE SIMULATION ─── */
              <div style={{
                maxWidth: 420,
                margin: '0 auto',
                width: '100%',
                background: 'var(--bg-shell)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-medium)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-dropdown)'
              }}>
                {/* Phone Header */}
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--brand-gradient)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                      The Artisan Bistro
                    </h4>
                    <span style={{ fontSize: 12, opacity: 0.9 }}>📍 Table #04 · Scanned via QR</span>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    fontSize: 11,
                    fontWeight: 700
                  }}>
                    LIVE MENU
                  </div>
                </div>

                {/* Filter Chips */}
                <div style={{
                  display: 'flex',
                  gap: 8,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-light)',
                  overflowX: 'auto'
                }}>
                  {['All Items', 'Coffee', 'Bites', 'Sides'].map((cat, idx) => (
                    <span
                      key={cat}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 12,
                        fontWeight: 600,
                        background: idx === 0 ? 'var(--brand-primary)' : 'var(--bg-card)',
                        color: idx === 0 ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-medium)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Dish Items */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {demoItems.map(item => {
                    const qty = demoCart[item.id] || 0
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-medium)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: item.isVeg ? '#10b981' : '#ef4444'
                            }} />
                            <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {item.name}
                            </h5>
                          </div>
                          <p style={{ margin: '2px 0 6px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {item.desc}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                              ₹{item.price}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--warning-main)', fontWeight: 600 }}>
                              {item.rating}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {qty > 0 ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              background: 'var(--brand-subtle)',
                              border: '1px solid var(--brand-border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '2px 6px'
                            }}>
                              <button
                                onClick={() => handleRemoveDemoItem(item.id)}
                                aria-label="Decrease quantity"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--brand-primary)',
                                  cursor: 'pointer',
                                  padding: 4,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Minus size={13} />
                              </button>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)' }}>
                                {qty}
                              </span>
                              <button
                                onClick={() => handleAddDemoItem(item.id)}
                                aria-label="Increase quantity"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--brand-primary)',
                                  cursor: 'pointer',
                                  padding: 4,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddDemoItem(item.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--brand-border)',
                                color: 'var(--brand-primary)',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Plus size={13} />
                              ADD
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Cart Action Footer */}
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderTop: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block' }}>
                      {cartCount} {cartCount === 1 ? 'item' : 'items'} in order
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      ₹{cartTotal}
                    </span>
                  </div>

                  <button
                    onClick={handleSimulateOrder}
                    disabled={cartCount === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: cartCount > 0 ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: cartCount > 0 ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ShoppingBag size={14} />
                    Place Order →
                  </button>
                </div>
              </div>
            ) : (
              /* ─── KITCHEN KDS SIMULATION ─── */
              <div style={{ width: '100%' }}>
                {/* Kitchen Status Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-shell)',
                  border: '1px solid var(--border-medium)',
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 10px #10b981'
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Kitchen Dispatch Console · Socket.IO Live
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <Bell size={14} color="var(--brand-primary)" />
                      <span>Audio Chime: Active</span>
                    </div>
                    <button
                      onClick={() => setDemoView('customer')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Place Another Customer Order
                    </button>
                  </div>
                </div>

                {/* Orders Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: 16
                }}>
                  {demoOrders.map(order => (
                    <div
                      key={order.id}
                      style={{
                        padding: '18px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--bg-shell)',
                        border: `1px solid ${order.status === 'Preparing' ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
                              {order.id}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'var(--brand-subtle)',
                              color: 'var(--brand-primary)'
                            }}>
                              {order.table}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 2 }}>
                            Received {order.time}
                          </span>
                        </div>

                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 12,
                          fontWeight: 700,
                          background: `${order.badgeColor}18`,
                          color: order.badgeColor,
                          border: `1px solid ${order.badgeColor}35`
                        }}>
                          {order.status}
                        </span>
                      </div>

                      <p style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                        background: 'var(--bg-card)',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)'
                      }}>
                        {order.items}
                      </p>

                      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        {order.status === 'Preparing' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'Ready', '#0d9488')}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--brand-primary)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Mark as Ready ✓
                          </button>
                        )}
                        {order.status === 'Ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'Completed', '#10b981')}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: 'var(--radius-md)',
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Complete Order ✓
                          </button>
                        )}
                        {order.status === 'Completed' && (
                          <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#10b981',
                            padding: '6px'
                          }}>
                            Fulfilled & Billed ✓
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          4. HOW IT WORKS (3 SIMPLE STEPS)
          ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{
        padding: '96px 24px',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--brand-primary)',
              display: 'inline-block',
              marginBottom: 8
            }}>
              Smooth Onboarding
            </span>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(26px, 3.5vw, 42px)',
              fontWeight: 800,
              margin: '0 0 14px',
              color: 'var(--text-primary)'
            }}>
              Up and Running in 3 Easy Steps
            </h2>
            <p style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              maxWidth: 560,
              margin: '0 auto'
            }}>
              Zero technical experience required. Have your restaurant fully operational and taking orders in less than 15 minutes.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28
          }}>
            {STEPS.map((step) => {
              const IconComp = step.icon
              return (
                <div
                  key={step.num}
                  style={{
                    padding: '36px 30px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.25s ease, border-color 0.25s ease',
                    boxShadow: 'var(--shadow-card)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = 'var(--brand-border)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'var(--border-medium)'
                  }}
                >
                  {/* Subtle Big Step Number */}
                  <div style={{
                    position: 'absolute',
                    top: 18,
                    right: 24,
                    fontSize: 48,
                    fontWeight: 900,
                    fontFamily: "'Outfit', sans-serif",
                    color: 'var(--border-medium)',
                    lineHeight: 1,
                    pointerEvents: 'none'
                  }}>
                    {step.num}
                  </div>

                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-subtle)',
                    border: '1px solid var(--brand-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 22
                  }}>
                    <IconComp size={24} color="var(--brand-primary)" />
                  </div>

                  <h3 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 19,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: 'var(--text-primary)'
                  }}>
                    {step.title}
                  </h3>

                  <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: 0
                  }}>
                    {step.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          5. FEATURES & BENEFITS GRID
          ═══════════════════════════════════════════════════ */}
      <section id="features" style={{
        padding: '96px 24px',
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--brand-primary)',
              display: 'inline-block',
              marginBottom: 8
            }}>
              Why Restaurant Owners Love Us
            </span>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(26px, 3.5vw, 42px)',
              fontWeight: 800,
              margin: '0 0 14px',
              color: 'var(--text-primary)'
            }}>
              Built Specifically for Hospitality
            </h2>
            <p style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              maxWidth: 580,
              margin: '0 auto'
            }}>
              Everything you need to speed up table turnaround, reduce staff workload, and increase customer satisfaction.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24
          }}>
            {FEATURES.map((feat) => {
              const IconComp = feat.icon
              return (
                <div
                  key={feat.title}
                  style={{
                    padding: '30px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.borderColor = 'var(--brand-border)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'var(--border-medium)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginBottom: 18
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--brand-subtle)',
                      border: '1px solid var(--brand-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComp size={22} color="var(--brand-primary)" />
                    </div>

                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--brand-primary)',
                      background: 'var(--brand-subtle)',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--brand-border)'
                    }}>
                      {feat.tag}
                    </span>
                  </div>

                  <h3 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: 'var(--text-primary)'
                  }}>
                    {feat.title}
                  </h3>

                  <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: 0
                  }}>
                    {feat.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          6. PRICING SECTION
          ═══════════════════════════════════════════════════ */}
      <section id="pricing" style={{
        padding: '96px 24px',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--brand-primary)',
              display: 'inline-block',
              marginBottom: 8
            }}>
              Simple, Predictable Plans
            </span>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(26px, 3.5vw, 42px)',
              fontWeight: 800,
              margin: '0 0 14px',
              color: 'var(--text-primary)'
            }}>
              Affordable Pricing with 0% Commission
            </h2>
            <p style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              maxWidth: 580,
              margin: '0 auto 28px'
            }}>
              Choose the right plan for your seating capacity. Upgrade, downgrade, or cancel anytime with no lock-in contracts.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-full)',
              padding: 4,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: billingCycle === 'monthly' ? 'var(--brand-primary)' : 'transparent',
                  color: billingCycle === 'monthly' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: billingCycle === 'yearly' ? 'var(--brand-primary)' : 'transparent',
                  color: billingCycle === 'yearly' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Annual Billing</span>
                <span style={{
                  fontSize: 11,
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 800
                }}>
                  SAVE {rawPrices.yearly_discount_percentage || 20}%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 28,
            alignItems: 'stretch'
          }}>
            {plans.map((p) => {
              const isPopular = p.popular
              return (
                <div
                  key={p.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '36px 32px',
                    borderRadius: 'var(--radius-xl)',
                    position: 'relative',
                    background: 'var(--bg-card)',
                    border: `2px solid ${isPopular ? 'var(--brand-primary)' : 'var(--border-medium)'}`,
                    boxShadow: isPopular ? '0 12px 36px rgba(79, 70, 229, 0.15)' : 'var(--shadow-card)',
                    transition: 'transform 0.25s ease'
                  }}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div style={{
                      position: 'absolute',
                      top: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 16px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--brand-gradient)',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
                      whiteSpace: 'nowrap'
                    }}>
                      ⭐ Most Popular Choice
                    </div>
                  )}

                  <h3 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: isPopular ? 'var(--brand-primary)' : 'var(--text-primary)',
                    margin: '0 0 8px'
                  }}>
                    {p.name}
                  </h3>

                  <p style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    minHeight: 38,
                    margin: '0 0 20px',
                    lineHeight: 1.5
                  }}>
                    {p.desc}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                    <span style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 44,
                      fontWeight: 900,
                      color: 'var(--text-primary)'
                    }}>
                      {p.price}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                      {p.period}
                    </span>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: 20,
                    marginBottom: 28,
                    flex: 1
                  }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                      display: 'block',
                      marginBottom: 16
                    }}>
                      What's Included:
                    </span>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {p.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                          <Check size={16} color="var(--success-main)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ lineHeight: 1.4 }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to="/owner/register"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '13px',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      background: isPopular ? 'var(--brand-gradient)' : 'var(--bg-shell)',
                      color: isPopular ? '#ffffff' : 'var(--text-primary)',
                      border: isPopular ? 'none' : '1px solid var(--border-medium)',
                      boxShadow: isPopular ? '0 4px 16px rgba(79, 70, 229, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                      marginTop: 'auto'
                    }}
                    onMouseEnter={e => {
                      if (!isPopular) {
                        e.currentTarget.style.borderColor = 'var(--brand-primary)'
                        e.currentTarget.style.background = 'var(--brand-subtle)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isPopular) {
                        e.currentTarget.style.borderColor = 'var(--border-medium)'
                        e.currentTarget.style.background = 'var(--bg-shell)'
                      }
                    }}
                  >
                    {p.cta}
                  </Link>
                </div>
              )
            })}
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: 36,
            color: 'var(--text-tertiary)',
            fontSize: 13
          }}>
            All subscriptions include SSL security, automated cloud backups, and zero transaction cuts on customer orders.
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          7. FREQUENTLY ASKED QUESTIONS (ACCORDION)
          ═══════════════════════════════════════════════════ */}
      <section id="faqs" style={{
        padding: '96px 24px',
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--brand-primary)',
              display: 'inline-block',
              marginBottom: 8
            }}>
              Got Questions?
            </span>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(26px, 3.5vw, 42px)',
              fontWeight: 800,
              margin: '0 0 14px',
              color: 'var(--text-primary)'
            }}>
              Frequently Asked Questions
            </h2>
            <p style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              margin: '0 auto'
            }}>
              Everything restaurant and café owners need to know before getting started.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={faq.q}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-card)',
                    border: `1px solid ${isOpen ? 'var(--brand-border)' : 'var(--border-medium)'}`,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: isOpen ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: isOpen ? 'var(--brand-primary)' : 'var(--text-primary)',
                      fontFamily: "'Outfit', sans-serif",
                      paddingRight: 16
                    }}>
                      {faq.q}
                    </span>
                    <span style={{
                      color: isOpen ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0
                    }}>
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 24px 22px',
                      fontSize: 15,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.65,
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: 16
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: 40,
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--brand-subtle)',
            border: '1px solid var(--brand-border)'
          }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
              Have another question? Email us at{' '}
              <a href={`mailto:${contactEmail}`} style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'none' }}>
                {contactEmail}
              </a>{' '}
              or visit our{' '}
              <Link to="/contact-us" style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'none' }}>
                Contact Page
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          8. PRIMARY CONVERSION CTA BANNER
          ═══════════════════════════════════════════════════ */}
      <section style={{
        padding: '96px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border-light)'
      }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(79, 70, 229, 0.18), transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 900,
            lineHeight: 1.2,
            marginBottom: 16,
            color: 'var(--text-primary)'
          }}>
            Ready to Streamline Your Restaurant's Ordering?
          </h2>

          <p style={{
            fontSize: 17,
            color: 'var(--text-secondary)',
            marginBottom: 36,
            lineHeight: 1.6
          }}>
            Join forward-thinking restaurants and cafés that are cutting order delays, boosting table turns, and delivering a 5-star digital guest experience.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap'
          }}>
            <Link
              to="/owner/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '16px 36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-gradient)',
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 30px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 36px rgba(79, 70, 229, 0.55)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(79, 70, 229, 0.45)'
              }}
            >
              Create Free Owner Account
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/owner/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '16px 28px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid var(--border-medium)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)'
                e.currentTarget.style.background = 'var(--brand-subtle)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
            >
              Sign In to Existing Café
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          9. CLEAN, TRUSTWORTHY FOOTER
          ═══════════════════════════════════════════════════ */}
      <footer style={{
        padding: '64px 24px 32px',
        background: 'var(--bg-main)'
      }}>
        <div style={{
          maxWidth: 1160,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 48
        }}>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 40
          }}>
            {/* Column 1: Brand Info */}
            <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                }}>
                  <img src="/logo.png" alt="WhatTheMenu Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 19,
                  fontWeight: 800,
                  color: 'var(--text-primary)'
                }}>
                  WhatTheMenu
                </span>
              </Link>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.6
              }}>
                Empowering modern restaurants, cafés, and bars with high-speed digital menus and live order dispatch.
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--text-tertiary)'
              }}>
                <ShieldCheck size={14} color="var(--success-main)" />
                <span>SSL Encrypted · 99.9% Uptime Cloud Infrastructure</span>
              </div>
            </div>

            {/* Column 2: Navigation Groups */}
            <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap' }}>
              
              {/* Product */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-primary)'
                }}>
                  Product
                </span>
                <a href="#features" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a>
                <a href="#how-it-works" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>How It Works</a>
                <a href="#live-preview" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Live Interactive Demo</a>
                <a href="#pricing" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>SaaS Plans</a>
                <a href="#faqs" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>FAQs</a>
              </div>

              {/* Portals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-primary)'
                }}>
                  Portals
                </span>
                <Link to="/owner/login" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Owner Dashboard</Link>
                <Link to="/owner/register" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Register New Café</Link>
                <Link to="/contact-us" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact & Support</Link>
              </div>

              {/* Legal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-primary)'
                }}>
                  Legal
                </span>
                <Link to="/terms" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms & Conditions</Link>
                <Link to="/privacy-policy" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link to="/refund-policy" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Refund Policy</Link>
              </div>

            </div>
          </div>

          {/* Copyright & Signoff */}
          <div style={{
            borderTop: '1px solid var(--border-light)',
            paddingTop: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
              © 2026 WhatTheMenu. All rights reserved.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
              Crafted for hospitality excellence.
            </p>
          </div>

        </div>
      </footer>

      {/* Responsive Breakpoint Styles */}
      <style>{`
        .hidden-mobile { display: flex; }
        .visible-mobile { display: none; }
        @media (max-width: 900px) {
          .hidden-mobile { display: none !important; }
          .visible-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
