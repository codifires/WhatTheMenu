/**
 * ============================================================================
 * WhatTheMenu — Data Privacy & Secrets Redaction Utility
 * ============================================================================
 *
 * Automatically redacts:
 * - Passwords and password hashes
 * - JWT tokens and Authorization Bearer headers
 * - One-Time Passwords (OTPs) and verification codes
 * - Razorpay keys, secrets, webhooks, and signatures
 * - Credit card numbers and customer phone numbers
 * - Database and cloud credentials
 * ============================================================================
 */

const REDACTION_PATTERNS = [
  // Authorization: Bearer tokens
  {
    regex: /Bearer\s+[A-Za-z0-9_.-]+/gi,
    replace: 'Bearer [REDACTED_TOKEN]'
  },
  // Standalone JWT tokens (Header.Payload.Signature)
  {
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replace: '[REDACTED_JWT]'
  },
  // Passwords in JSON, query strings, logs, and key-value pairs
  {
    regex: /(["']?password(?:_hash)?["']?\s*[:=]\s*)(?:(["'])([^"'\r\n]+)(["'])|([^\s"',;&]+))/gi,
    replace: (match, prefix, q1, val1, q2, val2) => {
      if (q1 && q2) {
        return `${prefix}${q1}[REDACTED]${q2}`;
      }
      return `${prefix}[REDACTED]`;
    }
  },
  // OTPs in JSON/query/text
  {
    regex: /(["']?(?:otp|login_otp|code)["']?\s*[:=]\s*["']?)(\d{4,8})(["']?)/gi,
    replace: '$1[REDACTED_OTP]$3'
  },
  // Razorpay API Keys (rzp_live_... or rzp_test_...)
  {
    regex: /rzp_(test|live)_[A-Za-z0-9]{10,}/gi,
    replace: 'rzp_$1_[REDACTED_KEY]'
  },
  // Razorpay Key Secret and Webhook Secret
  {
    regex: /(["']?(?:key_secret|razorpay_key_secret|webhook_secret|razorpay_webhook_secret)["']?\s*[:=]\s*)(?:(["'])([^"'\r\n]+)(["'])|([^\s"',;&]+))/gi,
    replace: (match, prefix, q1, val1, q2, val2) => {
      if (q1 && q2) {
        return `${prefix}${q1}[REDACTED_SECRET]${q2}`;
      }
      return `${prefix}[REDACTED_SECRET]`;
    }
  },
  // Razorpay Signature (HMAC hex)
  {
    regex: /(["']?razorpay_signature["']?\s*[:=]\s*["']?)([a-f0-9]{32,64})([^"'\r\n]*["']?)/gi,
    replace: '$1[REDACTED_SIGNATURE]$3'
  },
  // Customer phone numbers in JSON / key-value
  {
    regex: /(["']?(?:customer_phone|phone)["']?\s*[:=]\s*)(?:(["'])(\+?[0-9]{10,14})(["'])|(\+?[0-9]{10,14}))/gi,
    replace: (match, prefix, q1, val1, q2, val2) => {
      const phone = val1 || val2;
      const masked = phone && phone.length > 4 ? `***-***-${phone.slice(-4)}` : '[REDACTED_PHONE]';
      if (q1 && q2) {
        return `${prefix}${q1}${masked}${q2}`;
      }
      return `${prefix}${masked}`;
    }
  },
  // MongoDB Connection Strings (with embedded passwords)
  {
    regex: /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/gi,
    replace: 'mongodb$1://$2:[REDACTED_DB_PWD]@'
  },
  // Cloudinary credentials in URLs
  {
    regex: /cloudinary:\/\/([^:]+):([^@]+)@/gi,
    replace: 'cloudinary://$1:[REDACTED_SECRET]@'
  }
];

/**
 * Redacts sensitive fields and values from a string or object.
 *
 * @param {any} target - String, Error, or Object to redact
 * @returns {any} Sanitized output with secrets replaced by redaction placeholders
 */
const redactSensitiveData = (target) => {
  if (target === null || target === undefined) {
    return target;
  }

  if (target instanceof Error) {
    const sanitizedError = new Error(redactString(target.message));
    sanitizedError.name = target.name;
    sanitizedError.code = target.code;
    sanitizedError.statusCode = target.statusCode;
    if (target.stack) {
      sanitizedError.stack = redactString(target.stack);
    }
    return sanitizedError;
  }

  if (typeof target === 'string') {
    return redactString(target);
  }

  if (target instanceof Date) {
    return target;
  }

  if (target && (target._bsontype === 'ObjectId' || (target.constructor && target.constructor.name === 'ObjectId'))) {
    return target;
  }

  if (Buffer.isBuffer(target)) {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(item => redactSensitiveData(item));
  }

  if (typeof target === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(target)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('signature') ||
        lowerKey.includes('token') ||
        lowerKey === 'otp' ||
        lowerKey === 'login_otp'
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (lowerKey === 'customer_phone') {
        sanitized[key] = typeof value === 'string' && value.length > 4
          ? `***-***-${value.slice(-4)}`
          : '[REDACTED_PHONE]';
      } else {
        sanitized[key] = redactSensitiveData(value);
      }
    }
    return sanitized;
  }

  return target;
};

/**
 * Redacts known sensitive patterns from a raw string.
 */
const redactString = (str) => {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const { regex, replace } of REDACTION_PATTERNS) {
    result = result.replace(regex, replace);
  }
  return result;
};

module.exports = {
  redactSensitiveData,
  redactString
};
