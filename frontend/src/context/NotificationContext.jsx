import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'
import { adminAPI, ownerAPI, SOCKET_URL } from '../services/api'
import { playHardwareAlert } from '../utils/hardwareAlerts'

const NotificationContext = createContext(null)

// Synthetic Web Audio API Chime Synthesizer (0 latency, no audio file needed)
const playChime = (type = 'order') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const now = ctx.currentTime
    if (type === 'order') {
      // Pleasant double-ping (G5 -> C6)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(783.99, now) // G5
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1046.50, now + 0.12) // C6
      gain2.gain.setValueAtTime(0.25, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.5)
    } else if (type === 'plan') {
      // Upbeat triple fanfare for subscriptions
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + i * 0.1)
        gain.gain.setValueAtTime(0.2, now + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + i * 0.1)
        osc.stop(now + i * 0.1 + 0.4)
      })
    } else {
      // Soft ping
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now) // A5
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.35)
    }
  } catch (err) {
    console.debug('Audio chime error:', err)
  }
}

export const NotificationProvider = ({ children }) => {
  const { user, logout } = useAuth()
  const storageKey = user?.id ? `qrmenu_notifications_${user.id}` : (user?.role === 'superadmin' ? 'qrmenu_notifications_admin' : 'qrmenu_notifications_guest')

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('qrmenu_sound_enabled')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  // Persist notifications on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications))
    } catch (e) {
      console.warn('Could not save notifications to localStorage', e)
    }
  }, [notifications, storageKey])

  // Persist sound preference
  useEffect(() => {
    try {
      localStorage.setItem('qrmenu_sound_enabled', JSON.stringify(soundEnabled))
    } catch {}
  }, [soundEnabled])

  // Add Notification helper
  const addNotification = useCallback((item) => {
    const newNotif = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: item.title,
      message: item.message,
      type: item.type || 'system', // 'order' | 'plan' | 'support' | 'cafe' | 'system'
      read: item.read !== undefined ? item.read : false,
      createdAt: item.createdAt || new Date().toISOString(),
      link: item.link || null,
      meta: item.meta || {}
    }

    setNotifications(prev => {
      // If notification already exists with this ID, preserve its read state unless updated
      const existingIndex = prev.findIndex(n => n.id === newNotif.id)
      if (existingIndex !== -1) {
        return prev
      }
      return [newNotif, ...prev].slice(0, 50) // Keep last 50
    })

    if (soundEnabled && !item.silent) {
      playChime(item.type)
    }

    return newNotif
  }, [soundEnabled])

  // Mark specific notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Remove single notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([])
    if (user?.id || user?._id) {
      localStorage.setItem(`qrmenu_cleared_at_${user.id || user._id}`, Date.now().toString())
    }
  }, [user])

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

  // ==========================================
  // HYDRATION: Fetch Active Initial DB State
  // ==========================================
  const syncDatabaseState = useCallback(async () => {
    if (!user) return
    const userId = user?.id || user?._id
    const clearedAtStr = localStorage.getItem(`qrmenu_cleared_at_${userId}`)
    const clearedAt = clearedAtStr ? parseInt(clearedAtStr, 10) : 0

    // 1. ADMIN INITIAL DB SYNC
    if (user.role === 'superadmin') {
      try {
        // Fetch all open tickets
        const ticketsRes = await adminAPI.getSupportTickets({ status: 'open' })
        const openTickets = ticketsRes.data?.data || []

        openTickets.forEach(t => {
          const cafeName = t.cafe_id?.name || t.cafe_name || 'Café'
          const isUrgent = t.priority === 'urgent'
          addNotification({
            id: `ticket_${t._id}`,
            title: `${isUrgent ? '🚨 URGENT Support' : '🎧 Support'}: #${t.ticket_number || ''}`,
            message: `From ${cafeName}: "${t.subject}"`,
            type: 'support',
            link: '/admin/support-tickets',
            createdAt: t.created_at || t.createdAt,
            silent: true,
            meta: { ticketId: t._id, priority: t.priority, status: t.status }
          })
        })
      } catch (err) {
        console.debug('Could not sync admin support tickets:', err)
      }

      try {
        // Fetch recent subscription requests
        const subRes = await adminAPI.getSubscriptionRequests()
        const pendingSubs = (subRes.data?.data || []).filter(s => s.status === 'pending')

        pendingSubs.forEach(s => {
          const cafeName = s.cafe_id?.name || 'Café'
          addNotification({
            id: `subreq_${s._id}`,
            title: `💳 Subscription Request: ${(s.requested_plan || 'Pro').toUpperCase()}`,
            message: `${cafeName} requested an upgrade. Action required.`,
            type: 'plan',
            link: '/admin/subscriptions',
            createdAt: s.createdAt,
            silent: true,
            meta: { requestId: s._id, plan: s.requested_plan }
          })
        })
      } catch (err) {
        console.debug('Could not sync subscription requests:', err)
      }
    }

    // 2. OWNER INITIAL DB SYNC
    const cafeOwnerId = user?.id || user?._id
    if (user.role !== 'superadmin' && cafeOwnerId) {
      // A. Live Pending Orders
      try {
        const ordersRes = await ownerAPI.getOrders({ status: 'pending' })
        const pendingOrders = ordersRes.data?.data || []

        pendingOrders.forEach(o => {
          const orderNum = o.order_number || `#${String(o._id).slice(-4)}`
          const table = o.table_number ? `Table ${o.table_number}` : 'Takeaway'
          const total = o.total_amount ? `₹${o.total_amount}` : ''
          const itemsCount = o.items?.length || 1

          addNotification({
            id: `order_${o._id}`,
            title: `🛍️ New Order ${orderNum}`,
            message: `${table} • ${itemsCount} items • ${total}`,
            type: 'order',
            link: '/owner/orders',
            createdAt: o.created_at || o.createdAt,
            silent: true,
            meta: { orderId: o._id, orderNumber: orderNum, table: o.table_number }
          })
        })
      } catch (err) {
        console.debug('Could not sync live orders:', err)
      }

      // B. Support Tickets Updates & Replies
      try {
        const ticketsRes = await ownerAPI.getSupportTickets()
        const myTickets = ticketsRes.data?.data || []

        myTickets.forEach(t => {
          const ticketUpdatedAt = new Date(t.updated_at || t.updatedAt || t.created_at || t.createdAt).getTime()
          if (ticketUpdatedAt > clearedAt && (t.admin_reply || t.status === 'in_progress' || t.status === 'resolved')) {
            const hasReply = !!t.admin_reply
            const replySnippet = hasReply 
              ? (t.admin_reply.length > 55 ? t.admin_reply.slice(0, 55) + '...' : t.admin_reply)
              : `Status: ${t.status === 'in_progress' ? 'In Progress' : t.status}`

            addNotification({
              id: `ticket_${t._id}_${ticketUpdatedAt}`,
              title: `🎧 Support: #${t.ticket_number || ''}`,
              message: hasReply ? `Team Reply: "${replySnippet}"` : `Update: "${t.subject}" (${t.status})`,
              type: 'support',
              link: '/owner/support',
              createdAt: new Date(ticketUpdatedAt).toISOString(),
              silent: true,
              meta: { ticketId: t._id, status: t.status }
            })
          }
        })
      } catch (err) {
        console.debug('Could not sync owner support tickets:', err)
      }

      // C. Check Plan Expiry & Renew Reminder
      const expiryDate = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null
      const trialEndDate = user.trial_ends_at ? new Date(user.trial_ends_at) : null
      const targetDate = expiryDate || trialEndDate

      if (targetDate && !isNaN(targetDate.getTime())) {
        const now = new Date()
        const diffMs = targetDate.getTime() - now.getTime()
        const daysRemaining = diffMs / (1000 * 60 * 60 * 24)

        if (daysRemaining <= 0 || user.subscription_status === 'expired') {
          addNotification({
            id: 'plan_expired_critical',
            title: '🚨 Subscription Expired — Renew Now',
            message: 'Your café menu orders are paused. Renew your subscription plan to restore customer ordering.',
            type: 'plan',
            link: '/owner/subscription',
            silent: true
          })
        } else if (daysRemaining <= 3) {
          const days = Math.ceil(daysRemaining)
          addNotification({
            id: `plan_expiring_soon_${days}`,
            title: `⚠️ Plan Expiring in ${days} ${days === 1 ? 'Day' : 'Days'}`,
            message: `Your ${user.subscription_plan || 'Starter'} plan renews soon. Click to renew and avoid any service interruptions.`,
            type: 'plan',
            link: '/owner/subscription',
            silent: true
          })
        }
      }
    }
  }, [user, addNotification])

  // Sync DB state on load and poll every 20s
  useEffect(() => {
    syncDatabaseState()
    const interval = setInterval(syncDatabaseState, 20000)
    return () => clearInterval(interval)
  }, [syncDatabaseState])

  // ==========================================
  // Socket.io Real-time Instant Event Listener
  // ==========================================
  useEffect(() => {
    if (!user) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    })

    const cafeOwnerId = user?.id || user?._id

    // Café Owner Room Setup
    if (user.role !== 'superadmin' && cafeOwnerId) {
      socket.emit('join-cafe', cafeOwnerId)

      // 1. Real-time New Order Notification
      socket.on('new-order', (order) => {
        const orderNum = order.order_number || `#${String(order._id).slice(-4)}`
        const table = order.table_number ? `Table ${order.table_number}` : 'Takeaway'
        const total = order.total_amount ? `₹${order.total_amount}` : ''
        const itemsCount = order.items?.length || 1

        addNotification({
          id: `order_${order._id || Date.now()}`,
          title: `🛍️ New Order ${orderNum}`,
          message: `${table} • ${itemsCount} ${itemsCount === 1 ? 'item' : 'items'} • ${total}`,
          type: 'order',
          link: '/owner/orders',
          meta: { orderId: order._id, orderNumber: orderNum, table: order.table_number },
          silent: true // prevent duplicate chime
        })
        
        playHardwareAlert('new-order')

        toast.success(`🔔 New Order ${orderNum} received from ${table}!`, {
          duration: 4500,
          style: {
            background: '#0f172a',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#fff',
            fontWeight: 600
          }
        })
      })

      // 1.5 Real-time Staff Alert (Waiter/Bill)
      socket.on('staff-alert', (data) => {
        addNotification({
          id: `staff_alert_${Date.now()}`,
          title: `🛎️ Staff Alert: ${data.table_number || 'Takeaway'}`,
          message: `${data.customer_name || 'Customer'} requested ${data.type === 'waiter' ? 'a waiter' : 'the bill'}.`,
          type: 'system',
          meta: { type: data.type, table: data.table_number },
          silent: true
        })

        playHardwareAlert(data.type)

        toast.error(`🛎️ ${data.customer_name || 'Customer'} at ${data.table_number || 'Takeaway'} requested ${data.type === 'waiter' ? 'a waiter' : 'the bill'}!`, {
          duration: 6000,
          style: {
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fff',
            fontWeight: 700
          }
        })
      })

      // 2. Real-time Plan Activation / Renewal Notification
      socket.on('subscription-activated', (data) => {
        const planName = (data?.plan || user.subscription_plan || 'Starter').toUpperCase()
        addNotification({
          id: `sub_active_${Date.now()}`,
          title: `🎉 ${planName} Plan Active!`,
          message: `Your subscription has been activated successfully. Enjoy 0% commission and all features!`,
          type: 'plan',
          link: '/owner/subscription',
          meta: { plan: planName }
        })

        toast.success(`🎉 Subscription successfully activated!`, {
          duration: 5000,
          style: {
            background: '#0f172a',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            color: '#fff',
            fontWeight: 600
          }
        })
      })

      // 3. Support ticket updates from Admin
      socket.on('support-ticket-updated', (ticket) => {
        const hasReply = !!ticket.admin_reply
        const replySnippet = hasReply 
          ? (ticket.admin_reply.length > 55 ? ticket.admin_reply.slice(0, 55) + '...' : ticket.admin_reply)
          : `Status updated to ${ticket.status}`

        addNotification({
          id: `ticket_${ticket.id || ticket._id || Date.now()}`,
          title: `🎧 Support Response: #${ticket.ticket_number || ''}`,
          message: hasReply ? `Team: "${replySnippet}"` : replySnippet,
          type: 'support',
          link: '/owner/support',
          meta: { ticketId: ticket.id || ticket._id, status: ticket.status }
        })

        toast.success(`🎧 Support Team responded to #${ticket.ticket_number || ''}!`, {
          duration: 5000,
          style: {
            background: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#fff',
            fontWeight: 600
          }
        })
      })

      // 4. Account Suspended Event
      socket.on('account-suspended', (data) => {
        alert(`🚨 ACCOUNT SUSPENDED 🚨\n\n${data.message}`);
        logout();
        window.location.href = '/owner/login';
      })
    }

    // Super Admin Room Setup (Platform-level events only)
    if (user.role === 'superadmin') {
      socket.emit('join-admin')

      // 1. New Café Partner Registration Alert
      socket.on('new-cafe-registered', (data) => {
        addNotification({
          id: `cafe_${data.id || Date.now()}`,
          title: `🏪 New Café Registered: ${data.name}`,
          message: `${data.name} (${data.email}) joined on ${(data.plan || 'trial').toUpperCase()} plan.`,
          type: 'cafe',
          link: '/admin/cafes',
          meta: { cafeId: data.id, name: data.name }
        })

        toast.success(`🏪 New Café Registered: ${data.name}!`, {
          duration: 4500,
          style: {
            background: '#0f172a',
            border: '1px solid rgba(124, 58, 237, 0.4)',
            color: '#fff',
            fontWeight: 600
          }
        })
      })

      // 2. Admin Revenue & Subscription Alert
      socket.on('new-subscription-revenue', (data) => {
        addNotification({
          id: `revenue_${Date.now()}`,
          title: `💰 Subscription Revenue: ₹${data.amount}`,
          message: `${data.cafe_name || 'Café'} subscribed to ${(data.plan || 'Pro').toUpperCase()} plan.`,
          type: 'plan',
          link: '/admin/subscriptions',
          meta: { amount: data.amount, plan: data.plan }
        })

        toast.success(`💰 New Revenue: ₹${data.amount} from ${data.cafe_name || 'Café'}!`, {
          duration: 4500,
          style: {
            background: '#0f172a',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#fff',
            fontWeight: 600
          }
        })
      })

      // 3. New Support Ticket Submitted by Café Owner
      socket.on('new-support-ticket', (data) => {
        const isUrgent = data.priority === 'urgent'
        addNotification({
          id: `ticket_${data.id || Date.now()}`,
          title: `${isUrgent ? '🚨 URGENT Support' : '🎧 Support'}: #${data.ticket_number || ''}`,
          message: `From ${data.cafe_name || 'Café'}: "${data.subject}"`,
          type: 'support',
          link: '/admin/support-tickets',
          meta: { ticketId: data.id, priority: data.priority }
        })

        toast(`${isUrgent ? '🚨 Urgent Support Ticket' : '🎧 New Support Ticket'} from ${data.cafe_name || 'Café'}!`, {
          duration: 5000,
          icon: isUrgent ? '🚨' : '🎧',
          style: {
            background: '#0f172a',
            border: isUrgent ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(6, 182, 212, 0.4)',
            color: '#fff',
            fontWeight: 600
          }
        })
      })
    }

    return () => {
      socket.disconnect()
    }
  }, [user, addNotification])

  const unreadCount = notifications.filter(n => !n.read).length

  const value = {
    notifications,
    unreadCount,
    soundEnabled,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    toggleSound,
    syncDatabaseState,
    playTestChime: () => playChime('order')
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
