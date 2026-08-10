const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Returns a Razorpay instance configured with the platform's own keys.
 * Used for SaaS subscription billing (café owner → platform).
 */
const getPlatformRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Platform Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Returns a Razorpay instance configured with a café owner's own keys.
 * Used for customer order payments (customer → café owner directly).
 */
const getCafeRazorpay = (keyId, keySecret) => {
  if (!keyId || !keySecret) {
    throw new Error('Café Razorpay keys are not configured');
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Verifies a Razorpay webhook signature.
 * @param {string|Buffer} body - Raw request body
 * @param {string} signature - X-Razorpay-Signature header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
const verifyWebhookSignature = (body, signature, secret) => {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof body === 'string' ? body : body.toString())
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (err) {
    console.error('Webhook signature verification error:', err.message);
    return false;
  }
};

/**
 * Verifies Razorpay payment signature (used after checkout success callback).
 * @param {string} orderId - razorpay_order_id
 * @param {string} paymentId - razorpay_payment_id
 * @param {string} signature - razorpay_signature
 * @param {string} secret - Razorpay key_secret
 * @returns {boolean}
 */
const verifyPaymentSignature = (orderId, paymentId, signature, secret) => {
  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  } catch (err) {
    console.error('Payment signature verification error:', err.message);
    return false;
  }
};

/**
 * Verifies Razorpay subscription payment signature.
 * @param {string} subscriptionId - razorpay_subscription_id
 * @param {string} paymentId - razorpay_payment_id
 * @param {string} signature - razorpay_signature
 * @param {string} secret - Razorpay key_secret
 * @returns {boolean}
 */
const verifySubscriptionSignature = (subscriptionId, paymentId, signature, secret) => {
  try {
    const body = paymentId + '|' + subscriptionId;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  } catch (err) {
    console.error('Subscription signature verification error:', err.message);
    return false;
  }
};

module.exports = {
  getPlatformRazorpay,
  getCafeRazorpay,
  verifyWebhookSignature,
  verifyPaymentSignature,
  verifySubscriptionSignature,
};
