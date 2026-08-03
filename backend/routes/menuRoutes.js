const express = require('express');
const router = express.Router();
const { getCafeMenu, searchMenu } = require('../controllers/customerController');

// Public routes - no auth required
router.get('/:cafeId', getCafeMenu);
router.get('/:cafeId/search', searchMenu);

module.exports = router;
