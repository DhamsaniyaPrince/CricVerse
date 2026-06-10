const express = require('express');
const router = express.Router();
const {
  getPlayerAnalytics,
  getMatchAnalytics,
  getSystemAnalytics,
  getTeamAnalytics,
  compareTeams
} = require('../controllers/analyticsController');
const { optionalProtect } = require('../middleware/auth');

router.get('/dashboard', getSystemAnalytics);
router.get('/compare-teams', optionalProtect, compareTeams);
router.get('/player/:id', optionalProtect, getPlayerAnalytics);
router.get('/team/:id', optionalProtect, getTeamAnalytics);
router.get('/match/:id', getMatchAnalytics);

module.exports = router;
