import React from 'react'

const Maintenance = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a1a2c 0%, #080f1e 50%, #080c14 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60vw',
        height: '40vh',
        background: 'radial-gradient(ellipse, rgba(79,70,229,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vh',
        background: 'radial-gradient(ellipse, rgba(6,182,212,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Glass Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 520,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 24,
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeInUp 0.6s ease-out forwards'
      }}>
        
        {/* Animated Icon Container */}
        <div style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(6,182,212,0.1))',
          border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px',
          boxShadow: '0 0 32px rgba(6,182,212,0.15), inset 0 0 24px rgba(79,70,229,0.1)',
          position: 'relative'
        }}>
          {/* Pulsing rings */}
          <div style={{
            position: 'absolute',
            inset: -12,
            border: '1px dashed rgba(6,182,212,0.3)',
            borderRadius: 36,
            animation: 'spin 12s linear infinite'
          }} />
          <div style={{
            position: 'absolute',
            inset: -24,
            border: '1px solid rgba(79,70,229,0.15)',
            borderRadius: 44,
            animation: 'spin 24s linear infinite reverse'
          }} />
          
          <span style={{ fontSize: 42, filter: 'drop-shadow(0 4px 12px rgba(6,182,212,0.4))' }}>☕</span>
        </div>

        {/* Typography */}
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 36,
          fontWeight: 900,
          margin: '0 0 16px',
          background: 'linear-gradient(180deg, #ffffff 0%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px'
        }}>
          We're brewing an update
        </h1>
        
        <p style={{
          fontSize: 15,
          color: '#94a3b8',
          lineHeight: 1.6,
          margin: '0 auto 32px',
          maxWidth: '90%'
        }}>
          The QRMenu platform is currently undergoing scheduled maintenance to bring you exciting new features and better performance. We'll be back online shortly!
        </p>

        {/* Status indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 20px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 100,
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div style={{ position: 'relative', width: 8, height: 8 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <div style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            System Updates in Progress
          </span>
        </div>
      </div>

      <p style={{
        marginTop: 48,
        fontSize: 12,
        color: '#475569',
        fontWeight: 500,
        position: 'relative',
        zIndex: 10
      }}>
        &copy; {new Date().getFullYear()} QRMenu SaaS. All rights reserved.
      </p>

      {/* Embedded Animations */}
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes ping {
            75%, 100% { transform: scale(2.5); opacity: 0; }
          }
        `}
      </style>
    </div>
  )
}

export default Maintenance
