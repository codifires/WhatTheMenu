import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const INPUT = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
}

const CategoryManagement = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [form, setForm] = useState({ name: '', sort_order: 0 })

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      const res = await ownerAPI.getCategories()
      setCategories(res.data.data)
    } catch (error) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCat) {
        await ownerAPI.updateCategory(editingCat._id, form)
        toast.success('Category updated')
      } else {
        await ownerAPI.createCategory(form)
        toast.success('Category created')
      }
      setShowModal(false)
      setEditingCat(null)
      setForm({ name: '', sort_order: 0 })
      fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category and all its menu items? This action cannot be undone.')) return
    try {
      await ownerAPI.deleteCategory(id)
      toast.success('Category deleted')
      fetchCategories()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Categories</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Organize your menu into logical sections.</p>
        </div>
        <button
          onClick={() => { setEditingCat(null); setForm({ name: '', sort_order: categories.length }); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </button>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 90, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categories.map((cat, i) => (
            <div
              key={cat._id}
              style={{
                padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.2s, background 0.2s',
                animation: `slideUp 0.3s ease ${i * 0.05}s both`
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(79,70,229,0.1))', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#06b6d4', flexShrink: 0 }}>
                  {cat.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>{cat.name}</h3>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{cat.itemCount || 0} items</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setEditingCat(cat); setForm({ name: cat.name, sort_order: cat.sort_order }); setShowModal(true) }}
                  style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => {e.currentTarget.style.background='rgba(6,182,212,0.1)'; e.currentTarget.style.color='#22d3ee'}} onMouseLeave={e => {e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='#9ca3af'}}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  onClick={() => handleDelete(cat._id)}
                  style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => {e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#f87171'}} onMouseLeave={e => {e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='#9ca3af'}}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#e5e7eb', margin: '0 0 6px' }}>No categories created</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Start by organizing your menu into categories.</p>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ width: '100%', maxWidth: 400, background: '#0a0d18', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 24, padding: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{editingCat ? 'Edit Category' : 'Add Category'}</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Menu grouping.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Category Name *</label>
                <input
                  style={INPUT} placeholder="e.g. Beverages" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                  onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Display Order</label>
                <input
                  style={INPUT} type="number" min="0" placeholder="0" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                  onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.3)' }}>{editingCat ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default CategoryManagement
