import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })
  const [cafeId, setCafeId] = useState(() => {
    return localStorage.getItem('cartCafeId') || null
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

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
