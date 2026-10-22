/**
 * ============================================================================
 * WhatTheMenu — Standardized Error Class Hierarchy
 * ============================================================================
 *
 * Provides typed, consistent error representations across the application:
 * - AppError: Base class carrying HTTP statusCode, machine code, and safe details
 * - ValidationError: 400 Bad Request
 * - AuthenticationError: 401 Unauthorized
 * - ForbiddenError: 403 Forbidden
 * - NotFoundError: 404 Not Found
 * - ConflictError: 409 Conflict
 * - RateLimitError: 429 Too Many Requests
 * - InternalServerError: 500 Internal Server Error
 * - ServiceUnavailableError: 503 Service Unavailable
 * ============================================================================
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'ACCESS_DENIED', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later', retryAfterSeconds = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class InternalServerError extends AppError {
  constructor(message = 'An unexpected internal error occurred') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
};
