const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Report = require('../models/Report');
const { logAction } = require('../services/auditService');

// @desc    Get dashboard summary statistics
// @route   GET /api/admin/overview
// @access  Private/Admin
exports.getAdminOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });
    
    const totalTournaments = await Tournament.countDocuments();
    const pendingTournaments = await Tournament.countDocuments({ isApproved: false });
    
    const totalMatches = await Match.countDocuments();
    const liveMatches = await Match.countDocuments({ status: 'Live' });
    
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'Pending' });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, banned: bannedUsers },
        tournaments: { total: totalTournaments, pending: pendingTournaments },
        matches: { total: totalMatches, live: liveMatches },
        reports: { total: totalReports, pending: pendingReports }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all users with search and filtering
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  const { search, role, isBanned } = req.query;
  const query = {};

  if (role) {
    query.role = role;
  }

  if (isBanned !== undefined) {
    query.isBanned = isBanned === 'true';
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Toggle suspension / ban status of a user
// @route   PUT /api/admin/users/:id/ban
// @access  Private/Admin
exports.updateUserBanStatus = async (req, res) => {
  const { isBanned } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot ban another admin user' });
    }

    user.isBanned = !!isBanned;
    await user.save();

    await logAction(req, 'User Ban Status Updated', `${user.isBanned ? 'Suspended' : 'Re-activated'} user "${user.username}" (ID: ${user._id}).`);

    res.json({
      success: true,
      message: `User account has been successfully ${user.isBanned ? 'suspended' : 're-activated'}.`,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Change role of a user
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['player', 'captain', 'organizer', 'admin'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role assignment' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot change another admin\'s role' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAction(req, 'User Role Updated', `Updated role of user "${user.username}" (ID: ${user._id}) from "${oldRole}" to "${role}".`);

    res.json({
      success: true,
      message: `User role has been updated to '${role}'.`,
      data: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get unapproved pending tournaments
// @route   GET /api/admin/tournaments/pending
// @access  Private/Admin
exports.getPendingTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find({ isApproved: false })
      .populate('organizer', 'username email')
      .populate('teams', 'name logo');
    res.json({ success: true, count: tournaments.length, data: tournaments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Approve a tournament
// @route   PUT /api/admin/tournaments/:id/approve
// @access  Private/Admin
exports.approveTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    tournament.isApproved = true;
    await tournament.save();

    await logAction(req, 'Tournament Approved', `Approved tournament "${tournament.name}" (ID: ${tournament._id}).`);

    res.json({
      success: true,
      message: 'Tournament has been approved successfully!',
      data: tournament
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    File a new report
// @route   POST /api/admin/reports
// @access  Private
exports.createReport = async (req, res) => {
  const { reportedType, reportedId, reason } = req.body;
  try {
    const report = await Report.create({
      reporter: req.user._id,
      reportedType,
      reportedId,
      reason
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Resolve or dismiss a report
// @route   PUT /api/admin/reports/:id/resolve
// @access  Private/Admin
exports.resolveReport = async (req, res) => {
  const { status } = req.body; // 'Resolved' or 'Dismissed'
  if (!['Resolved', 'Dismissed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Resolved or Dismissed' });
  }

  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    await logAction(req, 'Report Resolved', `Set report status (ID: ${report._id}) to "${status}".`);

    res.json({
      success: true,
      message: `Report status updated to '${status}'.`,
      data: report
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a match
// @route   DELETE /api/admin/matches/:id
// @access  Private/Admin
exports.deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Delete matches from fixtures array in any tournaments
    if (match.tournament) {
      await Tournament.findByIdAndUpdate(match.tournament, {
        $pull: { fixtures: { match: match._id } }
      });
    }

    await Match.findByIdAndDelete(req.params.id);

    await logAction(req, 'Match Deleted', `Deleted match "${match.title}" (ID: ${match._id}).`);

    res.json({
      success: true,
      message: 'Match was successfully deleted.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
