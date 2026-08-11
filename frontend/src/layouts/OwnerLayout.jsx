import { useState } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'

const NAV_LINKS = [
  {
    to: '/owner', end: true, label: 'Dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    to: '/owner/orders', label: 'Live Orders',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  },
  {
    to: '/owner/completed-orders', label: 'Order History',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  },
  {
    to: '/owner/payments', label: 'Payments',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
  },
  {
    to: '/owner/revenue', label: 'Revenue',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
  },
  {
    to: '/owner/menu', label: 'Menu',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
  },
  {
    to: '/owner/categories', label: 'Categories',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
  },
  {
    to: '/owner/qr-code', label: 'QR Code',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h6v6h-6zM15 15v6M21 15v6"/></svg>
  },
  {
    to: '/owner/feedback', label: 'Feedback',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  },
  {
    to: '/owner/subscription', label: 'Subscription',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
  },
  {
    to: '/owner/settings', label: 'Settings',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
  },
  {
    to: '/owner/support', label: 'Help & Support',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  },
]

const S = {
  shell: {
    display: 'flex', minHeight: '100vh',
    background: '#080c14',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#fff',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 200, backdropFilter: 'blur(4px)',
  },
  sidebar: (open) => ({
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: 256, zIndex: 300,
    background: 'rgba(10,13,24,0.98)',
    borderRight: '1px solid rgba(6,182,212,0.15)',
    backdropFilter: 'blur(20px)',
    display: 'flex', flexDirection: 'column',
    transform: open ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
    boxShadow: open ? '4px 0 40px rgba(0,0,0,0.5)' : 'none',
  }),
  sidebarDesktop: {
    position: 'relative', transform: 'none',
    width: 256, flexShrink: 0,
    background: 'rgba(10,13,24,0.95)',
    borderRight: '1px solid rgba(6,182,212,0.12)',
    display: 'flex', flexDirection: 'column',
    height: '100vh', position: 'sticky', top: 0,
  },
  logo: {
    padding: '24px 20px', borderBottom: '1px solid rgba(6,182,212,0.12)',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  logoIcon: {
    width: 38, height: 38, borderRadius: 12,
    background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
    flexShrink: 0, fontSize: 18, color: '#fff'
  },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' },
  navLabel: { fontSize: 10, fontWeight: 700, color: '#4b5563', letterSpacing: 2, textTransform: 'uppercase', padding: '12px 12px 6px' },
  topbar: {
    height: 64, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 24px',
    background: 'rgba(10,13,24,0.85)', backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' },
  content: { flex: 1, padding: '28px 28px', overflowX: 'hidden' },
}

function NavItem({ link, onClick }) {
  return (
    <NavLink
      to={link.to} end={link.end} onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12,
        textDecoration: 'none', fontSize: 14, fontWeight: 500,
        transition: 'all 0.15s',
        color: isActive ? '#67e8f9' : '#6b7280',
        background: isActive ? 'rgba(6,182,212,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(6,182,212,0.2)' : '1px solid transparent',
      })}
      onMouseEnter={e => { if (!e.currentTarget.style.background.includes('182')) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#e5e7eb' }}}
      onMouseLeave={e => { if (!e.currentTarget.style.background.includes('182')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' }}}
    >
      {link.icon}
      {link.label}
    </NavLink>
  )
}

function SidebarContent({ user, onLogout, onClose }) {
  return (
    <>
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>☕</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'My Café'}
          </p>
          <p style={{ fontSize: 11, color: '#06b6d4', margin: 0, fontWeight: 600, letterSpacing: 1 }}>OWNER PORTAL</p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={S.nav}>
        <p style={S.navLabel}>Café Management</p>
        {NAV_LINKS.map(link => (
          <NavItem key={link.to} link={link} onClick={onClose} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: '#4b5563', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'none', border: '1px solid transparent', width: '100%', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#6b7280', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = 'transparent' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign Out
        </button>
      </div>
    </>
  )
}

const OwnerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const daysRemaining = (() => {
    if (!user?.subscription?.end_date) return null;
    const endDate = new Date(user.subscription.end_date);
    const diffTime = endDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const handleLogout = () => {
    logout()
    navigate('/owner/login')
  }

  const pageTitle = NAV_LINKS.find(l => l.end ? location.pathname === l.to : location.pathname.startsWith(l.to))?.label || 'Dashboard'

  return (
    <div style={S.shell}>
      {sidebarOpen && <div style={S.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside style={S.sidebar(sidebarOpen)} className="owner-sidebar-mobile">
        <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      <aside style={S.sidebarDesktop} className="owner-sidebar-desktop">
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => {}} />
      </aside>

      <div style={S.main}>
        <header style={S.topbar}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'none' }} className="owner-hamburger">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>Café</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{pageTitle}</span>
          </div>

          <div id="topbar-alert-portal" style={{ flex: 1, margin: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '6px 12px', borderRadius: 8, color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {daysRemaining === 0 ? 'Your plan expires today!' : `Your plan expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}!`}
                <Link to="/owner/subscription" style={{ color: '#fff', marginLeft: 8, textDecoration: 'underline' }}>Upgrade</Link>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to={`/menu/${user?.id}`} target="_blank" title="Preview Store"
              style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.color = '#10b981' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9ca3af' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </Link>
            
            {/* Real-Time Live Notification Bell */}
            <NotificationBell role="owner" />
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          </div>
        </header>

        <main style={S.content} className="owner-content">
          {children}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .owner-sidebar-mobile { display: none !important; }
        .owner-sidebar-desktop { display: flex; }
        .owner-hamburger { display: none !important; }
        .owner-content { padding: 28px !important; }
        @media (max-width: 1024px) {
          .owner-sidebar-mobile { display: flex !important; }
          .owner-sidebar-desktop { display: none !important; }
          .owner-hamburger { display: flex !important; }
          .owner-content { padding: 16px !important; }
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
      `}</style>
    </div>
  )
}

export default OwnerLayout
