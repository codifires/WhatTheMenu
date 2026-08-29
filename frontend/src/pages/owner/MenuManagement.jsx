import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'

import InputField from '../../components/ui/InputField'
import MenuHeader from './components/MenuHeader'
import CategoryFilterBar from './components/CategoryFilterBar'
import MenuItemCard from './components/MenuItemCard'
import AddEditItemModal from './components/AddEditItemModal'
import MediaLibraryModal from './components/MediaLibraryModal'

const MenuManagement = () => {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeTab, setActiveTab] = useState('items')
  const [editingCat, setEditingCat] = useState(null)
  const [catForm, setCatForm] = useState({ name: '', sort_order: 0 })
  const [showCatModal, setShowCatModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', is_veg: true, image_url: '' })
  const [imageFile, setImageFile] = useState(null)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [globalMedia, setGlobalMedia] = useState([])
  const [mediaTab, setMediaTab] = useState('platform')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    fetchCategories()
    fetchItems()
    fetchGlobalMedia()
  }, [activeCategory])

  const fetchGlobalMedia = async () => {
    try {
      const res = await ownerAPI.getGlobalMedia()
      setGlobalMedia(res.data.data)
    } catch (error) { console.error(error) }
  }

  const fetchCategories = async () => {
    try {
      const res = await ownerAPI.getCategories()
      setCategories(res.data.data)
    } catch (error) { console.error(error) }
  }

  const fetchItems = async () => {
    try {
      const params = activeCategory ? { category: activeCategory } : {}
      const res = await ownerAPI.getMenuItems(params)
      setItems(res.data.data)
    } catch (error) {
      toast.error('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Menu modifications are disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('description', form.description)
      formData.append('price', form.price)
      formData.append('category_id', form.category_id)
      formData.append('is_veg', form.is_veg)
      if (form.image_url) formData.append('image_url', form.image_url)
      if (imageFile) formData.append('image', imageFile)

      if (editingItem) {
        await ownerAPI.updateMenuItem(editingItem._id, formData)
        toast.success('Item updated')
      } else {
        await ownerAPI.createMenuItem(formData)
        toast.success('Item created')
      }
      setShowModal(false)
      resetForm()
      fetchItems()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save item')
    }
  }

  const handleDelete = async (id) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Menu modifications are disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await ownerAPI.deleteMenuItem(id)
        toast.success('Item deleted')
        fetchItems()
      } catch (error) {
        toast.error('Failed to delete')
      }
    }
  }

  const handleToggleAvailability = async (id) => {
    try {
      await ownerAPI.toggleAvailability(id)
      fetchItems()
    } catch (error) {
      toast.error('Failed to toggle')
    }
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id?._id || item.category_id,
      is_veg: item.is_veg,
      image_url: item.image || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingItem(null)
    setForm({ name: '', description: '', price: '', category_id: categories[0]?._id || '', is_veg: true, image_url: '' })
    setImageFile(null)
  }

  
  const handleCatSubmit = async (e) => {
    e.preventDefault()
    if (user?.email === 'cafe@demo.com') {
      toast.error('Demo Template: Modifications disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }
    try {
      if (editingCat) {
        await ownerAPI.updateCategory(editingCat._id, catForm)
        toast.success('Category updated')
      } else {
        await ownerAPI.createCategory(catForm)
        toast.success('Category created')
      }
      setShowCatModal(false)
      setEditingCat(null)
      setCatForm({ name: '', sort_order: 0 })
      fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    }
  }

  const handleCatDelete = async (id) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('Demo Template: Modifications disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await ownerAPI.deleteCategory(id)
        toast.success('Category deleted')
        fetchCategories()
        if (activeCategory === id) setActiveCategory('')
      } catch (error) {
        toast.error('Failed to delete category')
      }
    }
  }

  const handleSelectGlobalMedia = async (m) => {
    let newForm = { ...form, image_url: m.image_url }
    
    // Auto-fill name if empty
    if (!newForm.name && m.file_name) {
      newForm.name = m.file_name
    }
    
    // Try to auto-select or AUTO-CREATE matching category
    if (m.category && m.category !== 'General') {
      const matchingCat = categories.find(c => c.name.toLowerCase() === m.category.toLowerCase())
      if (matchingCat) {
        newForm.category_id = matchingCat._id
      } else {
        // Auto-create category if it doesn't exist
        try {
          const res = await ownerAPI.createCategory({ name: m.category })
          const newCategory = res.data.data
          // Update local categories state immediately so it's available
          setCategories(prev => [...prev, newCategory])
          newForm.category_id = newCategory._id
          toast.success(`Category "${m.category}" automatically created!`)
        } catch (error) {
          console.error('Failed to auto-create category:', error)
          toast.error(`Could not auto-create category "${m.category}"`)
        }
      }
    }
    
    setForm(newForm)
    setImageFile(null)
    setShowMediaModal(false)
  }

  const handleDragEnd = async (event) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Menu modifications are disabled.')
      return
    }
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(item => item._id === active.id)
      const newIndex = items.findIndex(item => item._id === over.id)
      
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)

      try {
        await ownerAPI.reorderMenuItems({ itemIds: newItems.map(item => item._id) })
      } catch (error) {
        toast.error('Failed to save new order')
        fetchItems() // revert on fail
      }
    }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      ── Header ──
        
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Menu Management</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Create and manage your menu and categories.</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'items') {
              resetForm(); setShowModal(true);
            } else {
              setEditingCat(null); setCatForm({ name: '', sort_order: 0 }); setShowCatModal(true);
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {activeTab === 'items' ? 'Add New Item' : 'Add Category'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
        <button 
          onClick={() => setActiveTab('items')}
          style={{ background: activeTab === 'items' ? 'rgba(6,182,212,0.1)' : 'transparent', color: activeTab === 'items' ? '#06b6d4' : '#9ca3af', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Menu Items
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          style={{ background: activeTab === 'categories' ? 'rgba(6,182,212,0.1)' : 'transparent', color: activeTab === 'categories' ? '#06b6d4' : '#9ca3af', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Categories
        </button>
      </div>

      {activeTab === 'items' ? (
        <>
          

      <CategoryFilterBar 
        categories={categories} 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ height: 280, borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i._id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {items.map((item, i) => (
                <MenuItemCard 
                  key={item._id} 
                  item={item} 
                  index={i} 
                  onEdit={openEdit} 
                  onDelete={handleDelete} 
                  onToggle={handleToggleAvailability} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#e5e7eb', margin: '0 0 6px' }}>No menu items found</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Click "Add New Item" to expand your menu.</p>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      <AddEditItemModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSubmit={handleSubmit} 
        form={form} 
        setForm={setForm} 
        categories={categories} 
        editingItem={editingItem} 
        imageFile={imageFile} 
        setImageFile={setImageFile} 
        onOpenMediaModal={() => setShowMediaModal(true)} 
      />

      {/* ── Media Manager Modal ── */}
      <MediaLibraryModal 
        isOpen={showMediaModal} 
        onClose={() => setShowMediaModal(false)} 
        mediaTab={mediaTab} 
        setMediaTab={setMediaTab} 
        globalMedia={globalMedia} 
        handleSelectGlobalMedia={handleSelectGlobalMedia} 
        form={form} 
        setForm={setForm} 
        setImageFile={setImageFile} 
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .menu-card:hover .menu-img { transform: scale(1.05); }
      `}</style>
        </>
      ) : (
        <>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[...Array(4)].map((_, i) => (
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
                      onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, sort_order: cat.sort_order }); setShowCatModal(true) }}
                      style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => {e.currentTarget.style.background='rgba(6,182,212,0.1)'; e.currentTarget.style.color='#22d3ee'}} onMouseLeave={e => {e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='#9ca3af'}}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleCatDelete(cat._id)}
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
        </>
      )}

      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCatModal(false)}>
          <div style={{ width: '100%', maxWidth: 400, background: '#0a0d18', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 24, padding: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{editingCat ? 'Edit Category' : 'Add Category'}</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Menu grouping.</p>
              </div>
              <button onClick={() => setShowCatModal(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Category Name *</label>
                <input
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} 
                  placeholder="e.g. Beverages" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Display Order</label>
                <input
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} 
                  type="number" min="0" placeholder="0" value={catForm.sort_order} onChange={e => setCatForm({...catForm, sort_order: parseInt(e.target.value) || 0})}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowCatModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.3)' }}>{editingCat ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* No custom styles needed for now, but keeping tag structure valid if any */}
    </div>
  )
}

export default MenuManagement
 

 

 

 

