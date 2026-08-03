import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'

const CustomerMenu = () => {
  const { cafeId } = useParams()
  const [cafe, setCafe] = useState(null)
  const [categories, setCategories] = useState([])
  const [allItems, setAllItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const { addItem, items: cartItems, updateQuantity, removeItem } = useCart()

  useEffect(() => {
    fetchMenu()
  }, [cafeId])

  const fetchMenu = async () => {
    try {
      const res = await customerAPI.getCafeMenu(cafeId)
      setCafe(res.data.data.cafe)
      setCategories(res.data.data.categories)
      setAllItems(res.data.data.allItems)
    } catch (error) {
      toast.error('Failed to load menu')
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

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 120, borderRadius: 24, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 36, width: 80, borderRadius: 20, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height: 200, borderRadius: 20, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease infinite' }} />)}
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
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Menu Not Available</p>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>This café's menu is currently unavailable or the link is invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* ── Café Header ── */}
      <div style={{ position: 'relative', padding: '30px 20px', overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', marginBottom: 20 }}>
        <div style={{ position: 'absolute', inset: 0, background: cafe.logo ? `url(${cafe.logo}) center/cover` : 'linear-gradient(135deg, #f59e0b, #ea580c)', filter: 'blur(20px) brightness(0.4)', transform: 'scale(1.2)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0d14, transparent)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
            {cafe.logo ? <img src={cafe.logo} alt={cafe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '☕'}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', color: '#fff', fontFamily: "'Outfit',sans-serif", textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{cafe.name}</h1>
            <p style={{ fontSize: 13, color: '#d1d5db', margin: 0, display: 'flex', alignItems: 'center', gap: 4, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
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
              background: activeCategory === 'all' ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'rgba(255,255,255,0.04)',
              color: activeCategory === 'all' ? '#fff' : '#9ca3af',
              boxShadow: activeCategory === 'all' ? '0 4px 15px rgba(245,158,11,0.4)' : 'none'
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
                background: activeCategory === cat._id ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'rgba(255,255,255,0.04)',
                color: activeCategory === cat._id ? '#fff' : '#9ca3af',
                boxShadow: activeCategory === cat._id ? '0 4px 15px rgba(245,158,11,0.4)' : 'none'
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
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                animation: `slideUp 0.3s ease ${i * 0.05}s both`, position: 'relative'
              }}>
                {/* Image */}
                <div style={{ height: 120, background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.2 }}>🍽️</div>
                  )}
                  {/* Veg/Non-Veg Indicator */}
                  <div style={{ position: 'absolute', top: 10, left: 10, width: 14, height: 14, borderRadius: 4, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.is_veg ? '#10b981' : '#ef4444' }} />
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: '#fff', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</h3>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 12px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>₹{item.price}</span>
                    
                    {qty > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 }}>
                        <button onClick={() => qty === 1 ? removeItem(item._id) : updateQuantity(item._id, qty - 1)} style={{ width: 24, height: 24, borderRadius: 8, border: 'none', background: 'transparent', color: '#9ca3af', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', width: 12, textAlign: 'center' }}>{qty}</span>
                        <button onClick={() => updateQuantity(item._id, qty + 1)} style={{ width: 24, height: 24, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addItem(item, cafeId)} style={{ padding: '6px 14px', borderRadius: 12, border: 'none', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}>
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
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🔍</span>
            <p style={{ fontSize: 14, margin: 0 }}>No items found in this category.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default CustomerMenu
