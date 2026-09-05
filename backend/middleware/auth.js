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
      message: 'Not authorized - no token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'superadmin') {
      req.user = await Admin.findById(decoded.id);
      req.user.role = 'superadmin';
    } else if (decoded.role === 'owner') {
      req.user = await Cafe.findById(decoded.id);
      req.user.role = 'owner';
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Enforce Device Limit
    if (decoded.role === 'owner') {
      const isValid = req.user.active_sessions && req.user.active_sessions.some(s => s.token === token);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Device limit reached. You have been logged out because a new device logged in.'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - invalid token'
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
