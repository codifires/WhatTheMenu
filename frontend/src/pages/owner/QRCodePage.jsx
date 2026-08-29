import { useState, useEffect, useRef } from 'react'
import { ownerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { Download, Printer, RefreshCw, ExternalLink, QrCode as QrIcon, Copy, Check } from 'lucide-react'

const QRCodePage = () => {
  const { user } = useAuth()
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef(null)

  const cafeId = user?.id || user?._id || qrData?.cafe_id
  const liveMenuUrl = qrData?.menu_url && !qrData.menu_url.startsWith('*') && qrData.menu_url.startsWith('http')
    ? qrData.menu_url
    : (cafeId ? `${window.location.origin}/menu/${cafeId}` : window.location.origin)

  useEffect(() => {
    fetchQR()
  }, [])

  const fetchQR = async () => {
    try {
      const res = await ownerAPI.getQRCode()
      setQrData(res.data.data)
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
      setQrData(res.data.data)
      toast.success('QR code updated successfully!')
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

      canvas.width = 600
      canvas.height = 600

      img.onload = () => {
        // Draw white background
        ctx.fillStyle = 'var(--text-primary)'
        ctx.fillRect(0, 0, 600, 600)
        // Draw QR code centered with padding
        ctx.drawImage(img, 50, 50, 500, 500)

        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `${user?.cafe_name || 'cafe'}-qr-menu.png`
        downloadLink.href = pngFile
        downloadLink.click()
        toast.success('High-res QR Code downloaded!')
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    } catch (e) {
      toast.error('Could not download QR code')
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Menu QR Standee - ${user?.cafe_name || 'Café'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;800;900&family=Inter:wght@400;600&display=swap');
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
              max-width: 440px;
              padding: 48px 36px;
              border-radius: 32px;
              box-shadow: 0 20px 40px var(--overlay-bg);
              border: 3px solid #0f172a;
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
              margin: 0 0 32px;
              font-weight: 500;
            }
            .qr-wrapper {
              background: #ffffff;
              padding: 24px;
              border-radius: 24px;
              display: inline-block;
              box-shadow: 0 10px 30px var(--overlay-bg);
              border: 2px solid #e2e8f0;
              margin-bottom: 28px;
            }
            .action-title {
              font-family: 'Outfit', sans-serif;
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 6px;
            }
            .url-text {
              font-size: 11px;
              color: #94a3b8;
              margin: 0;
              word-break: break-all;
            }
            @media print {
              body { background: transparent; padding: 0; }
              .standee { box-shadow: none; border-width: 2px; }
            }
          </style>
        </head>
        <body>
          <div class="standee">
            <h1 class="cafe-title">${user?.cafe_name || 'Our Digital Menu'}</h1>
            <p class="sub-title">Scan with any smartphone camera to browse & order</p>
            <div class="qr-wrapper">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(liveMenuUrl)}" width="240" height="240" alt="QR Menu" />
            </div>
            <div class="action-title">📱 Scan to View Menu & Order</div>
            <p class="url-text">${liveMenuUrl}</p>
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
    <div style={{ fontFamily: "'Inter',sans-serif", color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px 16px' }}>
      
      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeIn 0.5s ease' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: 'var(--cyan-bg-light)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--cyan-text)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          <QrIcon size={16} /> Tabletop QR Standee
        </div>
        <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, margin: '0 0 8px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>
          Your Digital Menu QR Code
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 460 }}>
          Customers scan this QR code with their mobile phone camera to view your menu, customize items, and place instant orders.
        </p>
      </div>

      {/* ── QR Card ── */}
      <div style={{ width: '100%', maxWidth: 440, animation: 'slideUp 0.5s ease 0.1s both' }}>
        <div style={{ padding: '36px 28px', borderRadius: 28, background: 'linear-gradient(145deg, var(--border-light) 0%, var(--border-light) 100%)', border: '1px solid var(--border-medium)', boxShadow: '0 25px 50px -12px var(--overlay-bg)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          
          {/* Decorative Radial Glow */}
          <div style={{ position: 'absolute', top: '40%', left: '50%', width: 220, height: 220, background: 'var(--cyan-bg-light)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {loading ? (
              <div style={{ width: 220, height: 220, margin: '0 auto 24px', borderRadius: 24, background: 'var(--border-light)', animation: 'pulse 1.5s ease infinite' }} />
            ) : (
              <>
                {/* QR Code Container */}
                <div style={{ background: 'var(--text-primary)', padding: 18, borderRadius: 24, display: 'inline-block', marginBottom: 20, boxShadow: '0 12px 36px var(--overlay-bg)' }}>
                  <QRCode
                    id="digital-menu-qr-code"
                    value={liveMenuUrl}
                    size={200}
                    level="H"
                    style={{ height: 'auto', maxWidth: '100%', width: '100%', display: 'block' }}
                  />
                </div>

                <p style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px', fontFamily: "'Outfit',sans-serif" }}>
                  Scan to Order
                </p>

                {/* Clickable Live URL Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card-hover)', border: '1px solid var(--border-medium)', padding: '8px 12px', borderRadius: 12, margin: '0 0 24px', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace' }}>
                    {liveMenuUrl}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    title="Copy Link"
                    style={{ background: 'var(--border-medium)', border: 'none', borderRadius: 8, padding: '6px', color: copied ? 'var(--success-text)' : 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <a
                    href={liveMenuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Live Menu"
                    style={{ background: 'var(--cyan-border-medium)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, padding: '6px', color: 'var(--cyan-text)', display: 'flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={handleDownload}
                    style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(6,182,212,0.3)', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                  >
                    <Download size={16} /> Download PNG
                  </button>
                  <button
                    onClick={handlePrint}
                    style={{ padding: '13px', borderRadius: 14, border: '1px solid var(--border-medium)', background: 'var(--border-light)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--border-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background='var(--border-light)'}
                  >
                    <Printer size={16} /> Print Standee
                  </button>
                </div>
                
                {/* Secondary Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 18 }}>
                  <button
                    onClick={handleRegenerate}
                    style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}
                  >
                    <RefreshCw size={13} /> Refresh Cloud QR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

export default QRCodePage
