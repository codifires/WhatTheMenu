import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { publicAPI } from '../services/api';

export default function ContactUs() {
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState({
    contact_email: 'support@whatthemenu.com',
    support_phone: '+91 6351241474',
    support_whatsapp: '+91 96626 82051',
    support_hours: 'Mon - Sun, 9:00 AM - 10:00 PM IST',
    platform_name: 'WhatTheMenu'
  });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn);
    
    publicAPI.getSettings()
      .then(res => {
        if (res.data?.data) {
          setSettings(prev => ({...prev, ...res.data.data}));
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ background: 'var(--bg-shell)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* NAVBAR */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'var(--bg-topbar)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-light)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src="/logo.png" alt="WTM Logo" style={{ height: 70, width: 70, objectFit: 'cover', borderRadius: '50%' }} />
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', fontFamily: "'Outfit',sans-serif", color: 'var(--text-primary)' }}>
              WTM
            </span>
          </Link>

          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden-mobile">
            {['Features','How it works','Pricing'].map(l => (
              <Link key={l} to={"/#" + l.toLowerCase().replace(/ /g,'-')}
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color='var(--text-primary)'}
                onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>{l}</Link>
            ))}
            <Link to="/contact-us"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Contact Us
            </Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            <Link to="/owner/login" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 4px' }}
              className="hidden-mobile">Owner Login</Link>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ flex: 1, paddingTop: 160, paddingBottom: 100, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: 600, width: '100%', padding: '0 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, margin: '0 0 24px', fontFamily: "'Outfit',sans-serif" }}>
            Get in <span style={{ background: 'linear-gradient(135deg,#a78bfa,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Touch</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 48, lineHeight: 1.6 }}>
            Have a question or need support with {settings.platform_name}? We're here to help you get the most out of your digital menu.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <a href={"mailto:" + settings.contact_email} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 20, transition: 'transform 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✉️</div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1 }}>Email Support</p>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{settings.contact_email}</p>
                </div>
              </div>
            </a>

            {/* Phone */}
            <a href={"tel:" + settings.support_phone} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 20, transition: 'transform 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📞</div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1 }}>Phone Support</p>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{settings.support_phone}</p>
                </div>
              </div>
            </a>

            {/* WhatsApp */}
            <a href={"https://wa.me/" + (settings.support_whatsapp || '').replace(/[^0-9]/g, '')} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 20, transition: 'transform 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💬</div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1 }}>WhatsApp Chat</p>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{settings.support_whatsapp}</p>
                </div>
              </div>
            </a>

            <div style={{ marginTop: 16, padding: 16, background: 'var(--border-light)', borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                <strong>Support Hours:</strong> {settings.support_hours}
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 48 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 300 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, textDecoration: 'none', marginBottom: 8, width: 'fit-content' }}>
                <img src="/logo.png" alt="WTM Logo" style={{ height: 120, width: 120, objectFit: 'cover', borderRadius: '50%' }} />
              </Link>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>
                Empowering cafés with next-generation digital menus and seamless ordering.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>Product</span>
                <Link to="/owner/login" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Owner Login</Link>
                <Link to="/owner/register" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Register Café</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>Contact</span>
                <a href={"mailto:" + settings.contact_email} style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>{settings.contact_email}</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>Legal</span>
                <Link to="/terms" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms & Conditions</Link>
                <Link to="/privacy-policy" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link to="/refund-policy" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>Refund Policy</Link>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 32, display: 'flex', justifyContent: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>© 2024 What on the Menu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
