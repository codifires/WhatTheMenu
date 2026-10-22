const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Cafe = require('../models/Cafe');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - no token provided',
      code: 'AUTHENTICATION_ERROR',
      request_id: req.id
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'superadmin') {
      req.user = await Admin.findById(decoded.id);
      if (req.user) req.user.role = 'superadmin';
    } else if (decoded.role === 'owner') {
      req.user = await Cafe.findById(decoded.id);
      if (req.user) req.user.role = 'owner';
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account removed',
        code: 'AUTHENTICATION_ERROR',
        request_id: req.id
      });
    }

    // Enforce Account Status & Device Limit for Café Owners
    if (decoded.role === 'owner') {
      // 1. Check account active status
      if (req.user.is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated. Please contact platform administration.',
          code: 'FORBIDDEN_ERROR',
          request_id: req.id
        });
      }

      // 2. Enforce Device Limit
      const isValid = req.user.active_sessions && req.user.active_sessions.some(s => s.token === token);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Device limit reached. You have been logged out because a new device logged in.',
          code: 'AUTHENTICATION_ERROR',
          request_id: req.id
        });
      }

      // Throttled refresh of last_active timestamp (at most once every 10 minutes)
      const currentSession = req.user.active_sessions.find(s => s.token === token);
      if (currentSession && (Date.now() - new Date(currentSession.last_active || 0).getTime() > 10 * 60 * 1000)) {
        currentSession.last_active = Date.now();
        req.user.markModified('active_sessions');
        req.user.save({ validateBeforeSave: false }).catch(() => {});
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - invalid or expired token',
      code: 'AUTHENTICATION_ERROR',
      request_id: req.id
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user?.role || 'unauthenticated'}' is not authorized to access this route`,
        code: 'FORBIDDEN_ERROR',
        request_id: req.id
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
