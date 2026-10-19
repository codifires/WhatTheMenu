import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { publicAPI } from '../services/api';
import { Mail, Phone, MessageSquare, Clock, ArrowLeft, Coffee, Sparkles } from 'lucide-react';

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
    <div style={{ background: 'var(--bg-shell, #090d16)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* NAVBAR */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'var(--bg-topbar, rgba(13, 17, 32, 0.85))' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-medium)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}>
              <Coffee size={20} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', fontFamily: "'Outfit',sans-serif", color: 'var(--text-primary)' }}>
              WhatTheMenu
            </span>
          </Link>

          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden-mobile">
            {['Features','How it works','Pricing'].map(l => (
              <Link key={l} to={"/#" + l.toLowerCase().replace(/ /g,'-')}
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
                {l}
              </Link>
            ))}
            <Link to="/contact-us"
              style={{ fontSize: 14, fontWeight: 700, color: '#06b6d4', textDecoration: 'none' }}>
              Contact Us
            </Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            <Link to="/owner/login" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 12px' }}
              className="hidden-mobile">Owner Login</Link>
            <Link to="/owner/register" style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', textDecoration: 'none', padding: '9px 18px', borderRadius: 10, boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ flex: 1, paddingTop: 140, paddingBottom: 80, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79, 70, 229, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: 620, width: '100%', padding: '0 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', color: '#06b6d4', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            <Sparkles size={13} />
            <span>Support & Helpdesk</span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, margin: '0 0 16px', fontFamily: "'Outfit',sans-serif", letterSpacing: '-1px' }}>
            Get in <span style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Touch</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.6 }}>
            Have a question or need assistance with {settings.platform_name}? Our restaurant operations team is here to help you succeed.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <a href={"mailto:" + settings.contact_email} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '22px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', gap: 18, transition: 'all 0.2s', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform='translateY(0)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(79, 70, 229, 0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={22} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Email Support</p>
                  <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{settings.contact_email}</p>
                </div>
              </div>
            </a>

            {/* Phone */}
            <a href={"tel:" + settings.support_phone} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '22px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', gap: 18, transition: 'all 0.2s', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform='translateY(0)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={22} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Phone Helpline</p>
                  <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{settings.support_phone}</p>
                </div>
              </div>
            </a>

            {/* WhatsApp */}
            <a href={"https://wa.me/" + (settings.support_whatsapp || '').replace(/[^0-9]/g, '')} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '22px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', gap: 18, transition: 'all 0.2s', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform='translateY(0)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={22} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Direct WhatsApp</p>
                  <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{settings.support_whatsapp}</p>
                </div>
              </div>
            </a>

            <div style={{ marginTop: 12, padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Clock size={16} color="var(--text-tertiary)" />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <strong>Operating Schedule:</strong> {settings.support_hours}
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border-medium)', padding: '48px 24px 32px', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Coffee size={18} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                  WhatTheMenu
                </span>
              </Link>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>
                Empowering cafés with next-generation digital menus and seamless ordering.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Product</span>
                <Link to="/owner/login" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Owner Login</Link>
                <Link to="/owner/register" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Register Café</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Support</span>
                <Link to="/contact-us" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Help Center</Link>
                <a href={"mailto:" + settings.contact_email} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>{settings.contact_email}</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Legal</span>
                <Link to="/terms" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms & Conditions</Link>
                <Link to="/privacy-policy" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link to="/refund-policy" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Refund Policy</Link>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-medium)', paddingTop: 24, display: 'flex', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>© {new Date().getFullYear()} WhatTheMenu SaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
