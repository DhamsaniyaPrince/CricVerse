const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { logAction } = require('../services/auditService');

// @desc    Create a new tournament
// @route   POST /api/tournaments
// @access  Private/Scorer/Admin
exports.createTournament = async (req, res) => {
  try {
    if (!req.body.organizer) {
      req.body.organizer = req.user._id;
    }
    const tournament = await Tournament.create(req.body);

    await logAction(req, 'Tournament Created', `Created tournament "${tournament.name}" (ID: ${tournament._id}).`);

    res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('organizer', 'username email')
      .populate('teams', 'name logo');
    res.json({ success: true, count: tournaments.length, data: tournaments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single tournament details
// @route   GET /api/tournaments/:id
// @access  Public
exports.getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'username email')
      .populate('teams', 'name logo stats')
      .populate('pointsTable.team', 'name logo')
      .populate({
        path: 'fixtures.match',
        populate: [
          { path: 'teamA', select: 'name logo' },
          { path: 'teamB', select: 'name logo' },
          { path: 'result.winner', select: 'name logo' }
        ]
      });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add a team to a tournament
// @route   POST /api/tournaments/:id/teams
// @access  Private/Scorer/Admin
exports.addTeamToTournament = async (req, res) => {
  const { teamId } = req.body;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.teams.includes(teamId)) {
      return res.status(400).json({ success: false, message: 'Team already registered in this tournament' });
    }

    tournament.teams.push(teamId);
    tournament.pointsTable.push({
      team: teamId,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0.0
    });

    await tournament.save();
    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Generate Tournament Fixtures (League / Round-Robin or Knockout)
// @route   POST /api/tournaments/:id/fixtures
// @access  Private/Scorer/Admin
exports.generateFixtures = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage fixtures for this tournament' });
    }

    if (tournament.teams.length < 2) {
      return res.status(400).json({ success: false, message: 'Need at least 2 teams to generate fixtures' });
    }

    // Delete any old fixtures/upcoming matches for this tournament
    const matchesToDelete = tournament.fixtures.map(f => f.match);
    await Match.deleteMany({ _id: { $in: matchesToDelete } });
    tournament.fixtures = [];

    const teams = [...tournament.teams];
    const generatedMatches = [];

    if (tournament.format === 'League') {
      // Round-Robin Fixtures Algorithm (Circle Method)
      if (teams.length % 2 !== 0) {
        teams.push(null); // Dummy team for BYE
      }

      const numTeams = teams.length;
      const rounds = numTeams - 1;
      const matchesPerRound = numTeams / 2;

      for (let round = 1; round <= rounds; round++) {
        for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
          const home = teams[matchIdx];
          const away = teams[numTeams - 1 - matchIdx];

          // Skip BYE matches
          if (home && away) {
            const title = `CPL Round ${round}: ${home} vs ${away}`;
            generatedMatches.push({
              title,
              teamA: home,
              teamB: away,
              round,
              tournament: tournament._id
            });
          }
        }
        // Rotate teams (keep index 0 constant, shift others)
        teams.splice(1, 0, teams.pop());
      }
    } else {
      // Knockout format Round 1 Pairings
      const numMatches = Math.floor(teams.length / 2);
      for (let i = 0; i < numMatches; i++) {
        const teamA = teams[i * 2];
        const teamB = teams[i * 2 + 1];
        
        generatedMatches.push({
          title: `Knockout Quarterfinal/Semifinal: ${teamA} vs ${teamB}`,
          teamA,
          teamB,
          round: 1,
          tournament: tournament._id
        });
      }
    }

    // Save generated matches to MongoDB and attach to tournament
    const createdMatches = await Match.create(generatedMatches);
    
    createdMatches.forEach((match, idx) => {
      tournament.fixtures.push({
        match: match._id,
        round: generatedMatches[idx].round,
        scheduledDate: new Date(Date.now() + idx * 24 * 60 * 60 * 1000), // Incremental days
        venue: 'CricVerse Ground ' + (idx % 2 + 1)
      });
    });

    tournament.status = 'Live';
    await tournament.save();

    const { triggerTournamentStartedNotification } = require('../services/notificationService');
    await triggerTournamentStartedNotification(tournament);

    const { logAction } = require('../services/auditService');
    await logAction(req, 'Tournament Started', `Tournament "${tournament.name}" status set to Live.`);

    res.json({ success: true, message: 'Fixtures generated successfully!', data: tournament });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Schedule a match (Set Date and Venue)
// @route   PUT /api/tournaments/:id/schedule
// @access  Private/Scorer/Admin
exports.scheduleMatch = async (req, res) => {
  const { matchId, scheduledDate, venue } = req.body;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to schedule matches for this tournament' });
    }

    const fixture = tournament.fixtures.find(f => f.match.toString() === matchId.toString());
    if (!fixture) {
      return res.status(404).json({ success: false, message: 'Fixture match not found in this tournament' });
    }

    if (scheduledDate) fixture.scheduledDate = new Date(scheduledDate);
    if (venue) fixture.venue = venue;

    await tournament.save();
    res.json({ success: true, message: 'Match successfully scheduled!', data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get tournament leadership rankings (Top Runs & Top Wickets)
// @route   GET /api/tournaments/:id/leaderboard
// @access  Public
exports.getTournamentLeaderboard = async (req, res) => {
  try {
    const matches = await Match.find({ tournament: req.params.id, status: 'Completed' })
      .populate('innings.scorecard.batsmen.player', 'name')
      .populate('innings.scorecard.bowlers.player', 'name');

    const runsMap = {};
    const wicketsMap = {};

    matches.forEach(match => {
      match.innings.forEach(innings => {
        // bat
        innings.scorecard.batsmen.forEach(entry => {
          if (entry.player) {
            const playerId = entry.player._id.toString();
            const runs = entry.runs;
            if (!runsMap[playerId]) {
              runsMap[playerId] = { name: entry.player.name, runs: 0 };
            }
            runsMap[playerId].runs += runs;
          }
        });
        // bowl
        innings.scorecard.bowlers.forEach(entry => {
          if (entry.player) {
            const playerId = entry.player._id.toString();
            const wickets = entry.wickets;
            if (!wicketsMap[playerId]) {
              wicketsMap[playerId] = { name: entry.player.name, wickets: 0 };
            }
            wicketsMap[playerId].wickets += wickets;
          }
        });
      });
    });

    const topBatsmen = Object.values(runsMap)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);

    const topBowlers = Object.values(wicketsMap)
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        batsmen: topBatsmen,
        bowlers: topBowlers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const TournamentRegistration = require('../models/TournamentRegistration');

// @desc    Update tournament details
// @route   PUT /api/tournaments/:id
// @access  Private/Creator/Admin
exports.updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Authorization check: Only creator organizer or admin can edit
    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this tournament' });
    }

    const oldStatus = tournament.status;

    const updatedTournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (req.body.status && req.body.status !== oldStatus) {
      const { triggerTournamentStartedNotification, triggerTournamentEndedNotification } = require('../services/notificationService');
      const { logAction } = require('../services/auditService');
      
      if (req.body.status === 'Live') {
        await triggerTournamentStartedNotification(updatedTournament);
        await logAction(req, 'Tournament Started', `Tournament "${updatedTournament.name}" status updated to Live.`);
      } else if (req.body.status === 'Completed') {
        await triggerTournamentEndedNotification(updatedTournament);
        await logAction(req, 'Tournament Completed', `Tournament "${updatedTournament.name}" status updated to Completed.`);
      }
    }

    res.json({ success: true, data: updatedTournament });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a tournament
// @route   DELETE /api/tournaments/:id
// @access  Private/Creator/Admin
exports.deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this tournament' });
    }

    // Also delete any registration requests associated with this tournament
    await TournamentRegistration.deleteMany({ tournament: req.params.id });

    // Also delete any match fixtures associated with this tournament
    const matchesToDelete = tournament.fixtures.map(f => f.match);
    await Match.deleteMany({ _id: { $in: matchesToDelete } });

    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Tournament and associated matches deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Register a team for a tournament
// @route   POST /api/tournaments/:id/register
// @access  Private (Captain / Admin)
exports.registerTeamForTournament = async (req, res) => {
  const { teamId } = req.body;
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.status !== 'Upcoming') {
      return res.status(400).json({ success: false, message: 'Registrations are only allowed for upcoming tournaments' });
    }

    const Team = require('../models/Team');
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Permission check: user must be team owner, or have teamRole Captain/Vice Captain, or be admin
    const TeamMembership = require('../models/TeamMembership');
    const isOwner = team.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const membership = await TeamMembership.findOne({ teamId: team._id, userId: req.user._id });
    const isCaptainOrVice = membership && ['Captain', 'Vice Captain'].includes(membership.teamRole);

    if (!isOwner && !isAdmin && !isCaptainOrVice) {
      return res.status(403).json({ success: false, message: 'Only team captains/owners/vice-captains can register a team' });
    }

    // Check if team limit reached
    if (tournament.teams.length >= tournament.maxTeams) {
      return res.status(400).json({ success: false, message: 'Tournament has reached maximum registered teams limit' });
    }

    // Check if team is already registered in the tournament
    if (tournament.teams.includes(teamId)) {
      return res.status(400).json({ success: false, message: 'Team is already registered in this tournament' });
    }

    // Check if there is already a pending or approved registration request
    const existingRegistration = await TournamentRegistration.findOne({
      tournament: req.params.id,
      team: teamId
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: `A registration request for this team is already ${existingRegistration.status.toLowerCase()}`
      });
    }

    const registration = await TournamentRegistration.create({
      tournament: req.params.id,
      team: teamId,
      captain: req.user._id,
      status: 'Pending'
    });

    res.status(201).json({ success: true, data: registration, message: 'Team registration request submitted!' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all registration requests for a tournament
// @route   GET /api/tournaments/:id/registrations
// @access  Private/Creator/Admin
exports.getRegistrationRequests = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view registrations' });
    }

    const requests = await TournamentRegistration.find({ tournament: req.params.id })
      .populate('team', 'name logo stats')
      .populate('captain', 'username email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Respond to a team registration request (Approve / Reject)
// @route   PUT /api/tournaments/:id/registrations/:regId
// @access  Private/Creator/Admin
exports.respondToRegistration = async (req, res) => {
  const { status } = req.body; // 'Approved' or 'Rejected'
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
  }

  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage registrations' });
    }

    const registration = await TournamentRegistration.findById(req.params.regId);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration request not found' });
    }

    if (registration.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Registration has already been processed' });
    }

    registration.status = status;
    await registration.save();

    if (status === 'Approved') {
      // Add team to tournament teams array if not present
      if (!tournament.teams.includes(registration.team)) {
        // Check capacity again
        if (tournament.teams.length >= tournament.maxTeams) {
          registration.status = 'Pending'; // Revert
          await registration.save();
          return res.status(400).json({ success: false, message: 'Tournament is full' });
        }
        
        tournament.teams.push(registration.team);
        
        // Add to pointsTable
        tournament.pointsTable.push({
          team: registration.team,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          points: 0,
          nrr: 0.0
        });

        await tournament.save();

        const { triggerTeamApprovedNotification } = require('../services/notificationService');
        await triggerTeamApprovedNotification(registration);

        const { logAction } = require('../services/auditService');
        const Team = require('../models/Team');
        const team = await Team.findById(registration.team);
        await logAction(req, 'Team Approved', `Approved team "${team?.name || 'Unknown'}" for tournament "${tournament.name}".`);
      }
    }

    res.json({
      success: true,
      message: `Registration request has been successfully ${status.toLowerCase()}!`,
      data: registration
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
