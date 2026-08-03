import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'

const INPUT = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
}

function InputField({ label, helperText, prefix, suffix, type = 'text', ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14 }}>{prefix}</span>}
        <input
          type={type}
          style={{ ...INPUT, paddingLeft: prefix ? 32 : 14, paddingRight: suffix ? 40 : 14 }}
          onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          {...props}
        />
        {suffix && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14 }}>{suffix}</span>}
      </div>
      {helperText && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>{helperText}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
          background: checked ? '#7c3aed' : 'rgba(255,255,255,0.1)',
          transition: 'background 0.2s', flexShrink: 0
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
          left: checked ? 23 : 3, transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  )
}

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    platformName: 'QRMenu SaaS',
    contactEmail: 'support@qrmenu.com',
    trialDays: '14',
    maintenanceMode: false,
    requireEmailVerification: true,
    stripeLiveMode: false,
    currency: 'INR',
    taxRate: '18',
    adminUpiId: 'yourname@upi',
    starterPrice: '299',
    proPrice: '499',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Load settings from DB
  useEffect(() => {
    adminAPI.getSettings()
      .then(res => {
        const s = res.data.data
        setForm({
          platformName: s.platform_name || 'QRMenu SaaS',
          contactEmail: s.contact_email || 'support@qrmenu.com',
          trialDays: String(s.trial_days ?? 14),
          maintenanceMode: s.maintenance_mode || false,
          requireEmailVerification: true,
          stripeLiveMode: s.payment_live_mode || false,
          currency: s.currency || 'INR',
          taxRate: String(s.tax_rate ?? 18),
          adminUpiId: s.admin_upi_id || 'yourname@upi',
          starterPrice: String(s.starter_price ?? 299),
          proPrice: String(s.pro_price ?? 499),
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
        trial_days: Number(form.trialDays),
        payment_live_mode: form.stripeLiveMode,
        currency: form.currency,
        tax_rate: Number(form.taxRate),
        admin_upi_id: form.adminUpiId,
        starter_price: Number(form.starterPrice),
        pro_price: Number(form.proPrice),
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
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'billing', label: 'Billing & Plans', icon: '💳' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ]

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff', maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Platform Settings</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Configure global platform behavior and defaults.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px rgba(124,58,237,0.3)', transition: 'transform 0.2s' }}
          onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, '@media(minWidth:768px)': { flexDirection: 'row' } }} className="settings-layout">
        
        {/* Sidebar tabs */}
        <div style={{ width: '100%', maxWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, transition: 'all 0.15s', textAlign: 'left',
                background: activeTab === tab.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                color: activeTab === tab.id ? '#c4b5fd' : '#9ca3af',
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 32 }}>
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>General Settings</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <InputField label="Platform Name" value={form.platformName} onChange={e => set(e.target.value)} helperText="Appears in emails and dashboard headers." />
                <InputField label="Support Email" type="email" value={form.contactEmail} onChange={e => set(e.target.value)} helperText="Contact address for café owners." />
              </div>

              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>System Status</h3>
                <Toggle
                  label="Maintenance Mode"
                  description="Disable access to all cafés (shows maintenance page). Admins can still log in."
                  checked={form.maintenanceMode}
                  onChange={v => set('maintenanceMode', v)}
                />
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Billing & Plans</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <InputField label="Default Trial Days" type="number" value={form.trialDays} onChange={e => set('trialDays', e.target.value)} suffix="days" helperText="Free trial length for new signups." />
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', display: 'block', marginBottom: 6 }}>Currency</label>
                  <select
                    value={form.currency} onChange={e => set('currency', e.target.value)}
                    style={{ ...INPUT, cursor: 'pointer' }}
                  >
                    <option value="INR" style={{ background: '#0d1120' }}>INR (₹) - Indian Rupee</option>
                    <option value="USD" style={{ background: '#0d1120' }}>USD ($) - US Dollar</option>
                    <option value="EUR" style={{ background: '#0d1120' }}>EUR (€) - Euro</option>
                  </select>
                </div>
                <InputField label="Tax Rate (GST)" type="number" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} suffix="%" helperText="Default tax rate applied to subscription invoices." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: 20 }}>
                 <InputField label="Admin UPI ID" type="text" value={form.adminUpiId} onChange={e => set('adminUpiId', e.target.value)} helperText="The UPI ID where café owners will send subscription payments." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: 20 }}>
                 <InputField label="Starter Plan Price" type="number" prefix="₹" value={form.starterPrice} onChange={e => set('starterPrice', e.target.value)} helperText="Monthly price for the Starter plan." />
                 <InputField label="Pro Plan Price" type="number" prefix="₹" value={form.proPrice} onChange={e => set('proPrice', e.target.value)} helperText="Monthly price for the Pro plan." />
              </div>

              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Payment Gateway</h3>
                <Toggle
                  label="Live Mode"
                  description="Toggle between test mode (mock payments) and live mode."
                  checked={form.stripeLiveMode}
                  onChange={v => set('stripeLiveMode', v)}
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Security & Access</h2>
              
              <Toggle
                label="Require Email Verification"
                description="Force café owners to verify their email address before accessing the dashboard."
                checked={form.requireEmailVerification}
                onChange={v => set('requireEmailVerification', v)}
              />

              <div style={{ marginTop: 32, padding: 20, borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f87171', margin: '0 0 8px' }}>Danger Zone</h3>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>These actions are destructive and cannot be reversed.</p>
                <button
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => alert('Feature disabled in demo mode')}
                >
                  Clear All Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 768px) {
          .settings-layout { flex-direction: row !important; }
        }
        @media (max-width: 767px) {
          .settings-layout { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}

export default AdminSettings
