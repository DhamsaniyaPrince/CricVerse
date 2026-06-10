const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/auditService');
const reportService = require('../services/reportService');
const { isCaptainOrAdminOfPlayer, isCaptainOrAdminOfTeam } = require('../middleware/auth');

// @desc    Get dashboard list of accessible documents for report downloads
// @route   GET /api/reports/dashboard
// @access  Private
exports.getReportDashboard = async (req, res) => {
  try {
    const role = req.user.role;

    // Resolve current player profile if user is a player/captain
    let playerProfile = await Player.findOne({ name: req.user.username });
    if (!playerProfile && req.user.name) {
      playerProfile = await Player.findOne({ name: req.user.name });
    }

    let playersList = [];
    let teamsList = [];
    let tournamentsList = [];
    let matchesList = [];

    if (role === 'admin') {
      playersList = await Player.find().select('name role');
      teamsList = await Team.find().select('name');
      tournamentsList = await Tournament.find().select('name');
      matchesList = await Match.find().select('title');
    } else if (role === 'captain') {
      const captainTeams = await Team.find({
        $or: [
          { owner: req.user._id },
          { captain: playerProfile?._id }
        ]
      }).select('name players');

      const teamIds = captainTeams.map(t => t._id);
      const teamPlayers = captainTeams.reduce((acc, t) => {
        if (t.players) {
          t.players.forEach(pId => acc.add(pId.toString()));
        }
        return acc;
      }, new Set());

      if (playerProfile) {
        teamPlayers.add(playerProfile._id.toString());
      }

      playersList = await Player.find({ _id: { $in: Array.from(teamPlayers) } }).select('name role');
      teamsList = captainTeams.map(t => ({ _id: t._id, name: t.name }));
      tournamentsList = await Tournament.find({ teams: { $in: teamIds } }).select('name');
      matchesList = await Match.find({
        $or: [
          { teamA: { $in: teamIds } },
          { teamB: { $in: teamIds } }
        ]
      }).select('title');
    } else if (role === 'organizer') {
      tournamentsList = await Tournament.find({ organizer: req.user._id }).select('name teams');
      const organizerTourneyIds = tournamentsList.map(t => t._id);
      
      const tourneyTeamIds = tournamentsList.reduce((acc, t) => {
        if (t.teams) {
          t.teams.forEach(tId => acc.add(tId.toString()));
        }
        return acc;
      }, new Set());

      teamsList = await Team.find({ _id: { $in: Array.from(tourneyTeamIds) } }).select('name players');
      
      const tourneyPlayers = teamsList.reduce((acc, t) => {
        if (t.players) {
          t.players.forEach(pId => acc.add(pId.toString()));
        }
        return acc;
      }, new Set());

      playersList = await Player.find({ _id: { $in: Array.from(tourneyPlayers) } }).select('name role');
      matchesList = await Match.find({ tournament: { $in: organizerTourneyIds } }).select('title');
    } else {
      // Regular user / player
      if (playerProfile) {
        playersList = [{ _id: playerProfile._id, name: playerProfile.name, role: playerProfile.role }];
        const myTeam = await Team.findOne({ players: playerProfile._id }).select('name');
        if (myTeam) {
          teamsList = [myTeam];
          tournamentsList = await Tournament.find({ teams: myTeam._id }).select('name');
          matchesList = await Match.find({
            $or: [
              { teamA: myTeam._id },
              { teamB: myTeam._id }
            ]
          }).select('title');
        }
      }
    }

    res.json({
      success: true,
      data: {
        players: playersList,
        teams: teamsList,
        tournaments: tournamentsList,
        matches: matchesList
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export player report
// @route   GET /api/reports/player/:id
// @access  Private
exports.exportPlayerReport = async (req, res) => {
  const { format = 'pdf', theme = 'dark' } = req.query; // 'pdf' or 'excel', 'dark' or 'light'
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found' });
    }

    const isAuthorized = await isCaptainOrAdminOfPlayer(req.user, player._id);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to export this player\'s report' });
    }

    const buffer = await reportService.generatePlayerReport(player, format.toLowerCase(), theme.toLowerCase());
    const fileName = `player_${player.name.replace(/\s+/g, '_').toLowerCase()}_report.${format}`;

    if (format.toLowerCase() === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await logAction(req, 'Report Exported', `Exported player report for "${player.name}" in ${format.toUpperCase()} format (${theme.toUpperCase()} theme).`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export team report
// @route   GET /api/reports/team/:id
// @access  Private
exports.exportTeamReport = async (req, res) => {
  const { format = 'pdf', theme = 'dark' } = req.query;
  try {
    const team = await Team.findById(req.params.id).populate('players', 'name role battingStyle bowlingStyle stats catches mvpAwards achievements');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team profile not found' });
    }

    const isAuthorized = await isCaptainOrAdminTeamWrapper(req.user, team._id);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to export this team\'s report' });
    }

    const buffer = await reportService.generateTeamReport(team, format.toLowerCase(), theme.toLowerCase());
    const fileName = `team_${team.name.replace(/\s+/g, '_').toLowerCase()}_report.${format}`;

    if (format.toLowerCase() === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await logAction(req, 'Report Exported', `Exported team report for "${team.name}" in ${format.toUpperCase()} format (${theme.toUpperCase()} theme).`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export tournament report
// @route   GET /api/reports/tournament/:id
// @access  Private
exports.exportTournamentReport = async (req, res) => {
  const { format = 'pdf', theme = 'dark' } = req.query;
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams', 'name logo createdAt')
      .populate('pointsTable.team', 'name logo')
      .populate({
        path: 'fixtures.match',
        populate: [
          { path: 'teamA', select: 'name' },
          { path: 'teamB', select: 'name' }
        ]
      });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const isAdminOrOrganizer = req.user.role === 'admin' || (tournament.organizer && tournament.organizer.toString() === req.user._id.toString());

    const buffer = await reportService.generateTournamentReport(tournament, format.toLowerCase(), isAdminOrOrganizer, theme.toLowerCase());
    const fileName = `tournament_${tournament.name.replace(/\s+/g, '_').toLowerCase()}_report.${format}`;

    if (format.toLowerCase() === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await logAction(req, 'Report Exported', `Exported tournament report for "${tournament.name}" (Admin Mode: ${isAdminOrOrganizer}) in ${format.toUpperCase()} format (${theme.toUpperCase()} theme).`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export match scorecard report
// @route   GET /api/reports/match/:id
// @access  Private
exports.exportMatchReport = async (req, res) => {
  const { format = 'pdf', theme = 'dark' } = req.query;
  try {
    const match = await Match.findById(req.params.id)
      .populate('teamA', 'name')
      .populate('teamB', 'name')
      .populate('result.winner', 'name')
      .populate('innings.scorecard.batsmen.player', 'name')
      .populate('innings.scorecard.bowlers.player', 'name');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Determine details authorization (Admin, organizer, or team captains of match)
    let isDetailed = req.user.role === 'admin';
    if (!isDetailed && match.tournament) {
      const tourney = await Tournament.findById(match.tournament);
      if (tourney && tourney.organizer && tourney.organizer.toString() === req.user._id.toString()) {
        isDetailed = true;
      }
    }
    if (!isDetailed) {
      const isTeamACaptain = await isCaptainOrAdminOfTeam(req.user, match.teamA?._id);
      const isTeamBCaptain = await isCaptainOrAdminOfTeam(req.user, match.teamB?._id);
      if (isTeamACaptain || isTeamBCaptain) {
        isDetailed = true;
      }
    }

    const buffer = await reportService.generateMatchReport(match, format.toLowerCase(), isDetailed, theme.toLowerCase());
    const fileName = `match_${match.title.replace(/\s+/g, '_').toLowerCase()}_report.${format}`;

    if (format.toLowerCase() === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await logAction(req, 'Report Exported', `Exported match report for "${match.title}" (Detailed: ${isDetailed}) in ${format.toUpperCase()} format (${theme.toUpperCase()} theme).`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export admin platform dashboard reports
// @route   GET /api/reports/admin/:type
// @access  Private (Admin Only)
exports.exportAdminReport = async (req, res) => {
  const { type } = req.params; // 'system', 'user_growth', 'team_growth', 'tournament_activity', 'platform_analytics'
  const { format = 'pdf', theme = 'dark' } = req.query;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Only administrators can access admin platform reports.' });
    }

    let reportData = {};

    if (type === 'system') {
      const usersCount = await User.countDocuments();
      const teamsCount = await Team.countDocuments();
      const tournamentsCount = await Tournament.countDocuments();
      const matchesCount = await Match.countDocuments();
      const logsCount = await AuditLog.countDocuments();
      reportData = { usersCount, teamsCount, tournamentsCount, matchesCount, logsCount };
    } else if (type === 'user_growth') {
      // Group users by role
      const roles = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      // Group registrations by YYYY-MM
      const registrationTrend = await User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      reportData = { roles, registrationTrend };
    } else if (type === 'team_growth') {
      const teams = await Team.find().select('name createdAt stats');
      const teamTrend = await Team.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      reportData = { teams, teamTrend };
    } else if (type === 'tournament_activity') {
      const tournaments = await Tournament.find().select('name status teams fixtures pointsTable');
      const matches = await Match.find().select('status result title');
      reportData = { tournaments, matches };
    } else if (type === 'platform_analytics') {
      const totalLogs = await AuditLog.countDocuments();
      const actions = await AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      const rolesUsage = await AuditLog.aggregate([
        { $group: { _id: '$userRole', count: { $sum: 1 } } }
      ]);
      reportData = { totalLogs, actions, rolesUsage };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid admin report category type.' });
    }

    const buffer = await reportService.generateAdminReport(type, reportData, format.toLowerCase(), theme.toLowerCase());
    const fileName = `admin_${type}_report.${format}`;

    if (format.toLowerCase() === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await logAction(req, 'Report Exported', `Exported admin platform report "${type}" in ${format.toUpperCase()} format (${theme.toUpperCase()} theme).`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper since isCaptainOrAdminOfTeam resolves asynchronously
const isCaptainOrAdminTeamWrapper = async (user, teamId) => {
  return await isCaptainOrAdminOfTeam(user, teamId);
};
