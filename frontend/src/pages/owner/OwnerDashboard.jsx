import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ownerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';



const STAT_DEFS = [
  {
    key: 'todayOrders', label: "Today's Orders", icon: '📋',
    bg: 'rgba(6,182,212,0.08)', border: 'var(--cyan-border-hover)', glow: 'var(--cyan-bg-light)',
    
  },
  {
    key: 'todayRevenue', label: "Today's Revenue", icon: '💸',
    bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', glow: 'var(--success-light)',
    format: (v) => `₹${(v || 0).toLocaleString()}`, 
  },
  {
    key: 'pendingOrders', label: 'Pending Orders', icon: '⏳',
    bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', glow: 'var(--warning-light)',
    
  },
  {
    key: 'completedToday', label: 'Completed Today', icon: '✅',
    bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', glow: 'rgba(139,92,246,0.1)',
    
  },
]

function StatCard({ def, value, index }) {
  const display = def.format ? def.format(value) : (value ?? 0)
  return (
    <div
      style={{
        padding: '22px 24px', borderRadius: 18, background: def.bg,
        border: `1px solid ${def.border}`, boxShadow: `0 4px 30px ${def.glow}`,
        transition: 'transform 0.25s, box-shadow 0.25s',
        animation: `slideUp 0.4s ease ${index * 0.08}s both`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${def.glow}` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 30px ${def.glow}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 24 }}>{def.icon}</div>
        {def.trend && (<span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, color: def.trendUp ? 'var(--success-text)' : 'var(--danger-text)', background: def.trendUp ? 'var(--success-light)' : 'var(--danger-light)' }}>{def.trend}</span>)}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 6px', fontWeight: 500 }}>{def.label}</p>
      <p style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-1px' }}>
        {display}
      </p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ padding: '22px 24px', borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
      <div style={{ width: 40, height: 16, borderRadius: 8, background: 'var(--border-light)', marginBottom: 16, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ width: '60%', height: 13, borderRadius: 6, background: 'var(--bg-card-hover)', marginBottom: 10, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ width: '40%', height: 32, borderRadius: 8, background: 'var(--border-light)', animation: 'pulse 1.5s ease infinite' }} />
    </div>
  )
}

const STATUS_COLORS = {
  new:       { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  accepted:  { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  preparing: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  ready:     { bg: 'var(--cyan-border-light)',  color: 'var(--cyan-text)', border: 'rgba(6,182,212,0.25)' },
  completed: { bg: 'var(--success-light)', color: 'var(--success-text)', border: 'var(--success-border)' },
}

const OwnerDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revenueDays, setRevenueDays] = useState(30)
  const { user } = useAuth()

  useEffect(() => { fetchDashboard() }, [revenueDays])

  const fetchDashboard = async () => {
    try {
      const res = await ownerAPI.getDashboard({ days: revenueDays })
      setStats(res.data.data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

    // Fill missing days
    const chartRevenueData = [];
    const revenueMap = {};
    (stats?.dailyRevenueHistory || []).forEach(item => {
      revenueMap[`${item._id.month}/${item._id.day}`] = item.total;
    });

    for (let i = revenueDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      chartRevenueData.push({
        name: key,
        value: revenueMap[key] || 0
      });
    }

  const chartTopItemsData = (stats?.topItems || []).map(item => ({
    name: item._id,
    sales: item.sales
  }));

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)', position: 'relative' }}>

      {/* ─── Subscription Alert Banner (Portal to Topbar) ─── */}
      {!loading && stats?.subscription && stats.subscription.daysLeft <= 3 && document.getElementById('topbar-alert-portal') && createPortal(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px 4px 12px', borderRadius: 50, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>Plan expires in {stats.subscription.daysLeft} days</span>
          </div>
          <Link to="/owner/subscription" style={{ padding: '6px 12px', borderRadius: 50, background: 'linear-gradient(135deg, #ef4444, #f97316)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
            Renew
          </Link>
        </div>,
        document.getElementById('topbar-alert-portal')
      )}

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 4px', fontWeight: 500 }}>
          {greeting}, <span style={{ color: 'var(--cyan-text)' }}>{user?.name}</span> 👋
        </p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Café Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Overview of your orders and menu performance today.</p>
      </div>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading
          ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          : STAT_DEFS.map((def, i) => (
              <StatCard key={def.key} def={def} value={stats?.[def.key]} index={i} />
            ))
        }
      </div>

      {/* ─── Secondary Stats (Rating & Menu) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {/* Rating */}
        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(245,158,11,0.08) 0%, var(--border-light) 100%)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>Average Rating</span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit',sans-serif" }}>
              {stats?.averageRating || '0.0'}<span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500, marginLeft: 2 }}>/5</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{stats?.totalReviews || 0}</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>total reviews</p>
          </div>
        </div>
        
        {/* Menu Stats */}
        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(6,182,212,0.08) 0%, var(--border-light) 100%)', border: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit',sans-serif" }}>{stats?.totalCategories || 0}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--cyan-text)', margin: 0 }}>Categories</p>
          </div>
          <div style={{ width: 1, height: 40, background: 'var(--border-hover)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit',sans-serif" }}>{stats?.totalMenuItems || 0}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--cyan-text)', margin: 0 }}>Menu Items</p>
          </div>
        </div>
      </div>

      
      {/* 🚀 Charts Section 🚀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, var(--border-light) 0%, var(--border-light) 100%)', border: '1px solid var(--border-medium)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>Revenue Over Time</h2>
              <select
                value={revenueDays}
                onChange={(e) => setRevenueDays(Number(e.target.value))}
                style={{
                  background: 'var(--border-light)', border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)', borderRadius: 8, padding: '4px 12px', fontSize: 12, outline: 'none', cursor: 'pointer'
                }}
              >
                <option value={7} style={{ background: 'var(--bg-shell)', color: 'var(--text-primary)' }}>Last 7 Days</option>
                <option value={30} style={{ background: 'var(--bg-shell)', color: 'var(--text-primary)' }}>Last 30 Days</option>
                <option value={90} style={{ background: 'var(--bg-shell)', color: 'var(--text-primary)' }}>Last 90 Days</option>
              </select>
            </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRevenueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} dx={-10} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hover)', borderRadius: 12, backdropFilter: 'blur(8px)' }} itemStyle={{ color: 'var(--cyan-text)', fontWeight: 600 }} />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: 'var(--cyan-text)', stroke: 'var(--text-primary)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, var(--border-light) 0%, var(--border-light) 100%)', border: '1px solid var(--border-medium)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 24px', color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>Top Selling Items</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartTopItemsData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis dataKey="name" type="category" stroke="#e5e7eb" fontSize={13} tickLine={false} axisLine={false} width={90} fontWeight={500} />
                <RechartsTooltip cursor={{ fill: 'var(--bg-card-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hover)', borderRadius: 12, backdropFilter: 'blur(8px)' }} itemStyle={{ color: 'var(--purple-text)', fontWeight: 600 }} />
                <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={16}>
                  {chartTopItemsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#a855f7" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Recent Orders ─── */}
      <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Recent Orders Today</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>Latest incoming orders</p>
          </div>
          <Link to="/owner/orders" style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, background: 'var(--cyan-bg-light)', border: '1px solid rgba(6,182,212,0.2)' }}>
            View All →
          </Link>
        </div>
        
        <div style={{ padding: '12px 16px' }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--border-light)', animation: 'pulse 1.5s ease infinite' }} />
                  <div>
                    <div style={{ width: 80, height: 12, borderRadius: 4, background: 'var(--border-light)', marginBottom: 6, animation: 'pulse 1.5s ease infinite' }} />
                    <div style={{ width: 120, height: 10, borderRadius: 4, background: 'var(--bg-input)', animation: 'pulse 1.5s ease infinite' }} />
                  </div>
                </div>
              </div>
            ))
          ) : stats?.recentOrders?.length > 0 ? (
            stats.recentOrders.map(order => {
              const sc = STATUS_COLORS[order.order_status] || STATUS_COLORS.new
              return (
                <div key={order._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, transition: 'background 0.15s', marginBottom: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--border-light)', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Order</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>{order.order_number}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{order.customer_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{order.items?.length || 0} items • Table {order.table_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>₹{order.total_amount}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>
                      {order.order_status}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <p style={{ fontSize: 14, margin: 0 }}>No orders yet today.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default OwnerDashboard
