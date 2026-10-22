/**
 * ============================================================================
 * WhatTheMenu — Centralized Production Error Handler
 * ============================================================================
 *
 * Enforces:
 * - Consistent HTTP status codes and stable JSON error responses
 * - Clear categorization: validation (400), auth (401), forbidden (403),
 *   not found (404), conflict (409), rate-limiting (429), server error (500),
 *   service unavailable (503)
 * - Complete redaction of internal stack traces, DB queries, secrets, and PII
 * - Structured correlation via request_id
 * ============================================================================
 */

const logger = require('../utils/logger');
const { redactString } = require('../utils/redact');

const errorHandler = (err, req, res, next) => {
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';
  const safeUrl = redactString(req.originalUrl || '');
  const safeStack = redactString(err.stack || '');
  const safeMessage = redactString(err.message || 'An error occurred');

  // Determine baseline HTTP status code
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  if (err.statusCode && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  } else if (err.status && typeof err.status === 'number') {
    statusCode = err.status;
  }

  // Determine error code and client-facing safe message
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let clientMessage = safeMessage;
  let validationErrors;
  let retryAfterSeconds;

  // Specific Known Error Classifications
  if (err.name === 'AppError' || err.isOperational) {
    statusCode = err.statusCode || 500;
    errorCode = err.code || 'APP_ERROR';
    clientMessage = err.message;
    if (err.details) {
      if (err.details.errors) validationErrors = err.details.errors;
      if (err.details.retryAfterSeconds) retryAfterSeconds = err.details.retryAfterSeconds;
    }
  } else if (err.message && err.message.includes('CORS blocked')) {
    statusCode = 403;
    errorCode = 'CORS_FORBIDDEN';
    clientMessage = err.message;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    clientMessage = 'Invalid authentication token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    clientMessage = 'Your session has expired. Please log in again.';
  } else if (err.type === 'entity.too.large' || err.status === 413) {
    statusCode = 413;
    errorCode = 'PAYLOAD_TOO_LARGE';
    clientMessage = 'Request payload too large. Maximum allowed size is 1MB.';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      clientMessage = 'File size too large. Maximum allowed size is 5MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      clientMessage = 'Too many files uploaded. Only 1 file is allowed.';
    } else {
      clientMessage = err.message || 'File upload error';
    }
  } else if (err.message && err.message.includes('Only image files')) {
    statusCode = 400;
    errorCode = 'INVALID_FILE_TYPE';
    clientMessage = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_IDENTIFIER_FORMAT';
    clientMessage = 'Invalid resource identifier format';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    if (err.errors) {
      validationErrors = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }));
      clientMessage = validationErrors.map(e => e.message).join(', ');
    } else {
      clientMessage = err.message;
    }
  } else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_RESOURCE_CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    clientMessage = `Duplicate value entered for ${field}. Please use another value.`;
  } else if (err.name === 'VersionError') {
    statusCode = 409;
    errorCode = 'CONCURRENCY_CONFLICT';
    clientMessage = 'Document was modified concurrently. Please refresh and try again.';
  } else if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoTimeoutError') {
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
    clientMessage = 'Database service temporarily unavailable. Please retry in a few moments.';
  } else if (statusCode >= 500 || err.name === 'MongoServerError') {
    statusCode = 500;
    errorCode = 'INTERNAL_SERVER_ERROR';
    // Strictly prevent internal query, system, or driver leaks in production
    clientMessage = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : safeMessage;
  }

  // Structured logging with request context
  const logMeta = {
    request_id: requestId,
    method: req.method,
    url: safeUrl,
    status_code: statusCode,
    error_code: errorCode,
    user_id: req.user ? req.user._id : undefined,
    ip: req.ip,
    stack: safeStack
  };

  if (statusCode >= 500) {
    logger.critical(`Unhandled Server Error: ${safeMessage}`, logMeta);
  } else {
    logger.error(`Client Error (${statusCode}): ${safeMessage}`, logMeta);
  }

  // Construct stable error response
  const responsePayload = {
    success: false,
    message: clientMessage,
    code: errorCode,
    request_id: requestId
  };

  if (validationErrors) {
    responsePayload.errors = validationErrors;
  }
  if (retryAfterSeconds) {
    responsePayload.retryAfterSeconds = retryAfterSeconds;
  }
  // Sanitize stack trace: only visible in non-production environments
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    responsePayload.stack = safeStack;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = { errorHandler };
