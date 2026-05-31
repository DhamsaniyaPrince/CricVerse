const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAdminOverview,
  getAllUsers,
  updateUserBanStatus,
  updateUserRole,
  getPendingTournaments,
  approveTournament,
  createReport,
  getReports,
  resolveReport,
  deleteMatch
} = require('../controllers/adminController');

// User routes (any authenticated user can report a concern)
router.post('/reports', protect, createReport);

// Admin-only route guard
router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getAdminOverview);
router.get('/users', getAllUsers);
router.put('/users/:id/ban', updateUserBanStatus);
router.put('/users/:id/role', updateUserRole);
router.get('/tournaments/pending', getPendingTournaments);
router.put('/tournaments/:id/approve', approveTournament);
router.get('/reports', getReports);
router.put('/reports/:id/resolve', resolveReport);
router.delete('/matches/:id', deleteMatch);

module.exports = router;
