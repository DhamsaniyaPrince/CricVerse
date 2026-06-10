const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getReportDashboard,
  exportPlayerReport,
  exportTeamReport,
  exportTournamentReport,
  exportMatchReport,
  exportAdminReport
} = require('../controllers/reportController');

// All routes require user protection / authentication
router.use(protect);

router.get('/dashboard', getReportDashboard);
router.get('/player/:id', exportPlayerReport);
router.get('/team/:id', exportTeamReport);
router.get('/tournament/:id', exportTournamentReport);
router.get('/match/:id', exportMatchReport);
router.get('/admin/:type', authorize('admin'), exportAdminReport);

module.exports = router;
