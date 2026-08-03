import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

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
  const [activeCategory, setActiveCategory] = useState('')
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', is_veg: true, image_url: '' })
  const [imageFile, setImageFile] = useState(null)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [globalMedia, setGlobalMedia] = useState([])
  const [mediaTab, setMediaTab] = useState('platform')

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
    if (!window.confirm('Delete this menu item?')) return
    try {
      await ownerAPI.deleteMenuItem(id)
      toast.success('Item deleted')
      fetchItems()
    } catch (error) {
      toast.error('Failed to delete')
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

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>

      ── Header ──
        <MenuHeader onAddNew={() => { resetForm(); setShowModal(true) }} />

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
    </div>
  )
}

export default MenuManagement
