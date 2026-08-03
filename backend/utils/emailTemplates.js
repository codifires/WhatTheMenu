const baseEmailTemplate = (content, title = 'Notification') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                <span style="display: inline-block; width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 10px; margin-right: 12px; vertical-align: middle; line-height: 32px; text-align: center;">☕</span>
                QR Menu SaaS
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                © ${new Date().getFullYear()} QR Menu SaaS. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                If you have any questions, reply to this email or contact our support team.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const resetPasswordTemplate = (resetUrl) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
      Hello,<br><br>
      We received a request to reset your password. If you didn't make this request, you can safely ignore this email. Otherwise, you can reset your password using the link below:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #3b82f6, #06b6d4); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(6, 182, 212, 0.2);">
        Reset My Password
      </a>
    </div>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
      Or copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${resetUrl}</a>
    </p>
  `;
  return baseEmailTemplate(content, 'Password Reset Request');
};

const welcomeTemplate = (resetUrl, cafeName, tempPassword) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Welcome to QR Menu SaaS!</h2>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
      Hello <strong>${cafeName}</strong>,<br><br>
      Your café account has been officially created by our administrators! We are thrilled to have you onboard.
    </p>
    <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px 0; color: #475569; font-size: 15px;">Your temporary password is: <strong style="color: #0f172a; font-size: 16px;">${tempPassword}</strong></p>
      <p style="margin: 0; color: #475569; font-size: 14px;">For your security, please log in and set a new password immediately.</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);">
        Set My Password
      </a>
    </div>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #6366f1; text-decoration: underline; word-break: break-all;">${resetUrl}</a>
    </p>
    <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 13px;">This link will expire in 24 hours.</p>
  `;
  return baseEmailTemplate(content, 'Welcome to QR Menu SaaS');
};

const subscriptionExpiryTemplate = (cafeName, endDate) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Action Required: Subscription Expiring Soon</h2>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
      Hello <strong>${cafeName}</strong>,<br><br>
      We hope you are enjoying QR Menu SaaS! This is a friendly reminder that your current subscription plan is scheduled to expire on <strong>${new Date(endDate).toLocaleDateString()}</strong>.
    </p>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400e; font-size: 15px;">To ensure uninterrupted service for your café and customers, please renew your plan before the expiration date.</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/owner/login" style="background: linear-gradient(135deg, #f59e0b, #ea580c); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">
        Renew Subscription
      </a>
    </div>
  `;
  return baseEmailTemplate(content, 'Subscription Expiring Soon');
};

const emailChangeOldTemplate = (cafeName, newEmail) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Security Alert: Email Address Changed</h2>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
      Hello <strong>${cafeName}</strong>,<br><br>
      This is a security notification to inform you that the email address associated with your QR Menu SaaS account has been changed by an Administrator.
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 15px;">Your account is now linked to:</p>
      <p style="margin: 0; color: #7f1d1d; font-size: 16px; font-weight: bold;">${newEmail}</p>
    </div>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.5;">
      You will no longer receive communications at this current email address, and you must use the new email address to log in to your Owner Dashboard.
    </p>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
      If you did not authorize this change, please contact our support team immediately.
    </p>
  `;
  return baseEmailTemplate(content, 'Security Alert: Email Changed');
};

const emailChangeNewTemplate = (cafeName) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Email Address Successfully Updated</h2>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.5;">
      Hello <strong>${cafeName}</strong>,<br><br>
      Your email address has been successfully updated by an Administrator. This email address is now the official contact for your QR Menu SaaS account.
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #166534; font-size: 15px;">Please use this email address the next time you log in to your Owner Dashboard.</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/owner/login" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
        Go to Login
      </a>
    </div>
  `;
  return baseEmailTemplate(content, 'Email Address Updated');
};

module.exports = {
  resetPasswordTemplate,
  welcomeTemplate,
  subscriptionExpiryTemplate,
  emailChangeOldTemplate,
  emailChangeNewTemplate
};
