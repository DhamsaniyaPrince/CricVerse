const express = require('express');
const router = express.Router();
const {
  createPlayer,
  getPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer
} = require('../controllers/playerController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('organizer', 'admin'), createPlayer)
  .get(getPlayers);

router.route('/:id')
  .get(getPlayerById)
  .put(protect, authorize('organizer', 'admin'), updatePlayer)
  .delete(protect, authorize('organizer', 'admin'), deletePlayer);

module.exports = router;
