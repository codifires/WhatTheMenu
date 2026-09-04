import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { customerAPI, SOCKET_URL } from '../../services/api'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

const CustomerMenu = () => {
  const { cafeId } = useParams()
  const [cafe, setCafe] = useState(null)
  const [categories, setCategories] = useState([])
  const [allItems, setAllItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const { addItem, items: cartItems, updateQuantity, removeItem, syncCartPrices } = useCart()

  useEffect(() => {
    fetchMenu()
    
    // Live Availability Updates
    const socket = io(SOCKET_URL)
    socket.emit('join-cafe', cafeId)
    
    socket.on('menu_item_updated', (updatedItem) => {
      setAllItems(prevItems => 
        prevItems.map(item => item._id === updatedItem._id ? { ...item, availability: updatedItem.availability } : item)
      )
    })

    return () => socket.disconnect()
  }, [cafeId])

  const fetchMenu = async () => {
    try {
      const res = await customerAPI.getCafeMenu(cafeId)
      setCafe(res.data.data.cafe)
      setCategories(res.data.data.categories)
      setAllItems(res.data.data.allItems)
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

  const getFilteredItems = () => {
    if (activeCategory === 'all') return allItems
    const cat = categories.find(c => c._id === activeCategory)
    return cat ? cat.items : []
  }

  if (isUnavailable) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontFamily: "'Outfit',sans-serif" }}>Menu Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 300, lineHeight: 1.5 }}>
          We're sorry, but this restaurant's digital menu is temporarily offline. Please check back later or ask a staff member for assistance.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 120, borderRadius: 24, background: 'var(--bg-input)', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 36, width: 80, borderRadius: 20, background: 'var(--bg-input)', animation: 'pulse 1.5s ease infinite' }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height: 200, borderRadius: 20, background: 'var(--bg-input)', animation: 'pulse 1.5s ease infinite' }} />)}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  if (!cafe) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 40, opacity: 0.5, display: 'block', marginBottom: 12 }}>🏪</span>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Menu Not Available</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>This café's menu is currently unavailable or the link is invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 40 }}>
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* ── Café Header ── */}
      <div style={{ 
        position: 'relative', 
        padding: '40px 24px 30px', 
        overflow: 'hidden', 
        borderBottomLeftRadius: 36, 
        borderBottomRightRadius: 36, 
        boxShadow: 'var(--accent-shadow)', 
        marginBottom: 24,
        background: 'var(--header-bg)'
      }}>
        {/* Background Image (only if cafe has a logo) */}
        {cafe.logo && (
          <div style={{ position: 'absolute', inset: 0, background: `url(${cafe.logo}) center/cover`, filter: 'blur(15px) brightness(0.3)', transform: 'scale(1.2)' }} />
        )}
        
        {/* Subtle overlay gradient to ensure text readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Logo Container */}
          <div style={{ 
            width: 72, 
            height: 72, 
            borderRadius: 24, 
            background: 'var(--bg-card)', 
            border: '2px solid rgba(255,255,255,0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 32, 
            overflow: 'hidden', 
            flexShrink: 0, 
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)' 
          }}>
            {cafe.logo ? <img src={cafe.logo} alt={cafe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '☕'}
          </div>
          
          {/* Cafe Info */}
          <div>
            <h1 style={{ 
              fontSize: 26, 
              fontWeight: 900, 
              margin: '0 0 6px', 
              color: '#ffffff', 
              fontFamily: "'Outfit',sans-serif", 
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              letterSpacing: '-0.5px'
            }}>
              {cafe.name}
            </h1>
            <p style={{ 
              fontSize: 14, 
              color: 'rgba(255,255,255,0.85)', 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              textShadow: '0 1px 4px rgba(0,0,0,0.5)' 
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {cafe.address}
            </p>
          </div>
        </div>
      </div>

      {/* ── Category Pills ── */}
      <div style={{ overflowX: 'auto', padding: '0 16px 12px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 'max-content' }}>
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '10px 20px', borderRadius: 50, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              background: activeCategory === 'all' ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
              color: activeCategory === 'all' ? 'var(--accent-text)' : 'var(--text-secondary)',
              boxShadow: activeCategory === 'all' ? 'var(--accent-shadow)' : 'none'
            }}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(cat._id)}
              style={{
                padding: '10px 20px', borderRadius: 50, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                background: activeCategory === cat._id ? 'var(--accent-gradient)' : 'var(--bg-card-hover)',
                color: activeCategory === cat._id ? 'var(--accent-text)' : 'var(--text-secondary)',
                boxShadow: activeCategory === cat._id ? 'var(--accent-shadow)' : 'none'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Menu Grid ── */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {getFilteredItems().map((item, i) => {
            const qty = getCartQuantity(item._id)
            return (
              <div key={item._id} style={{
                background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                animation: `slideUp 0.3s ease ${i * 0.05}s both`, position: 'relative'
              }}>
                {/* Image */}
                <div style={{ height: 120, background: 'var(--bg-card)', position: 'relative' }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.availability === false ? 'grayscale(100%) opacity(0.6)' : 'none' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.2 }}>🍽️</div>
                  )}
                  {/* Veg/Non-Veg Indicator */}
                  <div style={{ position: 'absolute', top: 10, left: 10, width: 14, height: 14, borderRadius: 4, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.is_veg ? '#10b981' : '#ef4444' }} />
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 12px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: item.availability === false ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}>₹{item.price}</span>
                    
                    {item.availability === false ? (
                      <span style={{ padding: '6px 12px', borderRadius: 12, background: 'var(--border-light)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}>
                        Out of Stock
                      </span>
                    ) : qty > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--border-light)', borderRadius: 12, padding: 4 }}>
                        <button onClick={() => qty === 1 ? removeItem(item._id) : updateQuantity(item._id, qty - 1)} style={{ width: 24, height: 24, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', width: 12, textAlign: 'center' }}>{qty}</span>
                        <button onClick={() => updateQuantity(item._id, qty + 1)} style={{ width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--accent-gradient)', color: 'var(--accent-text)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addItem(item, cafeId)} style={{ padding: '6px 14px', borderRadius: 12, border: 'none', background: 'var(--accent-bg-subtle)', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}>
                        + ADD
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {getFilteredItems().length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🔍</span>
            <p style={{ fontSize: 14, margin: 0 }}>No items found in this category.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}      </style>
      </div>
    </div>
  )
}

export default CustomerMenu
