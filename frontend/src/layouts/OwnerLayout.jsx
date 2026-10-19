import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from '../components/NotificationBell'
import {
  LayoutDashboard,
  BellRing,
  History,
  UtensilsCrossed,
  CreditCard,
  TrendingUp,
  QrCode,
  Star,
  Sparkles,
  Settings,
  HelpCircle,
  LogOut,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  User,
  Sun,
  Moon,
  AlertTriangle,
  Store,
  ChevronRight
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: 'OPERATIONS',
    links: [
      { to: '/owner', end: true, label: 'Dashboard', icon: LayoutDashboard },
      { to: '/owner/orders', label: 'Live Orders', icon: BellRing },
      { to: '/owner/completed-orders', label: 'Order History', icon: History },
      { to: '/owner/menu', label: 'Menu & Dishes', icon: UtensilsCrossed },
    ]
  },
  {
    title: 'MANAGEMENT',
    links: [
      { to: '/owner/payments', label: 'Payments', icon: CreditCard },
      { to: '/owner/revenue', label: 'Revenue Analytics', icon: TrendingUp },
      { to: '/owner/qr-code', label: 'Table QR Codes', icon: QrCode },
      { to: '/owner/feedback', label: 'Customer Reviews', icon: Star },
    ]
  },
  {
    title: 'SETTINGS & ACCOUNT',
    links: [
      { to: '/owner/subscription', label: 'Subscription Plan', icon: Sparkles },
      { to: '/owner/settings', label: 'Café Settings', icon: Settings },
      { to: '/owner/support', label: 'Help & Support', icon: HelpCircle },
    ]
  }
]

function NavItem({ link, onClick }) {
  const IconComp = link.icon
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderRadius: '0 18px 18px 0',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        transition: 'all 0.2s ease',
        color: isActive ? '#ffffff' : 'var(--text-secondary)',
        background: isActive
          ? 'linear-gradient(90deg, rgba(79, 70, 229, 0.2) 0%, rgba(79, 70, 229, 0) 100%)'
          : 'transparent',
        borderLeft: isActive ? '4px solid var(--brand-primary)' : '4px solid transparent',
        marginLeft: '-1px'
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.style.borderLeft.includes('var(--brand-primary)')) {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.style.borderLeft.includes('var(--brand-primary)')) {
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <IconComp size={18} />
      <span>{link.label}</span>
    </NavLink>
  )
}

function SidebarContent({ user, onLogout, onClose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--border-medium)'
      }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 'var(--radius-md)',
          background: 'var(--brand-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
        }}>
          <Store size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            margin: 0,
            color: 'var(--text-primary)',
            fontSize: 16,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {user?.name || 'My Café'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981'
            }} />
            <span style={{
              color: 'var(--brand-primary)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Owner Portal
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav style={{
        flex: 1,
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        overflowY: 'auto'
      }}>
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx}>
            <div style={{
              padding: '0 20px',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--text-tertiary)',
                letterSpacing: '1.2px',
                textTransform: 'uppercase'
              }}>
                {group.title}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.links.map(link => (
                <NavItem key={link.to} link={link} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}

        {/* Bottom Sidebar Action: Logout */}
        <div style={{ marginTop: 'auto', padding: '12px 16px 20px' }}>
          <div style={{ height: 1, background: 'var(--border-light)', marginBottom: 12 }} />
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              background: 'transparent',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger-text)'
              e.currentTarget.style.borderColor = 'var(--danger-border)'
              e.currentTarget.style.background = 'var(--danger-light)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'var(--border-medium)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

const OwnerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const daysRemaining = (() => {
    if (!user?.subscription?.end_date) return null
    const endDate = new Date(user.subscription.end_date)
    const diffTime = endDate.getTime() - new Date().getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  })()

  const handleLogout = () => {
    logout()
    navigate('/owner/login')
  }

  const allLinks = NAV_GROUPS.flatMap(g => g.links)
  const activeLink = allLinks.find(l => l.end ? location.pathname === l.to : location.pathname.startsWith(l.to))
  const pageTitle = activeLink?.label || 'Dashboard'

  const isRestricted = user?.subscription_status === 'suspended'
    && location.pathname !== '/owner/subscription'
    && location.pathname !== '/owner/support'

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-shell)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: 'var(--text-primary)'
    }}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg)',
            zIndex: 250,
            backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className="owner-sidebar-mobile"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 270,
          zIndex: 300,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-medium)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
          boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: 6
          }}
        >
          <X size={20} />
        </button>
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Desktop Sticky Sidebar */}
      <aside
        className="owner-sidebar-desktop"
        style={{
          width: 260,
          flexShrink: 0,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-medium)',
          height: '100vh',
          position: 'sticky',
          top: 0
        }}
      >
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => {}} />
      </aside>

      {/* Main App Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: 66,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'var(--bg-topbar)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-medium)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          {/* Left: Mobile hamburger & Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="owner-hamburger"
              aria-label="Open menu"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'none',
                alignItems: 'center'
              }}
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {user?.name || 'Café'}
              </span>
              <ChevronRight size={14} color="var(--text-tertiary)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Center: Subscription Warning Pill */}
          <div id="topbar-alert-portal" style={{ flex: 1, margin: '0 20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            {user?.subscription_status === 'expired' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--danger-text)',
                fontSize: 12,
                fontWeight: 600
              }}>
                <AlertTriangle size={15} />
                <span>Plan expired! QR menu disabled.</span>
                <Link to="/owner/subscription" style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: 700 }}>
                  Renew
                </Link>
              </div>
            )}
            {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3 && user?.subscription_status !== 'expired' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--warning-light)',
                border: '1px solid var(--warning-border)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                color: '#fbbf24',
                fontSize: 12,
                fontWeight: 600
              }}>
                <AlertTriangle size={15} />
                <span>{daysRemaining === 0 ? 'Expires today!' : `Expires in ${daysRemaining}d`}</span>
                <Link to="/owner/subscription" style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: 700 }}>
                  Upgrade
                </Link>
              </div>
            )}
          </div>

          {/* Right Action Icons & Profile Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* View Live Customer Menu */}
            <Link
              to={`/${user?.id}/menu`}
              target="_blank"
              title="Open Live Diner Menu in New Tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-subtle)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand-primary)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--brand-primary)'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--brand-subtle)'
                e.currentTarget.style.color = 'var(--brand-primary)'
              }}
            >
              <ExternalLink size={14} />
              <span className="hidden-mobile">View Menu</span>
            </Link>

            {/* Notification Bell */}
            <NotificationBell role="owner" />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Profile Dropdown Trigger */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px 4px 4px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
              >
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <ChevronDown size={14} color="var(--text-secondary)" />
              </button>

              {/* Profile Dropdown Menu Card */}
              {profileOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  width: 250,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 200,
                  padding: '12px',
                  animation: 'fadeIn 0.15s ease'
                }}>
                  {/* Café & Owner Details */}
                  <div style={{ padding: '4px 8px 10px', borderBottom: '1px solid var(--border-light)' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {user?.name || 'Café Owner'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.email}
                    </p>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'var(--brand-subtle)',
                        color: 'var(--brand-primary)'
                      }}>
                        {user?.subscription_plan || 'Pro'} Plan · Active
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Navigation Links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0' }}>
                    <Link
                      to="/owner/settings"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={15} color="var(--text-secondary)" />
                      <span>Café Settings</span>
                    </Link>

                    <Link
                      to="/owner/subscription"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Sparkles size={15} color="var(--brand-primary)" />
                      <span>Subscription & Plan</span>
                    </Link>

                    <Link
                      to={`/${user?.id}/menu`}
                      target="_blank"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <ExternalLink size={15} color="var(--text-secondary)" />
                      <span>Diner QR Preview</span>
                    </Link>
                  </div>

                  {/* Sign Out Button */}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                    <button
                      onClick={() => {
                        setProfileOpen(false)
                        handleLogout()
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--danger-text)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="owner-content" style={{
          flex: 1,
          padding: '24px',
          maxWidth: 1400,
          width: '100%',
          margin: '0 auto'
        }}>
          {isRestricted ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '48px 20px',
              minHeight: '60vh'
            }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20
              }}>
                <AlertTriangle size={36} color="var(--danger-text)" />
              </div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--danger-text)',
                margin: '0 0 12px',
                fontFamily: "'Outfit', sans-serif"
              }}>
                Portal Access Suspended
              </h2>
              <p style={{
                fontSize: 15,
                color: 'var(--text-secondary)',
                maxWidth: 480,
                lineHeight: 1.6,
                margin: '0 0 32px'
              }}>
                Your café subscription is currently suspended. Please renew your plan to restore real-time orders, customer QR menus, and dashboard controls.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link
                  to="/owner/subscription"
                  style={{
                    padding: '12px 28px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-gradient)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 700
                  }}
                >
                  Renew Subscription →
                </Link>
                <Link
                  to="/owner/support"
                  style={{
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  Contact Support
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (Screens <= 1024px) */}
        <nav
          className="owner-bottom-nav"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 150,
            background: 'var(--bg-sidebar)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border-medium)',
            padding: '6px 8px calc(env(safe-area-inset-bottom, 0px) + 6px)',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}
        >
          {[
            { to: '/owner', end: true, label: 'Dashboard', icon: LayoutDashboard },
            { to: '/owner/orders', label: 'Orders', icon: BellRing },
            { to: '/owner/menu', label: 'Menu', icon: UtensilsCrossed },
            { to: '/owner/qr-code', label: 'QRs', icon: QrCode },
            { to: '/owner/settings', label: 'Settings', icon: Settings },
          ].map(item => {
            const ItemIcon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  background: isActive ? 'var(--brand-subtle)' : 'transparent',
                  transition: 'all 0.2s ease'
                })}
              >
                <ItemIcon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .owner-sidebar-mobile { display: none; }
        .owner-sidebar-desktop { display: flex; }
        .owner-hamburger { display: none !important; }
        .owner-content { padding: 24px; }
        .owner-bottom-nav { display: none; }
        @media (max-width: 1024px) {
          .owner-sidebar-mobile { display: flex; }
          .owner-sidebar-desktop { display: none; }
          .owner-hamburger { display: flex !important; }
          .owner-content { padding: 16px !important; padding-bottom: 74px !important; }
          .owner-bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

export default OwnerLayout
