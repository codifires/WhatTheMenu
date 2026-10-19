import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'
import ThemeToggle from '../components/ThemeToggle'
import { 
  LayoutDashboard, Store, TrendingUp, Crown, CreditCard, 
  Settings, Sparkles, Image, HelpCircle, Terminal, 
  Menu, X, LogOut, ChevronRight, Shield
} from 'lucide-react'

const NAV_LINKS = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/cafes', icon: Store, label: 'Café Accounts' },
  { to: '/admin/revenue', icon: TrendingUp, label: 'Platform Revenue' },
  { to: '/admin/subscriptions', icon: Crown, label: 'Subscriptions' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payment Logs' },
  { to: '/admin/services', icon: Sparkles, label: 'Plan Features' },
  { to: '/admin/media', icon: Image, label: 'Media Library' },
  { to: '/admin/support', icon: HelpCircle, label: 'Support Desk' },
  { to: '/admin/logs', icon: Terminal, label: 'System Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Platform Config' },
]

function NavItem({ link, onClick }) {
  const Icon = link.icon
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all
        ${isActive 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-white/10' 
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
        }
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{link.label}</span>
    </NavLink>
  )
}

function SidebarContent({ user, onLogout, onClose }) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border-r border-[var(--border-medium)] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[var(--border-medium)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-[var(--text-primary)] font-heading tracking-tight leading-tight">
              WhatThe<span className="text-cyan-400">Menu</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Super Admin
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 p-3.5 space-y-1 overflow-y-auto scrollbar-none">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-2">
          Platform Operations
        </div>
        {NAV_LINKS.map(link => (
          <NavItem key={link.to} link={link} onClick={onClose} />
        ))}
      </div>

      {/* Admin Profile Footer */}
      <div className="p-3.5 border-t border-[var(--border-medium)] bg-[var(--bg-input)]/40">
        <div className="flex items-center gap-3 p-2 rounded-xl mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[var(--text-primary)] truncate">
              {user?.name || 'Administrator'}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] truncate">
              {user?.email || 'admin@whatthemenu.com'}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </div>
  )
}

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/admin/codifires')
  }

  const currentRoute = NAV_LINKS.find(l => 
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  )
  const pageTitle = currentRoute?.label || 'Super Admin'

  return (
    <div className="min-h-screen bg-[var(--bg-shell)] text-[var(--text-primary)] flex font-sans">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:hidden transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 flex-shrink-0 z-30">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-[var(--border-medium)] bg-[var(--bg-shell)]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <span>Super Admin</span>
              <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
              <span className="font-semibold text-[var(--text-primary)]">{pageTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell role="admin" />
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page Children Body */}
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
