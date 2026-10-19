import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  HelpCircle, MessageSquare, Phone, Mail, FileText, 
  ChevronDown, ChevronUp, Plus, Send, CheckCircle2, 
  Clock, AlertCircle, Sparkles, MessageCircle, ArrowRight
} from 'lucide-react'

const CATEGORIES = [
  { value: 'payment_upi', label: 'Payment & UPI Settlement', desc: 'Queries regarding Razorpay, UPI ID, or customer settlements' },
  { value: 'menu_qr', label: 'Menu & Table QR Codes', desc: 'Help with item creation, categories or table QR standees' },
  { value: 'live_orders', label: 'Live Orders & Audio Chimes', desc: 'Notification sound, kitchen display, or order status sync' },
  { value: 'subscription', label: 'Subscription & Plan Billing', desc: 'Upgrades, plan renewals, or invoice billing questions' },
  { value: 'other', label: 'General Inquiry & Suggestions', desc: 'Feedback, feature requests, or technical assistance' }
]

const DEFAULT_FAQS = [
  {
    q: 'How do I configure my UPI ID to receive direct payments?',
    a: 'Go to Owner Settings > Payment Settings. Enter your active UPI VPA (e.g., cafe@okhdfcbank or 9876543210@ybl) and click Save. All customer orders paid via UPI will settle instantly with 0% gateway commission.'
  },
  {
    q: 'How do I download and print high-resolution Table QR Codes?',
    a: 'Navigate to QR Code in your sidebar. Choose either "General Menu" or "Table Specific", enter your table number, and click "Download PNG Standee" or "Print Table Standee" directly.'
  },
  {
    q: 'Why didn’t I hear the audio chime when a new order arrived?',
    a: 'Modern browsers block automatic audio until you interact with the page. Ensure your browser tab is unmuted, click anywhere on the Live Kitchen screen once after logging in, and keep the tab open.'
  },
  {
    q: 'How does upgrading to the Pro Plus Plan work?',
    a: 'Go to Subscription in your sidebar and select "Upgrade to Pro Plus". Complete the secure Razorpay checkout. Your account will automatically activate all Pro Plus features without any downtime.'
  },
  {
    q: 'How do I temporarily mark an item as out of stock?',
    a: 'Go to Menu Management, locate the item, and toggle its availability switch to Off. It will immediately show an "Unavailable" badge on the customer menu so guests cannot order it.'
  }
]

const DEFAULT_INFO = {
  platform_name: 'WhatTheMenu SaaS',
  contact_email: 'support@whatthemenu.com',
  support_phone: '+91 98765 43210',
  support_whatsapp: '919876543210',
  support_hours: 'Mon - Sun, 9:00 AM - 10:00 PM IST',
  is_pro: false,
  sla: 'Standard Support (< 24 Hour Response)',
  faqs: DEFAULT_FAQS
}

export default function OwnerSupport() {
  const [activeTab, setActiveTab] = useState('tickets') // 'tickets' | 'new_ticket' | 'contact' | 'faqs'
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(DEFAULT_INFO)
  const [tickets, setTickets] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState(null)

  const [form, setForm] = useState({
    subject: '',
    category: 'payment_upi',
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      try {
        const infoRes = await ownerAPI.getSupportInfo()
        if (infoRes.data?.data) {
          setInfo(infoRes.data.data)
        }
      } catch (e) {}

      try {
        const ticketsRes = await ownerAPI.getSupportTickets()
        if (ticketsRes.data?.data) {
          setTickets(ticketsRes.data.data)
        }
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) {
      return toast.error('Please enter a ticket subject')
    }
    if (!form.description.trim()) {
      return toast.error('Please enter details about your issue')
    }

    try {
      setSubmitting(true)
      const res = await ownerAPI.createSupportTicket(form)
      toast.success(res.data?.message || 'Support ticket submitted successfully!')
      setForm({ subject: '', category: 'payment_upi', description: '' })
      const ticketsRes = await ownerAPI.getSupportTickets()
      setTickets(ticketsRes.data?.data || [])
      setActiveTab('tickets')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit support ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return { 
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/25', 
          icon: AlertCircle, 
          label: 'Open' 
        }
      case 'in_progress':
        return { 
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/25', 
          icon: Clock, 
          label: 'In Progress' 
        }
      case 'resolved':
        return { 
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', 
          icon: CheckCircle2, 
          label: 'Resolved' 
        }
      case 'closed':
        return { 
          bg: 'bg-slate-700/50 text-slate-400 border-slate-700', 
          icon: CheckCircle2, 
          label: 'Closed' 
        }
      default:
        return { 
          bg: 'bg-slate-700/50 text-slate-400 border-slate-700', 
          icon: AlertCircle, 
          label: status 
        }
    }
  }

  const displayInfo = info || DEFAULT_INFO
  const faqsList = displayInfo.faqs?.length ? displayInfo.faqs : DEFAULT_FAQS

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Dedicated Owner Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Help & Customer Support
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track inquiries, submit priority support tickets, or chat directly via WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new_ticket')}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* ── Quick Contact Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href={`https://wa.me/${displayInfo.support_whatsapp}?text=Hello%20WhatTheMenu%20Support`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-emerald-500/40 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              WhatsApp Support
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              +{displayInfo.support_whatsapp}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Typical reply: &lt; 15 mins
            </div>
          </div>
        </a>

        <a
          href={`mailto:${displayInfo.contact_email}`}
          className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-indigo-500/40 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
              Email Desk
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[180px]">
              {displayInfo.contact_email}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Available 24/7
            </div>
          </div>
        </a>

        <a
          href={`tel:${displayInfo.support_phone}`}
          className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-cyan-500/40 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
              Phone Helpline
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {displayInfo.support_phone}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {displayInfo.support_hours}
            </div>
          </div>
        </a>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-2 border-b border-[var(--border-medium)] pb-3">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tickets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-medium)]'
          }`}
        >
          My Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('new_ticket')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'new_ticket'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-medium)]'
          }`}
        >
          Create New Ticket
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'faqs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-medium)]'
          }`}
        >
          Knowledgebase FAQs
        </button>
      </div>

      {/* ── TAB 1: Existing Tickets ── */}
      {activeTab === 'tickets' && (
        <div className="space-y-4 animate-fadeIn">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] animate-pulse" />
              ))}
            </div>
          ) : tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map(ticket => {
                const badge = getStatusBadge(ticket.status)
                const BadgeIcon = badge.icon
                const catObj = CATEGORIES.find(c => c.value === ticket.category)
                return (
                  <div
                    key={ticket._id}
                    className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-[var(--text-primary)]">
                          {ticket.subject}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-secondary)]">
                          {catObj?.label || ticket.category}
                        </span>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {ticket.description}
                    </p>

                    {ticket.admin_reply && (
                      <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                        <strong className="block text-indigo-200 font-semibold mb-1">
                          Administrator Response:
                        </strong>
                        {ticket.admin_reply}
                      </div>
                    )}

                    <div className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-medium)] flex items-center justify-between">
                      <span>Ticket ID: {ticket._id?.slice(-8)}</span>
                      <span>Created {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] p-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading mb-1">
                No Support Tickets Filed
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                Have an inquiry about table QR codes, custom themes, or settlements? Open a new ticket anytime.
              </p>
              <button
                onClick={() => setActiveTab('new_ticket')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                Create Your First Ticket
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Create Ticket ── */}
      {activeTab === 'new_ticket' && (
        <div className="max-w-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl p-6 sm:p-8 shadow-sm animate-fadeIn">
          <h2 className="text-lg font-bold font-heading text-[var(--text-primary)] mb-1">
            Submit a New Support Ticket
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6">
            Our engineering and operational teams review tickets promptly during restaurant operating hours.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Issue Category *
              </label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-[var(--bg-card)]">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Subject Line *
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Need assistance setting up UPI QR for Table 5"
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Detailed Description *
              </label>
              <textarea
                rows={4}
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Please describe your question or issue with as much detail as possible..."
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Send Ticket'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className="py-2.5 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: FAQs Accordion ── */}
      {activeTab === 'faqs' && (
        <div className="space-y-3 animate-fadeIn">
          {faqsList.map((faq, idx) => {
            const isExpanded = expandedFaq === idx
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <span>{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="p-4 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-medium)] bg-[var(--bg-input)]">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
