import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { loadAlertSettings, saveAlertSettings, playHardwareAlert } from '../../utils/hardwareAlerts'

const INPUT = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--border-medium)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
}

function InputField({ label, helperText, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>{label}</label>
      {props.as === 'textarea' ? (
        <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 80 }} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} {...props} />
      ) : (
        <input style={INPUT} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} {...props} />
      )}
      {helperText && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>{helperText}</p>}
    </div>
  )
}

const OwnerSettings = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    tax_percentage: user?.tax_percentage || 0,
    razorpay_key_id: user?.razorpay_key_id || '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
    billing_settings: user?.billing_settings || { format: 'standard', tax_number: '', thank_you_message: 'Thank you for your visit!' }
  })
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hardwareAlerts, setHardwareAlerts] = useState(loadAlertSettings())
  const [editingRazorpay, setEditingRazorpay] = useState(false)
  const [razorpayForm, setRazorpayForm] = useState({ key_id: '', key_secret: '' })

  const handleHardwareChange = (field, value) => {
    const newSettings = { ...hardwareAlerts, [field]: value }
    setHardwareAlerts(newSettings)
    saveAlertSettings(newSettings)
    if (field === 'volume' && !newSettings.mute) {
      playHardwareAlert('new-order')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Modifying settings is disabled.', { style: { background: 'var(--text-primary)', color: 'var(--bg-main)', fontWeight: 'bold' } })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('phone', form.phone)
      formData.append('address', form.address)
      formData.append('tax_percentage', form.tax_percentage)
            // Only update Razorpay keys if the edit panel was intentionally opened and filled
      if (editingRazorpay && razorpayForm.key_id.trim() && razorpayForm.key_secret.trim()) {
        formData.append('razorpay_key_id', razorpayForm.key_id.trim())
        formData.append('razorpay_key_secret', razorpayForm.key_secret.trim())
        setEditingRazorpay(false)
        setRazorpayForm({ key_id: '', key_secret: '' })
      } else if (!editingRazorpay) {
        // If they are not editing, send back the existing key_id so it doesn't get cleared by accident
        formData.append('razorpay_key_id', form.razorpay_key_id || '')
      }
      
      if (form.razorpay_webhook_secret) formData.append('razorpay_webhook_secret', form.razorpay_webhook_secret)
      if (logoFile) formData.append('logo', logoFile)
      formData.append('billing_settings', JSON.stringify(form.billing_settings))

      const res = await ownerAPI.updateSettings(formData)
      localStorage.setItem('user', JSON.stringify(res.data.data))
      toast.success('Settings updated successfully')
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'profile', label: 'Café Profile', icon: '🏪' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'payments', label: 'Payment & Billing', icon: '💳' },
    { id: 'billing', label: 'Billing & Invoice', icon: '🧾' },
    { id: 'hours', label: 'Business Hours', icon: '🕒' },
    { id: 'alerts', label: 'Hardware Alerts', icon: '🔔' },
  ]

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)', maxWidth: 1000 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Settings</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Manage your café's profile, branding, and operations.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px rgba(6,182,212,0.3)', transition: 'transform 0.2s' }}
          onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, '@media(minWidth:768px)': { flexDirection: 'row' } }} className="settings-layout">
        
        {/* ── Sidebar Tabs ── */}
        <div style={{ width: '100%', maxWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, transition: 'all 0.15s', textAlign: 'left',
                background: activeTab === tab.id ? 'var(--cyan-bg-light)' : 'transparent',
                color: activeTab === tab.id ? '#67e8f9' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'var(--bg-input)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content Area ── */}
        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 20, padding: 32 }}>
          
          <form id="settings-form" onSubmit={handleSubmit}>
            
            {activeTab === 'profile' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Café Profile</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0 20px', '@media(minWidth:640px)': { gridTemplateColumns: '1fr 1fr' } }}>
                  <InputField label="Café Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  <InputField label="Contact Phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
                </div>
                <InputField label="Full Address" as="textarea" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required helperText="This address appears on customer receipts." />
              </div>
            )}

            {activeTab === 'branding' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Brand Assets</h2>
                <div style={{ padding: '24px', borderRadius: 16, border: '1px dashed rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.05)', textAlign: 'center' }}>
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '2px solid #06b6d4' }} />
                  ) : user?.logo ? (
                    <img src={user.logo} alt="Current Logo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '1px solid var(--border-medium)' }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px', border: '1px solid var(--border-medium)' }}>
                      ☕
                    </div>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Upload your café logo</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>Recommended size: 512x512px (PNG or JPG)</p>
                  <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
                </div>
              </div>
            )}

            {activeTab === 'hours' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Business Hours</h2>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>Configure when your café is open to accept online orders.</p>
                <div style={{ padding: 20, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>Business hours configuration coming soon in v2.0</p>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Hardware Alerts (This Device)</h2>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>These settings control audio and vibration alerts for this specific device. They do not affect other devices.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Mute Audio */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>🔕 Mute Audio Alerts</span>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Silence all incoming order and staff request sounds.</p>
                    </div>
                    <input type="checkbox" checked={hardwareAlerts.mute} onChange={(e) => handleHardwareChange('mute', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#06b6d4', cursor: 'pointer' }} />
                  </label>

                  {/* Disable Vibration */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>📳 Disable Vibration</span>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Stop this device from vibrating on new alerts.</p>
                    </div>
                    <input type="checkbox" checked={hardwareAlerts.disableVibration} onChange={(e) => handleHardwareChange('disableVibration', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#06b6d4', cursor: 'pointer' }} />
                  </label>

                  {/* Volume Slider */}
                  <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>🔊 Alert Volume</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#06b6d4' }}>{Math.round((hardwareAlerts.volume || 0.8) * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1" 
                      value={hardwareAlerts.volume || 0.8} 
                      onChange={(e) => handleHardwareChange('volume', parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
                      disabled={hardwareAlerts.mute}
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '12px 0 0', fontStyle: 'italic' }}>Drag slider to preview alert sound</p>
                  </div>

                  {/* Test Sounds Demo */}
                  <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px dashed rgba(6,182,212,0.3)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#67e8f9' }}>Test Alert Sounds</h3>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => playHardwareAlert('new-order')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--border-light)'}>
                        🛍️ New Order
                      </button>
                      <button type="button" onClick={() => playHardwareAlert('waiter')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--border-light)'}>
                        🛎️ Waiter / Bill
                      </button>
                      <button type="button" onClick={() => playHardwareAlert('ready')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--border-light)'}>
                        ✅ Order Ready
                      </button>
                    </div>
                  </div>
                </div>
                
              </div>
            )}

            
            {activeTab === 'billing' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Billing & Invoice Settings</h2>
                <div style={{ padding: '24px', borderRadius: 16, border: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
                  
                  <InputField 
                    label="Tax / GST Number" 
                    value={form.billing_settings.tax_number} 
                    onChange={e => setForm({...form, billing_settings: {...form.billing_settings, tax_number: e.target.value}})} 
                    helperText="This will appear on the customer's downloadable bill." 
                  />

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Bill Format</label>
                    <select
                      value={form.billing_settings.format}
                      onChange={e => setForm({...form, billing_settings: {...form.billing_settings, format: e.target.value}})}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                    >
                      <option style={{background: 'var(--bg-shell)'}} value="standard">Standard Receipt</option>
                      <option style={{background: 'var(--bg-shell)'}} value="minimal">Minimal (Eco-friendly)</option>
                      <option style={{background: 'var(--bg-shell)'}} value="detailed">Detailed Invoice</option>
                    </select>
                  </div>

                  <InputField 
                    label="Custom Thank You Message" 
                    as="textarea"
                    value={form.billing_settings.thank_you_message} 
                    onChange={e => setForm({...form, billing_settings: {...form.billing_settings, thank_you_message: e.target.value}})} 
                    helperText="Leave a nice message at the bottom of the bill." 
                  />
                  
                  <div style={{ marginTop: 24, padding: 16, background: 'rgba(6,182,212,0.05)', border: '1px dashed rgba(6,182,212,0.3)', borderRadius: 12 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#06b6d4' }}>Bill Preview Notes</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Customers can download this bill from their order tracking page once the payment is completed. It will automatically include your Cafe Name: <strong>{form.name}</strong>, Phone: <strong>{form.phone}</strong>, and Address: <strong>{form.address}</strong>.</p>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'payments' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Payment & Billing Methods</h2>
                <div style={{ padding: '24px', borderRadius: 16, border: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
                  

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>💳</span>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', color: 'var(--text-primary)' }}>Razorpay Payment Gateway</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Enable seamless online payments (Credit Card, Netbanking, UPI, Wallets) via Razorpay checkout.</p>
                    </div>
                  </div>
                  
                  <div style={{ padding: '20px', borderRadius: 14, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.04)', marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#67e8f9', margin: 0 }}>Razorpay API Keys</p>
                      {form.razorpay_key_id ? (
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: 'var(--success-text)', padding: '3px 8px', borderRadius: 50 }}>
                          ✓ Configured
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.2)', color: 'var(--danger-text)', padding: '3px 8px', borderRadius: 50 }}>
                          ⚠️ Not Configured
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                      Get these from your Razorpay Dashboard ➔ Settings ➔ API Keys.
                    </p>
                    {!editingRazorpay ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-medium)' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Key ID</span>
                            <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {form.razorpay_key_id ? form.razorpay_key_id.slice(0, 12) + '••••••••' + form.razorpay_key_id.slice(-4) : '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginBottom: 16 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Key Secret</span>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{form.razorpay_key_id ? '••••••••••••••••' : '—'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEditingRazorpay(true); setRazorpayForm({ key_id: '', key_secret: '' }) }}
                            style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(6,182,212,0.5)', background: 'rgba(6,182,212,0.06)', color: '#67e8f9', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--cyan-border-medium)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.06)'}
                          >
                            🔑 Update Razorpay Keys
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 18, marginTop: 1 }}>⚠️</span>
                            <p style={{ margin: 0, fontSize: 13, color: '#fbbf24', lineHeight: 1.5 }}>Enter new Razorpay credentials carefully. Old keys will be replaced only when you click <strong>Save Changes</strong>.</p>
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>New Key ID</label>
                            <input
                              type="text"
                              placeholder="rzp_live_..."
                              value={razorpayForm.key_id}
                              onChange={e => setRazorpayForm({...razorpayForm, key_id: e.target.value})}
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="off"
                              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.04)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                            />
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>New Key Secret</label>
                            <input
                              type="password"
                              placeholder="Enter new key secret..."
                              value={razorpayForm.key_secret}
                              onChange={e => setRazorpayForm({...razorpayForm, key_secret: e.target.value})}
                              autoComplete="new-password"
                              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.04)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEditingRazorpay(false); setRazorpayForm({ key_id: '', key_secret: '' }) }}
                            style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)', background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                  </div>

                  <div style={{ padding: '20px', borderRadius: 14, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.04)', marginBottom: 24 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#67e8f9', margin: '0 0 6px' }}>Order Webhooks</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                      Set up webhooks in Razorpay to ensure real-time order confirmation.
                    </p>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Webhook URL (Add this to Razorpay)</label>
                      <div style={{ 
                        padding: '12px 14px', borderRadius: 12, border: '1px dashed var(--border-hover)', 
                        background: 'var(--overlay-bg)', color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', wordBreak: 'break-all'
                      }}>
                        <span>{import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin}/api/webhooks/razorpay/order</span>
                        <button 
                          type="button"
                          onClick={() => {
                            const url = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin;
                            navigator.clipboard.writeText(`${url}/api/webhooks/razorpay/order`);
                            toast.success('Copied URL');
                          }}
                          style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#06b6d4', color: 'var(--text-primary)', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Copy
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0 0' }}>Select events: <strong>payment.captured</strong> and <strong>payment.failed</strong></p>
                    </div>
                    <InputField label="Webhook Secret" type="password" placeholder="Enter webhook secret..." value={form.razorpay_webhook_secret} onChange={e => setForm({...form, razorpay_webhook_secret: e.target.value})} helperText="Set a secret phrase here and enter the same secret in Razorpay to secure your webhooks." />
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>🧾</span>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 2px' }}>Taxes</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Configure a global tax percentage to apply to orders.</p>
                    </div>
                  </div>
                  
                  <div style={{ padding: '20px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Tax Percentage (%)</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>e.g. enter 5 for 5% tax.</p>
                    <InputField type="number" min="0" max="100" step="0.01" placeholder="0" value={form.tax_percentage} onChange={e => setForm({...form, tax_percentage: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 768px) { .settings-layout { flex-direction: row !important; } }
        @media (max-width: 767px) { .settings-layout { flex-direction: column !important; } }
      `}</style>
    </div>
  )
}

export default OwnerSettings
