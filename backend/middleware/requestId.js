/**
 * ============================================================================
 * WhatTheMenu — Request Correlation & Traceability Middleware
 * ============================================================================
 *
 * Attaches a unique request_id to every inbound HTTP transaction:
 * - Accepts trusted incoming X-Request-Id header (alphanumeric/hyphens)
 * - Automatically generates cryptographic fallback identifier if missing
 * - Propagates X-Request-Id back in response headers for client/operator correlation
 * - Records response time metrics upon request completion
 * ============================================================================
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const requestIdMiddleware = (req, res, next) => {
  // Validate or generate request ID
  const incomingHeader = req.headers['x-request-id'];
  let requestId;

  if (typeof incomingHeader === 'string' && /^[a-zA-Z0-9_\-]{8,64}$/.test(incomingHeader)) {
    requestId = incomingHeader;
  } else {
    requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);

    // Skip verbose logging for noisy static polling endpoints in test/dev
    const isHealthCheck = req.originalUrl === '/api/health' || req.originalUrl.startsWith('/api/health/');
    if (!isHealthCheck && res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} responded with ${res.statusCode} (${elapsedMs}ms)`, {
        request_id: requestId,
        method: req.method,
        url: req.originalUrl,
        status_code: res.statusCode,
        duration_ms: Number(elapsedMs),
        ip: req.ip,
        user_id: req.user ? req.user._id : undefined
      });
    }
  });

  next();
};

module.exports = { requestIdMiddleware };
