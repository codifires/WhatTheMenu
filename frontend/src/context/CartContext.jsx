import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

export const CartProvider = ({ children }) => {
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('cart')
    const lastActive = localStorage.getItem('cart_last_active')
    
    // Check if expired on initial load
    if (saved && lastActive) {
      if (Date.now() - parseInt(lastActive) > IDLE_TIMEOUT) {
        localStorage.removeItem('cart')
        localStorage.removeItem('cartCafeId')
        localStorage.removeItem('cart_last_active')
        return []
      }
    }
    return saved ? JSON.parse(saved) : []
  })
  const [cafeId, setCafeId] = useState(() => {
    return localStorage.getItem('cartCafeId') || null
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
    if (items.length > 0) {
      localStorage.setItem('cart_last_active', Date.now().toString())
    }
  }, [items])

  // Active Tab Idle Checker
  useEffect(() => {
    if (items.length === 0) return;
    let lastActivity = Date.now();
    
    const resetTimer = () => {
      lastActivity = Date.now();
      localStorage.setItem('cart_last_active', lastActivity.toString());
    };

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > IDLE_TIMEOUT) {
        setItems([]);
        setCafeId(null);
        localStorage.removeItem('cart');
        localStorage.removeItem('cartCafeId');
        localStorage.removeItem('cart_last_active');
        toast.error('Cart cleared due to 5 minutes of inactivity.', { icon: '⏳', duration: 4000 });
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [items.length])

  useEffect(() => {
    if (cafeId) localStorage.setItem('cartCafeId', cafeId)
  }, [cafeId])

  const addItem = (item, cafe_id) => {
    // If switching cafés, clear cart
    if (cafeId && cafeId !== cafe_id) {
      setItems([])
    }
    setCafeId(cafe_id)

    setItems(prev => {
      const existing = prev.find(i => i._id === item._id)
      if (existing) {
        return prev.map(i =>
          i._id === item._id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (itemId) => {
    setItems(prev => prev.filter(i => i._id !== itemId))
  }

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }
    setItems(prev =>
      prev.map(i =>
        i._id === itemId ? { ...i, quantity } : i
      )
    )
  }


  const syncCartPrices = (latestMenu) => {
    setItems(prev => prev.map(cartItem => {
      const liveItem = latestMenu.find(i => i._id === cartItem._id);
      return liveItem ? { ...cartItem, price: liveItem.price, name: liveItem.name } : cartItem;
    }));
  }

  const clearCart = () => {
    setItems([])
    setCafeId(null)
    localStorage.removeItem('cart')
    localStorage.removeItem('cartCafeId')
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0)

  return (
    <CartContext.Provider value={{
      items,
      cafeId,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount,
      setCafeId
    }}>
      {children}
    </CartContext.Provider>
  )
}
