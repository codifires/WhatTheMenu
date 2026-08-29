import { Link } from 'react-router-dom'

const TermsAndConditions = () => {
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
        
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)', margin: '0 0 8px' }}>Terms & Conditions</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 40px' }}>Last Updated: August 10, 2026</p>

        <div style={{ lineHeight: 1.8, fontSize: 15, color: 'var(--text-secondary)' }}>

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using the WTM platform ("Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the Service.</p>
            <p>WTM is a SaaS (Software as a Service) platform that enables café owners to create digital QR menus, receive customer orders, and manage their business operations online.</p>
          </Section>

          <Section title="2. Definitions">
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>"Platform"</strong> refers to the WTM web application and all associated services.</li>
              <li><strong>"Owner"</strong> or <strong>"Café Owner"</strong> refers to a business that registers on the Platform to manage their café.</li>
              <li><strong>"Customer"</strong> refers to an end-user who scans a QR code to browse a café's menu and place orders.</li>
              <li><strong>"Admin"</strong> refers to the WTM platform administrators.</li>
              <li><strong>"Subscription"</strong> refers to the paid plan that grants Owners access to Platform features.</li>
            </ul>
          </Section>

          <Section title="3. Account Registration">
            <p>To use the Platform as a Café Owner, you must register an account by providing accurate and complete information including your name, email address, and business details.</p>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account.</p>
            <p>We reserve the right to suspend or terminate accounts that provide false or misleading information.</p>
          </Section>

          <Section title="4. Subscription Plans & Payments">
            <p>WTM offers subscription plans (e.g., Starter, Pro) with varying features. Pricing is displayed on the Platform and may be updated from time to time with prior notice.</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Subscription fees are charged on a monthly basis.</li>
              <li>Payment is processed via secure third-party payment gateways (e.g., Razorpay, PhonePe).</li>
              <li>All prices are in Indian Rupees (INR) and inclusive of applicable taxes unless stated otherwise.</li>
              <li>Free trial periods, if offered, are subject to separate terms and may be limited.</li>
              <li><strong>Service Suspension:</strong> Failure to pay the subscription fee will result in the immediate suspension of your café's digital menu and ordering system until payment is made.</li>
            </ul>
          </Section>

          <Section title="5. Café Owner Responsibilities">
            <p>As a Café Owner using the Platform, you agree to:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Provide accurate menu information including item names, descriptions, prices, and availability.</li>
              <li>Ensure all food items listed comply with local health and safety regulations.</li>
              <li>Handle customer orders promptly and professionally.</li>
              <li>Not use the Platform for any illegal, fraudulent, or harmful activities.</li>
              <li>Maintain accurate UPI/payment information for receiving customer payments.</li>
            </ul>
          </Section>

          <Section title="6. Customer Ordering">
            <p>Customers can browse menus and place orders via the Platform without creating an account. By placing an order, customers agree to:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Pay the total order amount as displayed at checkout.</li>
              <li>Provide accurate information when required (e.g., table number).</li>
              <li>Direct any food quality or order issues to the respective café owner.</li>
            </ul>
            <p>WTM acts solely as a technology platform connecting customers with café owners. We are not responsible for food quality, preparation, or delivery.</p>
          </Section>

          <Section title="7. Payments Between Customers and Café Owners">
            <p>Customer food order payments are made directly to the Café Owner's UPI/bank account. WTM does not hold, process, or intermediate these payments.</p>
            <p>Any payment disputes between a Customer and a Café Owner must be resolved directly between the two parties.</p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>All content, design, source code, logos, and trademarks associated with WTM are the exclusive property of WTM and are protected under applicable intellectual property laws.</p>
            <p>Café Owners retain ownership of their menu content (item names, descriptions, images) uploaded to the Platform.</p>
          </Section>

          <Section title="9. Data Usage">
            <p>We collect and use personal data in accordance with our <Link to="/privacy-policy" style={{ color: '#f59e0b', textDecoration: 'underline' }}>Privacy Policy</Link>. By using the Platform, you consent to such data collection and processing.</p>
          </Section>

          <Section title="10. Service Availability">
            <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the Platform. We reserve the right to temporarily suspend the Service for maintenance, updates, or unforeseen circumstances.</p>
            <p>We are not liable for any losses arising from service downtime.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>To the maximum extent permitted by law, WTM shall not be liable for:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Any indirect, incidental, or consequential damages arising from the use of the Platform.</li>
              <li>Loss of revenue, data, or business opportunities.</li>
              <li>Food quality, hygiene, or safety issues at any café using the Platform.</li>
              <li>Payment disputes between Customers and Café Owners.</li>
            </ul>
          </Section>

          <Section title="12. Termination">
            <p>We may suspend or terminate your account at our discretion if you violate these Terms. Upon termination:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Your access to the Platform will be revoked immediately.</li>
              <li>Any outstanding subscription fees remain payable.</li>
              <li>Your menu data may be deleted after a reasonable retention period.</li>
            </ul>
          </Section>

          <Section title="13. Modifications to Terms">
            <p>We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section title="14. Governing Law">
            <p>These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in India.</p>
          </Section>

          <Section title="15. Contact Us">
            <p>If you have any questions about these Terms, please contact us:</p>
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

export default TermsAndConditions
