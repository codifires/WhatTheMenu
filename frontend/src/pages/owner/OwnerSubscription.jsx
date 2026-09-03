import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ownerAPI, publicAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { io } from 'socket.io-client'

const OwnerSubscription = () => {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [paymentIncomplete, setPaymentIncomplete] = useState(false)
  const [lastAttemptedPlan, setLastAttemptedPlan] = useState('pro')
  
  const [basicPrice, setBasicPrice] = useState(199)
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const [yearlyDiscountPercentage, setYearlyDiscountPercentage] = useState(20)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [adminUpiId, setAdminUpiId] = useState('superadmin@okaxis')
  const [platformName, setPlatformName] = useState('QRMenu SaaS')
  const [basicFeatures, setBasicFeatures] = useState([
    'Digital QR Menu',
    'Basic Analytics',
    'Up to 10 Menu Items'
  ])
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

  const fetchSettings = () => {
    publicAPI.getSettings().then(res => {
      const d = res.data?.data
      if (d?.basic_price) setBasicPrice(d.basic_price)
        if (d?.starter_price) setStarterPrice(d.starter_price)
      if (d?.pro_price) setProPrice(d.pro_price)
      if (d?.yearly_discount_percentage) setYearlyDiscountPercentage(d.yearly_discount_percentage)
      if (d?.admin_upi_id) setAdminUpiId(d.admin_upi_id)
      if (d?.platform_name) setPlatformName(d.platform_name)
      if (d?.basic_features?.length > 0) setBasicFeatures(d.basic_features)
        if (d?.starter_features?.length > 0) setStarterFeatures(d.starter_features)
      if (d?.pro_features?.length > 0) setProFeatures(d.pro_features)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const isActive = user?.subscription_status === 'active'
  const subscription = user?.subscription
  const pendingRequest = user?.pending_request
  
  const planName = subscription?.plan_name || 'free'
  const endDate = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'
  
  const displayPlanName = planName === 'free' ? 'Free Trial' : planName === 'basic' ? 'Basic Plan' : planName === 'starter' ? 'Starter Plan' : 'Pro Plan'
  const isCurrentPlanYearly = subscription?.billing_cycle === 'yearly'
  const basicPriceYearly = Math.round(basicPrice * 12 * (1 - yearlyDiscountPercentage / 100))
  const starterPriceYearly = Math.round(starterPrice * 12 * (1 - yearlyDiscountPercentage / 100))
  const proPriceYearly = Math.round(proPrice * 12 * (1 - yearlyDiscountPercentage / 100))
  const currentPrice = planName === 'free' ? 0 : planName === 'basic' ? (isCurrentPlanYearly ? basicPriceYearly : basicPrice) : planName === 'starter' ? (isCurrentPlanYearly ? starterPriceYearly : starterPrice) : (isCurrentPlanYearly ? proPriceYearly : proPrice)
  const displayPrice = planName === 'free' ? '₹0/month' : `₹${currentPrice}/${isCurrentPlanYearly ? 'year' : 'month'}`

  const upcoming = user?.upcoming_subscription
  const hasUpcoming = upcoming && upcoming.plan_name
  const upcomingPlanName = hasUpcoming ? (upcoming.plan_name === 'starter' ? 'Starter Plan' : 'Pro Plan') : null

  const isPending = !!pendingRequest
  // 1. Handle Confirmed Subscription Payment
  const handleSubscriptionSuccess = async (data) => {
    if (isConfirmedRef.current) return
    isConfirmedRef.current = true

    toast.success(`🎉 Payment Successful! Your ${data?.plan_name === 'pro' ? 'Pro Plan' : 'Starter Plan'} is now ACTIVE!`, {
      duration: 5000,
      icon: '⚡'
    })

    setPaymentIncomplete(false)

    // Refresh context and reload data seamlessly
    if (refreshUser) {
      await refreshUser()
    }
  }

  // 2. Initiate Razorpay Checkout for Subscription
  const handleStartUpgrade = async (targetPlan) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Subscription upgrades are disabled.', { style: { background: '#3b82f6', color: '#fff', fontWeight: 'bold' } })
      return
    }

    setLoading(true)
    setLastAttemptedPlan(targetPlan)
    isConfirmedRef.current = false

    try {
      const res = await ownerAPI.createRazorpaySubscription({ plan_name: targetPlan, billing_cycle: billingCycle })
      
      if (res.data?.success) {
        const { subscription_id, razorpay_key_id, plan_name } = res.data.data
        
        const options = {
          key: razorpay_key_id,
          subscription_id: subscription_id,
          name: platformName,
          description: `Upgrade to ${plan_name === 'pro' ? 'Pro' : 'Starter'} Plan`,
          image: '/logo.png', // Or platform logo
          handler: async function (response) {
            try {
              const verifyRes = await ownerAPI.verifyRazorpaySubscription({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              })
              
              if (verifyRes.data?.success) {
                handleSubscriptionSuccess({ plan_name })
              } else {
                toast.error('Payment verification failed.')
              }
            } catch (err) {
              toast.error(err.response?.data?.message || 'Payment verification failed.')
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone
          },
          theme: {
            color: '#06b6d4'
          },
          modal: {
            ondismiss: function() {
              setPaymentIncomplete(true)
              toast('Upgrade payment pending. You can retry anytime!', { icon: 'ℹ️' })
            }
          }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          toast.error(response.error.description || 'Payment failed.')
        });
        rzp.open();
        
      } else {
        toast.error(res.data?.message || 'Failed to initiate payment session')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate Razorpay upgrade')
    } finally {
      setLoading(false)
    }
  }

  // 3. Socket Listener for Background Webhook Success (e.g., if user closes tab too early)
  useEffect(() => {
    if (!user?._id) return

    const socket = io(SOCKET_URL)
    // We can join a cafe-specific room since we are the owner
    socket.emit('join-payment-session', `cafe-${user._id}`) 

    // Real-time server webhook event from Razorpay webhook
    socket.on('subscription-activated', (data) => {
      handleSubscriptionSuccess(data)
    })

    socket.on('subscription-status-changed', (data) => {
       if (data.status === 'suspended') {
         toast.error('Subscription suspended due to payment failure.')
       }
    })

    socket.on('settings-updated', () => {
       fetchSettings()
    })

    return () => {
      socket.disconnect()
    }
  }, [user?._id])

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)', maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
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
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          Manage your subscription and billing details seamlessly with Razorpay.
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
              <div style={{ fontSize: 13, color: 'var(--danger-text)' }}>
                Your {lastAttemptedPlan === 'pro' ? 'Pro Plan' : 'Starter Plan'} upgrade was not completed.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleStartUpgrade(lastAttemptedPlan)}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'var(--text-primary)',
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
          <div style={{ background: 'var(--warning-light)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>⏳</div>
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
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-medium)', 
          borderRadius: 24, 
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
          flex: '1 1 300px'
        }}>
          <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'var(--cyan-bg-light)', borderRadius: '50%' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif", textTransform: 'capitalize' }}>{displayPlanName}</h2>
                <span style={{ 
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                  background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: isActive ? 'var(--success-text)' : 'var(--danger-text)',
                  border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
                }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Billing period ends on <strong>{endDate}</strong>.</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>Renews at {displayPrice} with 0% platform transaction fees.</p>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={() => handleStartUpgrade(planName === 'starter' ? 'pro' : 'starter')}
                disabled={loading}
                style={{ 
                  padding: '12px 24px', borderRadius: 12, border: 'none', 
                  background: 'linear-gradient(135deg, #06b6d4, #4f46e5)', color: 'var(--text-primary)', 
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
            background: 'var(--bg-elevated)', 
            border: '1px dashed rgba(79, 70, 229, 0.4)', 
            borderRadius: 24, 
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            flex: '1 1 300px'
          }}>
            <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: 'var(--bg-card-hover)', borderRadius: '50%' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif", textTransform: 'capitalize' }}>{upcomingPlanName}</h2>
                <span style={{ background: 'var(--border-medium)', color: '#a5b4fc', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>UPCOMING</span>
              </div>
              <div>
                <p style={{ fontSize: 15, color: '#cbd5e1', margin: '0 0 8px' }}>Automatically starts on <strong>{endDate}</strong>.</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>Your plan is securely queued and will activate without any downtime.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pricing Table ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "'Outfit',sans-serif" }}>Available SaaS Plans</h3>
        
        {/* Toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--border-light)', borderRadius: 100, padding: 4 }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{ padding: '6px 16px', borderRadius: 100, border: 'none', background: billingCycle === 'monthly' ? '#7c3aed' : 'transparent', color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{ padding: '6px 16px', borderRadius: 100, border: 'none', background: billingCycle === 'yearly' ? '#7c3aed' : 'transparent', color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Yearly <span style={{ fontSize: 10, background: '#10b981', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: 50, fontWeight: 800 }}>-{yearlyDiscountPercentage}%</span>
          </button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        
        
          {/* Basic Plan */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: 'var(--text-secondary)' }}>Basic</h4>
            <div style={{ fontSize: 36, fontWeight: 800, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>
              ₹{billingCycle === 'yearly' ? basicPriceYearly : basicPrice}
              <span style={{ fontSize: 16, color: 'var(--text-tertiary)', fontWeight: 500 }}>/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {basicFeatures.map((feature, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#10b981' }}>✓</span> {feature}
                </li>
              ))}
            </ul>
            {planName === 'basic' ? (
              <button style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>Current Plan</button>
            ) : (
               <button
                onClick={() => handleStartUpgrade('basic')}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: planName === 'starter' || planName === 'pro' ? 'var(--border-hover)' : '#3b82f6',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s'
                }}
              >
                {planName === 'starter' || planName === 'pro' ? 'Downgrade to Basic' : 'Select Basic'}
              </button>
            )}
          </div>

          {/* Starter Plan */}
          <div style={{ background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -1, right: 24, transform: 'translateY(-50%)', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', background: 'linear-gradient(135deg,#10b981,#059669)' }}>Highly Recommended</div>
            <h4 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: '#10b981' }}>Starter</h4>
          <div style={{ fontSize: 36, fontWeight: 800, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>
            ₹{billingCycle === 'yearly' ? starterPriceYearly : starterPrice}
            <span style={{ fontSize: 16, color: 'var(--text-tertiary)', fontWeight: 500 }}>/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {starterFeatures.map((feature, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#10b981' }}>✓</span> {feature}
              </li>
            ))}
          </ul>
          {planName === 'starter' ? (
            <button style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>Current Plan</button>
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
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--purple-text)', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, right: 24, transform: 'translateY(-50%)', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>Most Popular</div>
          <h4 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: '#c4b5fd' }}>Pro</h4>
          <div style={{ fontSize: 36, fontWeight: 800, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>
            ₹{billingCycle === 'yearly' ? proPriceYearly : proPrice}
            <span style={{ fontSize: 16, color: 'var(--text-tertiary)', fontWeight: 500 }}>/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {proFeatures.map((feature, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
                <span style={{ color: '#06b6d4' }}>✓</span> {feature}
              </li>
            ))}
          </ul>
          {planName === 'pro' ? (
            <button style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#06b6d4', color: 'var(--bg-shell)', fontSize: 14, fontWeight: 700, cursor: 'not-allowed' }} disabled>Current Plan</button>
          ) : (
            <button
              onClick={() => handleStartUpgrade('pro')}
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#06b6d4', color: 'var(--bg-shell)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Upgrade to Pro
            </button>
          )}
        </div>

      </div>

    </div>
  )
}

export default OwnerSubscription
