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
    bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', glow: 'rgba(6,182,212,0.1)',
    
  },
  {
    key: 'todayRevenue', label: "Today's Revenue", icon: '💸',
    bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', glow: 'rgba(16,185,129,0.1)',
    format: (v) => `₹${(v || 0).toLocaleString()}`, 
  },
  {
    key: 'pendingOrders', label: 'Pending Orders', icon: '⏳',
    bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.1)',
    
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
        {def.trend && (<span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, color: def.trendUp ? '#34d399' : '#f87171', background: def.trendUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>{def.trend}</span>)}
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
  new:       { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  accepted:  { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  preparing: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  ready:     { bg: 'rgba(6,182,212,0.12)',  color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
  completed: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
}

const OwnerDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    try {
      const res = await ownerAPI.getDashboard()
      setStats(res.data.data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

    const chartRevenueData = (stats?.dailyRevenueHistory || []).map(item => ({
    name: `${item._id.month}/${item._id.day}`,
    value: item.total
  })).reverse();

  const chartTopItemsData = (stats?.topItems || []).map(item => ({
    name: item._id,
    sales: item.sales
  }));

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff', position: 'relative' }}>

      {/* ─── Subscription Alert Banner (Portal to Topbar) ─── */}
      {!loading && stats?.subscription && stats.subscription.daysLeft <= 3 && document.getElementById('topbar-alert-portal') && createPortal(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px 4px 12px', borderRadius: 50, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>Plan expires in {stats.subscription.daysLeft} days</span>
          </div>
          <Link to="/owner/subscription" style={{ padding: '6px 12px', borderRadius: 50, background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#fff', textDecoration: 'none', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
            Renew
          </Link>
        </div>,
        document.getElementById('topbar-alert-portal')
      )}

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px', fontWeight: 500 }}>
          {greeting}, <span style={{ color: '#22d3ee' }}>{user?.name}</span> 👋
        </p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Café Dashboard
        </h1>
        <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Overview of your orders and menu performance today.</p>
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
        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>Average Rating</span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif" }}>
              {stats?.averageRating || '0.0'}<span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, marginLeft: 2 }}>/5</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#e5e7eb', margin: 0 }}>{stats?.totalReviews || 0}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>total reviews</p>
          </div>
        </div>
        
        {/* Menu Stats */}
        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(6,182,212,0.08) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif" }}>{stats?.totalCategories || 0}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#22d3ee', margin: 0 }}>Categories</p>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, fontFamily: "'Outfit',sans-serif" }}>{stats?.totalMenuItems || 0}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#22d3ee', margin: 0 }}>Menu Items</p>
          </div>
        </div>
      </div>

      
      {/* 🚀 Charts Section 🚀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 24px', color: '#fff', fontFamily: "'Outfit',sans-serif" }}>Revenue Over Time</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRevenueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} dx={-10} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, backdropFilter: 'blur(8px)' }} itemStyle={{ color: '#22d3ee', fontWeight: 600 }} />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: '24px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 24px', color: '#fff', fontFamily: "'Outfit',sans-serif" }}>Top Selling Items</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartTopItemsData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis dataKey="name" type="category" stroke="#e5e7eb" fontSize={13} tickLine={false} axisLine={false} width={90} fontWeight={500} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, backdropFilter: 'blur(8px)' }} itemStyle={{ color: '#a855f7', fontWeight: 600 }} />
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
      <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>Recent Orders Today</h2>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Latest incoming orders</p>
          </div>
          <Link to="/owner/orders" style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', textDecoration: 'none', padding: '6px 14px', borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
            View All →
          </Link>
        </div>
        
        <div style={{ padding: '12px 16px' }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />
                  <div>
                    <div style={{ width: 80, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 6, animation: 'pulse 1.5s ease infinite' }} />
                    <div style={{ width: 120, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />
                  </div>
                </div>
              </div>
            ))
          ) : stats?.recentOrders?.length > 0 ? (
            stats.recentOrders.map(order => {
              const sc = STATUS_COLORS[order.order_status] || STATUS_COLORS.new
              return (
                <div key={order._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, transition: 'background 0.15s', marginBottom: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Order</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#e5e7eb', fontFamily: "'Outfit',sans-serif" }}>{order.order_number}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{order.customer_name}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{order.items?.length || 0} items • Table {order.table_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>₹{order.total_amount}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>
                      {order.order_status}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#4b5563' }}>
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
