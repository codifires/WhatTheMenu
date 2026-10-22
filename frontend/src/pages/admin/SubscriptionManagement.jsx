import { useState, useEffect } from 'react'
import { adminAPI, publicAPI, SOCKET_URL } from '../../services/api'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { 
  Crown, Zap, Gift, IndianRupee, Calendar, Check, 
  X, Clock, History, AlertTriangle, CheckCircle2, 
  ExternalLink, Search, RefreshCw, Copy
} from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [basicPrice, setBasicPrice] = useState(199)
  const [starterPrice, setStarterPrice] = useState(299)
  const [proPrice, setProPrice] = useState(499)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyCafeName, setHistoryCafeName] = useState('')
  const [copiedUTR, setCopiedUTR] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { 
    fetchSubscriptions() 
    fetchRequests()
    fetchPrices()

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, { auth: { token } })
    socket.emit('join-admin')

    socket.on('new-subscription-revenue', (data) => {
      toast.success(`⚡ New Subscription Payment: ${data.cafe_name} upgraded to ${data.plan_name?.toUpperCase()} (₹${data.amount})!`, {
        icon: '💰',
        duration: 5000
      })
      fetchSubscriptions()
      fetchRequests()
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const fetchPrices = async () => {
    try {
      const res = await publicAPI.getSettings()
      const d = res.data?.data || {}
      if (d.basic_price) setBasicPrice(d.basic_price)
      if (d.starter_price) setStarterPrice(d.starter_price)
      if (d.pro_price) setProPrice(d.pro_price)
    } catch (err) {}
  }

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getSubscriptions()
      setSubscriptions(res.data?.data || [])
    } catch {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await adminAPI.getSubscriptionRequests()
      setRequests(res.data?.data?.filter(r => r.status === 'pending') || [])
    } catch (err) {}
  }

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveSubscriptionRequest(id)
      toast.success('Subscription verified & activated!')
      fetchRequests()
      fetchSubscriptions()
    } catch {
      toast.error('Failed to approve request')
    }
  }

  const handleReject = async (id) => {
    try {
      await adminAPI.rejectSubscriptionRequest(id)
      toast.success('Request rejected')
      fetchRequests()
    } catch {
      toast.error('Failed to reject request')
    }
  }

  const fetchHistory = async (cafeId, cafeName) => {
    if (!cafeId) {
      toast.error('Cannot fetch history: Café details missing or deleted')
      return
    }
    try {
      const res = await adminAPI.getSubscriptionHistory(cafeId)
      setHistoryData(res.data?.data || [])
      setHistoryCafeName(cafeName)
      setHistoryModalOpen(true)
    } catch {
      toast.error('Failed to load history')
    }
  }

  const handleCopyUTR = (utr) => {
    navigator.clipboard.writeText(utr)
    setCopiedUTR(utr)
    toast.success('UTR copied to clipboard!')
    setTimeout(() => setCopiedUTR(null), 2000)
  }

  const filteredSubscriptions = subscriptions.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.cafe_id?.name?.toLowerCase().includes(q) ||
      s.plan_name?.toLowerCase().includes(q) ||
      s._id?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Crown className="w-3.5 h-3.5" />
            <span>SaaS Monetization</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Subscription Plan Management
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Monitor active restaurant subscriptions, review automated Razorpay transactions, and view tenant billing history.
          </p>
        </div>

        <button
          onClick={() => { fetchSubscriptions(); fetchRequests() }}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* ── Pricing Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Starter Tier</h3>
              <p className="text-xs text-[var(--text-secondary)]">Kiosk pilot & trial</p>
            </div>
          </div>
          <div>
            <span className="text-3xl font-black font-heading text-[var(--text-primary)]">
              ₹{basicPrice}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] ml-1">/month</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Pro Standard</h3>
              <p className="text-xs text-[var(--text-secondary)]">Most common subscription</p>
            </div>
          </div>
          <div>
            <span className="text-3xl font-black font-heading text-indigo-400">
              ₹{starterPrice}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] ml-1">/month</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Pro Plus Ultra</h3>
              <p className="text-xs text-[var(--text-secondary)]">Enterprise high-volume</p>
            </div>
          </div>
          <div>
            <span className="text-3xl font-black font-heading text-amber-400">
              ₹{proPrice}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] ml-1">/month</span>
          </div>
        </div>
      </div>

      {/* ── Pending Offline Verification Requests (Legacy / Deprecated Flow) ── */}
      {requests.length > 0 && (
        <div className="rounded-3xl bg-amber-500/5 border border-amber-500/30 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10">
            <div className="flex items-start sm:items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-sm font-heading text-amber-300">
                    Legacy Offline Verification Requests ({requests.length})
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Deprecated Fallback
                  </span>
                </div>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  Automated owner subscriptions now process directly via Razorpay. This queue only manages historical or manual offline fallback submissions.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-amber-500/20 uppercase font-bold text-amber-400/80 bg-amber-500/5">
                  <th className="py-3 px-5">Café Details</th>
                  <th className="py-3 px-5">Plan</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">UTR / Reference</th>
                  <th className="py-3 px-5">Submitted Date</th>
                  <th className="py-3 px-5 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {requests.map(req => (
                  <tr key={req._id} className="hover:bg-amber-500/10 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[var(--text-primary)]">
                      {req.cafe_id?.name || 'Partner Café'}
                    </td>
                    <td className="py-3.5 px-5 font-bold uppercase text-indigo-400">
                      {req.plan_name}
                    </td>
                    <td className="py-3.5 px-5 font-black text-emerald-400">
                      ₹{req.amount}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="inline-flex items-center gap-1.5 font-mono bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-medium)]">
                        <span>{req.utr_number}</span>
                        <button
                          onClick={() => handleCopyUTR(req.utr_number)}
                          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          {copiedUTR === req.utr_number ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-[var(--text-secondary)]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReject(req._id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-semibold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(req._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
                        >
                          Approve & Activate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Subscriptions Table ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h2 className="font-bold text-lg font-heading text-[var(--text-primary)]">
            Active & Expired Tenant Subscriptions
          </h2>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by café or plan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] uppercase font-bold text-[var(--text-tertiary)]">
                  <th className="py-4 px-5">Café Brand</th>
                  <th className="py-4 px-5">Plan Tier</th>
                  <th className="py-4 px-5">Renewal Price</th>
                  <th className="py-4 px-5">Cycle Window</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-medium)]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-[var(--text-secondary)]">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading subscription ledger...</span>
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-[var(--text-tertiary)]">
                      <Crown className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <div className="font-bold text-sm text-[var(--text-primary)]">No Subscriptions Found</div>
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map(sub => {
                    const statusClass = STATUS_COLORS[sub.status] || STATUS_COLORS.pending
                    const isPro = sub.plan_name === 'pro_plus'
                    return (
                      <tr key={sub._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-sm text-[var(--text-primary)]">
                            {sub.cafe_id?.name || 'Unknown Café'}
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)] font-mono">
                            ID: {sub._id?.slice(-8)}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${
                            isPro ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {isPro ? <Crown className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                            <span>{sub.plan_name}</span>
                          </span>
                        </td>

                        <td className="py-4 px-5 font-bold font-heading text-sm text-[var(--text-primary)]">
                          ₹{sub.price}
                        </td>

                        <td className="py-4 px-5 text-[var(--text-secondary)]">
                          {sub.start_date && sub.end_date ? (
                            <>
                              <div>{new Date(sub.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(sub.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </>
                          ) : 'No expiration'}
                        </td>

                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusClass}`}>
                            {sub.status}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => fetchHistory(sub.cafe_id?._id, sub.cafe_id?.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Audit Log</span>
                          </button>
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

      {/* ── History Modal ── */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-medium)] mb-5">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Subscription History • {historyCafeName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Timeline of previous renewals and transactions
                </p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {historyData.length > 0 ? (
                historyData.map((h, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[var(--text-primary)] uppercase">
                        {h.plan_name} Plan
                      </div>
                      <div className="text-[var(--text-tertiary)]">
                        {new Date(h.created_at || h.start_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400">₹{h.price}</div>
                      <div className="capitalize text-[var(--text-secondary)]">{h.status}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                  No previous renewal records found for this account.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
