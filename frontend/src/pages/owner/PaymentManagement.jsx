import { useState, useEffect, useMemo } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  IndianRupee, Clock, CheckCircle2, CreditCard, Banknote, 
  Copy, Check, Search, RefreshCw, ArrowUpRight, Filter, AlertCircle
} from 'lucide-react'

const FILTERS = [
  { id: 'all', label: 'All Payments' },
  { id: 'received', label: 'Received' },
  { id: 'pending', label: 'Pending' },
  { id: 'online', label: 'Online / Gateway' },
  { id: 'upi', label: 'Direct UPI' },
  { id: 'cash', label: 'Cash at Counter' },
]

const PaymentManagement = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedUTR, setCopiedUTR] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await ownerAPI.getOrders()
      const validOrders = res.data?.data?.filter(o => o.payment_status !== 'failed') || []
      setOrders(validOrders)
    } catch (error) {
      toast.error('Failed to fetch payment records')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUTR = (utr) => {
    if (!utr) return
    navigator.clipboard.writeText(utr)
    setCopiedUTR(utr)
    toast.success('UTR copied to clipboard!')
    setTimeout(() => setCopiedUTR(null), 2000)
  }

  const handleMarkPaymentReceived = async (orderId) => {
    setProcessingId(orderId)
    try {
      await ownerAPI.updateOrderStatus(orderId, { payment_status: 'received' })
      toast.success('Payment marked as received!')
      fetchOrders()
    } catch {
      toast.error('Failed to update payment status')
    } finally {
      setProcessingId(null)
    }
  }

  // Derived filter and stats
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Category Filter
      let matchesFilter = true
      if (filter === 'pending') matchesFilter = o.payment_status === 'pending'
      else if (filter === 'received') matchesFilter = o.payment_status === 'received' || o.payment_status === 'completed'
      else if (filter === 'upi') matchesFilter = o.payment_method === 'upi'
      else if (filter === 'cash') matchesFilter = o.payment_method === 'cash'
      else if (filter === 'online') matchesFilter = o.payment_method === 'online' || o.payment_method === 'razorpay'

      if (!matchesFilter) return false

      // 2. Search Filter
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        o.order_number?.toLowerCase().includes(q) ||
        String(o.daily_order_token).includes(q) ||
        String(o.table_number).toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.payment_utr?.toLowerCase().includes(q)
      )
    })
  }, [orders, filter, searchQuery])

  const stats = useMemo(() => {
    return orders.reduce((acc, order) => {
      const amount = Number(order.total_amount) || 0
      if (order.payment_status === 'received' || order.payment_status === 'completed') {
        acc.totalRevenue += amount
        acc.totalTransactions += 1
        if (order.payment_method === 'upi') acc.upiRevenue += amount
        if (order.payment_method === 'cash') acc.cashRevenue += amount
        if (order.payment_method === 'online' || order.payment_method === 'razorpay') acc.onlineRevenue += amount
      } else if (order.payment_status === 'pending') {
        acc.pendingRevenue += amount
        acc.pendingCount += 1
      }
      return acc
    }, { 
      totalRevenue: 0, 
      pendingRevenue: 0, 
      pendingCount: 0,
      upiRevenue: 0, 
      cashRevenue: 0, 
      onlineRevenue: 0, 
      totalTransactions: 0 
    })
  }, [orders])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Revenue Reconciliation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Payment Management & Ledger
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Reconcile payments across Razorpay online gateway, direct UPI QR scans, and cash collected at the counter.
          </p>
        </div>

        <button
          onClick={() => { setLoading(true); fetchOrders() }}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Payments</span>
        </button>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Settled Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-emerald-400">
            ₹{stats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {stats.totalTransactions} verified orders
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Collections</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-amber-400">
            ₹{stats.pendingRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {stats.pendingCount} unpaid tickets
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Online / UPI Total</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
            ₹{(stats.onlineRevenue + stats.upiRevenue).toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            ₹{stats.onlineRevenue.toLocaleString()} Gateway • ₹{stats.upiRevenue.toLocaleString()} Direct UPI
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash at Counter</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
            ₹{stats.cashRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Physical cash drawer total
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-medium)] p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search token, table, guest, or UTR..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Ledger Table ── */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] text-xs uppercase font-bold text-[var(--text-secondary)]">
                <th className="py-3.5 px-5">Order / Token</th>
                <th className="py-3.5 px-5">Guest & Table</th>
                <th className="py-3.5 px-5">Amount</th>
                <th className="py-3.5 px-5">Method</th>
                <th className="py-3.5 px-5">Transaction ID / UTR</th>
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-medium)]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[var(--text-secondary)]">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading payment transactions...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-[var(--text-secondary)]">
                    <AlertCircle className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                    <div className="font-bold text-[var(--text-primary)]">No payment records match this filter</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">Try switching to another tab or clearing search</div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isReceived = order.payment_status === 'received' || order.payment_status === 'completed'
                  const isCash = order.payment_method === 'cash'
                  const isUPI = order.payment_method === 'upi'

                  return (
                    <tr key={order._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-indigo-400 font-heading">
                          #{order.daily_order_token || order.order_number?.slice(-3)}
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)] block font-mono">
                          #{order.order_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-[var(--text-primary)]">
                          Table {order.table_number || 'Takeaway'}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {order.customer_name || 'Walk-in'}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-black font-heading text-base text-emerald-400">
                        ₹{order.total_amount}
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          isCash 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : isUPI 
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {isCash ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                          <span className="capitalize">{order.payment_method || 'Online'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        {order.payment_utr ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-medium)]">
                              {order.payment_utr}
                            </span>
                            <button
                              onClick={() => handleCopyUTR(order.payment_utr)}
                              title="Copy UTR number"
                              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            >
                              {copiedUTR === order.payment_utr ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-xs text-[var(--text-secondary)]">
                        {new Date(order.created_at).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          isReceived
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isReceived ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span className="capitalize">{isReceived ? 'Received' : 'Pending'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {!isReceived && (
                          <button
                            onClick={() => handleMarkPaymentReceived(order._id)}
                            disabled={processingId === order._id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PaymentManagement
