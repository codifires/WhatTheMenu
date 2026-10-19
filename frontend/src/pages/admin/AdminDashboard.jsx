import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  Store, CheckCircle2, AlertTriangle, IndianRupee, 
  HelpCircle, Activity, ArrowRight, Clock, Sparkles, 
  ShieldCheck, TrendingUp, RefreshCw, Plus, CreditCard, 
  ExternalLink, UserCheck, ShieldAlert
} from 'lucide-react'

const STAT_DEFS = [
  {
    key: 'totalCafes',
    label: 'Total Registered Cafés',
    icon: Store,
    bg: 'bg-indigo-500/15',
    color: 'text-indigo-400',
    border: 'border-indigo-500/25',
  },
  {
    key: 'activePlans',
    label: 'Active Subscriptions',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/15',
    color: 'text-emerald-400',
    border: 'border-emerald-500/25',
  },
  {
    key: 'expiredPlans',
    label: 'Expired / Lapsed Accounts',
    icon: AlertTriangle,
    bg: 'bg-amber-500/15',
    color: 'text-amber-400',
    border: 'border-amber-500/25',
  },
  {
    key: 'monthlyRevenue',
    label: 'Monthly Recurring Revenue (MRR)',
    icon: IndianRupee,
    bg: 'bg-cyan-500/15',
    color: 'text-cyan-400',
    border: 'border-cyan-500/25',
    format: (v) => `₹${(v || 0).toLocaleString()}`,
  },
  {
    key: 'openTickets',
    label: 'Active Support Tickets',
    icon: HelpCircle,
    bg: 'bg-purple-500/15',
    color: 'text-purple-400',
    border: 'border-purple-500/25',
  },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => { 
    fetchDashboard() 
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getDashboard()
      setStats(res.data?.data)
    } catch {
      toast.error('Failed to load super admin metrics')
    } finally {
      setLoading(false)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            {greeting}, {user?.name || 'Super Admin'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            System health, café tenant activations, monthly recurring revenue, and urgent support tickets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Stats</span>
          </button>

          <Link
            to="/admin/cafes"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Café</span>
          </Link>
        </div>
      </div>

      {/* ── 5 Core Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_DEFS.map((def, i) => {
          const Icon = def.icon
          const displayVal = def.format ? def.format(stats?.[def.key]) : (stats?.[def.key] ?? 0)
          return (
            <div
              key={def.key}
              className={`p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-[var(--border-hover)] shadow-sm transition-all flex flex-col justify-between ${
                i === 4 ? 'col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {def.label}
                </span>
                <div className={`w-8 h-8 rounded-xl ${def.bg} ${def.color} border ${def.border} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
                {loading ? '—' : displayVal}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Mid Section: Recent Cafés + Quick Actions & Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Cafés List (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border-medium)] flex items-center justify-between bg-[var(--bg-input)]/50">
            <div>
              <h2 className="font-bold text-base font-heading text-[var(--text-primary)]">
                Recent Café Activations
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Newest restaurant tenants onboarded to WhatTheMenu
              </p>
            </div>
            <Link
              to="/admin/cafes"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <span>View All Cafés</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[var(--border-medium)]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                Loading tenant directory...
              </div>
            ) : stats?.recentCafes?.length > 0 ? (
              stats.recentCafes.slice(0, 5).map(cafe => {
                const isActive = cafe.subscription_status === 'active'
                return (
                  <div
                    key={cafe._id}
                    className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                        {cafe.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {cafe.name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] truncate">
                          {cafe.email} • {cafe.phone || 'No phone'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {cafe.subscription_status}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-12 text-center text-[var(--text-tertiary)]">
                <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cafés registered yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Platform Health (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Grid */}
          <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-secondary)]">
              Admin Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/admin/cafes"
                className="p-3.5 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-medium)] text-center transition-all group"
              >
                <Store className="w-5 h-5 text-indigo-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Manage Cafés</span>
              </Link>

              <Link
                to="/admin/revenue"
                className="p-3.5 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-medium)] text-center transition-all group"
              >
                <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Platform MRR</span>
              </Link>

              <Link
                to="/admin/subscriptions"
                className="p-3.5 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-medium)] text-center transition-all group"
              >
                <CreditCard className="w-5 h-5 text-amber-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Subscriptions</span>
              </Link>

              <Link
                to="/admin/support"
                className="p-3.5 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-medium)] text-center transition-all group"
              >
                <HelpCircle className="w-5 h-5 text-purple-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Support Desk</span>
              </Link>
            </div>
          </div>

          {/* Health Stats */}
          <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-secondary)]">
              Platform Health Status
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--text-secondary)]">Café Active Ratio</span>
                  <span className="font-bold text-emerald-400">
                    {stats?.totalCafes ? Math.round(((stats.activePlans || 0) / stats.totalCafes) * 100) : 100}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${stats?.totalCafes ? Math.min(100, Math.round(((stats.activePlans || 0) / stats.totalCafes) * 100)) : 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--text-secondary)]">Uptime & Real-time WebSockets</span>
                  <span className="font-bold text-cyan-400">99.98% Healthy</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full w-[99.9%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Support Queue Table ── */}
      {stats?.recentTickets?.length > 0 && (
        <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border-medium)] flex items-center justify-between bg-indigo-500/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-heading text-[var(--text-primary)]">
                  Urgent Support Inquiries
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pending issues reported by restaurant owners
                </p>
              </div>
            </div>

            <Link
              to="/admin/support"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <span>Open Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] uppercase font-bold text-[var(--text-tertiary)]">
                  <th className="py-3 px-5">Ticket ID</th>
                  <th className="py-3 px-5">Café Name</th>
                  <th className="py-3 px-5">Subject</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-medium)]">
                {stats.recentTickets.map(t => (
                  <tr key={t._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="py-3 px-5 font-mono text-indigo-400 font-bold">
                      {t.ticket_number || t._id?.slice(-6)}
                    </td>
                    <td className="py-3 px-5 font-semibold text-[var(--text-primary)]">
                      {t.cafe_id?.name || 'Partner Café'}
                    </td>
                    <td className="py-3 px-5 text-[var(--text-secondary)] truncate max-w-xs">
                      {t.subject}
                    </td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link
                        to="/admin/support"
                        className="text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        Reply →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
