const express = require('express');
const router = express.Router();
const {
  createTournament,
  getTournaments,
  getTournamentById,
  addTeamToTournament,
  generateFixtures,
  scheduleMatch,
  getTournamentLeaderboard,
  updateTournament,
  deleteTournament,
  registerTeamForTournament,
  getRegistrationRequests,
  respondToRegistration
} = require('../controllers/tournamentController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .post(protect, authorize('organizer', 'admin'), createTournament)
  .get(getTournaments);

router.route('/:id')
  .get(getTournamentById)
  .put(protect, authorize('organizer', 'admin'), updateTournament)
  .delete(protect, authorize('organizer', 'admin'), deleteTournament);

router.route('/:id/teams')
  .post(protect, authorize('organizer', 'admin'), addTeamToTournament);

router.route('/:id/fixtures')
  .post(protect, authorize('organizer', 'admin'), generateFixtures);

router.route('/:id/schedule')
  .put(protect, authorize('organizer', 'admin'), scheduleMatch);

router.route('/:id/leaderboard')
  .get(getTournamentLeaderboard);

// Tournament registrations workflow
router.route('/:id/register')
  .post(protect, authorize('captain', 'admin', 'player'), registerTeamForTournament);

router.route('/:id/registrations')
  .get(protect, authorize('organizer', 'admin'), getRegistrationRequests);

router.route('/:id/registrations/:regId')
  .put(protect, authorize('organizer', 'admin'), respondToRegistration);

module.exports = router;
