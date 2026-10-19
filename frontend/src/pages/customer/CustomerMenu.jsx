import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { customerAPI, SOCKET_URL } from '../../services/api'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { UtensilsCrossed } from 'lucide-react'

const CustomerMenu = () => {
  const { cafeId } = useParams()
  const [searchParams] = useSearchParams()
  const [cafe, setCafe] = useState(null)
  const [categories, setCategories] = useState([])
  const [allItems, setAllItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [dietaryFilter, setDietaryFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isUnavailable, setIsUnavailable] = useState(false)
  
  // Table detection from URL query params (e.g. ?table=4 or ?t=4)
  const urlTable = searchParams.get('table') || searchParams.get('t')
  const [tableNumber, setTableNumber] = useState(() => {
    return urlTable || localStorage.getItem('customer_table') || ''
  })

  useEffect(() => {
    if (urlTable) {
      setTableNumber(urlTable)
      localStorage.setItem('customer_table', urlTable)
    }
  }, [urlTable])

  const { addItem, items: cartItems, updateQuantity, removeItem } = useCart()

  useEffect(() => {
    fetchMenu()
    
    // Live Availability Updates from Owner Dashboard
    const socket = io(SOCKET_URL)
    socket.emit('join-menu', cafeId)
    
    socket.on('menu_item_updated', (updatedItem) => {
      setAllItems(prevItems => 
        prevItems.map(item => item._id === updatedItem._id ? { ...item, availability: updatedItem.availability } : item)
      )
      setCategories(prevCats => 
        prevCats.map(cat => ({
          ...cat,
          items: cat.items.map(item => item._id === updatedItem._id ? { ...item, availability: updatedItem.availability } : item)
        }))
      )
    })

    return () => socket.disconnect()
  }, [cafeId])

  const fetchMenu = async () => {
    try {
      const res = await customerAPI.getCafeMenu(cafeId)
      setCafe(res.data.data.cafe)
      setCategories(res.data.data.categories || [])
      setAllItems(res.data.data.allItems || [])
    } catch (error) {
      if (error.response?.status === 403) {
        setIsUnavailable(true)
      } else {
        toast.error(error.response?.data?.message || 'Failed to load menu')
      }
    } finally {
      setLoading(false)
    }
  }

  const getCartQuantity = (itemId) => {
    const cartItem = cartItems.find(i => i._id === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  const handleAddToCart = (item) => {
    if (item.availability === false) {
      toast.error('Sorry, this dish is currently sold out.')
      return
    }
    addItem(item, cafeId)
    toast.success(`Added ${item.name} 🛒`, {
      id: `cart-add-${item._id}`,
      duration: 1500,
      style: {
        borderRadius: '14px',
        background: '#1c1917',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: '600',
        padding: '10px 16px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
      }
    })
  }

  const handleDecreaseQty = (item, currentQty) => {
    if (currentQty <= 1) {
      removeItem(item._id)
      toast('Item removed from cart', {
        id: `cart-remove-${item._id}`,
        duration: 1200,
        icon: '🗑️',
        style: {
          borderRadius: '14px',
          background: '#1c1917',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: '600'
        }
      })
    } else {
      updateQuantity(item._id, currentQty - 1)
    }
  }

  // Filtered menu items based on Category, Dietary, and Live Search
  const filteredItems = useMemo(() => {
    let list = activeCategory === 'all' 
      ? allItems 
      : (categories.find(c => c._id === activeCategory)?.items || [])

    if (dietaryFilter === 'veg') {
      list = list.filter(item => item.is_veg === true)
    } else if (dietaryFilter === 'non-veg') {
      list = list.filter(item => item.is_veg === false)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.description && item.description.toLowerCase().includes(q))
      )
    }

    return list
  }, [allItems, categories, activeCategory, dietaryFilter, searchQuery])

  // Category counts computed for category tabs
  const getCategoryCount = (catId) => {
    if (catId === 'all') {
      if (dietaryFilter === 'veg') return allItems.filter(i => i.is_veg === true).length
      if (dietaryFilter === 'non-veg') return allItems.filter(i => i.is_veg === false).length
      return allItems.length
    }
    const cat = categories.find(c => c._id === catId)
    if (!cat) return 0
    if (dietaryFilter === 'veg') return cat.items.filter(i => i.is_veg === true).length
    if (dietaryFilter === 'non-veg') return cat.items.filter(i => i.is_veg === false).length
    return cat.items.length
  }

  if (isUnavailable) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
          Menu Temporarily Offline
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 320, lineHeight: 1.5, margin: 0 }}>
          This restaurant's digital ordering system is currently unavailable. Please ask a server or check back later!
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
        {/* Café Header Skeleton */}
        <div style={{ height: 160, borderRadius: 28, background: 'var(--border-light)', animation: 'pulseCard 1.5s ease infinite' }} />
        
        {/* Search Bar Skeleton */}
        <div style={{ height: 46, borderRadius: 16, background: 'var(--border-light)', animation: 'pulseCard 1.5s ease infinite' }} />
        
        {/* Category Pills Skeleton */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'hidden' }}>
          {[90, 110, 85, 100].map((w, i) => (
            <div key={i} style={{ height: 38, width: w, borderRadius: 20, background: 'var(--border-light)', flexShrink: 0, animation: 'pulseCard 1.5s ease infinite' }} />
          ))}
        </div>
        
        {/* Food Cards Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 230, borderRadius: 18, background: 'var(--border-light)', animation: 'pulseCard 1.5s ease infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulseCard { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.35; } }`}</style>
      </div>
    )
  }

  if (!cafe) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 44, opacity: 0.6, display: 'block', marginBottom: 12 }}>🏪</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>Restaurant Not Found</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>The QR code or restaurant link is invalid or no longer active.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
      
        {/* ── Café Hero Banner ── */}
        <div style={{ 
          position: 'relative', 
          padding: '28px 18px 22px', 
          overflow: 'hidden', 
          borderBottomLeftRadius: 30, 
          borderBottomRightRadius: 30, 
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)', 
          marginBottom: 16,
          background: 'var(--header-bg)',
          color: '#ffffff'
        }}>
          {/* Subtle Logo Blur Atmosphere */}
          {cafe.logo && (
            <div 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                background: `url(${cafe.logo}) center/cover`, 
                filter: 'blur(25px) brightness(0.22)', 
                transform: 'scale(1.25)',
                pointerEvents: 'none'
              }} 
            />
          )}
          
          {/* Ambient Lighting Gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)', pointerEvents: 'none' }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Logo Container */}
            <div style={{ 
              width: 72, 
              height: 72, 
              borderRadius: 20, 
              background: '#ffffff', 
              border: '2px solid rgba(255, 255, 255, 0.3)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 32, 
              overflow: 'hidden', 
              flexShrink: 0, 
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)' 
            }}>
              {cafe.logo ? (
                <img src={cafe.logo} alt={cafe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UtensilsCrossed size={32} color="#ffffff" />
              )}
            </div>
            
            {/* Cafe Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ 
                  fontSize: 22, 
                  fontWeight: 900, 
                  margin: 0, 
                  color: '#ffffff', 
                  fontFamily: "'Outfit', sans-serif", 
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  letterSpacing: '-0.3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {cafe.name}
                </h1>
                
                {/* Table Pill if Scanned From Table QR */}
                {tableNumber && (
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: 12,
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <UtensilsCrossed size={12} /> Table {tableNumber}
                  </span>
                )}
              </div>

              {/* Address / Location */}
              {cafe.address && (
                <p style={{ 
                  fontSize: 12, 
                  color: 'rgba(255, 255, 255, 0.88)', 
                  margin: '0 0 6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 5, 
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  lineHeight: 1.3
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cafe.address}</span>
                </p>
              )}

              {/* Operational & Ordering Indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#34d399' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                  Open for Ordering
                </span>
                
                {cafe.tax_percentage > 0 && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    Tax: {cafe.tax_percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Search & Dietary Quick Bar ── */}
        <div style={{ padding: '0 16px 12px' }}>
          {/* Search Input Box */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <svg 
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} 
              width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 36px 11px 40px',
                borderRadius: 14,
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-bg-subtle)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'var(--shadow-card)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--border-medium)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Dietary Filter Segment (All / Veg / Non-Veg) */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All Dishes' },
              { id: 'veg', label: '🟢 Veg Only' },
              { id: 'non-veg', label: '🔴 Non-Veg' },
            ].map(tab => {
              const active = dietaryFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setDietaryFilter(tab.id)}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: 10,
                    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                    background: active ? 'var(--accent-bg-subtle)' : 'var(--bg-card)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? 'var(--shadow-card)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Category Horizontal Tabs ── */}
        <div style={{ 
          overflowX: 'auto', 
          padding: '0 16px 12px', 
          scrollbarWidth: 'none', 
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          gap: 8
        }}>
          {/* All Category Pill */}
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 50,
              border: activeCategory === 'all' ? 'none' : '1px solid var(--border-medium)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              background: activeCategory === 'all' ? 'var(--accent-gradient)' : 'var(--bg-card)',
              color: activeCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeCategory === 'all' ? 'var(--accent-shadow)' : 'var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0
            }}
          >
            <span>All Items</span>
            <span style={{ 
              fontSize: 11, 
              padding: '1px 6px', 
              borderRadius: 10, 
              background: activeCategory === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
              color: activeCategory === 'all' ? '#ffffff' : 'var(--text-tertiary)'
            }}>
              {getCategoryCount('all')}
            </span>
          </button>

          {/* Each Category */}
          {categories.map(cat => {
            const count = getCategoryCount(cat._id)
            const active = activeCategory === cat._id
            return (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(cat._id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 50,
                  border: active ? 'none' : '1px solid var(--border-medium)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  background: active ? 'var(--accent-gradient)' : 'var(--bg-card)',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: active ? 'var(--accent-shadow)' : 'var(--shadow-card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0
                }}
              >
                <span>{cat.name}</span>
                <span style={{ 
                  fontSize: 11, 
                  padding: '1px 6px', 
                  borderRadius: 10, 
                  background: active ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
                  color: active ? '#ffffff' : 'var(--text-tertiary)'
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Food Items Grid ── */}
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {filteredItems.map((item, i) => {
              const qty = getCartQuantity(item._id)
              const isOut = item.availability === false

              return (
                <div 
                  key={item._id} 
                  style={{
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-medium)', 
                    borderRadius: 18, 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    animation: `cardAppear 0.28s ease ${Math.min(i * 0.03, 0.4)}s both`, 
                    position: 'relative', 
                    boxShadow: 'var(--shadow-card)',
                    opacity: isOut ? 0.72 : 1,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  {/* Food Image Container with 4:3 Aspect Ratio */}
                  <div style={{ 
                    height: 125, 
                    background: 'var(--border-light)', 
                    position: 'relative', 
                    overflow: 'hidden' 
                  }}>
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        loading="lazy"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          filter: isOut ? 'grayscale(100%) opacity(0.55)' : 'none',
                          transition: 'transform 0.3s ease'
                        }} 
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--border-light) 0%, var(--border-medium) 100%)', color: 'var(--text-tertiary)', opacity: 0.4 }}>
                        <UtensilsCrossed size={32} />
                      </div>
                    )}

                    {/* Standard Indian Veg / Non-Veg Badge */}
                    <div 
                      title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                      style={{ 
                        position: 'absolute', 
                        top: 8, 
                        left: 8, 
                        width: 17, 
                        height: 17, 
                        borderRadius: 4, 
                        background: '#ffffff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)', 
                        border: `1.5px solid ${item.is_veg ? '#10b981' : '#dc2626'}`,
                        zIndex: 2
                      }}
                    >
                      {item.is_veg ? (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                      ) : (
                        <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '7px solid #dc2626' }} />
                      )}
                    </div>

                    {/* Sold Out Overlay Ribbon */}
                    {isOut && (
                      <div style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        background: 'rgba(0, 0, 0, 0.45)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        zIndex: 3
                      }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: 8, 
                          background: '#dc2626', 
                          color: '#ffffff', 
                          fontSize: 10, 
                          fontWeight: 800, 
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Item Name */}
                    <h3 style={{ 
                      fontSize: 14, 
                      fontWeight: 800, 
                      margin: '0 0 4px', 
                      color: 'var(--text-primary)', 
                      lineHeight: 1.3, 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden',
                      fontFamily: "'Inter', sans-serif"
                    }}>
                      {item.name}
                    </h3>
                    
                    {/* Description */}
                    <p style={{ 
                      fontSize: 11, 
                      color: 'var(--text-secondary)', 
                      margin: '0 0 10px', 
                      flex: 1, 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden', 
                      lineHeight: 1.4,
                      opacity: 0.9 
                    }}>
                      {item.description || 'Freshly prepared with authentic ingredients.'}
                    </p>
                    
                    {/* Price & Action Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 'auto' }}>
                      {/* Price */}
                      <span style={{ 
                        fontSize: 16, 
                        fontWeight: 900, 
                        color: isOut ? 'var(--text-tertiary)' : 'var(--accent-primary)', 
                        fontFamily: "'Outfit', sans-serif", 
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.3px'
                      }}>
                        ₹{item.price}
                      </span>
                      
                      {/* Interactive Action Controls */}
                      {isOut ? (
                        <button 
                          disabled 
                          aria-label="Item sold out"
                          style={{ 
                            height: 34, 
                            padding: '0 10px', 
                            borderRadius: 10, 
                            border: '1px solid var(--border-medium)', 
                            background: 'var(--border-light)', 
                            color: 'var(--text-tertiary)', 
                            fontSize: 11, 
                            fontWeight: 700, 
                            cursor: 'not-allowed',
                            pointerEvents: 'none'
                          }}
                        >
                          Sold Out
                        </button>
                      ) : qty > 0 ? (
                        /* Modern Stepper */
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          background: 'var(--accent-bg-subtle)', 
                          borderRadius: 10, 
                          padding: 2, 
                          border: '1.5px solid var(--accent-primary)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}>
                          <button 
                            onClick={() => handleDecreaseQty(item, qty)} 
                            aria-label={`Decrease ${item.name} quantity`}
                            style={{ 
                              width: 30, 
                              height: 30, 
                              borderRadius: 8, 
                              border: 'none', 
                              background: 'transparent', 
                              color: 'var(--accent-primary)', 
                              fontSize: 16, 
                              fontWeight: 900, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer' 
                            }}
                          >
                            -
                          </button>
                          
                          <span style={{ 
                            fontSize: 13, 
                            fontWeight: 800, 
                            color: 'var(--text-primary)', 
                            minWidth: 18, 
                            textAlign: 'center',
                            fontVariantNumeric: 'tabular-nums' 
                          }}>
                            {qty}
                          </span>
                          
                          <button 
                            onClick={() => updateQuantity(item._id, qty + 1)} 
                            aria-label={`Increase ${item.name} quantity`}
                            style={{ 
                              width: 30, 
                              height: 30, 
                              borderRadius: 8, 
                              border: 'none', 
                              background: 'var(--accent-gradient)', 
                              color: '#ffffff', 
                              fontSize: 16, 
                              fontWeight: 900, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer', 
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)' 
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        /* + ADD Button */
                        <button 
                          onClick={() => handleAddToCart(item)} 
                          aria-label={`Add ${item.name} to cart`}
                          style={{ 
                            height: 34, 
                            padding: '0 14px', 
                            borderRadius: 10, 
                            border: '1.5px solid var(--accent-primary)', 
                            background: 'var(--accent-bg-subtle)', 
                            color: 'var(--accent-primary)', 
                            fontSize: 12, 
                            fontWeight: 800, 
                            cursor: 'pointer', 
                            transition: 'all 0.18s ease', 
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--accent-primary)'
                            e.currentTarget.style.color = '#ffffff'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--accent-bg-subtle)'
                            e.currentTarget.style.color = 'var(--accent-primary)'
                          }}
                        >
                          <span>+ ADD</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty Search/Filter State */}
          {filteredItems.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-tertiary)', animation: 'fadeIn 0.3s ease' }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: 0.6 }}>🔍</span>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No dishes found</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                {searchQuery ? `We couldn't find anything matching "${searchQuery}"` : 'No dishes available in this selection.'}
              </p>
              {(searchQuery || dietaryFilter !== 'all' || activeCategory !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setDietaryFilter('all'); setActiveCategory('all'); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes cardAppear { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  )
}

export default CustomerMenu
