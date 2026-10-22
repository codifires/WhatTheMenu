import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { loadAlertSettings, saveAlertSettings, playHardwareAlert } from '../../utils/hardwareAlerts'
import { 
  Store, Palette, Sparkles, CreditCard, FileText, 
  Clock, Bell, Volume2, VolumeX, Vibrate, Check, 
  CheckCircle2, ShieldAlert, Upload, Play, Key, 
  Save, AlertTriangle, ExternalLink, HelpCircle
} from 'lucide-react'

export default function OwnerSettings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    slug: user?.slug || '',
    phone: user?.phone || '',
    address: user?.address || '',
    tax_percentage: user?.tax_percentage || 0,
    razorpay_key_id: user?.razorpay_key_id || '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
    billing_settings: user?.billing_settings || { 
      format: 'standard', 
      tax_number: '', 
      thank_you_message: 'Thank you for dining with us!' 
    }
  })
  const [logoFile, setLogoFile] = useState(null)
  const [themeSettings, setThemeSettings] = useState(
    user?.theme_settings || { active_theme: 'classic', unlocked_themes: ['classic'] }
  )

  useEffect(() => {
    if (user?.theme_settings) {
      setThemeSettings(user.theme_settings)
    }
  }, [user])

  const isSubActive = user?.subscription_status === 'active'
  const planName = isSubActive ? (user?.subscription?.plan_name || 'starter') : 'starter'
  let maxThemes = 1
  if (planName === 'pro') maxThemes = 3
  if (planName === 'pro_plus') maxThemes = 5
  
  const actualUnlockedThemes = (themeSettings.unlocked_themes || ['classic']).slice(0, maxThemes)
  const THEME_OPTIONS = [
    {
      id: 'classic',
      name: 'Classic Minimal',
      desc: 'Clean modern layout with vibrant ember-orange accents',
      bg: '#f8fafc',
      cardBg: '#ffffff',
      headerBg: '#0f172a',
      accent: '#ea580c',
      text: '#0f172a'
    },
    {
      id: 'midnight',
      name: 'Warm Amber Bistro',
      desc: 'Warm bistro style with rich espresso tones & golden amber',
      bg: '#fdfbf7',
      cardBg: '#ffffff',
      headerBg: '#2b1f13',
      accent: '#d97706',
      text: '#291e10'
    },
    {
      id: 'forest',
      name: 'Fresh Sage Garden',
      desc: 'Organic garden aesthetic with emerald green & sage highlights',
      bg: '#f7faf8',
      cardBg: '#ffffff',
      headerBg: '#12281b',
      accent: '#059669',
      text: '#12281b'
    },
    {
      id: 'rose',
      name: 'Berry & Rose Patisserie',
      desc: 'Velvety blush & berry tones perfect for bakeries & desserts',
      bg: '#fdf8f9',
      cardBg: '#ffffff',
      headerBg: '#2d121c',
      accent: '#e11d48',
      text: '#2d121c'
    },
    {
      id: 'blackgold',
      name: 'Artisan Gold & Onyx',
      desc: 'Luxury dark roast aesthetic with warm champagne gold',
      bg: '#faf9f5',
      cardBg: '#ffffff',
      headerBg: '#1c1917',
      accent: '#b45309',
      text: '#1f1d1a'
    }
  ]
  
  const handleThemeChange = async (themeId) => {
    if (themeSettings.active_theme === themeId) return
    try {
      const res = await ownerAPI.updateTheme({ active_theme: themeId })
      setThemeSettings(res.data.data)
      let u = JSON.parse(localStorage.getItem('user')) || {}
      u.theme_settings = res.data.data
      localStorage.setItem('user', JSON.stringify(u))
      toast.success('Customer menu theme activated!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to activate theme')
    }
  }

  const handleUnlockTheme = async (themeId) => {
    try {
      const res = await ownerAPI.updateTheme({ unlock_theme: themeId })
      setThemeSettings(res.data.data)
      let u = JSON.parse(localStorage.getItem('user')) || {}
      u.theme_settings = res.data.data
      localStorage.setItem('user', JSON.stringify(u))
      toast.success('Theme unlocked successfully!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to unlock theme')
    }
  }

  const [saving, setSaving] = useState(false)
  const [hardwareAlerts, setHardwareAlerts] = useState(loadAlertSettings())
  const [editingRazorpay, setEditingRazorpay] = useState(false)
  const [razorpayForm, setRazorpayForm] = useState({ key_id: '', key_secret: '' })
  const [showUrlWarningModal, setShowUrlWarningModal] = useState(false)

  const handleHardwareChange = (field, value) => {
    const newSettings = { ...hardwareAlerts, [field]: value }
    setHardwareAlerts(newSettings)
    saveAlertSettings(newSettings)
    if (field === 'volume' && !newSettings.mute) {
      playHardwareAlert('new-order')
    }
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    if (form.slug !== (user?.slug || '') && !showUrlWarningModal) {
      setShowUrlWarningModal(true)
      return
    }
    setShowUrlWarningModal(false)
    
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Modifying settings is simulated.')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      if (form.email) formData.append('email', form.email)
      if (form.slug) formData.append('slug', form.slug)
      formData.append('phone', form.phone)
      formData.append('address', form.address)
      formData.append('tax_percentage', form.tax_percentage)

      if (editingRazorpay && razorpayForm.key_id.trim() && razorpayForm.key_secret.trim()) {
        formData.append('razorpay_key_id', razorpayForm.key_id.trim())
        formData.append('razorpay_key_secret', razorpayForm.key_secret.trim())
        setEditingRazorpay(false)
        setRazorpayForm({ key_id: '', key_secret: '' })
      } else if (!editingRazorpay) {
        formData.append('razorpay_key_id', form.razorpay_key_id || '')
      }
      
      if (form.razorpay_webhook_secret) formData.append('razorpay_webhook_secret', form.razorpay_webhook_secret)
      if (logoFile) formData.append('logo', logoFile)
      formData.append('billing_settings', JSON.stringify(form.billing_settings))

      const res = await ownerAPI.updateSettings(formData)
      localStorage.setItem('user', JSON.stringify(res.data.data))
      toast.success('Settings updated successfully!')
      setTimeout(() => window.location.reload(), 800)
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'profile', label: 'Café Profile', icon: Store },
    { id: 'branding', label: 'Brand & Logo', icon: Palette },
    { id: 'themes', label: 'Menu Themes', icon: Sparkles },
    { id: 'payments', label: 'Payment Gateway', icon: CreditCard },
    { id: 'billing', label: 'Billing & Receipt', icon: FileText },
    { id: 'alerts', label: 'Hardware Alerts', icon: Bell },
    { id: 'hours', label: 'Business Hours', icon: Clock },
  ]

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>Café Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Restaurant Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure your brand identity, live menu theme, payment gateway keys, receipts, and audio alerts.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* ── Main Layout: Sidebar Tabs + Content Panel ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Sidebar Nav */}
        <div className="md:col-span-3 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {TABS.map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <TabIcon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-9 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Café Profile & Contact
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  General details displayed to your customers and printed on invoices.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Café Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Primary Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Applicable Food Tax / GST (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={form.tax_percentage}
                    onChange={e => setForm({ ...form, tax_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Complete Physical Address *
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, Landmark, City, State, PIN"
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)] space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Custom Digital Menu URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    {window.location.origin}/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-cafe-name"
                    className="flex-1 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    /menu
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Warning: Changing this slug will update your menu link. Ensure you reprint QR table standees if modified.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Branding */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Café Logo & Brand Assets
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Your logo will appear at the header of your mobile QR menu, table standees, and PDF receipts.
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-dashed border-[var(--border-medium)] hover:border-indigo-500/50 bg-[var(--bg-input)] text-center transition-colors">
                <div className="mb-4">
                  {logoFile ? (
                    <img
                      src={URL.createObjectURL(logoFile)}
                      alt="Logo Preview"
                      className="w-24 h-24 rounded-2xl object-cover mx-auto border-2 border-indigo-500 shadow-lg"
                    />
                  ) : user?.logo ? (
                    <img
                      src={user.logo}
                      alt="Current Logo"
                      className="w-24 h-24 rounded-2xl object-cover mx-auto border border-[var(--border-medium)] shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-sm">
                      <Store className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                  Upload Café Emblem / Logo
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto mb-4">
                  Recommended size: 512x512px. Supported formats: PNG, JPG, WebP.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setLogoFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Themes */}
          {activeTab === 'themes' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                    Customer Menu Themes
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Select a curated visual palette that reflects your restaurant's atmosphere.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] font-semibold">
                  Unlocked: <span className="text-cyan-400 font-bold">{actualUnlockedThemes.length}</span> / {maxThemes} themes
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_OPTIONS.map(theme => {
                  const isUnlocked = actualUnlockedThemes.includes(theme.id)
                  const isActive = (actualUnlockedThemes.includes(themeSettings.active_theme) ? themeSettings.active_theme : 'classic') === theme.id
                  const canUnlock = !isUnlocked && actualUnlockedThemes.length < maxThemes && planName !== 'starter'

                  return (
                    <div
                      key={theme.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500/5 ring-2 ring-cyan-400/40 shadow-md'
                          : 'border-[var(--border-medium)] bg-[var(--bg-input)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div>
                        {/* Realistic Mini Theme UI Preview */}
                        <div
                          className="w-full h-24 rounded-xl mb-3 border border-black/10 shadow-inner overflow-hidden flex flex-col justify-between"
                          style={{ background: theme.bg }}
                        >
                          {/* Mini Header Bar */}
                          <div
                            className="h-6 px-2.5 flex items-center justify-between text-[10px] font-bold text-white shadow-sm"
                            style={{ background: theme.headerBg }}
                          >
                            <span className="truncate max-w-[120px] font-heading tracking-wide">
                              {form.name || 'Café Menu'}
                            </span>
                            <span className="w-2 h-2 rounded-full" style={{ background: theme.accent }} />
                          </div>

                          {/* Mini Body / Card Sample */}
                          <div className="p-2 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-extrabold truncate" style={{ color: theme.text }}>
                                Signature Dish
                              </div>
                              <div className="text-[10px] font-bold" style={{ color: theme.accent }}>
                                ₹249
                              </div>
                            </div>
                            <div
                              className="px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
                              style={{ background: theme.accent }}
                            >
                              + ADD
                            </div>
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-0.5">
                          {theme.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mb-4">
                          {theme.desc}
                        </p>
                      </div>

                      {isActive ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Theme</span>
                        </div>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleThemeChange(theme.id)}
                          className="w-full py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors"
                        >
                          Apply Theme
                        </button>
                      ) : canUnlock ? (
                        <button
                          type="button"
                          onClick={() => handleUnlockTheme(theme.id)}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          Unlock Theme
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/owner/subscription')}
                          className="w-full py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-tertiary)] hover:text-amber-400 text-xs font-medium transition-colors"
                        >
                          Upgrade to Unlock
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Payments */}
          {activeTab === 'payments' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Payment Gateway Settings
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Configure custom Razorpay keys to collect online payments directly to your registered business merchant account.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Razorpay API Credentials
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {form.razorpay_key_id ? 'Configured with custom Key ID' : 'Using platform default credentials'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingRazorpay(!editingRazorpay)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold transition-colors"
                  >
                    {editingRazorpay ? 'Cancel' : 'Edit Credentials'}
                  </button>
                </div>

                {editingRazorpay && (
                  <div className="pt-4 border-t border-[var(--border-medium)] space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                        Razorpay Key ID
                      </label>
                      <input
                        type="text"
                        value={razorpayForm.key_id}
                        onChange={e => setRazorpayForm({ ...razorpayForm, key_id: e.target.value })}
                        placeholder="rzp_live_xxxxxxxxxxxx"
                        className="w-full px-3.5 py-2 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                        Razorpay Key Secret
                      </label>
                      <input
                        type="password"
                        value={razorpayForm.key_secret}
                        onChange={e => setRazorpayForm({ ...razorpayForm, key_secret: e.target.value })}
                        placeholder="••••••••••••••••••••"
                        className="w-full px-3.5 py-2 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Billing & Invoices */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Customer Receipt & Bill Layout
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Customize the format and footer notes printed on order receipts and digital PDF downloads.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    GST / Tax Registration Number
                  </label>
                  <input
                    type="text"
                    value={form.billing_settings.tax_number || ''}
                    onChange={e => setForm({
                      ...form,
                      billing_settings: { ...form.billing_settings, tax_number: e.target.value }
                    })}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Bill Layout Format
                  </label>
                  <select
                    value={form.billing_settings.format || 'standard'}
                    onChange={e => setForm({
                      ...form,
                      billing_settings: { ...form.billing_settings, format: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="standard">Standard Thermal Receipt (40-column)</option>
                    <option value="minimal">Minimalist Eco Receipt</option>
                    <option value="detailed">Detailed Full-Width Tax Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Receipt Footer Note / Greeting
                  </label>
                  <textarea
                    rows={2}
                    value={form.billing_settings.thank_you_message || ''}
                    onChange={e => setForm({
                      ...form,
                      billing_settings: { ...form.billing_settings, thank_you_message: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Hardware Alerts */}
          {activeTab === 'alerts' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Hardware Audio & Vibration Alerts
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Audible chimes and vibration settings tailored for kitchen display tablet and owner devices.
                </p>
              </div>

              <div className="space-y-4">
                {/* Mute Toggle */}
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                      {hardwareAlerts.mute ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">
                        Mute All Audio Chimes
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Silence notifications for new orders and waiter call buzzers.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hardwareAlerts.mute}
                    onChange={e => handleHardwareChange('mute', e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Vibration Toggle */}
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                      <Vibrate className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">
                        Disable Vibration
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Prevent phone or tablet hardware motor from buzzing.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hardwareAlerts.disableVibration}
                    onChange={e => handleHardwareChange('disableVibration', e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Volume Slider */}
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      Notification Volume
                    </span>
                    <span className="text-xs font-extrabold text-indigo-400 font-mono">
                      {Math.round((hardwareAlerts.volume || 0.8) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={hardwareAlerts.volume || 0.8}
                    onChange={e => handleHardwareChange('volume', parseFloat(e.target.value))}
                    disabled={hardwareAlerts.mute}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Sound Audition Buttons */}
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)]">
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] block mb-3">
                    Test Sound Effects
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => playHardwareAlert('new-order')}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>New Order Chime</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => playHardwareAlert('waiter')}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                      <span>Waiter Call Buzzer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => playHardwareAlert('ready')}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Order Ready Bell</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Business Hours */}
          {activeTab === 'hours' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                  Business Hours & Availability
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Control the operating schedule when your digital menu is accepting live orders.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-center">
                <Clock className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">
                  Automated Business Hours Schedule
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Your kitchen is currently accepting orders 24/7. Granular day-by-day automatic open/close scheduling is active by default.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* URL Warning Modal */}
      {showUrlWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)]">
                Confirm Menu URL Change
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Changing your restaurant slug will alter the QR code URL. Existing printed tabletop standees will no longer point to your new address until reprinted.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUrlWarningModal(false)
                  handleSubmit()
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors"
              >
                Yes, Change URL
              </button>
              <button
                type="button"
                onClick={() => setShowUrlWarningModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
