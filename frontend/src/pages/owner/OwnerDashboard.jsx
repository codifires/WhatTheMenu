import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ownerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Star,
  UtensilsCrossed,
  Plus,
  QrCode,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

const STATUS_COLORS = {
  new:       { bg: 'var(--status-new-bg)', color: 'var(--status-new-color)', border: 'var(--status-new-border)' },
  accepted:  { bg: 'var(--status-accepted-bg)', color: 'var(--status-accepted-color)', border: 'var(--status-accepted-border)' },
  preparing: { bg: 'var(--status-preparing-bg)', color: 'var(--status-preparing-color)', border: 'var(--status-preparing-border)' },
  ready:     { bg: 'var(--status-ready-bg)', color: 'var(--status-ready-color)', border: 'var(--status-ready-border)' },
  completed: { bg: 'var(--status-completed-bg)', color: 'var(--status-completed-color)', border: 'var(--status-completed-border)' },
  cancelled: { bg: 'var(--status-cancelled-bg)', color: 'var(--status-cancelled-color)', border: 'var(--status-cancelled-border)' },
}

function StatCard({ label, value, subtext, icon: Icon, iconBg, iconColor, alertBadge, linkTo }) {
  const content = (
    <div
      style={{
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        height: '100%'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--brand-border)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border-medium)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} />
        </div>
        {alertBadge && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--warning-light)',
            color: 'var(--warning-text)',
            border: '1px solid var(--warning-border)'
          }}>
            {alertBadge}
          </span>
        )}
      </div>

      <div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>
          {label}
        </p>
        <p style={{
          fontSize: 26,
          fontWeight: 800,
          color: 'var(--text-primary)',
          margin: 0,
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: '-0.5px'
        }}>
          {value}
        </p>
        {subtext && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  )

  return linkTo ? (
    <Link to={linkTo} style={{ textDecoration: 'none', display: 'block' }}>
      {content}
    </Link>
  ) : content
}

function SkeletonCard() {
  return (
    <div style={{
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-medium)',
      height: 140
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--border-light)', marginBottom: 14 }} />
      <div style={{ width: '50%', height: 14, borderRadius: 4, background: 'var(--border-light)', marginBottom: 8 }} />
      <div style={{ width: '70%', height: 26, borderRadius: 6, background: 'var(--border-light)' }} />
    </div>
  )
}

const OwnerDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revenueDays, setRevenueDays] = useState(30)
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboard()
  }, [revenueDays])

  const fetchDashboard = async () => {
    try {
      const res = await ownerAPI.getDashboard({ days: revenueDays })
      setStats(res.data.data)
    } catch {
      toast.error('Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  // Populate missing dates for smooth revenue curve
  const chartRevenueData = []
  const revenueMap = {}
  ;(stats?.dailyRevenueHistory || []).forEach(item => {
    revenueMap[`${item._id.month}/${item._id.day}`] = item.total
  })

  for (let i = revenueDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    chartRevenueData.push({
      name: key,
      value: revenueMap[key] || 0
    })
  }

  const chartTopItemsData = (stats?.topItems || []).slice(0, 6).map(item => ({
    name: item._id,
    sales: item.sales
  }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }}>
      
      {/* ─── 1. Header & Quick Actions Strip ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28
      }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 4px', fontWeight: 500 }}>
            {greeting}, <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{user?.name || 'Owner'}</span> 👋
          </p>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            fontFamily: "'Outfit', sans-serif"
          }}>
            Café Operations Dashboard
          </h1>
        </div>

        {/* Action Hub Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/owner/menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Add Dish</span>
          </Link>

          <Link
            to="/owner/orders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <ShoppingBag size={16} color="var(--brand-primary)" />
            <span>Live Kitchen</span>
            {stats?.pendingOrders > 0 && (
              <span style={{
                background: 'var(--warning-main)',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                fontSize: 11,
                fontWeight: 800
              }}>
                {stats.pendingOrders}
              </span>
            )}
          </Link>

          <Link
            to="/owner/qr-code"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <QrCode size={16} />
            <span>Table QRs</span>
          </Link>
        </div>
      </div>

      {/* ─── New Café Onboarding Setup Guide (Only shown if 0 menu items) ─── */}
      {!loading && stats && stats.totalMenuItems === 0 && (
        <div style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ maxWidth: 600 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(79, 70, 229, 0.15)', color: 'var(--brand-primary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                🚀 Getting Started Checklist
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', fontFamily: "'Outfit', sans-serif" }}>
                Welcome to your new digital café!
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Your digital ordering system is ready to launch. Complete these simple steps to start taking instant QR orders from your tables:
              </p>
            </div>

            <Link
              to="/owner/menu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-primary)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                alignSelf: 'center'
              }}
            >
              <Plus size={18} />
              <span>Create First Dish</span>
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginTop: 20
          }}>
            <Link
              to="/owner/menu"
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-subtle)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                1
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Add Menu Items</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Create categories and dishes with prices</p>
              </div>
            </Link>

            <Link
              to="/owner/qr-code"
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                2
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Download Table QRs</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Print tabletop stickers for dining spots</p>
              </div>
            </Link>

            <Link
              to="/owner/settings"
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                3
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Setup Payments & Brand</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Enable Razorpay & pick a menu theme</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ─── 2. Standardized KPI Metrics Grid (6 Core Metrics) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        {loading ? (
          [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Today's Revenue"
              value={`₹${(stats?.todayRevenue || 0).toLocaleString()}`}
              subtext="Direct customer billing"
              icon={DollarSign}
              iconBg="var(--success-light)"
              iconColor="var(--success-main)"
            />

            <StatCard
              label="Today's Orders"
              value={stats?.todayOrders ?? 0}
              subtext="Total orders received"
              icon={ShoppingBag}
              iconBg="var(--brand-subtle)"
              iconColor="var(--brand-primary)"
              linkTo="/owner/orders"
            />

            <StatCard
              label="Active Pending Orders"
              value={stats?.pendingOrders ?? 0}
              subtext={stats?.pendingOrders > 0 ? "Needs kitchen action" : "Kitchen all clear"}
              icon={Clock}
              iconBg="var(--warning-light)"
              iconColor="var(--warning-main)"
              alertBadge={stats?.pendingOrders > 0 ? `${stats.pendingOrders} Active` : null}
              linkTo="/owner/orders"
            />

            <StatCard
              label="Completed Today"
              value={stats?.completedToday ?? 0}
              subtext="Delivered & billed"
              icon={CheckCircle2}
              iconBg="rgba(139, 92, 246, 0.12)"
              iconColor="#8b5cf6"
              linkTo="/owner/completed-orders"
            />

            <StatCard
              label="Average Guest Rating"
              value={`${stats?.averageRating || '0.0'} ★`}
              subtext={`${stats?.totalReviews || 0} customer reviews`}
              icon={Star}
              iconBg="var(--warning-light)"
              iconColor="var(--warning-text)"
              linkTo="/owner/feedback"
            />

            <StatCard
              label="Active Menu Items"
              value={stats?.totalMenuItems ?? 0}
              subtext={`Across ${stats?.totalCategories || 0} categories`}
              icon={UtensilsCrossed}
              iconBg="var(--brand-subtle)"
              iconColor="var(--brand-primary)"
              linkTo="/owner/menu"
            />
          </>
        )}
      </div>

      {/* ─── 3. Charts Section: Revenue Area & Top Selling Dishes ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 28
      }}>
        {/* Revenue Area Chart */}
        <div style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Revenue Trend
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                Daily turnover over time
              </p>
            </div>

            <div style={{
              display: 'inline-flex',
              padding: 2,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-shell)',
              border: '1px solid var(--border-medium)'
            }}>
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setRevenueDays(d)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: revenueDays === d ? 'var(--brand-primary)' : 'transparent',
                    color: revenueDays === d ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRevenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} dx={-6} />
                <RechartsTooltip
                  formatter={(val) => [`₹${val.toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-medium)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-dropdown)',
                    fontSize: 12
                  }}
                  itemStyle={{ color: 'var(--brand-primary)', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Dishes */}
        <div style={{
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Top Selling Dishes
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Highest ordered items by volume
            </p>
          </div>

          {chartTopItemsData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTopItemsData} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={110} fontWeight={500} />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--bg-card-hover)' }}
                    formatter={(val) => [`${val} orders`, 'Sales']}
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-medium)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                    itemStyle={{ color: 'var(--brand-primary)', fontWeight: 700 }}
                  />
                  <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={14}>
                    {chartTopItemsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#6366f1" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{
              height: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              textAlign: 'center'
            }}>
              <UtensilsCrossed size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ fontSize: 13, margin: 0 }}>No item sales data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. Recent Incoming Orders Table ─── */}
      <div style={{
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Recent Orders Today
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Live customer orders placed through table QR codes
            </p>
          </div>

          <Link
            to="/owner/orders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-subtle)',
              border: '1px solid var(--brand-border)',
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
            <span>Open Live Kitchen Screen</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Table Body / Order Rows */}
        <div style={{ padding: '8px 16px' }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--border-light)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '30%', height: 14, borderRadius: 4, background: 'var(--border-light)', marginBottom: 6 }} />
                  <div style={{ width: '50%', height: 12, borderRadius: 4, background: 'var(--border-light)' }} />
                </div>
              </div>
            ))
          ) : stats?.recentOrders?.length > 0 ? (
            stats.recentOrders.map(order => {
              const sc = STATUS_COLORS[order.order_status] || STATUS_COLORS.new
              const isPaid = order.payment_status === 'received' || order.payment_status === 'completed'
              const isCash = order.payment_method === 'cash'

              return (
                <div
                  key={order._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 12px',
                    borderRadius: 'var(--radius-md)',
                    transition: 'background 0.15s ease',
                    borderBottom: '1px solid var(--border-light)',
                    gap: 16
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Left: Token & Table */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--brand-subtle)',
                      border: '1px solid var(--brand-border)',
                      textAlign: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: 9, color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                        TOKEN
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                        #{order.daily_order_token || order.order_number?.slice(-3) || '00'}
                      </span>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Table {order.table_number || 'N/A'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          • {order.customer_name || 'Walk-in Guest'}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        margin: '2px 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {order.items?.map(it => `${it.quantity}x ${it.name}`).join(', ') || 'No item details'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Payment, Price, Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    {/* Payment Pill */}
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCash ? 'var(--warning-light)' : isPaid ? 'var(--success-light)' : 'var(--danger-light)',
                      color: isCash ? 'var(--warning-text)' : isPaid ? 'var(--success-text)' : 'var(--danger-text)',
                      border: `1px solid ${isCash ? 'var(--warning-border)' : isPaid ? 'var(--success-border)' : 'var(--danger-border)'}`
                    }}>
                      {isCash ? '💵 Cash' : isPaid ? '✓ Paid' : '⏳ Unpaid'}
                    </span>

                    {/* Total Amount */}
                    <span style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      fontFamily: "'Outfit', sans-serif",
                      minWidth: 65,
                      textAlign: 'right'
                    }}>
                      ₹{order.total_amount}
                    </span>

                    {/* Order Status Badge */}
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.border}`,
                      textTransform: 'capitalize',
                      minWidth: 80,
                      textAlign: 'center'
                    }}>
                      {order.order_status}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--bg-shell)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <ShoppingBag size={24} color="var(--text-tertiary)" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                {stats?.totalMenuItems === 0 ? 'Ready to Receive Your First Order' : 'No Orders Yet Today'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                {stats?.totalMenuItems === 0
                  ? 'Add your menu items and place QR codes on your tables. Incoming customer orders will appear here in real time.'
                  : 'Orders placed from your QR codes will appear here in real time.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OwnerDashboard
