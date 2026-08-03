import { useState, useEffect, useCallback, useMemo } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

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
      toast.error('Failed to load platform revenue')
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
        return { total, count, label, sub: count > 0 ? `${count} subscription renewal${count > 1 ? 's' : ''}` : 'No renewals this month' }
      } else {
        const total = history.reduce((s, h) => s + (h.total || 0), 0)
        const count = history.reduce((s, h) => s + (h.count || 0), 0)
        const label = `Full Year ${selectedYear}`
        return { total, count, label, sub: `${history.length} month${history.length !== 1 ? 's' : ''} with revenue · ${count} renewals` }
      }
    } else {
      // Yearly
      const item = history[selectedIndex]
      if (item) {
        return {
          total: item.total || 0,
          count: item.count || 0,
          label: `Year ${item._id?.year}`,
          sub: `${item.count || 0} subscription renewals`
        }
      }
      const total = history.reduce((s, h) => s + (h.total || 0), 0)
      const count = history.reduce((s, h) => s + (h.count || 0), 0)
      return { total, count, label: 'All Years Combined', sub: `${count} total renewals` }
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
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#fff', position: 'relative' }}>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.9 } }
        .rev-row:hover { background: rgba(255,255,255,0.05) !important; transform: translateX(4px) !important; }
        .rev-row { transition: all 0.2s ease !important; }
        .yr-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .day-btn:hover { background: rgba(124,58,237,0.18) !important; color: #c084fc !important; }
        .mo-btn:hover { background: rgba(124,58,237,0.18) !important; color: #c084fc !important; }
        .custom-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.4); }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 24, animation: 'slideUp 0.4s ease' }}>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Platform Revenue Analytics
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontWeight: 500 }}>
          Subscription collections and platform earnings — filter by Year, Month, or Day.
        </p>
      </div>

      {/* ─── Filter Bar ─── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24,
        padding: '14px 18px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        animation: 'slideUp 0.42s ease'
      }}>
        {/* Top Controls Row: View Tabs + Year + (Month selector if in daily mode) */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: 3, borderRadius: 10, gap: 2 }}>
            {[['yearly','Yearly'],['monthly','Monthly'],['daily','Daily']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: view === v ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
                  color: view === v ? '#fff' : '#9ca3af',
                  boxShadow: view === v ? '0 4px 14px rgba(124,58,237,0.35)' : 'none',
                  fontFamily: "'Inter',sans-serif",
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.08)' }} />

          {/* Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Year</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {availableYears.map(y => (
                <button
                  key={y}
                  className="yr-btn"
                  onClick={() => changeYear(y)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedYear === y ? 'rgba(124,58,237,0.18)' : 'transparent',
                    color: selectedYear === y ? '#c084fc' : '#9ca3af',
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
              <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Month</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => changeMonth(Number(e.target.value))}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    color: '#c084fc',
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter',sans-serif"
                  }}
                >
                  {MONTH_FULL.map((m, idx) => (
                    <option key={idx} value={idx + 1} style={{ background: '#111827', color: '#fff' }}>
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
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
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
                className="day-btn"
                onClick={() => handleSelectDay('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: selectedDay === 'all' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.03)',
                  color: selectedDay === 'all' ? '#fff' : '#9ca3af',
                  outline: selectedDay === 'all' ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: selectedDay === 'all' ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
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
                    className="day-btn"
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
                        ? 'rgba(124,58,237,0.15)'
                        : 'transparent',
                      color: isSelected ? '#fff' : hasData ? '#c084fc' : '#6b7280',
                      outline: isSelected
                        ? '1px solid rgba(124,58,237,0.45)'
                        : hasData
                        ? '1px solid rgba(124,58,237,0.3)'
                        : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isSelected ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
                      fontFamily: "'Inter',sans-serif",
                      transition: 'all 0.15s',
                      position: 'relative'
                    }}
                    title={hasData ? `Day ${dayNum}: Subscriptions collected` : `Day ${dayNum}`}
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
                        background: '#c084fc'
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
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
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
                className="mo-btn"
                onClick={() => handleSelectMonthFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  background: selectedMonthFilter === 'all' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.03)',
                  color: selectedMonthFilter === 'all' ? '#fff' : '#9ca3af',
                  outline: selectedMonthFilter === 'all' ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: selectedMonthFilter === 'all' ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
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
                    className="mo-btn"
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
                        ? 'rgba(124,58,237,0.15)'
                        : 'transparent',
                      color: isSelected ? '#fff' : hasData ? '#c084fc' : '#6b7280',
                      outline: isSelected
                        ? '1px solid rgba(124,58,237,0.45)'
                        : hasData
                        ? '1px solid rgba(124,58,237,0.3)'
                        : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isSelected ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24, animation: 'slideUp 0.46s ease' }}>
        {[
          {
            label: 'Selected Filter',
            value: `₹${heroData.total.toLocaleString()}`,
            sub: heroData.label,
            icon: '💰',
            bg: 'rgba(124,58,237,0.08)',
            border: 'rgba(124,58,237,0.25)',
            glow: 'rgba(124,58,237,0.12)',
            accent: '#c084fc'
          },
          {
            label: view === 'daily' ? `${MONTH_NAMES[selectedMonth - 1]} Total` : `${selectedYear} Total`,
            value: `₹${totalRevenue.toLocaleString()}`,
            sub: `All ${history.length} records`,
            icon: '📊',
            bg: 'rgba(99,102,241,0.08)',
            border: 'rgba(99,102,241,0.2)',
            glow: 'rgba(99,102,241,0.1)',
            accent: '#818cf8'
          },
          {
            label: 'Peak Period',
            value: `₹${bestRevenue.toLocaleString()}`,
            sub: 'Highest revenue recorded',
            icon: '🏆',
            bg: 'rgba(245,158,11,0.08)',
            border: 'rgba(245,158,11,0.2)',
            glow: 'rgba(245,158,11,0.1)',
            accent: '#fbbf24'
          },
          {
            label: 'Total Renewals',
            value: `${history.reduce((s,h) => s + (h.count || 0), 0)} renewals`,
            sub: 'Subscription payments',
            icon: '🏪',
            bg: 'rgba(6,182,212,0.08)',
            border: 'rgba(6,182,212,0.2)',
            glow: 'rgba(6,182,212,0.1)',
            accent: '#22d3ee'
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              padding: '18px 20px',
              borderRadius: 16,
              background: card.bg,
              border: `1px solid ${card.border}`,
              boxShadow: `0 4px 24px ${card.glow}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              animation: `slideUp 0.4s ease ${i * 0.06}s both`
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 32px ${card.glow}` }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=`0 4px 24px ${card.glow}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px', fontWeight: 500 }}>{card.label}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 3px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
              {loading ? (
                <span style={{ display:'inline-block', width:80, height:22, borderRadius:6, background:'rgba(255,255,255,0.06)', animation:'pulse 1.5s ease infinite' }} />
              ) : (
                card.value
              )}
            </p>
            <p style={{ fontSize: 10, color: '#4b5563', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Main Grid: Hero Card + History List ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 18, animation: 'slideUp 0.5s ease' }}>

        {/* Left: Hero Card */}
        <div style={{
          padding: '28px 24px',
          borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.05) 100%)',
          border: '1px solid rgba(124,58,237,0.28)',
          boxShadow: '0 8px 40px rgba(124,58,237,0.12)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 300
        }}>
          <div style={{
            position: 'absolute',
            bottom: -50,
            right: -50,
            width: 180,
            height: 180,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1 }}>
                {view === 'daily' && selectedDay !== 'all'
                  ? `✦ Day ${selectedDay}`
                  : view === 'monthly' && selectedMonthFilter !== 'all'
                  ? `✦ ${MONTH_NAMES[Number(selectedMonthFilter) - 1]}`
                  : '✦ Platform Overview'}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 50,
                background: 'rgba(124,58,237,0.2)',
                color: '#c084fc',
                border: '1px solid rgba(124,58,237,0.4)',
                textTransform: 'uppercase'
              }}>
                {view}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 46, marginBottom: 10 }}>💎</div>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 10px', fontWeight: 600, letterSpacing: 0.3 }}>
              {loading ? 'Fetching revenue...' : heroData.label}
            </p>
            <p style={{
              fontSize: 'clamp(38px,7vw,56px)',
              fontWeight: 900,
              color: '#fff',
              margin: 0,
              fontFamily: "'Outfit',sans-serif",
              letterSpacing: '-2px',
              lineHeight: 1
            }}>
              {loading ? (
                <span style={{ display:'inline-block', width:140, height:56, borderRadius:12, background:'rgba(255,255,255,0.06)', animation:'pulse 1.5s ease infinite' }} />
              ) : (
                `₹${heroData.total.toLocaleString()}`
              )}
            </p>
            {!loading && (
              <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 0', fontWeight: 500 }}>
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
              background: heroData.total > 0 ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
              color: heroData.total > 0 ? '#c084fc' : '#6b7280',
              border: `1px solid ${heroData.total > 0 ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`
            }}>
              {heroData.total > 0 ? '✓ Subscriptions Collected' : '— No Revenue'}
            </span>
          </div>
        </div>

        {/* Right: History Breakdown List */}
        <div style={{
          borderRadius: 20,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#fff' }}>
                {view === 'yearly'
                  ? 'Yearly Breakdown'
                  : view === 'monthly'
                  ? `Monthly Breakdown — ${selectedYear}`
                  : `Daily Breakdown — ${MONTH_FULL[selectedMonth - 1]} ${selectedYear}`}
              </h2>
              <p style={{ fontSize: 11, color: '#4b5563', margin: '2px 0 0', fontWeight: 500 }}>
                Click any row to view breakdown in the left card.
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280' }}>
              {history.length} records
            </span>
          </div>

          <div style={{
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            maxHeight: 440,
            overflowY: 'auto'
          }}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 54, borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
              ))
            ) : history.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>📭</div>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0, fontWeight: 600 }}>No subscription revenue recorded for this period.</p>
                <p style={{ fontSize: 11, color: '#374151', margin: '5px 0 0' }}>
                  {view === 'daily' ? 'Try picking a different month or year above.' : 'Revenue appears here once café subscriptions are active.'}
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
                      background: isSelected ? 'rgba(124,58,237,0.14)' : 'transparent',
                      border: isSelected ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
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
                      background: isSelected ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                      transition: 'width 0.5s ease',
                      pointerEvents: 'none',
                      borderRadius: 12
                    }} />

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 15,
                          background: isCur ? 'rgba(124,58,237,0.25)' : isSelected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)'
                        }}>
                          {isCur ? '📅' : '🗓️'}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isCur ? '#c084fc' : isSelected ? '#e5e7eb' : '#9ca3af' }}>
                            {formatLabel(hist)}
                          </p>
                          {isCur && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {view === 'yearly' ? 'Current Year' : view === 'monthly' ? 'Current Month' : 'Today'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
                          ₹{(hist.total || 0).toLocaleString()}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: '#6b7280' }}>
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
