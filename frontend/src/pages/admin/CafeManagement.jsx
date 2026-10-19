import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Store, Search, Plus, Edit2, Trash2, Power, 
  ExternalLink, CheckCircle2, AlertTriangle, X, 
  RefreshCw, Mail, Phone, MapPin, Shield
} from 'lucide-react'

export default function CafeManagement() {
  const [cafes, setCafes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCafe, setEditingCafe] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ 
    name: '', email: '', password: '', phone: '', address: '', plan_name: 'starter' 
  })

  useEffect(() => { 
    fetchCafes() 
  }, [search])

  const fetchCafes = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getCafes({ search })
      setCafes(res.data?.data || [])
    } catch {
      toast.error('Failed to load café directory')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (editingCafe) {
        await adminAPI.updateCafe(editingCafe._id, fd)
        toast.success('Café details updated successfully!')
      } else {
        await adminAPI.createCafe(fd)
        toast.success('New café registered successfully!')
      }
      setShowModal(false)
      resetForm()
      fetchCafes()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? All menu items, QR links, and order history will be deleted.`)) return
    try { 
      await adminAPI.deleteCafe(id)
      toast.success('Café deleted from platform')
      fetchCafes() 
    } catch { 
      toast.error('Failed to delete café') 
    }
  }

  const handleToggleStatus = async (cafe) => {
    try {
      if (cafe.subscription_status === 'active') {
        await adminAPI.suspendCafe(cafe._id)
        toast.success(`${cafe.name} has been suspended`)
      } else {
        await adminAPI.activateCafe(cafe._id)
        toast.success(`${cafe.name} is now active`)
      }
      fetchCafes()
    } catch { 
      toast.error('Failed to update café status') 
    }
  }

  const openEdit = (cafe) => {
    setEditingCafe(cafe)
    setForm({ 
      name: cafe.name, 
      email: cafe.email, 
      password: '', 
      phone: cafe.phone || '', 
      address: cafe.address || '', 
      plan_name: cafe.subscription?.plan_name || 'starter' 
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingCafe(null)
    setForm({ name: '', email: '', password: '', phone: '', address: '', plan_name: 'starter' })
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>Tenant Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Café Partner Directory
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage café tenant accounts, subscription plans, contact details, and account suspension.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Café</span>
        </button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-medium)] p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cafés by name, email, or slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-[var(--text-secondary)] px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)]">
            Total: <span className="text-[var(--text-primary)] font-bold">{cafes.length}</span> Cafés
          </div>
          <button
            onClick={fetchCafes}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Directory Table ── */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] uppercase font-bold text-[var(--text-tertiary)]">
                <th className="py-4 px-5">Café Brand</th>
                <th className="py-4 px-5">Contact Details</th>
                <th className="py-4 px-5">Subscription Plan</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Registered Date</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-medium)]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-xs text-[var(--text-secondary)]">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading café directory...</span>
                  </td>
                </tr>
              ) : cafes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-[var(--text-tertiary)]">
                    <Store className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <div className="font-bold text-sm text-[var(--text-primary)]">No Cafés Found</div>
                    <div className="text-xs mt-1">Try modifying your search term or register a new café.</div>
                  </td>
                </tr>
              ) : (
                cafes.map(cafe => {
                  const isActive = cafe.subscription_status === 'active'
                  const planName = cafe.subscription?.plan_name || 'starter'

                  return (
                    <tr key={cafe._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                            {cafe.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[var(--text-primary)]">
                              {cafe.name}
                            </div>
                            <div className="text-[11px] text-[var(--text-tertiary)] font-mono">
                              /{cafe.slug || cafe._id?.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                          <Mail className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span>{cafe.email}</span>
                        </div>
                        {cafe.phone && (
                          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] mt-0.5">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{cafe.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {planName}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span>{cafe.subscription_status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-5 text-[var(--text-tertiary)]">
                        {new Date(cafe.createdAt || cafe.created_at || Date.now()).toLocaleDateString([], {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/${cafe.slug || cafe._id}/menu`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview customer menu"
                            className="p-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-cyan-400 border border-[var(--border-medium)] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => openEdit(cafe)}
                            title="Edit details"
                            className="p-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(cafe)}
                            title={isActive ? 'Suspend account' : 'Activate account'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isActive
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(cafe._id, cafe.name)}
                            title="Delete café"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-medium)] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    {editingCafe ? 'Edit Café Account' : 'Register New Café'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Configure restaurant credentials and subscription plan
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Café Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Artisanal Roastery & Café"
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Owner Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="owner@mycafe.com"
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  {editingCafe ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingCafe}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Subscription Tier
                  </label>
                  <select
                    value={form.plan_name}
                    onChange={e => setForm({ ...form, plan_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="starter">Starter / Free Trial</option>
                    <option value="pro">Pro Standard</option>
                    <option value="pro_plus">Pro Plus Ultra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Physical Address
                </label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City, State"
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : editingCafe ? 'Update Café' : 'Register Café'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
