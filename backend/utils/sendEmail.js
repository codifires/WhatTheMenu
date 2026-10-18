const nodemailer = require('nodemailer');

/**
 * Creates a configured Nodemailer Transporter
 * Handles Gmail service specifically to avoid cloud hosting port conflicts (e.g., Render blocking port 25/587)
 * Sanitizes Google App Passwords by removing display spaces
 */
const createEmailTransporter = () => {
  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  const user = (process.env.SMTP_EMAIL || process.env.FROM_EMAIL || '').trim();
  // Google App Passwords often have spaces (e.g., "abcd efgh ijkl mnop"). Strip them for SMTP authentication.
  const pass = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');

  if (isGmail) {
    // When using Gmail, nodemailer's well-known service profile manages direct SSL connection seamlessly
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass
      },
      connectionTimeout: 15000,
      socketTimeout: 20000
    });
  }

  // Standard SMTP configuration for custom providers (SendGrid, Mailgun, Amazon SES, Brevo, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465, // true for 465, false for 587/25
    auth: {
      user: (process.env.SMTP_USER || user),
      pass: pass
    },
    tls: {
      rejectUnauthorized: false // Avoid SSL certificate handshake failures behind cloud proxies
    },
    connectionTimeout: 15000,
    socketTimeout: 20000
  });
};

const sendEmail = async (options) => {
  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  const user = (process.env.SMTP_EMAIL || process.env.FROM_EMAIL || '').trim();

  // If credentials are dummy/unconfigured or simulation mode is explicitly enabled
  const isSimulated = !host || host === 'smtp.example.com' || process.env.SIMULATE_EMAIL === 'true';

  if (isSimulated) {
    console.log('\n--- ✉️ [SIMULATED EMAIL] ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: \n${options.message}`);
    console.log('----------------------------\n');
    return { success: true, simulated: true };
  }

  const transporter = createEmailTransporter();

  // Ensure RFC 2822 compliant From Header
  const fromName = (process.env.FROM_NAME || 'WhatTheMenu').trim();
  const fromEmail = (process.env.FROM_EMAIL || user).trim();
  const fromHeader = fromEmail ? `"${fromName}" <${fromEmail}>` : `"WhatTheMenu" <${user}>`;

  const message = {
    from: fromHeader,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(message);
    console.log(`📧 [EMAIL SENT SUCCESS] MessageId: ${info.messageId} | Recipient: ${options.email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [EMAIL DELIVERY ERROR] To: ${options.email} | Reason: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;

