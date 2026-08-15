import { Link } from 'react-router-dom'

const PrivacyPolicy = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e5e7eb', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="WTM Logo" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: '50%' }} />
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>WTM</span>
          </Link>
          <Link to="/" style={{ fontSize: 14, color: '#9ca3af', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#fff', margin: '0 0 8px' }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 40px' }}>Last Updated: August 10, 2026</p>

        <div style={{ lineHeight: 1.8, fontSize: 15, color: '#d1d5db' }}>

          <Section title="1. Introduction">
            <p>WTM ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
            <p>This policy applies to all users of the WTM platform, including Café Owners, Customers, and Administrators.</p>
          </Section>

          <Section title="2. Information We Collect">
            
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '16px 0 8px' }}>2.1 Café Owner Information</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li>Full name and contact details (email, phone number)</li>
              <li>Café name, address, and logo</li>
              <li>UPI ID or payment details for receiving customer payments</li>
              <li>Menu content (item names, descriptions, prices, images)</li>
              <li>Subscription and billing information</li>
              <li>Login credentials (passwords are encrypted and never stored in plain text)</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '16px 0 8px' }}>2.2 Customer Information</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li>Order details (items ordered, quantities, total amount)</li>
              <li>Table number (if provided)</li>
              <li>Feedback and star ratings (if submitted)</li>
              <li>Device and browser information (for analytics)</li>
            </ul>
            <p><strong>Note:</strong> Customers are NOT required to create an account or provide personal information to browse menus or place orders.</p>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '16px 0 8px' }}>2.3 Automatically Collected Information</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li>IP address and approximate location</li>
              <li>Browser type and device information</li>
              <li>Pages visited and time spent on the Platform</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the collected information for the following purposes:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Service Delivery:</strong> To provide, maintain, and improve the Platform's features and functionality.</li>
              <li><strong>Account Management:</strong> To create and manage Café Owner accounts, process subscriptions, and provide customer support.</li>
              <li><strong>Order Processing:</strong> To facilitate real-time order management between Customers and Café Owners.</li>
              <li><strong>Communication:</strong> To send service-related notifications, updates, and support responses.</li>
              <li><strong>Analytics:</strong> To understand usage patterns and improve user experience.</li>
              <li><strong>Security:</strong> To detect and prevent fraud, unauthorized access, and other security threats.</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing & Disclosure">
            <p>We do NOT sell your personal information to third parties. We may share data in the following situations:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>With Payment Processors:</strong> Subscription payment data is shared with our payment gateway partner (e.g., Razorpay) to process transactions securely.</li>
              <li><strong>Between Café Owners and Customers:</strong> Order details are shared with the respective Café Owner to fulfill orders.</li>
              <li><strong>Legal Requirements:</strong> If required by law, court order, or government regulation.</li>
              <li><strong>Service Providers:</strong> With trusted third-party services (e.g., cloud hosting, email services) that help us operate the Platform, subject to confidentiality agreements.</li>
            </ul>
          </Section>

          <Section title="5. Data Storage & Security">
            <p>We implement industry-standard security measures to protect your data:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>All passwords are encrypted using bcrypt hashing (never stored in plain text).</li>
              <li>Data is transmitted over HTTPS (SSL/TLS encryption).</li>
              <li>Our database is hosted on MongoDB Atlas with enterprise-grade security.</li>
              <li>Access to user data is restricted to authorized personnel only.</li>
              <li>We conduct regular security audits and monitoring.</li>
            </ul>
            <p>While we strive to protect your data, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.</p>
          </Section>

          <Section title="6. Cookies">
            <p>We use cookies and similar technologies to:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Keep you signed in to your account.</li>
              <li>Remember your preferences and settings.</li>
              <li>Analyze Platform usage and performance.</li>
            </ul>
            <p>You can control cookies through your browser settings. Disabling cookies may affect certain features of the Platform.</p>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain your data for as long as your account is active or as needed to provide you services. Specifically:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Café Owner Data:</strong> Retained until account deletion is requested.</li>
              <li><strong>Order Data:</strong> Retained for up to 12 months for analytics and dispute resolution.</li>
              <li><strong>Payment Records:</strong> Retained as required by Indian tax and financial regulations.</li>
            </ul>
            <p>Upon account deletion request, we will remove your personal data within 30 days, except where retention is required by law.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Access:</strong> Request a copy of your personal data we hold.</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information via your dashboard settings.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format.</li>
              <li><strong>Objection:</strong> Object to the processing of your data for marketing purposes.</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:codifires@gmail.com" style={{ color: '#f59e0b' }}>codifires@gmail.com</a>.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children. If we become aware that a child has provided us with personal data, we will take steps to delete such information.</p>
          </Section>

          <Section title="10. Third-Party Links">
            <p>The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those third parties. We encourage you to review their privacy policies before providing any personal information.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy periodically.</p>
          </Section>

          <Section title="12. Contact Us">
            <p>If you have any questions or concerns about this Privacy Policy, please contact us:</p>
            <ul style={{ paddingLeft: 20, listStyle: 'none' }}>
              <li>📧 Email: <a href="mailto:codifires@gmail.com" style={{ color: '#f59e0b' }}>codifires@gmail.com</a></li>
              <li>🌐 Website: <a href="https://whatthemanu.vercel.app" style={{ color: '#f59e0b' }}>whatthemanu.vercel.app</a></li>
            </ul>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>© 2026 WTM. All rights reserved.</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@700;800;900&display=swap');
      `}</style>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>{title}</h2>
    <div style={{ color: '#d1d5db' }}>{children}</div>
  </div>
)

export default PrivacyPolicy
