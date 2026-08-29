import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const LEVEL_COLORS = {
  info: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
  warn: { bg: 'var(--warning-light)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  error: { bg: 'rgba(239,68,68,0.1)', color: 'var(--danger-text)', border: 'rgba(239,68,68,0.2)' },
  critical: { bg: 'rgba(220,38,38,0.15)', color: '#ef4444', border: 'rgba(220,38,38,0.3)', glow: '0 0 10px rgba(220,38,38,0.4)' }
}

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    fetchLogs(page)
  }, [page])

  const fetchLogs = async (p) => {
    setLoading(true)
    try {
      const res = await adminAPI.getSystemLogs({ page: p, limit: 15 })
      setLogs(res.data.data)
      setTotalPages(res.data.pagination.pages)
    } catch {
      toast.error('Failed to load system logs')
    } finally {
      setLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all system logs?')) return
    setClearing(true)
    try {
      await adminAPI.clearSystemLogs()
      toast.success('Logs cleared successfully')
      setLogs([])
      setTotalPages(1)
      setPage(1)
    } catch {
      toast.error('Failed to clear logs')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, animation: 'slideUp 0.4s ease' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
            System Error Logs
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>
            Monitor backend crashes, API failures, and system warnings.
          </p>
        </div>
        
        <button
          onClick={handleClearLogs}
          disabled={clearing || logs.length === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: clearing || logs.length === 0 ? 'not-allowed' : 'pointer',
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--danger-text)',
            border: '1px solid rgba(239,68,68,0.3)',
            opacity: clearing || logs.length === 0 ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          {clearing ? 'Clearing...' : 'Clear All Logs'}
        </button>
      </div>

      <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', animation: 'slideUp 0.5s ease' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Level', 'Endpoint', 'Message', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.01)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} style={{ padding: '18px 20px' }}>
                        <div style={{ height: 13, borderRadius: 4, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map(log => {
                  const sc = LEVEL_COLORS[log.level] || LEVEL_COLORS.info
                  const isExpanded = expandedId === log._id
                  
                  return (
                    <React.Fragment key={log._id}>
                      <tr 
                        onClick={() => setExpandedId(isExpanded ? null : log._id)}
                        style={{ 
                          borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.04)', 
                          background: isExpanded ? 'var(--bg-input)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s' 
                        }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-card)' }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* Level */}
                        <td style={{ padding: '16px 20px', width: '120px' }}>
                          <span style={{ 
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, 
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                            boxShadow: sc.glow || 'none', textTransform: 'uppercase'
                          }}>
                            {log.level}
                          </span>
                        </td>

                        {/* Endpoint */}
                        <td style={{ padding: '16px 20px', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)', width: '25%' }}>
                          <span style={{ color: 'var(--text-secondary)', marginRight: 8 }}>{log.method}</span>
                          {log.url}
                        </td>

                        {/* Message */}
                        <td style={{ padding: '16px 20px', fontSize: 13, color: '#f3f4f6', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.message}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString('en-GB')}
                        </td>
                      </tr>
                      
                      {/* Expanded Stack Trace */}
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'var(--bg-input)' }}>
                          <td colSpan={4} style={{ padding: '0 20px 20px 20px' }}>
                            <div style={{ background: '#0d1117', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>{log.message}</p>
                              <pre style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {log.stack || 'No stack trace available.'}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-tertiary)', margin: '0 0 6px' }}>No system errors</p>
                    <p style={{ fontSize: 13, color: 'var(--border-hover)', margin: 0 }}>The server is running perfectly fine.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, background: page === 1 ? 'transparent' : 'var(--border-light)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 6, background: page === totalPages ? 'transparent' : 'var(--border-light)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}

export default AdminLogs
