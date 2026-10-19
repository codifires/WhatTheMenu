import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  HelpCircle, Search, RefreshCw, AlertCircle, Clock, 
  CheckCircle2, MessageSquare, Send, X, Filter, 
  ShieldCheck, ArrowUpRight, MessageCircle 
} from 'lucide-react'

const CATEGORY_NAMES = {
  payment_upi: 'Payment & UPI',
  menu_qr: 'Menu & QR Codes',
  live_orders: 'Live Orders & KDS',
  subscription: 'Subscriptions',
  other: 'General Inquiry'
}

export default function SupportTicketManagement() {
  const [tickets, setTickets] = useState([])
  const [counts, setCounts] = useState({ total: 0, open: 0, in_progress: 0, urgent: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [modalStatus, setModalStatus] = useState('resolved')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [statusFilter, priorityFilter, categoryFilter])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getSupportTickets({
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter
      })
      setTickets(res.data?.data || [])
      if (res.data?.counts) {
        setCounts(res.data.counts)
      }
    } catch (err) {
      toast.error('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (ticket) => {
    setSelectedTicket(ticket)
    setReplyText(ticket.admin_reply || '')
    setModalStatus(ticket.status === 'open' ? 'in_progress' : ticket.status)
  }

  const handleSaveReply = async (e) => {
    e.preventDefault()
    if (!selectedTicket) return

    try {
      setSaving(true)
      await adminAPI.replySupportTicket(selectedTicket._id, {
        status: modalStatus,
        admin_reply: replyText
      })
      toast.success('Support ticket updated & café notified!')
      setSelectedTicket(null)
      fetchTickets()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update support ticket')
    } finally {
      setSaving(false)
    }
  }

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const cafeName = t.cafe_id?.name?.toLowerCase() || ''
    const cafeEmail = t.cafe_id?.email?.toLowerCase() || ''
    const subject = t.subject?.toLowerCase() || ''
    const ticketNo = t.ticket_number?.toLowerCase() || ''
    return cafeName.includes(q) || cafeEmail.includes(q) || subject.includes(q) || ticketNo.includes(q)
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'in_progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'closed':
        return 'bg-slate-700/40 text-slate-400 border-slate-700'
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-700'
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Customer Resolution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Café Support & Issue Queue
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Review partner inquiries, reply to operational issues, and update ticket resolution statuses.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* ── Stat Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tickets</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
            {counts.total}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open / Pending</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-blue-400">
            {counts.open}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-amber-400">
            {counts.in_progress}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-emerald-400">
            {counts.resolved}
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-medium)] p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'open', 'in_progress', 'resolved'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]'
              }`}
            >
              {status === 'all' ? 'All Statuses' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ticket #, subject or café..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ── Tickets Table ── */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] uppercase font-bold text-[var(--text-tertiary)]">
                <th className="py-4 px-5">Ticket ID</th>
                <th className="py-4 px-5">Café Partner</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5">Subject & Description</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-medium)]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[var(--text-secondary)]">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading support queue...</span>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-[var(--text-tertiary)]">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400" />
                    <div className="font-bold text-sm text-[var(--text-primary)]">All Support Queues Clear</div>
                    <div className="text-xs mt-1">No pending support tickets match your current filter.</div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(t => {
                  const statusClass = getStatusBadge(t.status)
                  return (
                    <tr key={t._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-indigo-400">
                        {t.ticket_number || t._id?.slice(-8)}
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-bold text-sm text-[var(--text-primary)]">
                          {t.cafe_id?.name || 'Partner Café'}
                        </div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {t.cafe_id?.email || 'N/A'}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-secondary)] font-medium">
                          {CATEGORY_NAMES[t.category] || t.category}
                        </span>
                      </td>

                      <td className="py-4 px-5 max-w-sm">
                        <div className="font-semibold text-[var(--text-primary)] truncate">
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                          {t.description}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusClass}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleOpenModal(t)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-colors"
                        >
                          Respond
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

      {/* ── Reply Modal ── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-medium)] mb-4">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Reply to Ticket #{selectedTicket.ticket_number || selectedTicket._id?.slice(-8)}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedTicket.cafe_id?.name || 'Café Partner'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-xs space-y-1">
                <div className="font-bold text-[var(--text-primary)]">{selectedTicket.subject}</div>
                <div className="text-[var(--text-secondary)] leading-relaxed">{selectedTicket.description}</div>
              </div>

              <form onSubmit={handleSaveReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Ticket Resolution Status
                  </label>
                  <select
                    value={modalStatus}
                    onChange={e => setModalStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Administrator Reply Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Enter your response to the café owner..."
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{saving ? 'Sending Reply...' : 'Save & Notify Café'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
