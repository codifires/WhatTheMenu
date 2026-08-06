import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const card = (bg, border, glow) => ({
  padding: '24px',
  borderRadius: 18,
  background: bg,
  border: `1px solid ${border}`,
  boxShadow: `0 4px 24px ${glow}`,
  transition: 'transform 0.2s, box-shadow 0.2s',
})

const STAT_DEFS = [
  {
    key: 'totalCafes',
    label: 'Total Cafés',
    icon: '🏪',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
    glow: 'rgba(124,58,237,0.1)',
    accent: '#a78bfa',
    trend: '+12%',
    trendUp: true,
  },
  {
    key: 'activePlans',
    label: 'Active Plans',
    icon: '✅',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.2)',
    glow: 'rgba(16,185,129,0.08)',
    accent: '#34d399',
    trend: '+5%',
    trendUp: true,
  },
  {
    key: 'expiredPlans',
    label: 'Expired Plans',
    icon: '⚠️',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.2)',
    glow: 'rgba(245,158,11,0.08)',
    accent: '#fbbf24',
    trend: '-2%',
    trendUp: false,
  },
  {
    key: 'monthlyRevenue',
    label: 'Monthly Recurring Revenue (MRR)',
    icon: '💰',
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.2)',
    glow: 'rgba(99,102,241,0.08)',
    accent: '#818cf8',
    format: (v) => `₹${(v || 0).toLocaleString()}`,
    trend: 'Active',
    trendUp: true,
  },
  {
    key: 'openTickets',
    label: 'Open Support Tickets',
    icon: '🎧',
    bg: 'rgba(56,189,248,0.06)',
    border: 'rgba(56,189,248,0.25)',
    glow: 'rgba(56,189,248,0.1)',
    accent: '#38bdf8',
    trend: 'Live Tickets',
    trendUp: true,
  },
]

function StatCard({ def, value, index }) {
  const display = def.format ? def.format(value) : (value ?? 0)
  return (
    <div
      style={{
        padding: '22px 24px',
        borderRadius: 18,
        background: def.bg,
        border: `1px solid ${def.border}`,
        boxShadow: `0 4px 30px ${def.glow}`,
        transition: 'transform 0.25s, box-shadow 0.25s',
        animation: `slideUp 0.4s ease ${index * 0.08}s both`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${def.glow}` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 30px ${def.glow}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 24 }}>{def.icon}</div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50,
          color: def.trendUp ? '#34d399' : '#f87171',
          background: def.trendUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        }}>
          {def.trend}
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 6px', fontWeight: 500 }}>{def.label}</p>
      <p style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-1px' }}>
        {display}
      </p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ padding: '22px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 40, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.06)', marginBottom: 16, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ width: '60%', height: 13, borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 10, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ width: '40%', height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease infinite' }} />
    </div>
  )
}

const STATUS_COLORS = {
  active: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.2)' },
  suspended: { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' },
  expired: { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  pending: { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
}

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const res = await adminAPI.getDashboard()
      setStats(res.data.data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px', fontWeight: 500 }}>
          {greeting}, <span style={{ color: '#a78bfa' }}>{user?.name}</span> 👋
        </p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Platform Dashboard
        </h1>
        <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Overview of all cafés and subscriptions across the platform.</p>
      </div>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {loading
          ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          : STAT_DEFS.map((def, i) => (
              <StatCard key={def.key} def={def} value={stats?.[def.key]} index={i} />
            ))
        }
      </div>

      {/* ─── Two-column section ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>

        {/* Recent Cafés */}
        <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>Recent Cafés</h2>
              <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Latest registered cafés</p>
            </div>
            <Link to="/admin/cafes" style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              View All →
            </Link>
          </div>
          {/* Rows */}
          <div style={{ padding: '8px 0' }}>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', flexShrink: 0, animation: 'pulse 1.5s ease infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '50%', height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 6, animation: 'pulse 1.5s ease infinite' }} />
                    <div style={{ width: '70%', height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />
                  </div>
                </div>
              ))
            ) : stats?.recentCafes?.length > 0 ? (
              stats.recentCafes.slice(0, 6).map(cafe => {
                const sc = STATUS_COLORS[cafe.subscription_status] || STATUS_COLORS.pending
                return (
                  <div key={cafe._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {cafe.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cafe.name}</p>
                      <p style={{ fontSize: 11, color: '#4b5563', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cafe.email}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'capitalize', flexShrink: 0 }}>
                      {cafe.subscription_status}
                    </span>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#374151' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
                <p style={{ fontSize: 14, margin: 0 }}>No cafés registered yet</p>
                <Link to="/admin/cafes" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 600, color: '#7c3aed', textDecoration: 'none' }}>+ Add First Café</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick stats mini */}
          <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>Quick Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { to: '/admin/cafes', icon: '🏪', label: 'Add New Café', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
                { to: '/admin/support', icon: '🎧', label: 'Support Queue', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)' },
                { to: '/admin/subscriptions', icon: '💳', label: 'Manage Plans', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                { to: '/admin/settings', icon: '⚙️', label: 'Settings', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
              ].map(a => (
                <Link key={a.to + a.label} to={a.to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', borderRadius: 14, background: a.bg, border: `1px solid ${a.border}`, textDecoration: 'none', transition: 'transform 0.2s, opacity 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: a.color, textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform health */}
          <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>Platform Health</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Active Cafés', val: loading ? 0 : stats?.activePlans || 0, max: loading ? 10 : Math.max(stats?.totalCafes, 1), color: '#34d399' },
                { label: 'Plan Renewal Rate', val: 85, max: 100, color: '#818cf8', suffix: '%' },
                { label: 'Platform Uptime', val: 99, max: 100, color: '#7c3aed', suffix: '%' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>{m.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.suffix ? `${m.val}${m.suffix}` : `${m.val}/${m.max}`}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((m.val / m.max) * 100, 100)}%`, background: m.color, borderRadius: 3, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Support Tickets (Top Priority Queue) ─── */}
      {stats?.recentTickets?.length > 0 && (
        <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(56,189,248,0.2)', overflow: 'hidden', marginBottom: 28, boxShadow: '0 4px 24px rgba(56,189,248,0.06)' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(56,189,248,0.03)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎧</span>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#fff' }}>Recent Support Inquiries</h2>
                {stats?.urgentTickets > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                    ⚡ {stats.urgentTickets} Urgent
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Latest issues reported by café owners requiring review</p>
            </div>
            <Link to="/admin/support" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#38bdf8', textDecoration: 'none', padding: '8px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}>
              Open Support Queue →
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Ticket ID', 'Café', 'Subject', 'Priority', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#4b5563', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentTickets.map(t => (
                  <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 800, fontFamily: 'monospace', color: '#60a5fa', fontSize: 12 }}>
                      {t.ticket_number}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      {t.cafe_id?.name || 'Café'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: '#cbd5e1', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.subject}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: t.priority === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', color: t.priority === 'urgent' ? '#f87171' : '#94a3b8' }}>
                        {t.priority === 'urgent' ? '⚡ Urgent' : 'Standard'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, textTransform: 'capitalize', background: t.status === 'open' ? 'rgba(56,189,248,0.15)' : 'rgba(16,185,129,0.15)', color: t.status === 'open' ? '#38bdf8' : '#34d399' }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <Link to="/admin/support" style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textDecoration: 'none' }}>
                        Respond →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Recent Table (Full width) ─── */}
      <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>All Registered Cafés</h2>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Complete list with status and subscription details</p>
          </div>
          <Link to="/admin/cafes" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Café
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Café Name', 'Email', 'Plan', 'Status', 'Joined', ''].map(h => (
                  <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#4b5563', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} style={{ padding: '16px 20px' }}>
                        <div style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : stats?.recentCafes?.length > 0 ? (
                stats.recentCafes.map(cafe => {
                  const sc = STATUS_COLORS[cafe.subscription_status] || STATUS_COLORS.pending
                  return (
                    <tr key={cafe._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {cafe.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap' }}>{cafe.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280' }}>{cafe.email}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#9ca3af', textTransform: 'capitalize' }}>{cafe.subscription?.plan_name || 'N/A'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>
                          {cafe.subscription_status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' }}>
                        {new Date(cafe.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <Link to="/admin/cafes" style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', textDecoration: 'none', padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.06)', whiteSpace: 'nowrap' }}>
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#374151' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', margin: '0 0 8px' }}>No cafés registered yet</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: '0 0 16px' }}>Add your first café to get started.</p>
                    <Link to="/admin/cafes" style={{ fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                      + Add First Café
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default AdminDashboard
