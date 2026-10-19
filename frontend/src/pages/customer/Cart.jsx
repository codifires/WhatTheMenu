import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { customerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { UtensilsCrossed, PenLine, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'

const Cart = () => {
  const { cafeId } = useParams()
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } = useCart()
  const navigate = useNavigate()
  const [taxPercentage, setTaxPercentage] = useState(0)
  const [cafeName, setCafeName] = useState('')
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('customer_table') || '')
  const [notes, setNotes] = useState(() => localStorage.getItem('order_notes') || '')

  useEffect(() => {
    customerAPI.getCafeMenu(cafeId)
      .then(res => {
        setTaxPercentage(res.data.data.cafe.tax_percentage || 0)
        setCafeName(res.data.data.cafe.name || '')
      })
      .catch(() => {})
  }, [cafeId])

  const handleNotesChange = (val) => {
    setNotes(val)
    localStorage.setItem('order_notes', val)
  }

  const taxAmount = (totalAmount * taxPercentage) / 100
  const grandTotal = totalAmount + taxAmount

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart()
      toast.success('Cart cleared')
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', animation: 'fadeIn 0.35s ease' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 32px', fontFamily: "'Outfit', sans-serif" }}>
          Your Cart
        </h1>
        
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1.5px dashed var(--border-medium)', 
          borderRadius: 28, 
          padding: '50px 20px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 36 }}>
            🛒
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
            Your cart is empty
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px', maxWidth: 260, marginInline: 'auto', lineHeight: 1.5 }}>
            Looks like you haven't added anything yet. Discover our delicious menu items!
          </p>
          
          <button
            onClick={() => navigate(`/${cafeId}/menu`)}
            style={{ 
              padding: '14px 32px', 
              borderRadius: 16, 
              border: 'none', 
              background: 'var(--accent-gradient)', 
              color: '#ffffff', 
              fontSize: 15, 
              fontWeight: 800, 
              cursor: 'pointer', 
              boxShadow: 'var(--accent-shadow)', 
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
          >
            <span>Explore Menu</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px', animation: 'fadeIn 0.35s ease', paddingBottom: 170 }}>
      
      {/* ── Cart Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
            Your Cart
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'} from {cafeName || 'Menu'}
          </p>
        </div>

        <button 
          onClick={handleClearCart} 
          style={{ 
            padding: '7px 14px', 
            borderRadius: 10, 
            border: '1px solid var(--border-medium)', 
            background: 'var(--bg-card)', 
            color: 'var(--text-secondary)', 
            fontSize: 12, 
            fontWeight: 700, 
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
        >
          Clear All
        </button>
      </div>

      {/* Table Context Strip if available */}
      {tableNumber && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '10px 14px', 
          borderRadius: 14, 
          background: 'var(--accent-bg-subtle)', 
          border: '1px solid var(--accent-primary)',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UtensilsCrossed size={16} color="var(--accent-primary)" />
            <div>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
                Dine-In Table
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Table #{tableNumber}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const newTable = window.prompt('Enter your table number:', tableNumber)
              if (newTable !== null) {
                setTableNumber(newTable.trim())
                localStorage.setItem('customer_table', newTable.trim())
              }
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--accent-primary)', 
              fontSize: 12, 
              fontWeight: 700, 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Change
          </button>
        </div>
      )}

      {/* ── Cart Items List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {items.map((item, i) => (
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
              animation: `cardAppear 0.25s ease ${i * 0.04}s both` 
            }}
          >
            {/* Dish Thumbnail */}
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--border-light)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              {item.image ? (
                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35, color: 'var(--text-tertiary)' }}>
                  <UtensilsCrossed size={22} />
                </div>
              )}
              {/* Veg/Non-Veg Badge */}
              <div style={{ position: 'absolute', top: 4, left: 4, width: 12, height: 12, borderRadius: 3, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', border: `1px solid ${item.is_veg ? '#10b981' : '#dc2626'}` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.is_veg ? '#10b981' : '#dc2626' }} />
              </div>
            </div>

            {/* Dish Info */}
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
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: "'Outfit', sans-serif" }}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
                {item.quantity > 1 && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    (₹{item.price} each)
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'var(--border-light)', 
              borderRadius: 10, 
              padding: 2, 
              border: '1px solid var(--border-medium)',
              flexShrink: 0
            }}>
              <button 
                onClick={() => item.quantity === 1 ? removeItem(item._id) : updateQuantity(item._id, item.quantity - 1)} 
                aria-label={item.quantity === 1 ? `Remove ${item.name}` : `Decrease ${item.name}`}
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 8, 
                  border: 'none', 
                  background: item.quantity === 1 ? 'rgba(239, 68, 68, 0.12)' : 'transparent', 
                  color: item.quantity === 1 ? '#ef4444' : 'var(--text-primary)', 
                  fontSize: 16, 
                  fontWeight: 900, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                {item.quantity === 1 ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                ) : (
                  '-'
                )}
              </button>
              
              <span style={{ 
                fontSize: 13, 
                fontWeight: 800, 
                color: 'var(--text-primary)', 
                minWidth: 22, 
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums' 
              }}>
                {item.quantity}
              </span>
              
              <button 
                onClick={() => updateQuantity(item._id, item.quantity + 1)} 
                aria-label={`Increase ${item.name}`}
                style={{ 
                  width: 32, 
                  height: 32, 
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
          </div>
        ))}
      </div>

      {/* ── Cooking Instructions / Notes ── */}
      <div style={{ 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-medium)', 
        borderRadius: 16, 
        padding: '14px 16px', 
        marginBottom: 18, 
        boxShadow: 'var(--shadow-card)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <PenLine size={15} color="var(--text-secondary)" />
          <label htmlFor="cooking-notes" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Special Cooking Notes
          </label>
        </div>
        <input
          id="cooking-notes"
          type="text"
          placeholder="e.g. Less spicy, no onions, extra napkins..."
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border-medium)',
            background: 'var(--bg-main)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
        />
      </div>

      {/* ── Order Bill Summary ── */}
      <div style={{ 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-medium)', 
        borderRadius: 18, 
        padding: 18, 
        marginBottom: 20, 
        boxShadow: 'var(--shadow-card)',
        animation: 'cardAppear 0.3s ease 0.1s both' 
      }}>
        <h2 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 14px' }}>
          Bill Summary
        </h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Item Total ({totalItems} items)</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>₹{totalAmount.toFixed(2)}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 14 }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Taxes & Charges {taxPercentage > 0 ? `(${taxPercentage}%)` : ''}
          </span>
          <span style={{ color: taxAmount > 0 ? 'var(--text-primary)' : '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : 'Included'}
          </span>
        </div>
        
        <div style={{ height: 1, background: 'var(--border-medium)', margin: '0 0 14px' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>Grand Total</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Prices inclusive of all taxes</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-primary)', fontFamily: "'Outfit', sans-serif", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Sticky Proceed to Checkout Bar ── */}
      <div style={{ 
        position: 'fixed', 
        bottom: 84, 
        left: 0, 
        right: 0, 
        zIndex: 90, 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '0 16px', 
        pointerEvents: 'none' 
      }}>
        <button
          onClick={() => navigate(`/${cafeId}/menu/checkout`)}
          style={{ 
            width: '100%', 
            maxWidth: 440, 
            height: 52, 
            padding: '0 20px', 
            borderRadius: 16, 
            border: 'none', 
            background: 'var(--accent-gradient)', 
            color: '#ffffff', 
            fontSize: 15, 
            fontWeight: 800, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18), var(--accent-shadow)', 
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
            pointerEvents: 'auto' 
          }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
        >
          <span>Proceed to Checkout</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
            ₹{grandTotal.toFixed(2)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardAppear { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default Cart
