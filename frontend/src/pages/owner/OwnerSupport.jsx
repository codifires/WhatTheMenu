import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'payment_upi', label: '💳 Payment & UPI Settlement', desc: 'Queries regarding UPI ID, transactions or customer payments' },
  { value: 'menu_qr', label: '📋 Menu & Table QR Codes', desc: 'Help with item creation, categories or QR code standees' },
  { value: 'live_orders', label: '⚡ Live Orders & KDS Alerts', desc: 'Audio notifications, live order board or status transitions' },
  { value: 'subscription', label: '💎 Subscription & Plan Billing', desc: 'Upgrades, plan renewals or billing questions' },
  { value: 'other', label: '💡 General Inquiry & Feature Request', desc: 'Any other questions, feedback or platform suggestions' }
]

const DEFAULT_FAQS = [
  {
    q: 'How do I configure my UPI ID to receive direct payments?',
    a: 'Go to Owner Settings > Payment Settings. Enter your active UPI VPA (e.g., cafe@okhdfcbank or 9876543210@ybl) and click Save. All customer orders paid via UPI will settle instantly to your bank account with 0% gateway commission.'
  },
  {
    q: 'How do I download and print high-resolution Table QR Codes?',
    a: 'Navigate to QR Code in your sidebar. Select your desired table number or download the master QR. Click "Download High-Res QR" or "Print Standee" to place on dining tables.'
  },
  {
    q: 'Why didn’t I hear the audio chime when a new order arrived?',
    a: 'Modern browsers block automatic audio until you interact with the page. Ensure your browser tab is unmuted, click anywhere on the Live Orders screen once after logging in, and keep the tab open.'
  },
  {
    q: 'How does upgrading to the Pro Plan work?',
    a: 'Go to Subscription in your sidebar and select "Upgrade to Pro". A dynamic UPI payment QR will appear. Scan and pay via GPay, PhonePe, or Paytm, and your Pro features will activate immediately within seconds.'
  },
  {
    q: 'How do I temporarily mark an item as out of stock?',
    a: 'Go to Menu Management, find the item, and toggle the availability switch to "Unavailable". It will instantly disappear from your customer menu in real time.'
  }
]

const DEFAULT_INFO = {
  platform_name: 'QRMenu SaaS',
  contact_email: 'support@qrmenu.com',
  support_phone: '+91 98765 43210',
  support_whatsapp: '919876543210',
  support_hours: 'Mon - Sun, 9:00 AM - 10:00 PM IST',
  is_pro: false,
  sla: 'Standard Support (< 24 Hour Response)',
  faqs: DEFAULT_FAQS
}

export default function OwnerSupport() {
  const [activeTab, setActiveTab] = useState('contact') // 'contact' | 'tickets' | 'faqs'
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(DEFAULT_INFO)
  const [tickets, setTickets] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState(null)

  // Form State
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
      } catch (e) {
        console.warn('Backend server needs restart for /api/support routes:', e.message)
      }

      try {
        const ticketsRes = await ownerAPI.getSupportTickets()
        if (ticketsRes.data?.data) {
          setTickets(ticketsRes.data.data)
        }
      } catch (e) {
        console.warn('Could not fetch existing tickets:', e.message)
      }
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
      toast.success(res.data?.message || 'Support ticket submitted!')
      setForm({ subject: '', category: 'payment_upi', description: '' })
      // Refresh tickets & switch to tickets tab
      const ticketsRes = await ownerAPI.getSupportTickets()
      setTickets(ticketsRes.data?.data || [])
      setActiveTab('tickets')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit support ticket. Please restart the backend server.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)', label: 'Open' }
      case 'in_progress':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: 'In Progress' }
      case 'resolved':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-text)', border: 'rgba(16, 185, 129, 0.3)', label: 'Resolved' }
      case 'closed':
        return { bg: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-secondary)', border: 'rgba(100, 116, 139, 0.3)', label: 'Closed' }
      default:
        return { bg: 'var(--border-hover)', color: 'var(--text-primary)', border: 'var(--border-hover)', label: status }
    }
  }

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat)
    return found ? found.label : cat
  }

  const displayInfo = info || DEFAULT_INFO
  const isPro = displayInfo.is_pro
  const faqsList = displayInfo.faqs?.length ? displayInfo.faqs : DEFAULT_FAQS

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px', fontFamily: "'Outfit', sans-serif" }}>
            🎧 Help & Support Center
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Instant help for menu setup, 0% UPI payments, table QR codes, and kitchen orders.
          </p>
        </div>

        {/* Plan SLA Badge */}
        <div style={{
          padding: '10px 18px',
          borderRadius: 14,
          background: isPro 
            ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.18), rgba(79, 70, 229, 0.18))' 
            : 'var(--border-light)',
          border: isPro ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: isPro ? '0 0 20px rgba(168, 85, 247, 0.15)' : 'none'
        }}>
          <span style={{ fontSize: 20 }}>{isPro ? '⚡' : '🛡️'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: isPro ? '#c084fc' : 'var(--text-primary)' }}>
              {isPro ? 'Pro Priority Support Active' : 'Standard Support Tier'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {displayInfo.sla || 'Fast assistance for all café partners'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Channels Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {/* WhatsApp Channel */}
        <a
          href={`https://wa.me/${String(displayInfo.support_whatsapp || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi Support, I am ${displayInfo.cafe_info?.name || 'Café Owner'} (${displayInfo.cafe_info?.email || ''}). I need assistance with my QR Menu account.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '20px 22px',
            borderRadius: 18,
            background: 'var(--success-light)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0
          }}>
            💬
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', marginBottom: 2 }}>
              WhatsApp Instant Chat
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Direct message our technical support team
            </div>
          </div>
        </a>

        {/* Email Support */}
        <a
          href={`mailto:${displayInfo.contact_email || 'support@qrmenu.com'}?subject=Support Request - ${encodeURIComponent(displayInfo.cafe_info?.name || '')}`}
          style={{
            padding: '20px 22px',
            borderRadius: 18,
            background: 'var(--cyan-bg-light)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0
          }}>
            ✉️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', marginBottom: 2 }}>
              Email Support
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {displayInfo.contact_email || 'support@qrmenu.com'}
            </div>
          </div>
        </a>

        {/* Operating Hours */}
        <div style={{
          padding: '20px 22px',
          borderRadius: 18,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0
          }}>
            ⏰
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24', marginBottom: 2 }}>
              Helpline & Hours
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {displayInfo.support_hours || 'Mon - Sun, 9:00 AM - 10:00 PM'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-medium)', paddingBottom: 12, marginBottom: 28 }}>
        <button
          onClick={() => setActiveTab('contact')}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'contact' ? '#2563eb' : 'transparent',
            color: activeTab === 'contact' ? 'var(--text-primary)' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          📝 Submit New Ticket
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'tickets' ? '#2563eb' : 'transparent',
            color: activeTab === 'tickets' ? 'var(--text-primary)' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <span>🎫 My Tickets</span>
          {tickets.length > 0 && (
            <span style={{
              background: 'var(--border-hover)',
              padding: '2px 8px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 800
            }}>
              {tickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'faqs' ? '#2563eb' : 'transparent',
            color: activeTab === 'faqs' ? 'var(--text-primary)' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          📚 FAQs & Setup Guides
        </button>
      </div>

      {/* ── TAB 1: SUBMIT TICKET ── */}
      {activeTab === 'contact' && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 8px 32px var(--overlay-bg)'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Open a Support Request
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
            Fill out the details below. Pro Plan tickets receive instant high-priority routing.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Category Grid */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                Select Issue Category:
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10
              }}>
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.value}
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: form.category === cat.value ? 'rgba(37, 99, 235, 0.18)' : 'var(--bg-card)',
                      border: form.category === cat.value ? '1px solid #3b82f6' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.category === cat.value ? '#60a5fa' : 'var(--text-primary)', marginBottom: 3 }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {cat.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Subject / Brief Summary:
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g., Need help updating UPI ID for table #4"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Detailed Description:
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Please describe what happened, steps to reproduce, or any questions..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 800,
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.15s ease'
                }}
              >
                {submitting ? 'Submitting Ticket...' : '🚀 Submit Support Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 2: MY TICKETS ── */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tickets.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: 20,
              border: '1px solid var(--border-medium)'
            }}>
              <span style={{ fontSize: 42, display: 'block', marginBottom: 12 }}>🎫</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No Support Tickets Yet</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                You have not opened any support requests yet.
              </p>
              <button
                onClick={() => setActiveTab('contact')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: '#2563eb',
                  color: 'var(--text-primary)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                + Create First Ticket
              </button>
            </div>
          ) : (
            tickets.map(t => {
              const badge = getStatusBadge(t.status)
              return (
                <div
                  key={t._id}
                  style={{
                    padding: '22px 24px',
                    borderRadius: 18,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-medium)',
                    boxShadow: '0 4px 20px var(--overlay-bg)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>
                          {t.ticket_number}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: t.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-light)',
                          color: t.priority === 'urgent' ? 'var(--danger-text)' : '#94a3b8',
                          border: t.priority === 'urgent' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-medium)'
                        }}>
                          {t.priority === 'urgent' ? '⚡ Priority' : 'Standard'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                        {t.subject}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {getCategoryLabel(t.category)} • Opened on {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}>
                      {badge.label}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    fontSize: 13,
                    color: '#cbd5e1',
                    lineHeight: 1.5,
                    marginBottom: t.admin_reply ? 14 : 0
                  }}>
                    {t.description}
                  </div>

                  {/* Admin Reply Box */}
                  {t.admin_reply && (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      marginTop: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>💬</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--success-text)' }}>
                          Support Team Response:
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {t.admin_reply}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── TAB 3: FAQS & GUIDES ── */}
      {activeTab === 'faqs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqsList.map((faq, idx) => {
            const isExpanded = expandedFaq === idx
            return (
              <div
                key={idx}
                style={{
                  borderRadius: 16,
                  background: 'var(--bg-elevated)',
                  border: isExpanded ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-light)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    color: isExpanded ? '#38bdf8' : 'var(--text-primary)',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: 16, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>

                {isExpanded && (
                  <div style={{
                    padding: '0 22px 18px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    borderTop: '1px solid var(--border-medium)'
                  }}>
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
