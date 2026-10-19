import { useState, useEffect, useRef } from 'react'
import { ownerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { 
  Download, Printer, RefreshCw, ExternalLink, QrCode as QrIcon, 
  Copy, Check, Sparkles, UtensilsCrossed, Hash
} from 'lucide-react'

const QRCodePage = () => {
  const { user } = useAuth()
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [selectedTab, setSelectedTab] = useState('general') // 'general' | 'table'

  const cafeId = user?.id || user?._id || qrData?.cafe_id
  const baseMenuUrl = qrData?.menu_url && !qrData.menu_url.startsWith('*') && qrData.menu_url.startsWith('http')
    ? qrData.menu_url
    : (cafeId ? `${window.location.origin}/${cafeId}/menu` : window.location.origin)

  // Computed URL depending on table selection
  const liveMenuUrl = selectedTab === 'table' && tableNumber.trim()
    ? `${baseMenuUrl}?table=${encodeURIComponent(tableNumber.trim())}`
    : baseMenuUrl

  useEffect(() => {
    fetchQR()
  }, [])

  const fetchQR = async () => {
    try {
      const res = await ownerAPI.getQRCode()
      setQrData(res.data?.data)
    } catch (error) {
      console.warn('QR code fallback to client-side generation')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setLoading(true)
    try {
      const res = await ownerAPI.regenerateQRCode()
      setQrData(res.data?.data)
      toast.success('QR Code cloud sync refreshed!')
    } catch (error) {
      toast.error('Failed to regenerate QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(liveMenuUrl)
    setCopied(true)
    toast.success('Menu link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    try {
      const svg = document.getElementById('digital-menu-qr-code')
      if (!svg) return

      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      canvas.width = 800
      canvas.height = 1000

      img.onload = () => {
        // Draw white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 800, 1000)

        // Draw header
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(user?.cafe_name || 'Our Café Menu', 400, 100)

        ctx.fillStyle = '#64748b'
        ctx.font = '20px sans-serif'
        if (selectedTab === 'table' && tableNumber.trim()) {
          ctx.fillText(`Table ${tableNumber.trim()} • Scan to Browse & Order`, 400, 140)
        } else {
          ctx.fillText('Scan with any phone camera to view menu & order', 400, 140)
        }

        // Draw QR Code in Center
        ctx.drawImage(img, 150, 190, 500, 500)

        // Draw Footer pill
        ctx.fillStyle = '#f1f5f9'
        ctx.beginPath()
        ctx.roundRect(150, 740, 500, 70, [16])
        ctx.fill()

        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 22px sans-serif'
        ctx.fillText(
          selectedTab === 'table' && tableNumber.trim() ? `Table ${tableNumber.trim()}` : 'Digital Menu & Instant Ordering',
          400,
          782
        )

        ctx.fillStyle = '#94a3b8'
        ctx.font = '16px monospace'
        ctx.fillText(liveMenuUrl, 400, 860)

        ctx.font = '14px sans-serif'
        ctx.fillText('Powered by WhatTheMenu', 400, 930)

        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        const fileName = selectedTab === 'table' && tableNumber.trim()
          ? `${user?.cafe_name || 'cafe'}-table-${tableNumber.trim()}-qr.png`
          : `${user?.cafe_name || 'cafe'}-digital-menu-qr.png`
        downloadLink.download = fileName.replace(/\s+/g, '-').toLowerCase()
        downloadLink.href = pngFile
        downloadLink.click()
        toast.success('High-resolution QR Standee downloaded!')
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    } catch (e) {
      toast.error('Could not download QR code')
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const tableLabel = selectedTab === 'table' && tableNumber.trim() ? `Table ${tableNumber.trim()}` : null

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Menu Standee - ${user?.cafe_name || 'Café'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap');
            body {
              margin: 0;
              padding: 40px 20px;
              background: #f8fafc;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              font-family: 'Inter', sans-serif;
              box-sizing: border-box;
            }
            .standee {
              background: #ffffff;
              width: 100%;
              max-width: 420px;
              padding: 48px 36px;
              border-radius: 28px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.06);
              border: 2px solid #e2e8f0;
              text-align: center;
            }
            .cafe-title {
              font-family: 'Outfit', sans-serif;
              font-size: 28px;
              font-weight: 900;
              color: #0f172a;
              margin: 0 0 6px;
              text-transform: capitalize;
            }
            .sub-title {
              font-size: 14px;
              color: #64748b;
              margin: 0 0 28px;
              font-weight: 500;
            }
            .table-badge {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              font-size: 13px;
              font-weight: 800;
              padding: 6px 18px;
              border-radius: 9999px;
              margin-bottom: 24px;
              letter-spacing: 0.5px;
            }
            .qr-wrapper {
              background: #ffffff;
              padding: 20px;
              border-radius: 24px;
              display: inline-block;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
              border: 1.5px solid #e2e8f0;
              margin-bottom: 24px;
            }
            .action-title {
              font-family: 'Outfit', sans-serif;
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 6px;
            }
            .instruction {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 16px;
            }
            .url-text {
              font-size: 11px;
              color: #94a3b8;
              margin: 0 0 24px;
              word-break: break-all;
              font-family: monospace;
            }
            .footer-branding {
              font-size: 11px;
              color: #cbd5e1;
              font-weight: 600;
            }
            @media print {
              body { background: transparent; padding: 0; }
              .standee { box-shadow: none; border-width: 1px; }
            }
          </style>
        </head>
        <body>
          <div class="standee">
            <h1 class="cafe-title">${user?.cafe_name || 'Our Digital Menu'}</h1>
            <p class="sub-title">Contactless Mobile Ordering</p>
            ${tableLabel ? `<div class="table-badge">${tableLabel}</div>` : ''}
            <div class="qr-wrapper">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(liveMenuUrl)}" width="240" height="240" alt="QR Menu" />
            </div>
            <div class="action-title">Scan to View Menu & Order</div>
            <p class="instruction">Point your mobile camera at the QR code above</p>
            <p class="url-text">${liveMenuUrl}</p>
            <div class="footer-branding">Powered by WhatTheMenu</div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <div className="text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <QrIcon className="w-3.5 h-3.5" />
            <span>Contactless Ordering</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            QR Code Generator & Standee
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Display these QR codes on your dining tables or front desk so guests can scan and order instantly.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center justify-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Cloud QR</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Standee Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: QR Config & Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Tab Selection */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              1. Choose Standee Type
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTab('general')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedTab === 'general'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                    : 'border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">General Menu</div>
                <div className="text-xs text-[var(--text-secondary)]">For front counter or takeaway</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('table')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedTab === 'table'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                    : 'border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">Table Specific</div>
                <div className="text-xs text-[var(--text-secondary)]">Pre-fills table number in cart</div>
              </button>
            </div>

            {/* Table Number Input if Table Selected */}
            {selectedTab === 'table' && (
              <div className="pt-2 animate-fadeIn">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Table Number or Label
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 1, 2, Patio-A, VIP-1"
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="text-[11px] text-[var(--text-secondary)] mr-1 self-center">Quick pick:</span>
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTableNumber(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        tableNumber === num
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      T-{num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* URL Box */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              2. Menu Direct URL
            </h2>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)]">
              <span className="text-xs text-[var(--text-secondary)] font-mono truncate flex-1 pl-1">
                {liveMenuUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                title="Copy link"
                className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={liveMenuUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open live customer menu"
                className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG Standee</span>
              </button>

              <button
                onClick={handlePrint}
                className="py-3 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Table Standee</span>
              </button>
            </div>
            
            <p className="text-xs text-center text-[var(--text-tertiary)]">
              Print in standard 4x6" or 5x7" tabletop acrylic holders for optimal durability.
            </p>
          </div>
        </div>

        {/* Right Column: Live Table Standee Preview */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white text-slate-900 p-8 shadow-2xl border-4 border-slate-900 text-center relative overflow-hidden transition-all duration-300">
            {/* Top Brand Accent */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <UtensilsCrossed className="w-6 h-6" />
            </div>

            <h3 className="text-2xl font-black font-heading tracking-tight capitalize text-slate-900">
              {user?.cafe_name || 'Our Café'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5 mb-4">
              Contactless Mobile Ordering
            </p>

            {/* Table Badge */}
            {selectedTab === 'table' && tableNumber.trim() && (
              <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider mb-4 shadow-sm animate-scaleIn">
                <Hash className="w-3.5 h-3.5" />
                <span>Table {tableNumber.trim()}</span>
              </div>
            )}

            {/* QR Code Container with High-Res SVG */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 inline-block shadow-inner mb-4">
              <QRCode
                id="digital-menu-qr-code"
                value={liveMenuUrl}
                size={220}
                level="H"
                style={{ height: 'auto', maxWidth: '100%', width: '100%', display: 'block' }}
              />
            </div>

            <h4 className="text-base font-extrabold text-slate-900 mb-1">
              Scan to Browse & Order
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-3 leading-relaxed">
              Open your smartphone camera and point it at the QR code above. No app download needed!
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>WhatTheMenu</span>
              <span>Fast & Safe Ordering</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRCodePage
