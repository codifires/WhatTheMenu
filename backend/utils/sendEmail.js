const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  // Define email options
  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // Only attempt to send if SMTP credentials are provided, otherwise just log it for local testing
  if (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.example.com') {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
  } else {
    console.log('\n--- SIMULATED EMAIL ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: \n${options.message}`);
    console.log('-----------------------\n');
  }
};

module.exports = sendEmail;
