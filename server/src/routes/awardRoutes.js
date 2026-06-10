const express = require('express');
const router = express.Router();
const {
  getSeasonMvpLeaderboard,
  getAwardsGallery,
  getHallOfFame,
  getTopPerformers,
  getPlayerAwardsTimeline
} = require('../controllers/awardController');

router.get('/season', getSeasonMvpLeaderboard);
router.get('/gallery', getAwardsGallery);
router.get('/hall-of-fame', getHallOfFame);
router.get('/top-performers', getTopPerformers);
router.get('/player-timeline/:playerId', getPlayerAwardsTimeline);

module.exports = router;
