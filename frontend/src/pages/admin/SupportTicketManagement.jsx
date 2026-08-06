import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const CATEGORY_NAMES = {
  payment_upi: '💳 Payment & UPI',
  menu_qr: '📋 Menu & QR',
  live_orders: '⚡ Live Orders',
  subscription: '💎 Subscription',
  other: '💡 General Inquiry'
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
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)', label: 'Open' }
      case 'in_progress':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: 'In Progress' }
      case 'resolved':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)', label: 'Resolved' }
      case 'closed':
        return { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', label: 'Closed' }
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: 'rgba(255, 255, 255, 0.2)', label: status }
    }
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 6px', fontFamily: "'Outfit', sans-serif" }}>
            🎧 Café Support & Issue Tickets
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
            Manage client inquiries, troubleshoot UPI payments/KDS orders, and reply directly to café partners.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* ── Stat Summary Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        <div style={{
          padding: '20px',
          borderRadius: 16,
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
            Total Tickets
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>
            {counts.total}
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: 16,
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 6 }}>
            Open / Pending
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8' }}>
            {counts.open}
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: 6 }}>
            ⚡ Urgent / Pro Plan
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#f87171' }}>
            {counts.urgent}
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: 16,
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: 6 }}>
            Resolved Tickets
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#34d399' }}>
            {counts.resolved}
          </div>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '16px 20px',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: 20
      }}>
        {/* Search */}
        <div style={{ flex: '1 1 250px' }}>
          <input
            type="text"
            placeholder="Search by café, email, ticket ID, or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">⚡ Urgent (Pro Plan)</option>
          <option value="normal">Standard Priority</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Categories</option>
          <option value="payment_upi">Payment & UPI</option>
          <option value="menu_qr">Menu & QR Codes</option>
          <option value="live_orders">Live Orders</option>
          <option value="subscription">Subscription</option>
          <option value="other">Other / Inquiry</option>
        </select>
      </div>

      {/* ── Tickets Table ── */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 18,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            Loading support tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>✅</span>
            <p style={{ margin: 0, fontSize: 14 }}>No tickets matching the current filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700 }}>Ticket ID</th>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700 }}>Café & Plan</th>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700 }}>Subject & Category</th>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700 }}>Priority</th>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700 }}>Created</th>
                  <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => {
                  const badge = getStatusBadge(t.status)
                  const isPro = t.cafe_id?.subscription?.plan_name === 'pro' || t.cafe_id?.subscription_status === 'pro'
                  return (
                    <tr
                      key={t._id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 800, fontFamily: 'monospace', color: '#60a5fa' }}>
                        {t.ticket_number}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{t.cafe_id?.name || 'Unknown Café'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{t.cafe_id?.email}</span>
                          {isPro && (
                            <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                              💎 PRO
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.subject}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {CATEGORY_NAMES[t.category] || t.category}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          background: t.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: t.priority === 'urgent' ? '#f87171' : '#94a3b8',
                          border: t.priority === 'urgent' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {t.priority === 'urgent' ? '⚡ Urgent' : 'Standard'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 14,
                          fontSize: 11,
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: 12 }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenModal(t)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {t.admin_reply ? 'View / Edit' : 'Reply & Resolve'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── REPLY / RESOLVE MODAL ── */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 999
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 600,
            padding: '24px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>
                  {selectedTicket.ticket_number}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Café Info Banner */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: 16,
              fontSize: 13,
              color: '#cbd5e1'
            }}>
              <div><strong>Café:</strong> {selectedTicket.cafe_id?.name} ({selectedTicket.cafe_id?.email})</div>
              <div><strong>Category:</strong> {CATEGORY_NAMES[selectedTicket.category] || selectedTicket.category}</div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                Issue Description:
              </label>
              <div style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: 13,
                color: '#e2e8f0',
                maxHeight: 120,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
              }}>
                {selectedTicket.description}
              </div>
            </div>

            {/* Reply & Status Form */}
            <form onSubmit={handleSaveReply} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                  Admin Reply / Solution:
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your response to the café owner..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                  Update Ticket Status:
                </label>
                <select
                  value={modalStatus}
                  onChange={e => setModalStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved (Mark as Solved)</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    background: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : '💾 Save & Notify Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
