import { useState, useEffect, useCallback, useMemo } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  TrendingUp, BarChart3, Trophy, CreditCard, Calendar, 
  CalendarDays, Inbox, IndianRupee, Filter, ArrowUpRight, 
  CheckCircle2, Sparkles, Layers, ShieldCheck
} from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL  = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const RevenueManagement = () => {
  const now = new Date()
  const [loading, setLoading]                 = useState(true)
  const [data, setData]                       = useState(null)           // API response
  const [view, setView]                       = useState('daily')        // yearly | monthly | daily (default daily)
  const [selectedYear, setYear]               = useState(now.getFullYear())
  const [selectedMonth, setMonth]             = useState(now.getMonth() + 1)
  const [selectedDay, setDay]                 = useState('all')          // 'all' or number 1..31
  const [selectedMonthFilter, setMonthFilter] = useState('all')          // 'all' or number 1..12 in monthly view
  const [availableYears, setYears]            = useState([now.getFullYear()])
  const [selectedIndex, setIdx]               = useState(0)

  const fetchRevenue = useCallback(async (v, y, m) => {
    setLoading(true)
    try {
      const params = { view: v }
      if (v === 'monthly' || v === 'daily') params.year  = y
      if (v === 'daily')                    params.month = m
      const res = await adminAPI.getRevenue(params)
      setData(res.data.data)
      if (res.data.data?.availableYears?.length) {
        setYears(res.data.data.availableYears)
      }
      setIdx(0)
    } catch {
      toast.error('Failed to load platform subscription revenue')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load: current month daily view
  useEffect(() => {
    fetchRevenue('daily', now.getFullYear(), now.getMonth() + 1)
  }, [])

  const switchView = (v) => {
    setView(v)
    setDay('all')
    setMonthFilter('all')
    fetchRevenue(v, selectedYear, selectedMonth)
  }

  const changeYear = (y) => {
    setYear(y)
    setDay('all')
    setMonthFilter('all')
    fetchRevenue(view, y, selectedMonth)
  }

  const changeMonth = (m) => {
    setMonth(m)
    setDay('all')
    fetchRevenue('daily', selectedYear, m)
  }

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate()
  }, [selectedYear, selectedMonth])

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [daysInMonth])

  const history = data?.history || []

  // Map days that have real data
  const daysWithData = useMemo(() => {
    if (view !== 'daily') return new Set()
    return new Set(history.map(h => h._id?.day).filter(Boolean))
  }, [history, view])

  // Compute selected data for hero card
  const heroData = useMemo(() => {
    if (loading || !data) return { total: 0, count: 0, label: 'Loading...', sub: '' }

    if (view === 'daily') {
      if (selectedDay !== 'all') {
        const item = history.find(h => h._id?.day === Number(selectedDay))
        const total = item?.total || 0
        const count = item?.count || 0
        const dateObj = new Date(selectedYear, selectedMonth - 1, Number(selectedDay))
        const label = dateObj.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        return { total, count, label, sub: count > 0 ? `${count} subscription renewal${count > 1 ? 's' : ''}` : 'No renewals recorded' }
      } else {
        const total = history.reduce((s, h) => s + (h.total || 0), 0)
        const count = history.reduce((s, h) => s + (h.count || 0), 0)
        const label = `${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`
        return { total, count, label, sub: `${history.length} active day${history.length !== 1 ? 's' : ''} · ${count} total subscription payments` }
      }
    } else if (view === 'monthly') {
      if (selectedMonthFilter !== 'all') {
        const item = history.find(h => h._id?.month === Number(selectedMonthFilter))
        const total = item?.total || 0
        const count = item?.count || 0
        const label = `${MONTH_FULL[Number(selectedMonthFilter) - 1]} ${selectedYear}`
        return { total, count, label, sub: count > 0 ? `${count} subscription renewal${count > 1 ? 's' : ''}` : 'No revenue this month' }
      } else {
        const total = history.reduce((s, h) => s + (h.total || 0), 0)
        const count = history.reduce((s, h) => s + (h.count || 0), 0)
        const label = `Full Year ${selectedYear}`
        return { total, count, label, sub: `${history.length} month${history.length !== 1 ? 's' : ''} with renewals · ${count} total payments` }
      }
    } else {
      // Yearly
      const item = history[selectedIndex]
      if (item) {
        return {
          total: item.total || 0,
          count: item.count || 0,
          label: `Year ${item._id?.year}`,
          sub: `${item.count || 0} total payments`
        }
      }
      const total = history.reduce((s, h) => s + (h.total || 0), 0)
      const count = history.reduce((s, h) => s + (h.count || 0), 0)
      return { total, count, label: 'All Years Combined', sub: `${count} total payments` }
    }
  }, [loading, data, view, selectedDay, selectedMonthFilter, selectedYear, selectedMonth, history, selectedIndex])

  const totalRevenue = history.reduce((s, h) => s + (h.total || 0), 0)
  const bestRevenue  = history.length ? Math.max(...history.map(h => h.total || 0)) : 0
  const maxTotal     = bestRevenue || 1

  const formatLabel = (hist) => {
    if (!hist._id) return 'Unknown'
    if (view === 'yearly')  return `Year ${hist._id.year}`
    if (view === 'monthly') return `${MONTH_NAMES[hist._id.month - 1]} ${hist._id.year}`
    return new Date(hist._id.year, hist._id.month - 1, hist._id.day)
      .toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isCurrentPeriod = (hist) => {
    if (!hist._id) return false
    if (view === 'yearly')  return hist._id.year === now.getFullYear()
    if (view === 'monthly') return hist._id.month === now.getMonth() + 1 && hist._id.year === now.getFullYear()
    return hist._id.day === now.getDate() && hist._id.month === now.getMonth() + 1 && hist._id.year === now.getFullYear()
  }

  const handleSelectDay = (dayVal) => {
    setDay(dayVal)
    if (dayVal !== 'all') {
      const idx = history.findIndex(h => h._id?.day === Number(dayVal))
      if (idx !== -1) setIdx(idx)
    }
  }

  const handleSelectMonthFilter = (mVal) => {
    setMonthFilter(mVal)
    if (mVal !== 'all') {
      const idx = history.findIndex(h => h._id?.month === Number(mVal))
      if (idx !== -1) setIdx(idx)
    }
  }

  const handleRowClick = (hist, idx) => {
    setIdx(idx)
    if (view === 'daily' && hist._id?.day) {
      setDay(hist._id.day)
    } else if (view === 'monthly' && hist._id?.month) {
      setMonthFilter(hist._id.month)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)', position: 'relative' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .rev-row:hover { background: var(--bg-card-hover) !important; border-color: rgba(124, 58, 237, 0.4) !important; }
        .rev-row { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .custom-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.5); }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 24, animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)' }}>
            <TrendingUp size={18} />
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
            Platform Revenue Analytics
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>
          SaaS subscription billings, renewals, and platform revenue metrics across all registered cafés.
        </p>
      </div>

      {/* ─── Filter Bar ─── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24,
        padding: '16px 20px',
        borderRadius: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-card)',
        animation: 'fadeIn 0.35s ease'
      }}>
        {/* Top Controls Row: View Tabs + Year + Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: 4, borderRadius: 10, gap: 4 }}>
            {[
              { id: 'daily', label: 'Daily', icon: CalendarDays },
              { id: 'monthly', label: 'Monthly', icon: Calendar },
              { id: 'yearly', label: 'Yearly', icon: Layers }
            ].map(({ id: v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: view === v ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
                  color: view === v ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: view === v ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
                  fontFamily: "'Inter',sans-serif",
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 26, background: 'var(--border-medium)' }} />

          {/* Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Year
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => changeYear(y)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedYear === y ? 'rgba(124,58,237,0.18)' : 'var(--bg-input)',
                    color: selectedYear === y ? '#c4b5fd' : 'var(--text-secondary)',
                    outline: selectedYear === y ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                    fontFamily: "'Inter',sans-serif",
                    transition: 'all 0.15s'
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* If in Daily mode: show Month Picker dropdown */}
          {view === 'daily' && (
            <>
              <div style={{ width: 1, height: 26, background: 'var(--border-medium)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Month
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => changeMonth(Number(e.target.value))}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    color: '#c4b5fd',
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter',sans-serif"
                  }}
                >
                  {MONTH_FULL.map((m, idx) => (
                    <option key={idx} value={idx + 1} style={{ background: '#131b2e', color: '#ffffff' }}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* ─── DYNAMIC SUB-FILTER ROW ─── */}
        {/* 1. In DAILY View: Show DAY Pills (All, 1, 2, 3... 31) */}
        {view === 'daily' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--border-medium)'
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
              Day
            </span>
            <div className="custom-scroll" style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              paddingBottom: 4,
              alignItems: 'center',
              width: '100%'
            }}>
              <button
                onClick={() => handleSelectDay('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: selectedDay === 'all' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'var(--bg-input)',
                  color: selectedDay === 'all' ? '#ffffff' : 'var(--text-secondary)',
                  outline: selectedDay === 'all' ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border-medium)',
                  boxShadow: selectedDay === 'all' ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                  fontFamily: "'Inter',sans-serif",
                  transition: 'all 0.15s'
                }}
              >
                All Days
              </button>

              {daysArray.map(dayNum => {
                const isSelected = selectedDay === dayNum
                const hasData = daysWithData.has(dayNum)
                return (
                  <button
                    key={dayNum}
                    onClick={() => handleSelectDay(dayNum)}
                    style={{
                      padding: '4px 9px',
                      minWidth: 32,
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: isSelected
                        ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                        : hasData
                        ? 'rgba(124,58,237,0.14)'
                        : 'transparent',
                      color: isSelected ? '#ffffff' : hasData ? '#c4b5fd' : 'var(--text-tertiary)',
                      outline: isSelected
                        ? '1px solid rgba(124,58,237,0.4)'
                        : hasData
                        ? '1px solid rgba(124,58,237,0.25)'
                        : '1px solid var(--border-light, rgba(255,255,255,0.06))',
                      boxShadow: isSelected ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                      fontFamily: "'Inter',sans-serif",
                      transition: 'all 0.15s',
                      position: 'relative'
                    }}
                    title={hasData ? `Day ${dayNum}: Renewals recorded` : `Day ${dayNum}`}
                  >
                    {dayNum}
                    {hasData && !isSelected && (
                      <span style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#a78bfa'
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 2. In MONTHLY View: Show Month Pills (All Months, Jan, Feb... Dec) */}
        {view === 'monthly' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--border-medium)'
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
              Month
            </span>
            <div className="custom-scroll" style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              paddingBottom: 4,
              alignItems: 'center',
              width: '100%'
            }}>
              <button
                onClick={() => handleSelectMonthFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: selectedMonthFilter === 'all' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'var(--bg-input)',
                  color: selectedMonthFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                  outline: selectedMonthFilter === 'all' ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border-medium)',
                  boxShadow: selectedMonthFilter === 'all' ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                  fontFamily: "'Inter',sans-serif",
                  transition: 'all 0.15s'
                }}
              >
                All Months
              </button>

              {MONTH_NAMES.map((m, idx) => {
                const mNum = idx + 1
                const isSelected = selectedMonthFilter === mNum
                const hasData = history.some(h => h._id?.month === mNum)
                return (
                  <button
                    key={m}
                    onClick={() => handleSelectMonthFilter(mNum)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: isSelected
                        ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                        : hasData
                        ? 'rgba(124,58,237,0.14)'
                        : 'transparent',
                      color: isSelected ? '#ffffff' : hasData ? '#c4b5fd' : 'var(--text-tertiary)',
                      outline: isSelected
                        ? '1px solid rgba(124,58,237,0.4)'
                        : hasData
                        ? '1px solid rgba(124,58,237,0.25)'
                        : '1px solid var(--border-light, rgba(255,255,255,0.06))',
                      boxShadow: isSelected ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                      fontFamily: "'Inter',sans-serif",
                      transition: 'all 0.15s'
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Stats Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24, animation: 'fadeIn 0.4s ease' }}>
        {[
          {
            label: 'Selected Filter MRR',
            value: `₹${heroData.total.toLocaleString()}`,
            sub: heroData.label,
            icon: IndianRupee,
            bg: 'rgba(124,58,237,0.1)',
            border: 'rgba(124,58,237,0.25)',
            glow: 'rgba(124,58,237,0.15)',
            accent: '#a78bfa'
          },
          {
            label: view === 'daily' ? `${MONTH_NAMES[selectedMonth - 1]} Platform Total` : `${selectedYear} Platform Total`,
            value: `₹${totalRevenue.toLocaleString()}`,
            sub: `All ${history.length} records in view`,
            icon: BarChart3,
            bg: 'rgba(99,102,241,0.08)',
            border: 'rgba(99,102,241,0.2)',
            glow: 'rgba(99,102,241,0.1)',
            accent: '#818cf8'
          },
          {
            label: 'Peak Revenue Day',
            value: `₹${bestRevenue.toLocaleString()}`,
            sub: 'Highest subscription period',
            icon: Trophy,
            bg: 'rgba(245,158,11,0.08)',
            border: 'rgba(245,158,11,0.2)',
            glow: 'rgba(245,158,11,0.1)',
            accent: '#fbbf24'
          },
          {
            label: 'Total Plan Renewals',
            value: `${history.reduce((s,h) => s + (h.count || 0), 0)} renewals`,
            sub: 'Tenant subscriptions collected',
            icon: CreditCard,
            bg: 'rgba(6,182,212,0.08)',
            border: 'rgba(6,182,212,0.2)',
            glow: 'rgba(6,182,212,0.1)',
            accent: '#06b6d4'
          },
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={i}
              style={{
                padding: '18px 20px',
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: `1px solid ${card.border}`,
                boxShadow: 'var(--shadow-card)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {card.label}
                </span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: card.bg, color: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} />
                </div>
              </div>
              <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
                {loading ? (
                  <span style={{ display:'inline-block', width:80, height:24, borderRadius:6, background:'var(--border-medium)', opacity: 0.5 }} />
                ) : (
                  card.value
                )}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {card.sub}
              </p>
            </div>
          )
        })}
      </div>

      {/* ─── Main Grid: Hero Card + History List ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.6fr', gap: 20, animation: 'fadeIn 0.45s ease' }}>

        {/* Left: Hero Card */}
        <div style={{
          padding: '28px 24px',
          borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(124, 58, 237, 0.15) 0%, rgba(19, 27, 46, 0.95) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 320
        }}>
          <div style={{
            position: 'absolute',
            bottom: -50,
            right: -50,
            width: 180,
            height: 180,
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} />
                {view === 'daily' && selectedDay !== 'all'
                  ? `Day ${selectedDay} Subscriptions`
                  : view === 'monthly' && selectedMonthFilter !== 'all'
                  ? `${MONTH_NAMES[Number(selectedMonthFilter) - 1]} SaaS Billings`
                  : 'Platform SaaS Overview'}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 50,
                background: 'rgba(124, 58, 237, 0.2)',
                color: '#c4b5fd',
                border: '1px solid rgba(124, 58, 237, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                {view}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)' }}>
              <IndianRupee size={28} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px', fontWeight: 600 }}>
              {loading ? 'Fetching platform revenue...' : heroData.label}
            </p>
            <p style={{
              fontSize: 'clamp(36px,5vw,50px)',
              fontWeight: 900,
              color: 'var(--text-primary)',
              margin: 0,
              fontFamily: "'Outfit',sans-serif",
              letterSpacing: '-1.5px',
              lineHeight: 1
            }}>
              {loading ? (
                <span style={{ display:'inline-block', width:140, height:48, borderRadius:12, background:'var(--border-medium)', opacity: 0.5 }} />
              ) : (
                `₹${heroData.total.toLocaleString()}`
              )}
            </p>
            {!loading && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '10px 0 0', fontWeight: 500 }}>
                {heroData.sub}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              padding: '6px 16px',
              borderRadius: 50,
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: heroData.total > 0 ? 'rgba(124, 58, 237, 0.2)' : 'var(--bg-input)',
              color: heroData.total > 0 ? '#c4b5fd' : 'var(--text-tertiary)',
              border: `1px solid ${heroData.total > 0 ? 'rgba(124, 58, 237, 0.35)' : 'var(--border-medium)'}`
            }}>
              {heroData.total > 0 ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>SaaS Settled Billings</span>
                </>
              ) : (
                <span>No Billings Recorded</span>
              )}
            </span>
          </div>
        </div>

        {/* Right: History Breakdown List */}
        <div style={{
          borderRadius: 20,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-medium)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                {view === 'yearly'
                  ? 'Yearly SaaS Billings'
                  : view === 'monthly'
                  ? `Monthly SaaS Billings — ${selectedYear}`
                  : `Daily SaaS Billings — ${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`}
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0', fontWeight: 500 }}>
                Select any row to inspect metrics in the summary card.
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border-medium)' }}>
              {history.length} records
            </span>
          </div>

          <div style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 460,
            overflowY: 'auto'
          }}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 56, borderRadius: 12, background: 'var(--bg-input)', opacity: 0.5 }} />
              ))
            ) : history.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Inbox size={24} />
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>No subscription billings recorded</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
                  {view === 'daily' ? 'Try picking a different month or year above.' : 'Tenant subscription payments will appear here.'}
                </p>
              </div>
            ) : (
              history.map((hist, i) => {
                const isCur = isCurrentPeriod(hist)
                const isSelected = view === 'daily'
                  ? (selectedDay !== 'all' ? hist._id?.day === Number(selectedDay) : i === selectedIndex)
                  : view === 'monthly'
                  ? (selectedMonthFilter !== 'all' ? hist._id?.month === Number(selectedMonthFilter) : i === selectedIndex)
                  : i === selectedIndex

                const pct = maxTotal > 0 ? Math.min(((hist.total || 0) / maxTotal) * 100, 100) : 0

                return (
                  <div
                    key={i}
                    className="rev-row"
                    onClick={() => handleRowClick(hist, i)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(124,58,237,0.1)' : 'var(--bg-input)',
                      border: isSelected ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border-medium)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Background Progress Bar */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${pct}%`,
                      background: isSelected ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.02)',
                      transition: 'width 0.4s ease',
                      pointerEvents: 'none',
                      borderRadius: 12
                    }} />

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCur ? 'rgba(124,58,237,0.25)' : isSelected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                          color: isCur || isSelected ? '#c4b5fd' : 'var(--text-tertiary)'
                        }}>
                          {isCur ? <CalendarDays size={18} /> : <Calendar size={18} />}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isCur ? '#c4b5fd' : isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {formatLabel(hist)}
                          </p>
                          {isCur && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {view === 'yearly' ? 'Current Year' : view === 'monthly' ? 'Current Month' : 'Today'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.3px' }}>
                          ₹{(hist.total || 0).toLocaleString()}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {hist.count || 0} renewal{(hist.count || 0) !== 1 ? 's' : ''} · {pct.toFixed(0)}% of peak
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RevenueManagement
