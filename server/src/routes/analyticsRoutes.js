const express = require('express');
const router = express.Router();
const {
  getPlayerAnalytics,
  getMatchAnalytics,
  getSystemAnalytics
} = require('../controllers/analyticsController');

router.get('/dashboard', getSystemAnalytics);
router.get('/player/:id', getPlayerAnalytics);
router.get('/match/:id', getMatchAnalytics);

module.exports = router;
