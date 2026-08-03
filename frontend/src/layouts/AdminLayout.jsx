import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  {
    to: '/admin',
    end: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    to: '/admin/cafes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    label: 'Cafés',
  },
  {
    to: '/admin/revenue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    label: 'Revenue',
  },
  {
    to: '/admin/subscriptions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    label: 'Subscriptions',
  },
  {
    to: '/admin/settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    label: 'Settings',
  },
  {
    to: '/admin/services',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
      </svg>
    ),
    label: 'Plan Services',
  },
  {
    to: '/admin/media',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    label: 'Media Library',
  },
]

const S = {
  // layout
  shell: {
    display: 'flex', minHeight: '100vh',
    background: '#080c14',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#fff',
  },
  // sidebar
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 200, backdropFilter: 'blur(4px)',
  },
  sidebar: (open) => ({
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: 256, zIndex: 300,
    background: 'rgba(10,13,24,0.98)',
    borderRight: '1px solid rgba(124,58,237,0.12)',
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
    borderRight: '1px solid rgba(124,58,237,0.1)',
    display: 'flex', flexDirection: 'column',
    height: '100vh', position: 'sticky', top: 0,
  },
  logo: {
    padding: '24px 20px', borderBottom: '1px solid rgba(124,58,237,0.1)',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  logoIcon: {
    width: 38, height: 38, borderRadius: 12,
    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
    flexShrink: 0,
  },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' },
  navLabel: { fontSize: 10, fontWeight: 700, color: '#374151', letterSpacing: 2, textTransform: 'uppercase', padding: '12px 12px 6px' },
  // topbar
  topbar: {
    height: 64, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    background: 'rgba(10,13,24,0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' },
  content: { flex: 1, padding: '28px 28px', overflowX: 'hidden' },
}

function NavItem({ link, onClick }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12,
        textDecoration: 'none', fontSize: 14, fontWeight: 500,
        transition: 'all 0.15s',
        color: isActive ? '#c4b5fd' : '#6b7280',
        background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
      })}
      onMouseEnter={e => { if (!e.currentTarget.style.background.includes('124')) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#e5e7eb' }}}
      onMouseLeave={e => { if (!e.currentTarget.style.background.includes('124')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' }}}
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
        <div style={S.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM17 17h4M17 21v-4M21 14h-4v4"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.3px' }}>QRMenu</p>
          <p style={{ fontSize: 11, color: '#7c3aed', margin: 0, fontWeight: 600, letterSpacing: 1 }}>ADMIN PANEL</p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={S.nav}>
        <p style={S.navLabel}>Main Menu</p>
        {NAV_LINKS.map(link => (
          <NavItem key={link.to} link={link} onClick={onClose} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: '#4b5563', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        {/* Logout */}
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

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  // Current page title from path
  const pageTitle = NAV_LINKS.find(l => l.end ? location.pathname === l.to : location.pathname.startsWith(l.to))?.label || 'Admin'

  return (
    <div style={S.shell}>
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div style={S.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar (mobile: drawer) ── */}
      <aside style={S.sidebar(sidebarOpen)} className="admin-sidebar-mobile">
        <button
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Sidebar (desktop: static) ── */}
      <aside style={S.sidebarDesktop} className="admin-sidebar-desktop">
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => {}} />
      </aside>

      {/* ── Main Area ── */}
      <div style={S.main}>
        {/* Top bar */}
        <header style={S.topbar}>
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'none' }}
            className="admin-hamburger"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>Admin</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{pageTitle}</span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Notification bell */}
            <button
              style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', position: 'relative', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; e.currentTarget.style.color = '#a78bfa' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9ca3af' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', border: '2px solid #080c14' }} />
            </button>

            {/* User avatar */}
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={S.content} className="admin-content">
          {children}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }

        /* Desktop: hide mobile sidebar, show desktop sidebar */
        .admin-sidebar-mobile { display: none !important; }
        .admin-sidebar-desktop { display: flex; }
        .admin-hamburger { display: none !important; }
        .admin-content { padding: 28px !important; }

        @media (max-width: 1024px) {
          .admin-sidebar-mobile { display: flex !important; }
          .admin-sidebar-desktop { display: none !important; }
          .admin-hamburger { display: flex !important; }
          .admin-content { padding: 16px !important; }
        }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.5); }
      `}</style>
    </div>
  )
}

export default AdminLayout
