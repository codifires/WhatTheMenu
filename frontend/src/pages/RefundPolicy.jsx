import { Link } from 'react-router-dom'

const RefundPolicy = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="WTM Logo" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: '50%' }} />
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>WTM</span>
          </Link>
          <Link to="/" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)', margin: '0 0 8px' }}>Refund & Cancellation Policy</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 40px' }}>Last Updated: August 10, 2026</p>

        <div style={{ lineHeight: 1.8, fontSize: 15, color: 'var(--text-secondary)' }}>

          <Section title="1. Overview">
            <p>At WTM, we strive to ensure a seamless experience for both our Café Owners (Subscribers) and their Customers. This policy outlines the conditions under which refunds and cancellations are processed.</p>
          </Section>

          <Section title="2. SaaS Subscriptions (For Café Owners)">
            
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>2.1 Subscription Cancellations</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li>You may cancel your WTM subscription at any time from your Owner Dashboard.</li>
              <li>Upon cancellation, your subscription will remain active until the end of your current billing cycle.</li>
              <li>We do not charge any cancellation fees.</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>2.2 Refund Eligibility for Subscriptions</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Non-Refundable:</strong> Subscription payments are generally non-refundable once the billing cycle has started.</li>
              <li><strong>Exceptions:</strong> A pro-rated refund may be issued if you experienced prolonged technical issues caused by our platform that prevented you from using the service, provided you reported the issue to our support team within 48 hours.</li>
              <li>If you believe you were charged in error, please contact us within 7 days of the charge for a full refund.</li>
            </ul>
          </Section>

          <Section title="3. Food Orders (For Customers)">
            <p>WTM provides the technology platform for ordering but does not prepare, sell, or deliver food.</p>
            
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>3.1 Order Cancellations</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li>Order cancellations are at the sole discretion of the specific Café where the order was placed.</li>
              <li>Once an order is marked as "Preparing" by the café, it typically cannot be cancelled.</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>3.2 Refunds for Food Orders</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li>Any refund requests for food quality, missing items, or delayed service must be directed to the Café Owner.</li>
              <li>If a refund is approved by the Café Owner, the payment will be reversed to your original payment method.</li>
              <li>WTM is not liable for issuing refunds for food orders placed with independent cafés.</li>
            </ul>
          </Section>

          <Section title="4. Payment Gateway Failures">
            <p>In the event that a payment fails but the amount is debited from your account (Customer or Café Owner):</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>The payment gateway (e.g., Cashfree) will automatically initiate a refund to the original payment source.</li>
              <li>This process typically takes 5 to 7 business days depending on your bank.</li>
            </ul>
          </Section>

          <Section title="5. How to Request a Refund">
            <p>To request a refund for a SaaS Subscription, please email our support team with your registered email address, transaction ID, and the reason for your request.</p>
          </Section>

          <Section title="6. Contact Us">
            <p>If you have any questions regarding this Refund Policy, please reach out to us:</p>
            <ul style={{ paddingLeft: 20, listStyle: 'none' }}>
              <li>📧 Email: <a href="mailto:codifires@gmail.com" style={{ color: '#f59e0b' }}>codifires@gmail.com</a></li>
              <li>🌐 Website: <a href="https://whatthemanu.vercel.app" style={{ color: '#f59e0b' }}>whatthemanu.vercel.app</a></li>
            </ul>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>© 2026 WTM. All rights reserved.</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
      `}</style>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>{title}</h2>
    <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
  </div>
)

export default RefundPolicy
