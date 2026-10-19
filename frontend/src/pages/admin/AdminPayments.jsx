import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  CreditCard, Calendar, IndianRupee, RefreshCw, 
  Search, Copy, Check, ChevronLeft, ChevronRight, CheckCircle2 
} from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    fetchPayments(page)
  }, [page])

  const fetchPayments = async (p) => {
    setLoading(true)
    try {
      const res = await adminAPI.getAllPayments({ page: p, limit: 15 })
      setPayments(res.data?.data || [])
      setTotalPages(res.data?.pagination?.pages || 1)
    } catch {
      toast.error('Failed to load subscription payments')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (txt) => {
    if (!txt) return
    navigator.clipboard.writeText(txt)
    setCopiedId(txt)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Platform Billing Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Subscription Payments & Receipts
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Complete transaction record of all café subscription payments processed through Razorpay.
          </p>
        </div>

        <button
          onClick={() => fetchPayments(page)}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] uppercase font-bold text-[var(--text-tertiary)]">
                <th className="py-4 px-5">Café Partner</th>
                <th className="py-4 px-5">Subscription Plan</th>
                <th className="py-4 px-5">Amount Billed</th>
                <th className="py-4 px-5">Date & Time</th>
                <th className="py-4 px-5">Razorpay Payment ID</th>
                <th className="py-4 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-medium)]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-xs text-[var(--text-secondary)]">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading payment transactions...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-[var(--text-tertiary)]">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <div className="font-bold text-sm text-[var(--text-primary)]">No Subscription Payments Recorded</div>
                    <div className="text-xs mt-1">Transactions from Razorpay checkout will automatically appear here.</div>
                  </td>
                </tr>
              ) : (
                payments.map(payment => {
                  const statusClass = STATUS_COLORS[payment.status] || STATUS_COLORS.active
                  const isProPlus = payment.plan_name === 'pro_plus'

                  return (
                    <tr key={payment._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                            {payment.cafe_id?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[var(--text-primary)]">
                              {payment.cafe_id?.name || 'Partner Café'}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              {payment.cafe_id?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${
                          isProPlus ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {payment.plan_name}
                        </span>
                      </td>

                      <td className="py-4 px-5 font-black font-heading text-sm text-emerald-400">
                        ₹{payment.price}
                      </td>

                      <td className="py-4 px-5 text-[var(--text-secondary)]">
                        {new Date(payment.created_at).toLocaleString([], {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>

                      <td className="py-4 px-5">
                        {payment.razorpay_payment_id ? (
                          <div className="inline-flex items-center gap-1.5 font-mono bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-medium)]">
                            <span>{payment.razorpay_payment_id}</span>
                            <button
                              onClick={() => handleCopy(payment.razorpay_payment_id)}
                              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            >
                              {copiedId === payment.razorpay_payment_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusClass}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Success</span>
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border-medium)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
