const express = require('express');
const router = express.Router();
const {
  createPlayer,
  getPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  addPlayerXp
} = require('../controllers/playerController');
const { protect, authorize, optionalProtect } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('organizer', 'admin'), createPlayer)
  .get(getPlayers);

router.route('/xp')
  .post(protect, addPlayerXp);

router.route('/:id')
  .get(optionalProtect, getPlayerById)
  .put(protect, updatePlayer)
  .delete(protect, authorize('admin'), deletePlayer);

module.exports = router;
