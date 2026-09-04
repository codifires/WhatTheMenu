import { NavLink, useParams, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { customerAPI } from '../services/api'
import { useCart } from '../context/CartContext'

const CustomerLayout = ({ children }) => {
  const { cafeId } = useParams()
  const location = useLocation()
  const { totalItems } = useCart()
  const id = cafeId || localStorage.getItem('cartCafeId') || ''
  const isCheckout = location.pathname.includes('/checkout')
  useEffect(() => {
    if (!id) return;
    
    // Set instantly from cache to prevent flashing
    const cachedTheme = localStorage.getItem('cafeTheme_' + id) || 'classic';
    document.body.className = `customer-theme theme-${cachedTheme}`;
    
    // Fetch latest in background
    customerAPI.getCafeMenu(id).then(res => {
      const active = res.data.data.cafe?.theme_settings?.active_theme || 'classic';
      if (active !== cachedTheme) {
        localStorage.setItem('cafeTheme_' + id, active);
        document.body.className = `customer-theme theme-${active}`;
      }
    }).catch(err => console.error('Failed to fetch theme for layout:', err));
    
    return () => {
      document.body.className = '';
    }
  }, [id])


  const navItems = [
    { to: `/${id}/menu`, label: 'Menu', end: true, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    )},
    { to: `/${id}/menu/search`, label: 'Search', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )},
    { to: `/${id}/menu/cart`, label: 'Cart', badge: totalItems, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    )},
    { to: `/${id}/menu/orders`, label: 'Orders', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    )},
    { to: `/${id}/menu/feedback`, label: 'Feedback', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    )},
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: isCheckout ? 0 : 100, maxWidth: 500, margin: '0 auto', position: 'relative', fontFamily: "'Inter',sans-serif" }}>
      
      {/* Content Area */}
      {children}

      {/* Floating Bottom Navigation (Hidden on Checkout) */}
      {!isCheckout && (
        <nav style={{ position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 100, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '100%', maxWidth: 440, background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 30, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.05)',
            padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20,
                  textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  background: isActive ? 'var(--accent-bg-subtle)' : 'transparent',
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0)'
                })}
              >
                <div style={{ position: 'relative' }}>
                  {item.icon}
                  {item.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -8, minWidth: 18, height: 18, background: '#ef4444', color: 'var(--text-primary)',
                      fontSize: 10, fontWeight: 800, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--bg-main)', padding: '0 4px', animation: 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <style>{`
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default CustomerLayout
