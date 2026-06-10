const express = require('express');
const router = express.Router();
const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  joinTeamViaCode,
  invitePlayer,
  respondToInvitation,
  respondToJoinRequest,
  removePlayer,
  assignCaptain,
  getManagedTeams,
  assignMemberRole
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, createTeam)
  .get(getTeams);

router.post('/join-code', protect, joinTeamViaCode);

router.get('/managed', protect, getManagedTeams);

router.route('/:id')
  .get(getTeamById)
  .put(protect, updateTeam)
  .delete(protect, authorize('admin'), deleteTeam);

router.post('/:id/invite', protect, invitePlayer);
router.post('/:id/invitations/respond', protect, respondToInvitation);
router.post('/:id/requests/respond', protect, respondToJoinRequest);
router.post('/:id/captain', protect, assignCaptain);
router.post('/:id/member-role', protect, assignMemberRole);
router.delete('/:id/players/:playerId', protect, removePlayer);

module.exports = router;
