import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'
import { 
  Settings, CreditCard, ShieldCheck, Save, Clock, 
  Calendar, CalendarDays, Globe, Sliders, Edit3, 
  Briefcase, Zap, Mail, Phone, MessageSquare, 
  CheckCircle2, AlertTriangle, Loader2, HelpCircle, Lock
} from 'lucide-react'

const INPUT = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

function InputField({ label, helperText, prefix, suffix, type = 'text', ...props }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 600 }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          style={{ ...INPUT, paddingLeft: prefix ? 32 : 14, paddingRight: suffix ? 44 : 14 }}
          onFocus={e => {
            e.target.style.borderColor = '#7c3aed'
            e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.15)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--border-medium)'
            e.target.style.boxShadow = 'none'
          }}
          {...props}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600 }}>
            {suffix}
          </span>
        )}
      </div>
      {helperText && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '5px 0 0', fontWeight: 500 }}>{helperText}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-medium)' }}>
      <div style={{ paddingRight: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
          background: checked ? '#7c3aed' : 'rgba(255,255,255,0.1)',
          boxShadow: checked ? '0 2px 10px rgba(124, 58, 237, 0.4)' : 'none',
          transition: 'background 0.2s', flexShrink: 0
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#ffffff', position: 'absolute', top: 3,
          left: checked ? 23 : 3, transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }} />
      </button>
    </div>
  )
}

const DAYS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' }
]

const TIMEZONES = [
  { code: 'IST', label: 'IST (India Standard Time - UTC+5:30)' },
  { code: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { code: 'EST', label: 'EST (US Eastern - UTC-5)' },
  { code: 'PST', label: 'PST (US Pacific - UTC-8)' },
  { code: 'GMT', label: 'GMT (Greenwich Mean Time)' },
  { code: 'GST', label: 'GST (Gulf / Dubai - UTC+4)' },
  { code: 'SGT', label: 'SGT (Singapore - UTC+8)' }
]

function format12Hour(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  if (isNaN(h)) return time24
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  h = h ? h : 12
  return `${h}:${m} ${ampm}`
}

function ScheduleHoursPicker({ value, onChange }) {
  const [mode, setMode] = useState('calendar') // 'calendar' | 'custom'
  const [startDay, setStartDay] = useState('Mon')
  const [endDay, setEndDay] = useState('Sun')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('22:00')
  const [timezone, setTimezone] = useState('IST')
  const [is24x7, setIs24x7] = useState(false)

  const updateSchedule = (newStartDay, newEndDay, newStartTime, newEndTime, newTz, isAlways) => {
    if (isAlways) {
      onChange('24/7 Always Active Support')
      return
    }
    const formatted = `${newStartDay} - ${newEndDay}, ${format12Hour(newStartTime)} - ${format12Hour(newEndTime)} ${newTz}`
    onChange(formatted)
  }

  const handleStartDay = (d) => { setStartDay(d); updateSchedule(d, endDay, startTime, endTime, timezone, is24x7) }
  const handleEndDay = (d) => { setEndDay(d); updateSchedule(startDay, d, startTime, endTime, timezone, is24x7) }
  const handleStartTime = (t) => { setStartTime(t); updateSchedule(startDay, endDay, t, endTime, timezone, is24x7) }
  const handleEndTime = (t) => { setEndTime(t); updateSchedule(startDay, endDay, startTime, t, timezone, is24x7) }
  const handleTz = (tz) => { setTimezone(tz); updateSchedule(startDay, endDay, startTime, endTime, tz, is24x7) }

  const applyPreset = (preset) => {
    if (preset === 'all_week') {
      setIs24x7(false)
      setStartDay('Mon')
      setEndDay('Sun')
      updateSchedule('Mon', 'Sun', startTime, endTime, timezone, false)
    } else if (preset === 'weekdays') {
      setIs24x7(false)
      setStartDay('Mon')
      setEndDay('Fri')
      updateSchedule('Mon', 'Fri', startTime, endTime, timezone, false)
    } else if (preset === '24x7') {
      setIs24x7(true)
      updateSchedule(startDay, endDay, startTime, endTime, timezone, true)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border-medium)',
      borderRadius: 16,
      padding: '20px 22px',
      marginTop: 16,
      marginBottom: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <CalendarDays size={16} color="#c4b5fd" />
            <span>Support Operating Schedule & Calendar Hours</span>
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            Set operating days & calendar schedule shown to café owners in the help center.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMode(m => m === 'calendar' ? 'custom' : 'calendar')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            color: '#c4b5fd',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {mode === 'calendar' ? (
            <>
              <Edit3 size={13} />
              <span>Custom Text</span>
            </>
          ) : (
            <>
              <Calendar size={13} />
              <span>Calendar Mode</span>
            </>
          )}
        </button>
      </div>

      {mode === 'calendar' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applyPreset('all_week')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: !is24x7 && startDay === 'Mon' && endDay === 'Sun' ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                border: '1px solid var(--border-medium)',
                transition: 'all 0.15s'
              }}
            >
              <CalendarDays size={13} />
              <span>Mon - Sun (All Week)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('weekdays')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: !is24x7 && startDay === 'Mon' && endDay === 'Fri' ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                border: '1px solid var(--border-medium)',
                transition: 'all 0.15s'
              }}
            >
              <Briefcase size={13} />
              <span>Mon - Fri (Weekdays)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('24x7')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: is24x7 ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                border: '1px solid var(--border-medium)',
                transition: 'all 0.15s'
              }}
            >
              <Zap size={13} />
              <span>24/7 Always Active</span>
            </button>
          </div>

          {!is24x7 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {/* Start Day */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Start Day
                </label>
                <select
                  value={startDay}
                  onChange={e => handleStartDay(e.target.value)}
                  style={{ ...INPUT, cursor: 'pointer' }}
                >
                  {DAYS.map(d => (
                    <option key={d.short} value={d.short} style={{ background: '#131b2e' }}>{d.full}</option>
                  ))}
                </select>
              </div>

              {/* End Day */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  End Day
                </label>
                <select
                  value={endDay}
                  onChange={e => handleEndDay(e.target.value)}
                  style={{ ...INPUT, cursor: 'pointer' }}
                >
                  {DAYS.map(d => (
                    <option key={d.short} value={d.short} style={{ background: '#131b2e' }}>{d.full}</option>
                  ))}
                </select>
              </div>

              {/* Opening Time Clock */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Opening Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => handleStartTime(e.target.value)}
                  style={{ ...INPUT, cursor: 'pointer' }}
                />
              </div>

              {/* Closing Time Clock */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Closing Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => handleEndTime(e.target.value)}
                  style={{ ...INPUT, cursor: 'pointer' }}
                />
              </div>

              {/* Timezone */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Timezone / Region
                </label>
                <select
                  value={timezone}
                  onChange={e => handleTz(e.target.value)}
                  style={{ ...INPUT, cursor: 'pointer' }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.code} value={tz.code} style={{ background: '#131b2e' }}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Formatted Live Preview */}
          <div style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(79, 70, 229, 0.08))',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} />
              <span>Live Support Schedule Preview:</span>
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#ffffff',
              background: 'rgba(0,0,0,0.4)',
              padding: '4px 12px',
              borderRadius: 8,
              fontFamily: 'monospace',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {value || 'Mon - Sun, 9:00 AM - 10:00 PM IST'}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <InputField
            label="Support Operating Hours (Custom Text)"
            value={value}
            onChange={e => onChange(e.target.value)}
            helperText="Custom schedule string shown to café owners in the Support Center."
          />
        </div>
      )}
    </div>
  )
}

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    platformName: 'WhatTheMenu SaaS',
    contactEmail: 'support@whatthemenu.com',
    supportPhone: '+91 98765 43210',
    supportWhatsapp: '919876543210',
    supportHours: 'Mon - Sun, 9:00 AM - 10:00 PM IST',
    trialDays: '14',
    maintenanceMode: false,
    requireEmailVerification: true,
    stripeLiveMode: false,
    currency: 'INR',
    taxRate: '18',
    starterPrice: '199',
    proPrice: '499',
    proPlusPrice: '999',
    yearlyDiscountPercentage: '20',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Load settings from DB
  useEffect(() => {
    adminAPI.getSettings()
      .then(res => {
        const s = res.data.data
        if (!s) return
        setForm({
          platformName: s.platform_name || 'WhatTheMenu SaaS',
          contactEmail: s.contact_email || 'support@whatthemenu.com',
          supportPhone: s.support_phone || '+91 98765 43210',
          supportWhatsapp: s.support_whatsapp || '919876543210',
          supportHours: s.support_hours || 'Mon - Sun, 9:00 AM - 10:00 PM IST',
          trialDays: String(s.trial_days ?? 14),
          maintenanceMode: Boolean(s.maintenance_mode),
          requireEmailVerification: true,
          stripeLiveMode: Boolean(s.payment_live_mode),
          currency: s.currency || 'INR',
          taxRate: String(s.tax_rate ?? 18),
          starterPrice: String(s.starter_price ?? 199),
          proPrice: String(s.pro_price ?? 499),
          proPlusPrice: String(s.pro_plus_price ?? 999),
          yearlyDiscountPercentage: String(s.yearly_discount_percentage ?? 20),
        })
      })
      .catch(() => {}) // silently fail, keep defaults
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminAPI.updateSettings({
        platform_name: form.platformName,
        contact_email: form.contactEmail,
        support_phone: form.supportPhone,
        support_whatsapp: form.supportWhatsapp,
        support_hours: form.supportHours,
        trial_days: Number(form.trialDays),
        payment_live_mode: form.stripeLiveMode,
        currency: form.currency,
        tax_rate: Number(form.taxRate),
        starter_price: Number(form.starterPrice),
        pro_price: Number(form.proPrice),
        pro_plus_price: Number(form.proPlusPrice),
        yearly_discount_percentage: Number(form.yearlyDiscountPercentage),
        maintenance_mode: form.maintenanceMode,
      })
      toast.success('Platform settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
  ]

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)', maxWidth: 1040, position: 'relative' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 768px) {
          .settings-layout { flex-direction: row !important; }
        }
        @media (max-width: 767px) {
          .settings-layout { flex-direction: column !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)' }}>
              <Settings size={18} />
            </div>
            <h1 style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
              Platform Settings
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
            Configure global SaaS parameters, subscription pricing, support channels, and platform behavior.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 26px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="settings-layout">
        
        {/* Sidebar tabs */}
        <div style={{ width: '100%', maxWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: isActive ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  background: isActive ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-card)',
                  color: isActive ? '#c4b5fd' : 'var(--text-secondary)',
                }}
              >
                <Icon size={18} color={isActive ? '#c4b5fd' : 'var(--text-tertiary)'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 20, padding: '32px 28px', boxShadow: 'var(--shadow-card)' }}>
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-medium)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>
                  General Configuration
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                  Basic identity and official communication channels for WhatTheMenu.
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 20px' }}>
                <InputField 
                  label="Platform Brand Name" 
                  value={form.platformName} 
                  onChange={e => set('platformName', e.target.value)} 
                  helperText="Appears across system headers, email notifications, and footer." 
                />
                <InputField 
                  label="Official Support Email" 
                  type="email" 
                  value={form.contactEmail} 
                  onChange={e => set('contactEmail', e.target.value)} 
                  helperText="Primary inbox receiving system notifications & tickets." 
                />
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-medium)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} color="#c4b5fd" />
                  <span>Owner Support Channels</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 20px' }}>
                  <InputField 
                    label="Support WhatsApp (Direct wa.me)" 
                    value={form.supportWhatsapp} 
                    onChange={e => set('supportWhatsapp', e.target.value)} 
                    helperText="Digits with country code (e.g. 919876543210)." 
                  />
                  <InputField 
                    label="Support Phone Helpline" 
                    value={form.supportPhone} 
                    onChange={e => set('supportPhone', e.target.value)} 
                    helperText="Displayed in the Café Owner Help Center." 
                  />
                </div>
                
                <ScheduleHoursPicker
                  value={form.supportHours}
                  onChange={val => set('supportHours', val)}
                />
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-medium)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={16} color="#c4b5fd" />
                  <span>Platform System Status</span>
                </h3>
                <Toggle
                  label="Maintenance Mode"
                  description="Block customer access to all cafés (displays friendly maintenance screen). Super Admins can still log in."
                  checked={form.maintenanceMode}
                  onChange={v => set('maintenanceMode', v)}
                />
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-medium)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>
                  SaaS Plans & Pricing Ledger
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                  Manage trial periods, recurring subscription tier prices, taxes, and Razorpay live mode.
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 20px' }}>
                <InputField 
                  label="Trial Duration" 
                  type="number" 
                  value={form.trialDays} 
                  onChange={e => set('trialDays', e.target.value)} 
                  suffix="days" 
                  helperText="Default free trial length for newly registered cafés." 
                />
                
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Platform Currency
                  </label>
                  <select
                    value={form.currency} 
                    onChange={e => set('currency', e.target.value)}
                    style={{ ...INPUT, cursor: 'pointer' }}
                  >
                    <option value="INR" style={{ background: '#131b2e' }}>INR (₹) - Indian Rupee</option>
                    <option value="USD" style={{ background: '#131b2e' }}>USD ($) - US Dollar</option>
                    <option value="EUR" style={{ background: '#131b2e' }}>EUR (€) - Euro</option>
                  </select>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '5px 0 0', fontWeight: 500 }}>
                    Global currency symbol for subscription checkouts.
                  </p>
                </div>

                <InputField 
                  label="Tax Rate (GST / VAT)" 
                  type="number" 
                  value={form.taxRate} 
                  onChange={e => set('taxRate', e.target.value)} 
                  suffix="%" 
                  helperText="Tax percentage calculated on subscription invoices." 
                />
              </div>

              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-medium)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={16} color="#c4b5fd" />
                  <span>Monthly Subscription Tier Prices</span>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 20px' }}>
                  <InputField 
                    label="Starter Plan (Monthly)" 
                    type="number" 
                    prefix="₹" 
                    value={form.starterPrice} 
                    onChange={e => set('starterPrice', e.target.value)} 
                    helperText="Ideal for small kiosks & food trucks." 
                  />
                  <InputField 
                    label="Pro Plan (Monthly)" 
                    type="number" 
                    prefix="₹" 
                    value={form.proPrice} 
                    onChange={e => set('proPrice', e.target.value)} 
                    helperText="For busy cafés with active kitchen order flow." 
                  />
                  <InputField 
                    label="Pro Plus Plan (Monthly)" 
                    type="number" 
                    prefix="₹" 
                    value={form.proPlusPrice} 
                    onChange={e => set('proPlusPrice', e.target.value)} 
                    helperText="Multi-table restaurants requiring priority perks." 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 20px', marginTop: 8 }}>
                  <InputField 
                    label="Yearly Discount Percentage (%)" 
                    type="number" 
                    suffix="%" 
                    value={form.yearlyDiscountPercentage} 
                    onChange={e => set('yearlyDiscountPercentage', e.target.value)} 
                    helperText="Discount applied when owners switch from Monthly to Annual billing." 
                  />
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-medium)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} color="#c4b5fd" />
                  <span>Payment Gateway Environment</span>
                </h3>
                <Toggle
                  label="Razorpay Production Live Mode"
                  description="When disabled, test cards/UPI simulators are active. Enable only when real payments are verified."
                  checked={form.stripeLiveMode}
                  onChange={v => set('stripeLiveMode', v)}
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-medium)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>
                  Security & Access Governance
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                  Authentication policies, verification gates, and platform safety controls.
                </p>
              </div>
              
              <Toggle
                label="Mandatory Email Verification"
                description="Require newly signed-up café owners to confirm their email OTP prior to dashboard unlock."
                checked={form.requireEmailVerification}
                onChange={v => set('requireEmailVerification', v)}
              />

              <div style={{ marginTop: 36, padding: 24, borderRadius: 16, border: '1px solid rgba(244, 63, 94, 0.25)', background: 'rgba(244, 63, 94, 0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f43f5e', marginBottom: 8 }}>
                  <AlertTriangle size={20} />
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif" }}>
                    Platform Danger Zone
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Administrative actions below are restricted and clear global runtime caching layers.
                </p>
                <button
                  type="button"
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    background: 'rgba(244, 63, 94, 0.12)',
                    color: '#f43f5e',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onClick={() => toast.success('Platform cache purged successfully')}
                >
                  Purge Application Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
