import { useState, useEffect, useMemo } from 'react'
import { ownerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  Calendar, Search, Printer, CheckCircle2, Clock, 
  User, IndianRupee, TrendingUp, ShoppingBag, Eye,
  CreditCard, Banknote, X, RefreshCw, LayoutGrid, Table as TableIcon
} from 'lucide-react'

export default function CompletedOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [dateFilterMode, setDateFilterMode] = useState('all') // 'all', 'today', 'yesterday', 'custom'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  useEffect(() => {
    fetchOrders()
  }, [selectedDate])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await ownerAPI.getOrders({
        status: 'completed',
        ...(selectedDate && { date: selectedDate })
      })
      const validOrders = res.data?.data?.filter(order =>
        order.payment_status === 'received' ||
        order.payment_status === 'completed' ||
        order.payment_method === 'cash' ||
        order.order_status === 'completed'
      ) || []
      setOrders(validOrders)
    } catch {
      toast.error('Failed to load completed orders')
    } finally {
      setLoading(false)
    }
  }

  // Quick date presets
  const handleDatePreset = (mode) => {
    setDateFilterMode(mode)
    const today = new Date()
    if (mode === 'today') {
      setSelectedDate(today.toISOString().split('T')[0])
    } else if (mode === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      setSelectedDate(yesterday.toISOString().split('T')[0])
    } else {
      setSelectedDate('')
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        order.order_number?.toLowerCase().includes(q) ||
        String(order.daily_order_token).includes(q) ||
        String(order.table_number).toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.payment_method?.toLowerCase().includes(q)
      )
    })
  }, [orders, searchQuery])

  // Summary KPIs
  const stats = useMemo(() => {
    const totalCount = filteredOrders.length
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
    const avgOrderValue = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0
    const onlineOrders = filteredOrders.filter(o => o.payment_method === 'online' || o.payment_method === 'upi').length
    const cashOrders = filteredOrders.filter(o => o.payment_method === 'cash').length

    return { totalCount, totalRevenue, avgOrderValue, onlineOrders, cashOrders }
  }, [filteredOrders])

  const handlePrintReceipt = (order) => {
    const printWindow = window.open('', '_blank', 'width=420,height=650')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${order.order_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
            body { 
              font-family: 'Space Mono', monospace; 
              padding: 24px; 
              margin: 0; 
              font-size: 13px; 
              color: #0f172a; 
              background: #fff;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px dashed #cbd5e1; 
              padding-bottom: 14px; 
              margin-bottom: 16px; 
            }
            .title { font-size: 18px; font-weight: bold; margin: 0 0 4px; }
            .meta { font-size: 12px; color: #475569; margin: 2px 0; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .items th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 6px 0; font-size: 11px; text-transform: uppercase; }
            .items td { padding: 6px 0; vertical-align: top; }
            .total-row { 
              border-top: 2px dashed #cbd5e1; 
              padding-top: 12px; 
              font-weight: bold; 
              font-size: 16px; 
              display: flex;
              justify-content: space-between;
              margin-bottom: 16px;
            }
            .footer { 
              border-top: 1px solid #e2e8f0; 
              padding-top: 14px; 
              text-align: center; 
              font-size: 11px; 
              color: #64748b; 
              line-height: 1.5;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${user?.cafe_name || 'CUSTOMER RECEIPT'}</div>
            <div class="meta">Token #${order.daily_order_token || order.order_number?.slice(-3)} • Table ${order.table_number || 'Takeaway'}</div>
            <div class="meta">Order: #${order.order_number}</div>
            <div class="meta">${new Date(order.created_at).toLocaleString()}</div>
          </div>
          <table class="items">
            <thead>
              <tr>
                <th style="width: 32px;">Qty</th>
                <th>Item</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.items?.map(it => `
                <tr>
                  <td>${it.quantity}x</td>
                  <td>${it.name}</td>
                  <td style="text-align: right;">₹${it.price * it.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-row">
            <span>TOTAL AMOUNT</span>
            <span>₹${order.total_amount}</span>
          </div>
          <div class="footer">
            Method: ${order.payment_method?.toUpperCase()} (${order.payment_status?.toUpperCase()})<br/>
            ${order.customer_name ? `Guest: ${order.customer_name}<br/>` : ''}
            Thank you for dining with us! Come back soon.
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* ─── 1. Header & Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Archive & Auditing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Completed Orders & History
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Browse all finished, served, and settled customer orders with thermal receipt export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh order history"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              title="Card grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Top Summary KPI Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Archived Orders</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
            {stats.totalCount}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {stats.onlineOrders} online • {stats.cashOrders} cash
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-emerald-400">
            ₹{stats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            From filtered completed orders
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Ticket (AOV)</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
            ₹{stats.avgOrderValue}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Per completed ticket
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Payment Mix</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-[var(--text-primary)]">
            {stats.totalCount > 0 ? Math.round((stats.onlineOrders / stats.totalCount) * 100) : 0}%
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Online vs Cash payments
          </div>
        </div>
      </div>

      {/* ─── 3. Search & Date Filter Bar ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-medium)] p-3.5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by token, table, guest or order #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-medium)]">
            <button
              onClick={() => handleDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dateFilterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dateFilterMode === 'today' ? 'bg-indigo-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDatePreset('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dateFilterMode === 'yesterday' ? 'bg-indigo-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Yesterday
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)]">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setDateFilterMode('custom')
              }}
              className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => handleDatePreset('all')}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs ml-1"
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. Orders Content ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map(order => {
              const isCash = order.payment_method === 'cash'
              const formattedTime = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const formattedDate = new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })

              return (
                <div
                  key={order._id}
                  className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-[var(--border-hover)] p-5 shadow-sm transition-all flex flex-col justify-between gap-4 group"
                >
                  {/* Top Bar: Token & Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-center font-heading">
                          <span className="text-[10px] font-extrabold block leading-tight uppercase">TOKEN</span>
                          <span className="text-base font-black">
                            #{order.daily_order_token || order.order_number?.slice(-3) || '00'}
                          </span>
                        </div>
                        <div>
                          <div className="font-extrabold text-base text-[var(--text-primary)]">
                            Table {order.table_number || 'Takeaway'}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] font-mono">
                            #{order.order_number}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    </div>

                    {/* Customer & Timestamp row */}
                    <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] mb-3">
                      <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                        <User className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        <span>{order.customer_name || 'Walk-in Guest'}</span>
                      </div>
                      <div className="text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formattedDate}, {formattedTime}</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {order.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-primary)] font-medium truncate pr-2">
                            <span className="text-indigo-400 font-bold mr-1.5">{it.quantity}x</span>
                            {it.name}
                          </span>
                          <span className="text-[var(--text-secondary)] font-medium flex-shrink-0">
                            ₹{it.price * it.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="pt-3 border-t border-[var(--border-medium)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                        Total Settled
                      </span>
                      <span className="text-lg font-black text-emerald-400 font-heading">
                        ₹{order.total_amount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                        isCash
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {isCash ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        <span>{isCash ? 'Cash' : 'Online'}</span>
                      </span>

                      <button
                        onClick={() => handlePrintReceipt(order)}
                        title="Print thermal receipt"
                        className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)] transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        title="View order details"
                        className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-medium)] bg-[var(--bg-input)] text-xs uppercase font-bold text-[var(--text-secondary)]">
                    <th className="py-3 px-4">Token & Order #</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-medium)]">
                  {filteredOrders.map(order => {
                    const isCash = order.payment_method === 'cash'
                    const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0
                    return (
                      <tr key={order._id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-indigo-400">#{order.daily_order_token || order.order_number?.slice(-3)}</span>
                          <span className="text-xs text-[var(--text-tertiary)] block font-mono">#{order.order_number}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                          Table {order.table_number || 'Takeaway'}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-primary)]">
                          {order.customer_name || 'Walk-in'}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                          {new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                          {itemCount} items ({order.items?.map(i => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ')}{order.items?.length > 2 ? '...' : ''})
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-semibold border ${
                            isCash ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {isCash ? 'Cash' : 'Online'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 font-heading">
                          ₹{order.total_amount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintReceipt(order)}
                              title="Print thermal receipt"
                              className="p-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              title="View details"
                              className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="py-16 text-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] p-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center mx-auto mb-3 text-[var(--text-tertiary)]">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading mb-1">
            {searchQuery || selectedDate ? 'No Orders Match Your Filters' : 'No Completed Orders in Archive'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            {searchQuery || selectedDate
              ? 'Try clearing the search query or changing your date range.'
              : 'Orders completed and served in the live order screen will automatically appear here.'}
          </p>
          {(searchQuery || selectedDate) && (
            <button
              onClick={() => {
                setSearchQuery('')
                handleDatePreset('all')
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}

      {/* ─── 5. Order Details Modal ─── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-medium)] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold font-heading text-lg">
                  #{selectedOrder.daily_order_token || selectedOrder.order_number?.slice(-3)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Order Details • Table {selectedOrder.table_number || 'Takeaway'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    #{selectedOrder.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-xs">
                <div>
                  <span className="text-[var(--text-tertiary)] block">Date & Time</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)] block">Customer Name</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedOrder.customer_name || 'Walk-in Guest'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)] block">Payment Status</span>
                  <span className="font-semibold text-emerald-400 capitalize">
                    {selectedOrder.payment_status} ({selectedOrder.payment_method})
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)] block">Order Status</span>
                  <span className="font-semibold text-emerald-400 capitalize">
                    {selectedOrder.order_status}
                  </span>
                </div>
              </div>

              {selectedOrder.cooking_notes && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <strong>Special Instructions:</strong> {selectedOrder.cooking_notes}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Items Ordered
                </h4>
                <div className="divide-y divide-[var(--border-medium)] border border-[var(--border-medium)] rounded-xl overflow-hidden bg-[var(--bg-input)]">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {it.name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          ₹{it.price} each × {it.quantity}
                        </div>
                      </div>
                      <div className="font-bold text-[var(--text-primary)]">
                        ₹{it.price * it.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[var(--border-medium)]">
                <span className="font-bold text-[var(--text-primary)]">Total Paid</span>
                <span className="text-xl font-black text-emerald-400 font-heading">
                  ₹{selectedOrder.total_amount}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handlePrintReceipt(selectedOrder)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
