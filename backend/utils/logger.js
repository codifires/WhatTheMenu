/**
 * ============================================================================
 * WhatTheMenu — Production Structured Logger & Observability Engine
 * ============================================================================
 *
 * Capabilities:
 * - Structured JSON logging in production with ISO timestamps and log levels
 * - Automated sensitive data redaction for strings, objects, and Error stacks
 * - Security event logging (failed logins, IDOR denials, webhook signature failures)
 * - Fire-and-forget persistence to MongoDB SystemLog model with 30d TTL
 * ============================================================================
 */

const { redactSensitiveData, redactString } = require('./redact');
const SystemLog = require('../models/SystemLog');

const LOG_LEVELS = {
  info: 1,
  warn: 2,
  security: 3,
  error: 4,
  critical: 5
};

const formatOutput = (level, message, meta = {}) => {
  const sanitizedMeta = redactSensitiveData(meta) || {};
  const sanitizedMessage = redactString(message);

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: sanitizedMessage,
    ...sanitizedMeta
  };

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  // Developer-friendly output in non-production
  const prefix = {
    info: 'ℹ️ [INFO]',
    warn: '⚠️ [WARN]',
    security: '🛡️ [SECURITY]',
    error: '❌ [ERROR]',
    critical: '🔥 [CRITICAL]'
  }[level] || '[LOG]';

  const reqId = sanitizedMeta.request_id ? `[${sanitizedMeta.request_id}] ` : '';
  const metaStr = Object.keys(sanitizedMeta).length > 0 && Object.keys(sanitizedMeta).some(k => k !== 'request_id')
    ? `\n  Details: ${JSON.stringify(sanitizedMeta)}`
    : '';

  return `${prefix} ${reqId}${sanitizedMessage}${metaStr}`;
};

const persistSystemLog = (level, message, meta = {}) => {
  try {
    const sanitizedMeta = redactSensitiveData(meta) || {};
    const sanitizedMessage = redactString(message);
    const sanitizedStack = meta.stack ? redactString(meta.stack) : undefined;

    SystemLog.create({
      level: level === 'security' ? 'warn' : level,
      event_type: sanitizedMeta.event_type || (level === 'security' ? 'SECURITY_EVENT' : undefined),
      request_id: sanitizedMeta.request_id,
      method: sanitizedMeta.method,
      url: sanitizedMeta.url,
      status_code: sanitizedMeta.status_code,
      user_id: sanitizedMeta.user_id,
      ip: sanitizedMeta.ip,
      message: sanitizedMessage,
      stack: sanitizedStack,
      metadata: sanitizedMeta.details || (Object.keys(sanitizedMeta).length ? sanitizedMeta : undefined)
    }).catch(err => {
      // Prevent recursive logging loops if database persistence fails
      console.error('SystemLog persistence warning:', err.message);
    });
  } catch (err) {
    console.error('SystemLog creation error:', err.message);
  }
};

const logger = {
  info(message, meta) {
    console.log(formatOutput('info', message, meta));
  },

  warn(message, meta) {
    console.warn(formatOutput('warn', message, meta));
  },

  error(message, meta = {}) {
    console.error(formatOutput('error', message, meta));
    persistSystemLog('error', message, meta);
  },

  critical(message, meta = {}) {
    console.error(formatOutput('critical', message, meta));
    persistSystemLog('critical', message, meta);
  },

  security(eventType, meta = {}) {
    const message = `Security event: ${eventType}${meta.reason ? ` - ${meta.reason}` : ''}`;
    const securityMeta = { ...meta, event_type: eventType };
    console.warn(formatOutput('security', message, securityMeta));
    persistSystemLog('security', message, securityMeta);
  }
};

module.exports = logger;
