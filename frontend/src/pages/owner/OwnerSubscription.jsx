import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ownerAPI, publicAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { 
  Crown, Zap, Sparkles, Check, CheckCircle2, 
  CreditCard, ArrowRight, Clock, AlertTriangle, 
  RefreshCw, ShieldCheck, Calendar, IndianRupee, Gift
} from 'lucide-react'

const OwnerSubscription = () => {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [paymentIncomplete, setPaymentIncomplete] = useState(false)
  const [lastAttemptedPlan, setLastAttemptedPlan] = useState('pro_plus')
  
  const [basicPrice, setBasicPrice] = useState(199)
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const [yearlyDiscountPercentage, setYearlyDiscountPercentage] = useState(20)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [adminUpiId, setAdminUpiId] = useState('superadmin@okaxis')
  const [platformName, setPlatformName] = useState('WhatTheMenu SaaS')
  const [basicFeatures, setBasicFeatures] = useState([
    'Digital QR Menu',
    'Basic Analytics',
    'Up to 15 Menu Items',
    'Standard Support'
  ])
  const [starterFeatures, setStarterFeatures] = useState([
    'Digital QR Menu & Tables',
    'Real-time Order KDS',
    'Detailed Sales Analytics',
    'Sound Chime Alerts'
  ])
  const [proFeatures, setProFeatures] = useState([
    'Everything in Starter',
    'Advanced Analytics & Reports',
    'Priority 24/7 Phone Support',
    'Custom Branding & Standees',
    'Unlimited Products & Tables'
  ])

  const isConfirmedRef = useRef(false)

  const fetchSettings = () => {
    publicAPI.getSettings().then(res => {
      const d = res.data?.data || {}
      if (d.basic_price) setBasicPrice(d.basic_price)
      if (d.starter_price) setStarterPrice(d.starter_price)
      if (d.pro_price) setProPrice(d.pro_price)
      if (d.yearly_discount_percentage) setYearlyDiscountPercentage(d.yearly_discount_percentage)
      if (d.admin_upi_id) setAdminUpiId(d.admin_upi_id)
      if (d.platform_name) setPlatformName(d.platform_name)
      if (d.basic_features?.length > 0) setBasicFeatures(d.basic_features)
      if (d.starter_features?.length > 0) setStarterFeatures(d.starter_features)
      if (d.pro_features?.length > 0) setProFeatures(d.pro_features)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const isActive = user?.subscription_status === 'active'
  const subscription = user?.subscription
  const pendingRequest = user?.pending_request
  
  const planName = subscription?.plan_name || 'starter'
  const endDate = subscription?.end_date 
    ? new Date(subscription.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
    : 'No expiry (Trial)'
  
  const displayPlanName = planName === 'starter' ? 'Free Trial / Starter' : planName === 'pro' ? 'Starter Plan' : 'Pro Plus Plan'
  const isCurrentPlanYearly = subscription?.billing_cycle === 'yearly'
  
  const basicPriceYearly = Math.round(basicPrice * 12 * (1 - yearlyDiscountPercentage / 100))
  const starterPriceYearly = Math.round(starterPrice * 12 * (1 - yearlyDiscountPercentage / 100))
  const proPriceYearly = Math.round(proPrice * 12 * (1 - yearlyDiscountPercentage / 100))
  
  const currentPrice = planName === 'starter' ? 0 : planName === 'pro' ? (isCurrentPlanYearly ? starterPriceYearly : starterPrice) : (isCurrentPlanYearly ? proPriceYearly : proPrice)
  const displayPrice = planName === 'starter' ? '₹0/month' : `₹${currentPrice}/${isCurrentPlanYearly ? 'year' : 'month'}`

  const upcoming = user?.upcoming_subscription
  const hasUpcoming = upcoming && upcoming.plan_name
  const upcomingPlanName = hasUpcoming ? (upcoming.plan_name === 'pro' ? 'Starter Plan' : 'Pro Plus Plan') : null

  const isPending = !!pendingRequest

  const handleSubscriptionSuccess = async (data) => {
    if (isConfirmedRef.current) return
    isConfirmedRef.current = true

    toast.success(`🎉 Payment Confirmed! Your ${data?.plan_name === 'pro_plus' ? 'Pro Plus Plan' : 'Pro Plan'} is now ACTIVE!`, {
      duration: 5000,
      icon: '⚡'
    })

    setPaymentIncomplete(false)

    if (refreshUser) {
      await refreshUser()
    }
  }

  const handleStartUpgrade = async (targetPlan) => {
    if (user?.email === 'cafe@demo.com') {
      toast.error('⚠️ Demo Template: Subscription payment is simulated.')
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
          description: `Upgrade to ${plan_name === 'pro_plus' ? 'Pro Plus' : 'Starter'} Plan`,
          image: '/logo.png',
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
            color: '#6366f1'
          },
          modal: {
            ondismiss: function() {
              setPaymentIncomplete(true)
              toast('Upgrade window closed. You can retry whenever ready.', { icon: 'ℹ️' })
            }
          }
        }
        
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function (response) {
          toast.error(response.error.description || 'Payment failed.')
        })
        rzp.open()
      } else {
        toast.error(res.data?.message || 'Failed to initiate payment session')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate Razorpay upgrade')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?._id) return

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, { auth: { token } })
    socket.emit('join-payment-session', `cafe-${user._id}`) 

    socket.on('subscription-activated', (data) => {
      handleSubscriptionSuccess(data)
    })

    socket.on('subscription-status-changed', (data) => {
      if (data.status === 'suspended') {
        toast.error('Subscription suspended due to payment status change.')
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
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Crown className="w-3.5 h-3.5" />
            <span>SaaS Membership</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Subscription & Billing Plans
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Choose the right tier for your restaurant. Upgrade or switch billing cycles anytime with Razorpay.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Rates</span>
        </button>
      </div>

      {/* ── Incomplete Payment Alert ── */}
      {paymentIncomplete && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <strong className="block font-semibold">Payment Incomplete</strong>
              <span className="text-xs text-rose-300">
                Your previous plan upgrade was cancelled or interrupted. You can resume checkout safely.
              </span>
            </div>
          </div>
          <button
            onClick={() => handleStartUpgrade(lastAttemptedPlan)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Upgrade</span>
          </button>
        </div>
      )}

      {/* ── Pending Admin Review Alert ── */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-sm text-amber-300">
          <Clock className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <strong className="block font-semibold">Upgrade Under Review</strong>
            <span className="text-xs">
              Your offline request for the {pendingRequest.plan_name === 'pro_plus' ? 'Pro Plus Plan' : 'Starter Plan'} is pending administrator confirmation.
            </span>
          </div>
        </div>
      )}

      {/* ── Current Plan Overview Card ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[var(--bg-card)] to-[var(--bg-card)] border border-indigo-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block">
                    Current Active Plan
                  </span>
                  <h2 className="text-2xl font-black font-heading text-[var(--text-primary)]">
                    {displayPlanName}
                  </h2>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                isActive 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {isActive ? '● Active' : '● Expired'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-xs">
              <div>
                <span className="text-[var(--text-tertiary)] block mb-1">Billing Period Expiry</span>
                <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  {endDate}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] block mb-1">Renewal Rate</span>
                <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  {displayPrice} (0% platform commissions)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border-medium)]">
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full SSL encryption & automated invoice generation</span>
            </div>

            <button
              onClick={() => handleStartUpgrade(planName === 'pro_plus' ? 'pro' : 'pro_plus')}
              disabled={loading}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{planName === 'pro_plus' ? 'Manage Pro Plus' : 'Upgrade to Pro Plus'}</span>
            </button>
          </div>
        </div>

        {/* Next Queued Renewal or Perks Card */}
        <div className="md:col-span-4 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base font-heading mb-1 text-[var(--text-primary)]">
              {hasUpcoming ? 'Queued Subscription' : 'Owner Member Perks'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              {hasUpcoming
                ? `Your upcoming switch to ${upcomingPlanName} starts smoothly on ${endDate} without menu interruption.`
                : 'All plans include zero hidden commission fees, instant WhatsApp customer alerts, and limitless QR downloads.'}
            </p>
          </div>

          <div className="space-y-2 border-t border-[var(--border-medium)] pt-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Direct Customer UPI to your bank</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Instant sound chime notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Unlimited Table QR standee prints</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Plans Section ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black font-heading tracking-tight text-[var(--text-primary)]">
              Available Subscription Tiers
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Save up to {yearlyDiscountPercentage}% by paying annually
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] self-start sm:self-auto">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Yearly</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
                -{yearlyDiscountPercentage}%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Starter */}
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] flex flex-col justify-between hover:border-[var(--border-hover)] transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center mb-4">
                <Gift className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)] mb-1">
                Starter Tier
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Best for small kiosks and pilot setups
              </p>

              <div className="mb-6">
                <span className="text-3xl font-black font-heading text-[var(--text-primary)]">
                  ₹{billingCycle === 'yearly' ? basicPriceYearly : basicPrice}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] font-medium ml-1">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {basicFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartUpgrade('starter')}
              disabled={loading || planName === 'starter'}
              className="w-full py-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-bold text-[var(--text-primary)] disabled:opacity-50 transition-colors"
            >
              {planName === 'starter' ? 'Current Plan' : 'Select Starter'}
            </button>
          </div>

          {/* Plan 2: Pro (Recommended) */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/20 to-[var(--bg-card)] border-2 border-indigo-500/40 relative flex flex-col justify-between shadow-lg shadow-indigo-500/10">
            <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              Recommended
            </span>

            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)] mb-1">
                Pro Standard
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                For busy cafés managing high table volume
              </p>

              <div className="mb-6">
                <span className="text-3xl font-black font-heading text-indigo-400">
                  ₹{billingCycle === 'yearly' ? starterPriceYearly : starterPrice}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] font-medium ml-1">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {starterFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartUpgrade('pro')}
              disabled={loading || planName === 'pro'}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{planName === 'pro' ? 'Current Active Plan' : 'Upgrade to Pro'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Plan 3: Pro Plus */}
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] flex flex-col justify-between hover:border-[var(--border-hover)] transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Crown className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[var(--text-primary)] mb-1">
                Pro Plus Ultra
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Enterprise dining, multiple floors & priority SLAs
              </p>

              <div className="mb-6">
                <span className="text-3xl font-black font-heading text-amber-400">
                  ₹{billingCycle === 'yearly' ? proPriceYearly : proPrice}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] font-medium ml-1">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {proFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartUpgrade('pro_plus')}
              disabled={loading || planName === 'pro_plus'}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{planName === 'pro_plus' ? 'Current Active Plan' : 'Upgrade to Pro Plus'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerSubscription
