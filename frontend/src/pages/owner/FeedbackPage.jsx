import { useState, useEffect, useMemo } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Star, MessageSquare, User, Clock, Calendar, 
  Search, Filter, RefreshCw, ThumbsUp, AlertCircle
} from 'lucide-react'

const FeedbackPage = () => {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRatingFilter, setSelectedRatingFilter] = useState('all') // 'all' | '5' | '4' | '3' | 'critical'
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { 
    fetchFeedback() 
  }, [])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const res = await ownerAPI.getFeedback()
      setFeedback(res.data?.data || [])
    } catch (error) {
      toast.error('Failed to load guest feedback')
    } finally {
      setLoading(false)
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = feedback.length
    if (total === 0) return { average: '0.0', counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, total: 0 }

    const sum = feedback.reduce((acc, f) => acc + (f.rating || 0), 0)
    const average = (sum / total).toFixed(1)

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    feedback.forEach(f => {
      const r = Math.round(f.rating) || 5
      if (counts[r] !== undefined) counts[r] += 1
    })

    return { average, counts, total }
  }, [feedback])

  // Filtered List
  const filteredFeedback = useMemo(() => {
    return feedback.filter(f => {
      if (selectedRatingFilter === '5' && f.rating !== 5) return false
      if (selectedRatingFilter === '4' && f.rating !== 4) return false
      if (selectedRatingFilter === '3' && f.rating !== 3) return false
      if (selectedRatingFilter === 'critical' && f.rating > 2) return false

      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        f.customer_name?.toLowerCase().includes(q) ||
        f.review?.toLowerCase().includes(q) ||
        f.order_id?.order_number?.toLowerCase().includes(q)
      )
    })
  }, [feedback, selectedRatingFilter, searchQuery])

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
        }`}
      />
    ))
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Guest Sentiment</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Customer Reviews & Ratings
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real feedback collected directly from customers upon order settlement.
          </p>
        </div>

        <button
          onClick={fetchFeedback}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Reviews</span>
        </button>
      </div>

      {/* ── Ratings Overview Hero Widget ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Score Card */}
        <div className="md:col-span-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/20 via-[var(--bg-card)] to-[var(--bg-card)] border border-amber-500/30 flex flex-col justify-between text-center md:text-left shadow-sm">
          <div>
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider block mb-1">
              Overall Score
            </span>
            <div className="text-5xl font-black font-heading text-[var(--text-primary)] my-2">
              {stats.average}
              <span className="text-xl text-[var(--text-tertiary)] font-normal"> / 5.0</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1 my-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(Number(stats.average)) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--border-medium)] text-xs text-[var(--text-secondary)]">
            Based on <strong>{stats.total} verified customer ratings</strong>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="md:col-span-8 p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm space-y-3 flex flex-col justify-center">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = stats.counts[stars] || 0
            const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <span>{stars}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </span>

                <div className="flex-1 h-2 rounded-full bg-[var(--bg-input)] border border-[var(--border-medium)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-16 text-right text-[var(--text-secondary)] font-mono">
                  {count} ({percentage}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-medium)] p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedRatingFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedRatingFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]'
            }`}
          >
            All Reviews
          </button>
          <button
            onClick={() => setSelectedRatingFilter('5')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedRatingFilter === '5'
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]'
            }`}
          >
            5 Stars Only
          </button>
          <button
            onClick={() => setSelectedRatingFilter('4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedRatingFilter === '4'
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]'
            }`}
          >
            4 Stars
          </button>
          <button
            onClick={() => setSelectedRatingFilter('critical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedRatingFilter === 'critical'
                ? 'bg-rose-600 text-white'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-rose-400 border border-[var(--border-medium)]'
            }`}
          >
            Needs Attention (≤ 2★)
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search review comments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ── Reviews Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] animate-pulse" />
          ))}
        </div>
      ) : filteredFeedback.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeedback.map(fb => (
            <div
              key={fb._id}
              className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-[var(--border-hover)] shadow-sm flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/15 to-cyan-500/15 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {(fb.customer_name || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[120px]">
                        {fb.customer_name || 'Guest Diner'}
                      </h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] font-mono">
                        #{fb.order_id?.order_number || 'Takeaway'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {renderStars(fb.rating)}
                  </div>
                </div>

                <div className="my-3 text-xs text-[var(--text-secondary)] leading-relaxed italic">
                  {fb.review ? (
                    `"${fb.review}"`
                  ) : (
                    <span className="text-[var(--text-tertiary)] not-italic">
                      Rating given without written review text.
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-medium)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(fb.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(fb.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] p-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Star className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-heading mb-1">
            {searchQuery || selectedRatingFilter !== 'all' ? 'No Reviews Match Filter' : 'No Guest Reviews Yet'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {searchQuery || selectedRatingFilter !== 'all'
              ? 'Try selecting "All Reviews" or clearing your search term.'
              : 'Ratings submitted by diners on their order completion screen will appear here.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default FeedbackPage
