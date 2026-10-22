const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const { validate } = require('../middleware/validator');
const { getCafeMenu, searchMenu } = require('../controllers/customerController');
const { menuLimiter, menuSearchLimiter } = require('../middleware/rateLimiter');

const cafeParamValidator = [
  param('cafeId')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .isLength({ min: 1, max: 64 })
    .withMessage('Valid cafe identifier required'),
  validate
];

const searchMenuValidator = [
  param('cafeId')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .isLength({ min: 1, max: 64 })
    .withMessage('Valid cafe identifier required'),
  query('q')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),
  validate
];

// Public routes - protected by dedicated menu and search rate limiters
router.get('/:cafeId', menuLimiter, cafeParamValidator, getCafeMenu);
router.get('/:cafeId/search', menuSearchLimiter, searchMenuValidator, searchMenu);

module.exports = router;
