import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { customerAPI } from '../../services/api'

const Cart = () => {
  const { cafeId } = useParams()
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } = useCart()
  const navigate = useNavigate()
  const [taxPercentage, setTaxPercentage] = useState(0)

  useEffect(() => {
    customerAPI.getCafeMenu(cafeId)
      .then(res => setTaxPercentage(res.data.data.cafe.tax_percentage || 0))
      .catch(() => {})
  }, [cafeId])

  const taxAmount = (totalAmount * taxPercentage) / 100
  const grandTotal = totalAmount + taxAmount

  if (items.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 40px', fontFamily: "'Outfit',sans-serif" }}>Your Cart</h2>
        
        <div style={{ background: 'var(--bg-card)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 32, padding: '60px 20px' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 16, opacity: 0.5 }}>🛒</span>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Your cart is empty</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 32px' }}>Looks like you haven't added anything yet.</p>
          
          <button
            onClick={() => navigate(`/${cafeId}/menu`)}
            style={{ padding: '14px 28px', borderRadius: 16, border: 'none', background: 'var(--accent-gradient)', color: 'var(--accent-text)', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--accent-shadow)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
          >
            Explore Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.4s ease', paddingBottom: 140 }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Your Cart</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Review your items</p>
        </div>
        <button onClick={clearCart} style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {/* ── Cart Items ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {items.map((item, i) => (
          <div key={item._id} style={{ display: 'flex', gap: 16, padding: 16, borderRadius: 24, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', animation: `slideUp 0.3s ease ${i * 0.05}s both` }}>
            
            <div style={{ width: 72, height: 72, borderRadius: 16, background: 'var(--bg-card)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              {item.image ? (
                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.2 }}>🍽️</div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent-primary)', margin: 0 }}>₹{item.price}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card-hover)', borderRadius: 12, padding: '4px 6px' }}>
                  <button onClick={() => item.quantity === 1 ? removeItem(item._id) : updateQuantity(item._id, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: item.quantity === 1 ? 'rgba(239,68,68,0.1)' : 'transparent', color: item.quantity === 1 ? 'var(--danger-text)' : 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {item.quantity === 1 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    ) : '-'}
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', width: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item._id, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--accent-gradient)', color: 'var(--accent-text)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Order Summary ── */}
      <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 24, animation: 'slideUp 0.4s ease 0.2s both' }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>Order Summary</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Items ({totalItems})</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>₹{totalAmount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Taxes & Fees {taxPercentage > 0 ? `(${taxPercentage}%)` : ''}</span>
          <span style={{ fontSize: 14, color: taxAmount > 0 ? 'var(--text-primary)' : '#10b981', fontWeight: 600 }}>
            {taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : 'Free'}
          </span>
        </div>
        <div style={{ height: 1, background: 'var(--border-hover)', margin: '0 0 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif" }}>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Sticky Checkout Button ── */}
      <div style={{ position: 'fixed', bottom: 100, left: 16, right: 16, zIndex: 90 }}>
        <button
          onClick={() => navigate(`/${cafeId}/menu/checkout`)}
          style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '16px', borderRadius: 20, border: 'none', background: 'var(--accent-gradient)', color: 'var(--accent-text)', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--accent-shadow)', transition: 'transform 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
        >
          <span>Checkout</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ₹{grandTotal.toFixed(2)}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default Cart
