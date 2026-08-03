const QRCodeLib = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const qrDataUrl = await QRCodeLib.toDataURL(data, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
    return qrDataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

module.exports = { generateQRCode };
