/**
 * ============================================================================
 * WhatTheMenu — Order & Payment State Machine
 * ============================================================================
 * Defines allowed order and payment states, valid transitions, and invariants:
 * - Terminal states cannot be revived (cancelled order cannot transition to new/preparing).
 * - A cancelled order cannot have its payment marked as received or completed.
 * - Completed orders cannot regress to preparing/new.
 * ============================================================================
 */

const ORDER_STATUS = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  RECEIVED: 'received',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Permitted order status transitions
const VALID_ORDER_TRANSITIONS = {
  [ORDER_STATUS.NEW]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.CANCELLED], // Owner cancellation / refund allowed, but no progression backward
  [ORDER_STATUS.CANCELLED]: [] // Strictly terminal: once cancelled, cannot be revived
};

// Permitted payment status transitions
const VALID_PAYMENT_TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.RECEIVED, PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.RECEIVED, PAYMENT_STATUS.COMPLETED],
  [PAYMENT_STATUS.RECEIVED]: [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.COMPLETED]: [PAYMENT_STATUS.FAILED]
};

/**
 * Validates whether an order status transition is permitted.
 * @param {string} currentStatus - Current order status
 * @param {string} targetStatus - Proposed new status
 * @returns {boolean} True if permitted, false otherwise
 */
const isValidOrderStatusTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true; // Idempotent no-op

  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
};

/**
 * Validates whether a payment status transition is permitted.
 * @param {string} currentPaymentStatus - Current payment status
 * @param {string} targetPaymentStatus - Proposed payment status
 * @param {string} currentOrderStatus - Current order status (to enforce cancelled order invariant)
 * @returns {{ valid: boolean, reason?: string }}
 */
const isValidPaymentStatusTransition = (currentPaymentStatus, targetPaymentStatus, currentOrderStatus) => {
  if (!currentPaymentStatus || !targetPaymentStatus) {
    return { valid: false, reason: 'Current and target payment statuses are required' };
  }

  // Idempotent no-op
  if (currentPaymentStatus === targetPaymentStatus) {
    return { valid: true };
  }

  // Critical Invariant: Cancelled orders can NEVER be marked as paid
  if (
    currentOrderStatus === ORDER_STATUS.CANCELLED &&
    (targetPaymentStatus === PAYMENT_STATUS.RECEIVED || targetPaymentStatus === PAYMENT_STATUS.COMPLETED)
  ) {
    return {
      valid: false,
      reason: `Impossible transition: Cannot apply payment ("${targetPaymentStatus}") to an already cancelled order`
    };
  }

  const allowed = VALID_PAYMENT_TRANSITIONS[currentPaymentStatus];
  if (!Array.isArray(allowed) || !allowed.includes(targetPaymentStatus)) {
    return {
      valid: false,
      reason: `Invalid payment transition from "${currentPaymentStatus}" to "${targetPaymentStatus}"`
    };
  }

  return { valid: true };
};

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  VALID_ORDER_TRANSITIONS,
  VALID_PAYMENT_TRANSITIONS,
  isValidOrderStatusTransition,
  isValidPaymentStatusTransition
};
