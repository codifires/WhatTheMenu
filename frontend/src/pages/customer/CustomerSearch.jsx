import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { customerAPI } from '../../services/api'
import { useCart } from '../../context/CartContext'

const CustomerSearch = () => {
  const { cafeId } = useParams()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const { addItem, items: cartItems, updateQuantity, removeItem } = useCart()

  const handleSearch = async (q) => {
    setQuery(q)
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await customerAPI.searchMenu(cafeId, q)
      setResults(res.data.data)
    } catch (error) {
      console.error(error)
    } finally {
      setSearching(false)
    }
  }

  const getCartQuantity = (itemId) => {
    const cartItem = cartItems.find(i => i._id === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.4s ease' }}>
      
      {/* ── Header & Search Input ── */}
      <div style={{ marginBottom: 24, position: 'sticky', top: 0, paddingTop: 10, paddingBottom: 10, background: '#0a0d14', zIndex: 10 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 16px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Find craving</h2>
        
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search burgers, coffee, etc..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '16px 16px 16px 48px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 16, fontWeight: 600, outline: 'none',
              boxSizing: 'border-box', transition: 'all 0.3s'
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(245,158,11,0.6)'; e.target.style.background = 'rgba(245,158,11,0.05)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
          />
        </div>
      </div>

      {/* ── Results List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.map((item, i) => {
          const qty = getCartQuantity(item._id)
          return (
            <div key={item._id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)', animation: `slideUp 0.3s ease ${i * 0.05}s both`
            }}>
              
              {/* Image Box */}
              <div style={{ width: 70, height: 70, borderRadius: 12, background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.2 }}>🍽️</div>
                )}
                <div style={{ position: 'absolute', top: 4, left: 4, width: 10, height: 10, borderRadius: 3, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 1 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: item.is_veg ? '#10b981' : '#ef4444' }} />
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.category_id?.name || 'Item'}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', margin: 0 }}>₹{item.price}</p>
              </div>

              {/* Actions */}
              <div style={{ flexShrink: 0 }}>
                {qty > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 }}>
                    <button onClick={() => updateQuantity(item._id, qty + 1)} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => qty === 1 ? removeItem(item._id) : updateQuantity(item._id, qty - 1)} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent', color: '#9ca3af', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>-</button>
                  </div>
                ) : (
                  <button onClick={() => addItem(item, cafeId)} style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Empty States ── */}
      {query.length >= 2 && results.length === 0 && !searching && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', animation: 'fadeIn 0.3s' }}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.5 }}>🤷</span>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#e5e7eb', margin: '0 0 4px' }}>No items found</p>
          <p style={{ fontSize: 14, margin: 0 }}>We couldn't find anything matching "{query}"</p>
        </div>
      )}

      {query.length < 2 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <svg style={{ opacity: 0.2, marginBottom: 16 }} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p style={{ fontSize: 14, margin: 0 }}>Type at least 2 characters to search the menu.</p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default CustomerSearch
