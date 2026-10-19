import { useState, useEffect, useMemo } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'

import CategoryFilterBar from './components/CategoryFilterBar'
import MenuItemCard from './components/MenuItemCard'
import AddEditItemModal from './components/AddEditItemModal'
import MediaLibraryModal from './components/MediaLibraryModal'
import { Plus, Search, FolderPlus, UtensilsCrossed, Edit2, Trash2, X } from 'lucide-react'

export default function MenuManagement() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeTab, setActiveTab] = useState('items') // 'items' | 'categories'
  const [editingCat, setEditingCat] = useState(null)
  const [catForm, setCatForm] = useState({ name: '', sort_order: 0 })
  const [showCatModal, setShowCatModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dietFilter, setDietFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'instock' | 'outofstock'

  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_veg: true,
    image_url: ''
  })
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
    } catch (error) {
      console.error(error)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await ownerAPI.getCategories()
      setCategories(res.data.data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchItems = async () => {
    setLoading(true)
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
      toast.error('⚠️ Demo Café: Menu modifications are disabled.', {
        style: { background: 'var(--text-primary)', color: 'var(--bg-main)', fontWeight: 'bold' }
      })
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
        toast.success('Dish updated successfully')
      } else {
        await ownerAPI.createMenuItem(formData)
        toast.success('Dish added to menu')
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
      toast.error('⚠️ Demo Café: Deletion disabled.')
      return
    }
    if (window.confirm('Are you sure you want to delete this menu dish?')) {
      try {
        await ownerAPI.deleteMenuItem(id)
        toast.success('Item removed from menu')
        fetchItems()
      } catch (error) {
        toast.error('Failed to delete item')
      }
    }
  }

  const handleToggleAvailability = async (id) => {
    try {
      await ownerAPI.toggleAvailability(id)
      fetchItems()
    } catch (error) {
      toast.error('Failed to toggle stock status')
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
    setForm({ name: '', description: '', price: '', category_id: '', is_veg: true, image_url: '' })
    setImageFile(null)
  }

  const handleCatSubmit = async (e) => {
    e.preventDefault()
    if (user?.email === 'cafe@demo.com') {
      toast.error('Demo Café: Modifications disabled.')
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
      toast.error('Demo Café: Category deletion disabled.')
      return
    }
    if (window.confirm('Delete this category? Items in it will become uncategorized.')) {
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

    const isAutoFilled = !newForm.name || globalMedia.some(g => g.file_name === newForm.name)
    if (isAutoFilled && m.file_name) {
      newForm.name = m.file_name
    }

    if (m.category && m.category !== 'General') {
      const matchingCat = categories.find(c => c.name.toLowerCase() === m.category.toLowerCase())
      if (matchingCat) {
        newForm.category_id = matchingCat._id
      } else {
        try {
          const res = await ownerAPI.createCategory({ name: m.category })
          const newCategory = res.data.data
          setCategories(prev => [...prev, newCategory])
          newForm.category_id = newCategory._id
          toast.success(`Category "${m.category}" created automatically!`)
        } catch {
          // ignore error
        }
      }
    }

    setForm(newForm)
    setImageFile(null)
    setShowMediaModal(false)
  }

  const handleDragEnd = async (event) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Café: Reordering disabled.')
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
      } catch {
        toast.error('Failed to save order')
        fetchItems()
      }
    }
  }

  // Category counts calculation
  const categoryCounts = useMemo(() => {
    const counts = { all: items.length }
    items.forEach(it => {
      const cId = it.category_id?._id || it.category_id
      if (cId) counts[cId] = (counts[cId] || 0) + 1
    })
    return counts
  }, [items])

  // Filtered Items (by Category, Search, Diet, Stock)
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ||
        it.name?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q)

      const matchesDiet =
        dietFilter === 'all' ||
        (dietFilter === 'veg' && it.is_veg) ||
        (dietFilter === 'non-veg' && !it.is_veg)

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'instock' && it.availability) ||
        (stockFilter === 'outofstock' && !it.availability)

      return matchesSearch && matchesDiet && matchesStock
    })
  }, [items, searchQuery, dietFilter, stockFilter])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }}>
      
      {/* ─── 1. Header Bar ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            color: 'var(--text-primary)',
            margin: 0
          }}>
            Menu & Products
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage dishes, prices, availability, and menu categories.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => {
            if (activeTab === 'items') {
              resetForm()
              setShowModal(true)
            } else {
              setEditingCat(null)
              setCatForm({ name: '', sort_order: 0 })
              setShowCatModal(true)
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--brand-gradient)',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {activeTab === 'items' ? <Plus size={16} /> : <FolderPlus size={16} />}
          <span>{activeTab === 'items' ? 'Add New Dish' : 'Add Category'}</span>
        </button>
      </div>

      {/* ─── 2. Tab Navigation (Dishes vs Categories) ─── */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        borderBottom: '1px solid var(--border-medium)',
        paddingBottom: 10
      }}>
        <button
          onClick={() => setActiveTab('items')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'items' ? 'var(--brand-subtle)' : 'transparent',
            color: activeTab === 'items' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'items' ? 700 : 500,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Menu Dishes ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'categories' ? 'var(--brand-subtle)' : 'transparent',
            color: activeTab === 'categories' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'categories' ? 700 : 500,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'items' ? (
        <>
          {/* ─── 3. Search and Secondary Filters ─── */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px' }}>
              <Search size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                placeholder="Search dish name or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: 34,
                  paddingRight: 12,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Dietary & Stock Quick Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Diet */}
              <select
                value={dietFilter}
                onChange={e => setDietFilter(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Diets</option>
                <option value="veg">🟢 Veg Only</option>
                <option value="non-veg">🔴 Non-Veg Only</option>
              </select>

              {/* Stock */}
              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Availability</option>
                <option value="instock">In Stock</option>
                <option value="outofstock">Out of Stock (86'd)</option>
              </select>
            </div>
          </div>

          {/* Category Filter Bar */}
          <CategoryFilterBar 
            categories={categories} 
            activeCategory={activeCategory} 
            onCategoryChange={setActiveCategory}
            counts={categoryCounts}
          />

          {/* ─── 4. Product Cards Grid ─── */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 280,
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    animation: 'pulse 1.5s ease infinite'
                  }}
                />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredItems.map(i => i._id)} strategy={rectSortingStrategy}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                  {filteredItems.map((item, i) => (
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
            <div style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-medium)'
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <UtensilsCrossed size={28} />
              </div>
              <h3 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 6px'
              }}>
                {searchQuery || dietFilter !== 'all' || stockFilter !== 'all'
                  ? 'No Dishes Match Selected Filters'
                  : 'No Menu Items in this Category'}
              </h3>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                maxWidth: 420,
                margin: '0 auto 20px'
              }}>
                {searchQuery || dietFilter !== 'all' || stockFilter !== 'all'
                  ? 'Try clearing your search query or reset dietary and stock filters.'
                  : 'Click "Add New Dish" to add items to your digital menu.'}
              </p>
              {(searchQuery || dietFilter !== 'all' || stockFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setDietFilter('all')
                    setStockFilter('all')
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  onClick={() => {
                    resetForm()
                    setShowModal(true)
                  }}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  + Add First Dish
                </button>
              )}
            </div>
          )}

          {/* Add/Edit Dish Modal */}
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

          {/* Media Library Modal */}
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
        </>
      ) : (
        /* ─── 5. Categories Tab ─── */
        <>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 90, borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {categories.map(cat => (
                <div
                  key={cat._id}
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'border-color 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--brand-subtle)',
                      border: '1px solid var(--brand-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      flexShrink: 0
                    }}>
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {cat.name}
                      </h3>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        {categoryCounts[cat._id] || 0} dishes listed
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingCat(cat)
                        setCatForm({ name: cat.name, sort_order: cat.sort_order })
                        setShowCatModal(true)
                      }}
                      title="Edit Category"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-shell)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleCatDelete(cat._id)}
                      title="Delete Category"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--danger-light)',
                        border: '1px solid var(--danger-border)',
                        color: 'var(--danger-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-medium)'
            }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                No Categories Created Yet
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Organize your menu into groups like Beverages, Main Course, and Desserts.
              </p>
              <button
                onClick={() => {
                  setEditingCat(null)
                  setCatForm({ name: '', sort_order: 0 })
                  setShowCatModal(true)
                }}
                style={{
                  padding: '9px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                + Create Category
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── 6. Add/Edit Category Modal ─── */}
      {showCatModal && (
        <div
          onClick={() => setShowCatModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(8px)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              boxShadow: 'var(--shadow-dropdown)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{
                  fontSize: 18,
                  fontWeight: 800,
                  margin: 0,
                  fontFamily: "'Outfit', sans-serif",
                  color: 'var(--text-primary)'
                }}>
                  {editingCat ? 'Edit Category' : 'Create Category'}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Group your dishes logically.
                </p>
              </div>
              <button
                onClick={() => setShowCatModal(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-shell)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Category Name *
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g. Starters & Small Plates"
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Display Order
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={catForm.sort_order}
                  onChange={e => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-shell)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--brand-gradient)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {editingCat ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
