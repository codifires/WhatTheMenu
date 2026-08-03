import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  active:    { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  suspended: { bg: 'rgba(239,68,68,0.10)',  color: '#f87171', border: 'rgba(239,68,68,0.25)' },
  expired:   { bg: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  pending:   { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
}

const INPUT = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
}

function InputField({ label, ...props }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>{label}</label>
      {props.as === 'select' ? (
        <select
          style={{ ...INPUT, cursor: 'pointer' }}
          onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          {...props}
        >
          {props.children}
        </select>
      ) : (
        <input
          style={INPUT}
          onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          {...props}
        />
      )}
    </div>
  )
}

const CafeManagement = () => {
  const [cafes, setCafes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCafe, setEditingCafe] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', plan_name: 'free' })

  useEffect(() => { fetchCafes() }, [search])

  const fetchCafes = async () => {
    try {
      const res = await adminAPI.getCafes({ search })
      setCafes(res.data.data)
    } catch {
      toast.error('Failed to load cafés')
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
        toast.success('Café updated!')
      } else {
        await adminAPI.createCafe(fd)
        toast.success('Café created!')
      }
      setShowModal(false); resetForm(); fetchCafes()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this café and all its data? This cannot be undone.')) return
    try { await adminAPI.deleteCafe(id); toast.success('Café deleted'); fetchCafes() }
    catch { toast.error('Failed to delete') }
  }

  const handleToggle = async (cafe) => {
    try {
      if (cafe.subscription_status === 'active') {
        await adminAPI.suspendCafe(cafe._id); toast.success('Café suspended')
      } else {
        await adminAPI.activateCafe(cafe._id); toast.success('Café activated')
      }
      fetchCafes()
    } catch { toast.error('Failed to update status') }
  }

  const openEdit = (cafe) => {
    setEditingCafe(cafe)
    setForm({ name: cafe.name, email: cafe.email, password: '', phone: cafe.phone, address: cafe.address, plan_name: cafe.subscription?.plan_name || 'free' })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingCafe(null)
    setForm({ name: '', email: '', password: '', phone: '', address: '', plan_name: 'free' })
  }

  const filteredCafes = cafes // server-side filtered

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Café Management</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Manage all registered café partners on the platform.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)', transition: 'transform 0.2s, box-shadow 0.2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(124,58,237,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(124,58,237,0.35)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Café
        </button>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            placeholder="Search cafés by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT, paddingLeft: 38, maxWidth: '100%' }}
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
          {loading ? '...' : cafes.length} cafés total
        </div>
      </div>

      {/* Table card */}
      <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Café', 'Contact', 'Plan', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#4b5563', textAlign: i === 4 ? 'right' : 'left', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.01)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} style={{ padding: '18px 20px' }}>
                        <div style={{ height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : cafes.length > 0 ? (
                cafes.map(cafe => {
                  const sc = STATUS_COLORS[cafe.subscription_status] || STATUS_COLORS.pending
                  const isActive = cafe.subscription_status === 'active'
                  return (
                    <tr key={cafe._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {/* Café */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                            {cafe.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{cafe.name}</p>
                            <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>ID: {cafe._id?.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{cafe.email}</p>
                        <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>{cafe.phone}</p>
                      </td>
                      {/* Plan */}
                      <td style={{ padding: '16px 20px' }}>
                        {(() => {
                          const plan = cafe.subscription?.plan_name || 'N/A'
                          const subStatus = cafe.subscription?.status
                          const planConfig = {
                            free: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', icon: '🎁' },
                            starter: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)', icon: '📦' },
                            pro: { color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.3)', icon: '⭐' },
                          }[plan] || { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)', icon: '?' }
                          return (
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: planConfig.bg, color: planConfig.color, border: `1px solid ${planConfig.border}`, textTransform: 'capitalize', display: 'inline-block' }}>
                                {planConfig.icon} {plan}
                              </span>
                              {subStatus === 'pending' && (
                                <span style={{ display: 'block', fontSize: 10, color: '#f59e0b', marginTop: 3 }}>⏳ Awaiting approval</span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>
                          {cafe.subscription_status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Edit */}
                          <button onClick={() => openEdit(cafe)} title="Edit"
                            style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(124,58,237,0.1)'; e.currentTarget.style.color='#a78bfa'; e.currentTarget.style.borderColor='rgba(124,58,237,0.3)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#6b7280'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {/* Suspend/Activate */}
                          <button onClick={() => handleToggle(cafe)} title={isActive ? 'Suspend' : 'Activate'}
                            style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { const c = isActive ? '#fbbf24' : '#34d399'; const bg = isActive ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'; e.currentTarget.style.background=bg; e.currentTarget.style.color=c; e.currentTarget.style.borderColor=c+'55' }}
                            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#6b7280'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
                            {isActive
                              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            }
                          </button>
                          {/* Delete */}
                          <button onClick={() => handleDelete(cafe._id)} title="Delete"
                            style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#6b7280'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>No cafés found</p>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{search ? 'Try a different search term' : 'Add your first café to get started'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 480, background: '#0d1120', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 22, padding: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif" }}>
                  {editingCafe ? 'Edit Café' : 'Add New Café'}
                </h2>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>
                  {editingCafe ? 'Update café information' : 'Register a new café on the platform'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField label="Café Name *" placeholder="Brew & Bite Café" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <InputField label="Email Address *" type="email" placeholder="owner@cafe.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              <InputField label="Phone Number *" type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
              <InputField label="Address *" placeholder="123 MG Road, Bangalore" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
              {!editingCafe && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>Subscription Plan *</label>
                  <select
                    value={form.plan_name}
                    onChange={e => setForm({...form, plan_name: e.target.value})}
                    style={{ ...INPUT, cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    <option value="free">Free Trial</option>
                    <option value="starter">Starter — ₹299/month</option>
                    <option value="pro">Pro — ₹499/month</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, padding: '12px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                  {submitting ? 'Saving…' : editingCafe ? 'Update Café' : 'Create Café'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        option { background: #0d1120; }
      `}</style>
    </div>
  )
}

export default CafeManagement
