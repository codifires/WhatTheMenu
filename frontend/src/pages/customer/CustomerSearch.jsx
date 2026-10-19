import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { customerAPI, SOCKET_URL } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { Search, X, UtensilsCrossed, SearchX, Plus, Minus, Loader2 } from 'lucide-react'

const CustomerSearch = () => {
  const { cafeId } = useParams()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [dietaryFilter, setDietaryFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const { addItem, items: cartItems, updateQuantity, removeItem } = useCart()

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socket.emit('join-menu', cafeId)
    
    socket.on('menu_item_updated', (updatedItem) => {
      setResults(prevResults => 
        prevResults.map(item => item._id === updatedItem._id ? { ...item, availability: updatedItem.availability } : item)
      )
    })

    return () => socket.disconnect()
  }, [cafeId])

  const handleSearch = async (q) => {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await customerAPI.searchMenu(cafeId, q.trim())
      setResults(res.data.data || [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const getCartQuantity = (itemId) => {
    const cartItem = cartItems.find(i => i._id === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  const handleAddToCart = (item) => {
    if (item.availability === false) {
      toast.error('Item is currently sold out.')
      return
    }
    addItem(item, cafeId)
    toast.success(`Added ${item.name} 🛒`, {
      id: `search-add-${item._id}`,
      duration: 1500,
      style: {
        borderRadius: '14px',
        background: '#1c1917',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: '600'
      }
    })
  }

  // Filtered by dietary preference
  const filteredResults = useMemo(() => {
    if (dietaryFilter === 'veg') return results.filter(i => i.is_veg === true)
    if (dietaryFilter === 'non-veg') return results.filter(i => i.is_veg === false)
    return results
  }, [results, dietaryFilter])

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.35s ease', paddingBottom: 120 }}>
      
      {/* ── Search Header & Sticky Input ── */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        paddingTop: 8, 
        paddingBottom: 12, 
        background: 'var(--bg-main)', 
        zIndex: 20 
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 14px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
          Find Your Craving
        </h1>
        
        {/* Input Container */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search 
            size={18}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} 
          />
          
          <input
            type="text"
            placeholder="Search burgers, pizzas, coffees, desserts..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 36px 12px 42px',
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

          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              aria-label="Clear search query"
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
                cursor: 'pointer'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dietary Filters */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Items' },
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
                  fontWeight: active ? 800 : 600,
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

      {/* ── Results List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredResults.map((item, i) => {
          const qty = getCartQuantity(item._id)
          const isOut = item.availability === false

          return (
            <div 
              key={item._id} 
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: 12, 
                borderRadius: 16, 
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)', 
                boxShadow: 'var(--shadow-card)',
                animation: `cardAppear 0.25s ease ${Math.min(i * 0.04, 0.4)}s both`,
                opacity: isOut ? 0.7 : 1
              }}
            >
              {/* Dish Image Box */}
              <div style={{ width: 68, height: 68, borderRadius: 12, background: 'var(--border-light)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      filter: isOut ? 'grayscale(100%) opacity(0.55)' : 'none' 
                    }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', opacity: 0.4 }}>
                    <UtensilsCrossed size={24} />
                  </div>
                )}

                {/* Veg/Non-Veg Badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: 4, 
                  left: 4, 
                  width: 13, 
                  height: 13, 
                  borderRadius: 3, 
                  background: '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: `1px solid ${item.is_veg ? '#10b981' : '#dc2626'}` 
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.is_veg ? '#10b981' : '#dc2626' }} />
                </div>
              </div>

              {/* Info Column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: 14, 
                  fontWeight: 800, 
                  color: 'var(--text-primary)', 
                  margin: '0 0 2px', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}>
                  {item.name}
                </h3>
                
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.category_id?.name || 'Dish'}
                </p>
                
                <p style={{ 
                  fontSize: 14, 
                  fontWeight: 900, 
                  color: isOut ? 'var(--text-tertiary)' : 'var(--accent-primary)', 
                  margin: 0,
                  fontFamily: "'Outfit', sans-serif",
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  ₹{item.price}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ flexShrink: 0 }}>
                {isOut ? (
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: 8, 
                    background: 'var(--border-light)', 
                    color: 'var(--text-tertiary)', 
                    fontSize: 10, 
                    fontWeight: 700 
                  }}>
                    Sold Out
                  </span>
                ) : qty > 0 ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: 'var(--accent-bg-subtle)', 
                    borderRadius: 10, 
                    padding: 2, 
                    border: '1.5px solid var(--accent-primary)' 
                  }}>
                    <button 
                      onClick={() => qty === 1 ? removeItem(item._id) : updateQuantity(item._id, qty - 1)} 
                      style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: 6, 
                        border: 'none', 
                        background: 'transparent', 
                        color: 'var(--accent-primary)', 
                        fontSize: 15, 
                        fontWeight: 900, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer' 
                      }}
                    >
                      -
                    </button>
                    
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', minWidth: 18, textAlign: 'center' }}>
                      {qty}
                    </span>
                    
                    <button 
                      onClick={() => updateQuantity(item._id, qty + 1)} 
                      style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: 6, 
                        border: 'none', 
                        background: 'var(--accent-gradient)', 
                        color: '#ffffff', 
                        fontSize: 15, 
                        fontWeight: 900, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer' 
                      }}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleAddToCart(item)} 
                    style={{ 
                      height: 34, 
                      padding: '0 12px', 
                      borderRadius: 10, 
                      border: '1.5px solid var(--accent-primary)', 
                      background: 'var(--accent-bg-subtle)', 
                      color: 'var(--accent-primary)', 
                      fontSize: 12, 
                      fontWeight: 800, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>+ ADD</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Empty & Helper States ── */}
      {query.trim().length >= 2 && filteredResults.length === 0 && !searching && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', animation: 'fadeIn 0.3s' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-tertiary)' }}>
            <SearchX size={28} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>No matching dishes</p>
          <p style={{ fontSize: 13, margin: 0 }}>We couldn't find anything matching "{query}"</p>
        </div>
      )}

      {query.trim().length < 2 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-tertiary)' }}>
            <Search size={28} />
          </div>
          <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Type at least 2 characters to search the menu.</p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardAppear { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default CustomerSearch
