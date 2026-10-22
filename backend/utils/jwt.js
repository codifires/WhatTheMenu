const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (id, role) => {
  return jwt.sign({ id, role, jti: crypto.randomBytes(16).toString('hex') }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { generateToken };
