import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Sparkles, Plus, Trash2, Save, Crown, Zap, 
  Gift, CheckCircle2, RefreshCw 
} from 'lucide-react'

export default function PlanServicesManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [starterFeatures, setStarterFeatures] = useState([])
  const [proFeatures, setProFeatures] = useState([])
  const [proPlusFeatures, setProPlusFeatures] = useState([])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/settings')
      if (res.data?.success) {
        setStarterFeatures(res.data.data.starter_features || [
          'Digital QR Menu',
          'Basic Analytics',
          'Up to 15 Menu Items',
          'Standard Support'
        ])
        setProFeatures(res.data.data.pro_features || [
          'Digital QR Menu & Tables',
          'Real-time Order KDS',
          'Detailed Sales Analytics',
          'Sound Chime Alerts'
        ])
        setProPlusFeatures(res.data.data.pro_plus_features || [
          'Everything in Starter & Pro',
          'Advanced Analytics & Reports',
          'Priority 24/7 Phone Support',
          'Custom Branding & Standees',
          'Unlimited Products & Tables'
        ])
      }
    } catch (error) {
      toast.error('Failed to load plan features')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await api.put('/admin/settings', {
        starter_features: starterFeatures.filter(f => f.trim()),
        pro_features: proFeatures.filter(f => f.trim()),
        pro_plus_features: proPlusFeatures.filter(f => f.trim())
      })
      if (res.data?.success) {
        toast.success('Plan feature sets saved successfully!')
      }
    } catch (error) {
      toast.error('Failed to save plan feature sets')
    } finally {
      setSaving(false)
    }
  }

  const addFeature = (plan) => {
    if (plan === 'starter') setStarterFeatures([...starterFeatures, ''])
    else if (plan === 'pro') setProFeatures([...proFeatures, ''])
    else setProPlusFeatures([...proPlusFeatures, ''])
  }

  const updateFeature = (plan, index, value) => {
    if (plan === 'starter') {
      const arr = [...starterFeatures]
      arr[index] = value
      setStarterFeatures(arr)
    } else if (plan === 'pro') {
      const arr = [...proFeatures]
      arr[index] = value
      setProFeatures(arr)
    } else {
      const arr = [...proPlusFeatures]
      arr[index] = value
      setProPlusFeatures(arr)
    }
  }

  const removeFeature = (plan, index) => {
    if (plan === 'starter') {
      setStarterFeatures(starterFeatures.filter((_, i) => i !== index))
    } else if (plan === 'pro') {
      setProFeatures(proFeatures.filter((_, i) => i !== index))
    } else {
      setProPlusFeatures(proPlusFeatures.filter((_, i) => i !== index))
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-[var(--text-secondary)]">Loading plan configuration...</span>
      </div>
    )
  }

  const FeatureSection = ({ title, desc, icon: Icon, plan, features, badge }) => (
    <div className={`p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-col justify-between ${
      badge ? 'bg-gradient-to-b from-indigo-950/20 to-[var(--bg-card)] border-indigo-500/40' : 'bg-[var(--bg-card)] border-[var(--border-medium)]'
    }`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              badge ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-heading text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => addFeature(plan)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Perk</span>
          </button>
        </div>

        <div className="space-y-2.5 my-4">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 text-center text-xs text-[var(--text-tertiary)] font-bold">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={feat}
                onChange={e => updateFeature(plan, idx, e.target.value)}
                placeholder="e.g. Real-time Kitchen Orders"
                className="flex-1 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeFeature(plan, idx)}
                className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Remove perk"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature Entitlements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Plan Feature Services & Perks
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Edit the bullet points shown on pricing pages and café registration plan selection cards.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* ── 3 Column Feature Lists ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureSection
          title="Starter Tier"
          desc="Kiosk pilot & trial tier"
          icon={Gift}
          plan="starter"
          features={starterFeatures}
        />

        <FeatureSection
          title="Pro Standard"
          desc="Recommended for busy cafés"
          icon={Zap}
          plan="pro"
          features={proFeatures}
          badge="Popular"
        />

        <FeatureSection
          title="Pro Plus Ultra"
          desc="Enterprise dining & full branding"
          icon={Crown}
          plan="pro_plus"
          features={proPlusFeatures}
        />
      </div>
    </div>
  )
}
