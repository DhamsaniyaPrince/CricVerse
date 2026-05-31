const express = require('express');
const router = express.Router();
const {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  updateMatchScore,
  endMatch,
  seedMatches,
  setupMatchInnings,
  setupMatchReady,
  undoLastBall,
  deleteMatch
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('organizer', 'admin'), createMatch)
  .get(getMatches);

router.post('/seed', seedMatches);

router.route('/:id')
  .get(getMatchById)
  .put(protect, authorize('organizer', 'admin'), updateMatch)
  .delete(protect, authorize('organizer', 'admin'), deleteMatch);

router.route('/:id/setup-ready')
  .put(protect, authorize('organizer', 'admin'), setupMatchReady);

router.route('/:id/setup')
  .put(protect, authorize('organizer', 'admin'), setupMatchInnings);

router.route('/:id/ball')
  .post(protect, authorize('organizer', 'admin'), updateMatchScore);

router.route('/:id/undo')
  .post(protect, authorize('organizer', 'admin'), undoLastBall);

router.route('/:id/end')
  .post(protect, authorize('organizer', 'admin'), endMatch);

module.exports = router;
