import React, { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Terminal, AlertTriangle, Trash2, ChevronDown, 
  ChevronUp, RefreshCw, CheckCircle2, Clock, ShieldAlert,
  ChevronLeft, ChevronRight
} from 'lucide-react'

const LEVEL_COLORS = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  critical: 'bg-rose-600/20 text-rose-300 border-rose-500/30'
}

export default function AdminLogs() {
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
      setLogs(res.data?.data || [])
      setTotalPages(res.data?.pagination?.pages || 1)
    } catch {
      toast.error('Failed to load system logs')
    } finally {
      setLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all system logs?')) return
    setClearing(true)
    try {
      await adminAPI.clearSystemLogs()
      toast.success('System logs cleared')
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
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Infrastructure Diagnostics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            System & Error Exception Logs
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time backend API traces, uncaught exceptions, and database connection event telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleClearLogs}
            disabled={clearing || logs.length === 0}
            className="py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-colors flex items-center gap-2 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            <span>{clearing ? 'Clearing...' : 'Clear All Logs'}</span>
          </button>
        </div>
      </div>

      {/* ── Logs Table ── */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] uppercase font-bold text-[var(--text-tertiary)]">
                <th className="py-4 px-5">Severity</th>
                <th className="py-4 px-5">HTTP Endpoint</th>
                <th className="py-4 px-5">Message Summary</th>
                <th className="py-4 px-5">Timestamp</th>
                <th className="py-4 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-medium)]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-xs text-[var(--text-secondary)]">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Querying system log files...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-[var(--text-tertiary)]">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400" />
                    <div className="font-bold text-sm text-[var(--text-primary)]">Clean Diagnostics</div>
                    <div className="text-xs mt-1">Zero backend error exceptions logged. System is operating normally.</div>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const levelClass = LEVEL_COLORS[log.level] || LEVEL_COLORS.info
                  const isExpanded = expandedId === log._id

                  return (
                    <React.Fragment key={log._id}>
                      <tr 
                        onClick={() => setExpandedId(isExpanded ? null : log._id)}
                        className={`hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors ${
                          isExpanded ? 'bg-[var(--bg-input)]' : ''
                        }`}
                      >
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${levelClass}`}>
                            {log.level || 'info'}
                          </span>
                        </td>

                        <td className="py-4 px-5 font-mono text-xs text-[var(--text-primary)]">
                          <span className="text-[var(--text-tertiary)] mr-1.5 font-bold">{log.method || 'GET'}</span>
                          <span>{log.url || '/api/health'}</span>
                        </td>

                        <td className="py-4 px-5 text-[var(--text-secondary)] truncate max-w-md">
                          {log.message}
                        </td>

                        <td className="py-4 px-5 text-[var(--text-tertiary)]">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center text-[var(--text-tertiary)]">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[var(--bg-input)]">
                          <td colSpan="5" className="px-5 pb-5 pt-0">
                            <div className="p-4 rounded-2xl bg-black/50 border border-[var(--border-medium)] overflow-x-auto text-xs font-mono">
                              <p className="text-rose-400 font-bold mb-2">
                                {log.message}
                              </p>
                              {log.stack ? (
                                <pre className="text-slate-400 text-[11px] leading-relaxed whitespace-pre-wrap">
                                  {log.stack}
                                </pre>
                              ) : (
                                <span className="text-slate-500 italic">No stack trace recorded.</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
