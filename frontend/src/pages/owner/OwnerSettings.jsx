import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const INPUT = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
}

function InputField({ label, helperText, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', display: 'block', marginBottom: 6 }}>{label}</label>
      {props.as === 'textarea' ? (
        <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 80 }} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} {...props} />
      ) : (
        <input style={INPUT} onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} {...props} />
      )}
      {helperText && <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>{helperText}</p>}
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
    razorpay_webhook_secret: ''
  })
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Modifying settings is disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('phone', form.phone)
      formData.append('address', form.address)
      formData.append('tax_percentage', form.tax_percentage)
      formData.append('razorpay_key_id', form.razorpay_key_id)
      if (form.razorpay_key_secret) formData.append('razorpay_key_secret', form.razorpay_key_secret)
      if (form.razorpay_webhook_secret) formData.append('razorpay_webhook_secret', form.razorpay_webhook_secret)
      if (logoFile) formData.append('logo', logoFile)

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
    { id: 'branding', label: 'Branding', icon: '✨' },
    { id: 'payments', label: 'Payment & Billing', icon: '💳' },
    { id: 'hours', label: 'Business Hours', icon: '🕒' },
  ]

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff', maxWidth: 1000 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Settings</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Manage your café's profile, branding, and operations.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px rgba(6,182,212,0.3)', transition: 'transform 0.2s' }}
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
                background: activeTab === tab.id ? 'rgba(6,182,212,0.1)' : 'transparent',
                color: activeTab === tab.id ? '#67e8f9' : '#9ca3af',
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content Area ── */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 32 }}>
          
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
                    <img src={user.logo} alt="Current Logo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      ☕
                    </div>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: '0 0 4px' }}>Upload your café logo</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>Recommended size: 512x512px (PNG or JPG)</p>
                  <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} style={{ fontSize: 13, color: '#9ca3af' }} />
                </div>
              </div>
            )}

            {activeTab === 'hours' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Business Hours</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Configure when your café is open to accept online orders.</p>
                <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Business hours configuration coming soon in v2.0</p>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Payment & Billing Methods</h2>
                <div style={{ padding: '24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>💳</span>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>Razorpay Payment Gateway</h3>
                      <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Enable seamless online payments (Credit Card, Netbanking, UPI, Wallets) via Razorpay checkout.</p>
                    </div>
                  </div>
                  
                  <div style={{ padding: '20px', borderRadius: 14, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.04)', marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#67e8f9', margin: 0 }}>Razorpay API Keys</p>
                      {form.razorpay_key_id ? (
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '3px 8px', borderRadius: 50 }}>
                          ✓ Configured
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '3px 8px', borderRadius: 50 }}>
                          ⚠️ Not Configured
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px' }}>
                      Get these from your Razorpay Dashboard ➔ Settings ➔ API Keys.
                    </p>
                    <InputField label="Key ID" placeholder="rzp_live_..." value={form.razorpay_key_id} onChange={e => setForm({...form, razorpay_key_id: e.target.value})} />
                    <InputField label="Key Secret" type="password" placeholder={form.razorpay_key_id ? "•••••••••••••••• (Leave blank to keep existing)" : "Enter key secret..."} value={form.razorpay_key_secret} onChange={e => setForm({...form, razorpay_key_secret: e.target.value})} />
                  </div>

                  <div style={{ padding: '20px', borderRadius: 14, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.04)', marginBottom: 24 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#67e8f9', margin: '0 0 6px' }}>Order Webhooks</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px' }}>
                      Set up webhooks in Razorpay to ensure real-time order confirmation.
                    </p>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', display: 'block', marginBottom: 6 }}>Webhook URL (Add this to Razorpay)</label>
                      <div style={{ 
                        padding: '12px 14px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)', 
                        background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', wordBreak: 'break-all'
                      }}>
                        <span>{import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin}/api/webhooks/razorpay/order</span>
                        <button 
                          type="button"
                          onClick={() => {
                            const url = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin;
                            navigator.clipboard.writeText(`${url}/api/webhooks/razorpay/order`);
                            toast.success('Copied URL');
                          }}
                          style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#06b6d4', color: '#fff', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Copy
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>Select events: <strong>payment.captured</strong> and <strong>payment.failed</strong></p>
                    </div>
                    <InputField label="Webhook Secret" type="password" placeholder="Enter webhook secret..." value={form.razorpay_webhook_secret} onChange={e => setForm({...form, razorpay_webhook_secret: e.target.value})} helperText="Set a secret phrase here and enter the same secret in Razorpay to secure your webhooks." />
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>🧾</span>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 2px' }}>Taxes</h3>
                      <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Configure a global tax percentage to apply to orders.</p>
                    </div>
                  </div>
                  
                  <div style={{ padding: '20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: '0 0 4px' }}>Tax Percentage (%)</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>e.g. enter 5 for 5% tax.</p>
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
