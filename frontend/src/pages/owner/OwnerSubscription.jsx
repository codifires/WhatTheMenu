import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ownerAPI, publicAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { io } from 'socket.io-client'

const OwnerSubscription = () => {
  const { user, refreshUser } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('pro') // 'starter' | 'pro'
  const [loading, setLoading] = useState(false)
  const [upiSession, setUpiSession] = useState(null)
  const [paymentIncomplete, setPaymentIncomplete] = useState(false)
  const [lastAttemptedPlan, setLastAttemptedPlan] = useState('pro')
  
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const [adminUpiId, setAdminUpiId] = useState('superadmin@okaxis')
  const [platformName, setPlatformName] = useState('QRMenu SaaS')
  const [starterFeatures, setStarterFeatures] = useState([
    'Digital QR Menu',
    'Order Management',
    'Basic Analytics'
  ])
  const [proFeatures, setProFeatures] = useState([
    'Everything in Starter',
    'Advanced Analytics',
    'Priority Support',
    'Custom Branding'
  ])

  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  const isConfirmedRef = useRef(false)

  useEffect(() => {
    publicAPI.getSettings().then(res => {
      const d = res.data?.data
      if (d?.starter_price) setStarterPrice(d.starter_price)
      if (d?.pro_price) setProPrice(d.pro_price)
      if (d?.admin_upi_id) setAdminUpiId(d.admin_upi_id)
      if (d?.platform_name) setPlatformName(d.platform_name)
      if (d?.starter_features?.length > 0) setStarterFeatures(d.starter_features)
      if (d?.pro_features?.length > 0) setProFeatures(d.pro_features)
    }).catch(() => {})
  }, [])

  const isActive = user?.subscription_status === 'active'
  const subscription = user?.subscription
  const pendingRequest = user?.pending_request
  
  const planName = subscription?.plan_name || 'free'
  const endDate = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'
  
  const displayPlanName = planName === 'free' ? 'Free Trial' : planName === 'starter' ? 'Starter Plan' : 'Pro Plan'
  const displayPrice = planName === 'free' ? '₹0/month' : planName === 'starter' ? `₹${starterPrice}/month` : `₹${proPrice}/month`

  const upcoming = user?.upcoming_subscription
  const hasUpcoming = upcoming && upcoming.plan_name
  const upcomingPlanName = hasUpcoming ? (upcoming.plan_name === 'starter' ? 'Starter Plan' : 'Pro Plan') : null

  const isPending = !!pendingRequest
  const [confirming, setConfirming] = useState(false)

  // 1. Instant Automated Verification & Activation
  const handleConfirmPaid = async () => {
    if (!upiSession?.session_id || confirming) return
    setConfirming(true)
    try {
      const res = await ownerAPI.simulateSubscriptionWebhook({
        session_id: upiSession.session_id,
        transaction_id: `AUTO_UPI_${Date.now()}`,
        status: 'SUCCESS',
        amount: upiSession.amount
      })
      if (res.data?.success) {
        handleSubscriptionSuccess({ plan_name: upiSession.plan_name })
      } else {
        toast.error(res.data?.message || 'Verification failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to auto-activate subscription')
    } finally {
      setConfirming(false)
    }
  }

  // 1. Initiate Automated Real-Time UPI Session
  const handleStartUpgrade = async (targetPlan) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Subscription upgrades are disabled.', { style: { background: '#fff', color: '#000', fontWeight: 'bold' } })
      return
    }

    setLoading(true)
    setSelectedPlan(targetPlan)
    setLastAttemptedPlan(targetPlan)
    isConfirmedRef.current = false

    try {
      const res = await ownerAPI.initiateSubscriptionSession({ plan_name: targetPlan })
      if (res.data?.success) {
        setUpiSession(res.data.data)
        setShowUpgradeModal(true)
        setPaymentIncomplete(false)
      } else {
        toast.error(res.data?.message || 'Failed to initiate payment session')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate UPI upgrade')
    } finally {
      setLoading(false)
    }
  }

  // 2. Handle Confirmed Subscription Payment (Auto Real-Time Detection)
  const handleSubscriptionSuccess = async (data) => {
    if (isConfirmedRef.current) return
    isConfirmedRef.current = true

    toast.success(`🎉 Payment Detected! Your ${data?.plan_name === 'pro' ? 'Pro Plan' : 'Starter Plan'} is now ACTIVE!`, {
      duration: 5000,
      icon: '⚡'
    })

    setShowUpgradeModal(false)
    setUpiSession(null)
    setPaymentIncomplete(false)

    // Refresh context and reload data seamlessly
    if (refreshUser) {
      await refreshUser()
    }
  }

  // 3. Socket & Resilient Polling Listener inside active UPI Modal
  useEffect(() => {
    if (!showUpgradeModal || !upiSession?.session_id) return

    const socket = io(SOCKET_URL)
    socket.emit('join-payment-session', upiSession.session_id)

    // Real-time server webhook event
    socket.on('subscription-activated', (data) => {
      handleSubscriptionSuccess(data)
    })

    socket.on('subscription-failed', (data) => {
      toast.error(data?.message || 'Subscription payment was not completed')
      handleCloseModal(true)
    })

    // Resilient Polling Fallback (every 2.5 seconds)
    const pollInterval = setInterval(async () => {
      if (isConfirmedRef.current) return
      try {
        const res = await ownerAPI.checkSubscriptionStatus(upiSession.session_id)
        const status = res.data?.data?.status
        if (status === 'approved') {
          handleSubscriptionSuccess(res.data.data)
        }
      } catch (err) {
        // Silently retry next tick
      }
    }, 2500)

    return () => {
      socket.disconnect()
      clearInterval(pollInterval)
    }
  }, [showUpgradeModal, upiSession])

  // 4. Open native UPI App on Mobile
  const handleOpenUpiApp = () => {
    if (!upiSession?.upi_url) return

    if (!isMobile) {
      toast('💡 UPI apps are on mobile phones. Please scan the dynamic QR code with your phone camera or payment app!', {
        icon: '📲',
        duration: 4500
      })
      return
    }

    window.location.href = upiSession.upi_url
  }

  // 5. Handle Modal Dismissal / Abort
  const handleCloseModal = async (wasFailed = false) => {
    if (upiSession?.session_id && !isConfirmedRef.current) {
      ownerAPI.cancelSubscriptionSession(upiSession.session_id).catch(() => {})
    }
    setShowUpgradeModal(false)
    setPaymentIncomplete(true)
    if (!wasFailed) {
      toast('Upgrade payment pending. You can retry or complete it anytime!', { icon: 'ℹ️' })
    }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff', maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── CSS Keyframe for Pulse Radar Animation ── */}
      <style>{`
        @keyframes pulse-radar {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(24px,4vw,32px)', fontWeight: 900, margin: '0 0 8px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Subscription & Billing
        </h1>
        <p style={{ fontSize: 15, color: '#9ca3af', margin: 0 }}>
          Automated real-time zero-fee UPI upgrades for instant activation.
        </p>
      </div>

      {/* ── Payment Incomplete / Repay Banner ── */}
      {paymentIncomplete && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(220,38,38,0.2))',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>
                Payment Incomplete
              </div>
              <div style={{ fontSize: 13, color: '#f87171' }}>
                Your {lastAttemptedPlan === 'pro' ? 'Pro Plan' : 'Starter Plan'} upgrade was not completed.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleStartUpgrade(lastAttemptedPlan)}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
            }}
          >
            🔄 Repay / Retry Upgrade
          </button>
        </div>
      )}

      {/* ── Approval Pending Banner (Legacy Fallback) ── */}
      {isPending && (
        <div style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.1), rgba(217,119,6,0.15))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(245,158,11,0.2)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>⏳</div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', margin: '0 0 4px' }}>Approval Pending</h3>
            <p style={{ fontSize: 14, color: '#d97706', margin: 0 }}>Your request to upgrade to the <strong>{pendingRequest.plan_name === 'pro' ? 'Pro Plan' : 'Starter Plan'}</strong> is currently under review by Admin. Your plan will activate once verified.</p>
          </div>
        </div>
      )}

      {/* ── Current Plan & Upcoming Plan Container ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
        
        {/* ── Current Plan Card ── */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)', 
          border: '1px solid rgba(255,255,255,0.08)', 
          borderRadius: 24, 
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
          flex: '1 1 300px'
        }}>
          <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif", textTransform: 'capitalize' }}>{displayPlanName}</h2>
                <span style={{ 
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                  background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: isActive ? '#34d399' : '#f87171',
                  border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
                }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ fontSize: 15, color: '#cbd5e1', margin: '0 0 8px' }}>Billing period ends on <strong>{endDate}</strong>.</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Renews at {displayPrice} with 0% platform transaction fees.</p>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={() => handleStartUpgrade(planName === 'starter' ? 'pro' : 'starter')}
                disabled={loading}
                style={{ 
                  padding: '12px 24px', borderRadius: 12, border: 'none', 
                  background: 'linear-gradient(135deg, #06b6d4, #4f46e5)', color: '#fff', 
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(6,182,212,0.3)',
                  transition: 'transform 0.2s',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {loading ? '⚡ Initializing...' : '⚡ Upgrade Plan'}
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Plan Card */}
        {hasUpcoming && (
          <div style={{ 
            background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)', 
            border: '1px dashed rgba(79, 70, 229, 0.4)', 
            borderRadius: 24, 
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            flex: '1 1 300px'
          }}>
            <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif", textTransform: 'capitalize' }}>{upcomingPlanName}</h2>
                <span style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#a5b4fc', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>UPCOMING</span>
              </div>
              <div>
                <p style={{ fontSize: 15, color: '#cbd5e1', margin: '0 0 8px' }}>Automatically starts on <strong>{endDate}</strong>.</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Your plan is securely queued and will activate without any downtime.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pricing Table ── */}
      <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>Available SaaS Plans</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        
        {/* Starter Plan */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: '#9ca3af' }}>Starter</h4>
          <div style={{ fontSize: 36, fontWeight: 800, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>₹{starterPrice}<span style={{ fontSize: 16, color: '#6b7280', fontWeight: 500 }}>/mo</span></div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {starterFeatures.map((feature, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#d1d5db' }}>
                <span style={{ color: '#10b981' }}>✓</span> {feature}
              </li>
            ))}
          </ul>
          {planName === 'starter' ? (
            <button style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600 }}>Current Plan</button>
          ) : (
             <button
              onClick={() => handleStartUpgrade('starter')}
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Select Starter
            </button>
          )}
        </div>

        {/* Pro Plan */}
        <div style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.1) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #06b6d4, #4f46e5)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Most Popular</div>
          <h4 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: '#06b6d4' }}>Pro</h4>
          <div style={{ fontSize: 36, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>₹{proPrice}<span style={{ fontSize: 16, color: '#6b7280', fontWeight: 500 }}>/mo</span></div>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 24px' }}>All features included.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {proFeatures.map((feature, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#fff' }}>
                <span style={{ color: '#06b6d4' }}>✓</span> {feature}
              </li>
            ))}
          </ul>
          {planName === 'pro' ? (
            <button style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#06b6d4', color: '#080c14', fontSize: 14, fontWeight: 700, cursor: 'not-allowed' }} disabled>Current Plan</button>
          ) : (
            <button
              onClick={() => handleStartUpgrade('pro')}
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#06b6d4', color: '#080c14', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Upgrade to Pro
            </button>
          )}
        </div>

      </div>

      {/* ── Automated Real-Time Direct NPCI UPI Upgrade Modal ── */}
      {showUpgradeModal && upiSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#111827', width: '100%', maxWidth: 440, borderRadius: 24, padding: 28, border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', position: 'relative', textAlign: 'center' }}>
            <button
              onClick={() => handleCloseModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}
            >
              ✕
            </button>
            
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>
              Upgrade to {upiSession.plan_display}
            </h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>
              Direct UPI transfer to Superadmin (0% platform fees)
            </p>

            {/* Dynamic Real-Time UPI QR Code */}
            <div style={{ background: '#fff', padding: 14, borderRadius: 16, display: 'inline-block', marginBottom: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
              <QRCode value={upiSession.upi_url} size={165} />
            </div>

            <p style={{ fontSize: 28, fontWeight: 900, color: '#06b6d4', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>
              ₹{Number(upiSession.amount).toFixed(2)}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>
              Admin UPI: <strong>{upiSession.admin_upi_id}</strong>
            </p>

            {/* Live Pulsing Real-Time Radar Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '10px 16px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 20,
              marginBottom: 16
            }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse-radar 1.5s infinite',
                display: 'inline-block'
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                ⚡ Awaiting UPI Payment Confirmation...
              </span>
            </div>

            {/* One-Tap Mobile Pay Button */}
            <button
              type="button"
              onClick={handleOpenUpiApp}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #4f46e5)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(6,182,212,0.3)'
              }}
            >
              <span>📲</span> Open UPI App (GPay / PhonePe / Paytm)
            </button>

            {/* Instant Automated Verification & Activation Button */}
            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirmPaid}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: confirming ? 'not-allowed' : 'pointer',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                opacity: confirming ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {confirming ? (
                <>
                  <span>⏳</span> Verifying & Activating...
                </>
              ) : (
                <>
                  <span>✅</span> I Have Paid ₹{Number(upiSession.amount).toFixed(2)} — Activate Plan
                </>
              )}
            </button>

            {/* Explanatory Note */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 12,
              color: '#9ca3af',
              lineHeight: 1.5,
              marginBottom: 10
            }}>
              ✨ <strong>100% Automated Detection</strong>: Scan QR or tap above to pay. Your plan will activate instantly without manual UTR submission!
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(upiSession.admin_upi_id)
                toast.success('Admin UPI ID copied!')
              }}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}
            >
              Copy UPI ID to clipboard
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerSubscription
