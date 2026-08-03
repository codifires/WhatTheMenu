import { useState, useEffect } from 'react'
import { ownerAPI } from '../../services/api'
import toast from 'react-hot-toast'

const QRCodePage = () => {
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchQR() }, [])

  const fetchQR = async () => {
    try {
      const res = await ownerAPI.getQRCode()
      setQrData(res.data.data)
    } catch (error) {
      toast.error('Failed to load QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    try {
      const res = await ownerAPI.regenerateQRCode()
      setQrData(res.data.data)
      toast.success('QR code regenerated')
    } catch (error) {
      toast.error('Failed to regenerate')
    }
  }

  const handleDownload = () => {
    if (!qrData?.qr_image) return
    const link = document.createElement('a')
    link.download = 'cafe-qr-menu.png'
    link.href = qrData.qr_image
    link.click()
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head><title>QR Menu Code</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif;background:#fff;">
          <div style="text-align:center;padding:40px;border:2px dashed #ccc;border-radius:20px;">
            <h2 style="margin:0 0 10px;font-size:24px;">Scan to View Menu</h2>
            <p style="margin:0 0 30px;color:#666;">Place your order directly from your phone!</p>
            <img src="${qrData.qr_image}" style="width:300px;height:300px;display:block;margin:0 auto;" />
            <p style="margin-top:30px;color:#888;font-size:12px;">${qrData.menu_url}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
      
      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: 'fadeIn 0.5s ease' }}>
        <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, margin: '0 0 8px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px' }}>Your Digital Menu</h1>
        <p style={{ fontSize: 15, color: '#9ca3af', margin: 0, maxWidth: 400 }}>Print or share this QR code so customers can easily browse your menu and place orders.</p>
      </div>

      {/* ── QR Card ── */}
      <div style={{ width: '100%', maxWidth: 420, animation: 'slideUp 0.5s ease 0.1s both' }}>
        <div style={{ padding: 40, borderRadius: 28, background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          
          {/* Decorative glow */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, background: 'rgba(6,182,212,0.2)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {loading ? (
              <div style={{ width: 240, height: 240, margin: '0 auto 24px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />
            ) : qrData ? (
              <>
                <div style={{ background: '#fff', padding: 16, borderRadius: 24, display: 'inline-block', marginBottom: 24, boxShadow: '0 10px 30px rgba(6,182,212,0.15)' }}>
                  <img src={qrData.qr_image} alt="QR Code" style={{ width: 220, height: 220, display: 'block' }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Scan to Order</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 32px', wordBreak: 'break-all' }}>{qrData.menu_url}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button onClick={handleDownload} style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(6,182,212,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </button>
                  <button onClick={handlePrint} style={{ padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print
                  </button>
                </div>
                
                <button onClick={handleRegenerate} style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none', background: 'transparent', color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='#9ca3af'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Generate New Code
                </button>
              </>
            ) : (
              <p style={{ color: '#ef4444', fontSize: 14 }}>Failed to load QR code</p>
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
