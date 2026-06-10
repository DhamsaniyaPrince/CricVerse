const Player = require('../models/Player');

// @desc    Create a new player
// @route   POST /api/players
// @access  Private/Scorer/Admin
exports.createPlayer = async (req, res) => {
  try {
    const player = await Player.create(req.body);
    res.status(201).json({ success: true, data: player });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all players with optional search & filter
// @route   GET /api/players
// @access  Public
exports.getPlayers = async (req, res) => {
  try {
    const { search, role, teamId } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (role) {
      query.role = role;
    }
    if (teamId) {
      const Team = require('../models/Team');
      const team = await Team.findById(teamId);
      if (team) {
        query._id = { $in: team.players };
      } else {
        return res.json({ success: true, count: 0, data: [] });
      }
    }

    const players = await Player.find(query).limit(50);
    res.json({ success: true, count: players.length, data: players });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single player profile & stats
// @route   GET /api/players/:id
// @access  Public
exports.getPlayerById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let idOrUsername = req.id || req.params.id;
    let playerId = idOrUsername;
    
    if (!mongoose.Types.ObjectId.isValid(idOrUsername)) {
      let foundPlayer = await Player.findOne({ username: idOrUsername.toLowerCase() });
      if (!foundPlayer) {
        const User = require('../models/User');
        const userDoc = await User.findOne({ username: { $regex: new RegExp(`^${idOrUsername}$`, 'i') } });
        if (userDoc) {
          foundPlayer = await Player.create({
            name: userDoc.name || userDoc.username,
            username: userDoc.username,
            role: 'All-Rounder',
            battingStyle: 'Right-hand bat',
            bowlingStyle: 'Right-arm medium',
            bio: 'CricVerse athlete profile.'
          });
        } else {
          return res.status(404).json({ success: false, message: 'Player not found' });
        }
      }
      playerId = foundPlayer._id.toString();
    }

    const { recalculatePlayerAchievements } = require('../services/achievementService');
    const { recalculatePlayerStats } = require('../services/statsService');
    await recalculatePlayerAchievements(playerId);
    await recalculatePlayerStats(playerId);

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const Team = require('../models/Team');
    const currentTeam = await Team.findOne({ players: player._id }).select('name logo');

    const { isCaptainOrAdminOfPlayer } = require('../middleware/auth');
    const isAuthorized = await isCaptainOrAdminOfPlayer(req.user, player._id);

    let responseData = player.toObject();
    if (currentTeam) {
      responseData.currentTeam = {
        _id: currentTeam._id,
        name: currentTeam.name,
        logo: currentTeam.logo
      };
    }

    // Calculate badge progress for the 5 official achievements (Task 7)
    const Match = require('../models/Match');
    const Tournament = require('../models/Tournament');

    const maxRuns = Math.max(...(player.matchHistory || []).map(mh => mh.runs || 0), 0);
    const maxWickets = Math.max(...(player.matchHistory || []).map(mh => mh.wickets || 0), 0);
    const mvpCount = (player.matchHistory || []).filter(mh => mh.mvpStatus).length;

    // 1. MVP
    const mvpEarned = mvpCount >= 1;

    // 2. Top Performer
    const topPerformerEarned = maxRuns >= 50 || maxWickets >= 3;
    const topPerformerPercentage = topPerformerEarned ? 100 : Math.round(Math.max((maxRuns / 50) * 100, (maxWickets / 3) * 100));

    // 3. Tournament Winner
    const wonTournaments = await Tournament.find({ status: 'Completed' });
    const playerTeams = await Team.find({ players: player._id });
    const playerTeamIds = playerTeams.map(t => t._id.toString());
    let wonTournament = false;
    for (const tourney of wonTournaments) {
      if (tourney.pointsTable && tourney.pointsTable.length > 0) {
        const topTeamEntry = tourney.pointsTable[0];
        if (topTeamEntry && topTeamEntry.team && playerTeamIds.includes(topTeamEntry.team.toString())) {
          wonTournament = true;
          break;
        }
      }
    }

    // 4. Winning Streak
    let winsStreak = 0;
    let maxStreak = 0;
    const sortedMatches = [...(player.matchHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const item of sortedMatches) {
      const match = await Match.findById(item.matchId);
      if (match && match.result && match.result.winner) {
        let playerTeam = null;
        if (match.playingXIA.some(id => id.toString() === player._id.toString())) {
          playerTeam = match.teamA;
        } else if (match.playingXIB.some(id => id.toString() === player._id.toString())) {
          playerTeam = match.teamB;
        } else if (currentTeam) {
          playerTeam = currentTeam._id;
        }

        if (playerTeam && match.result.winner.toString() === playerTeam.toString()) {
          winsStreak++;
          if (winsStreak > maxStreak) maxStreak = winsStreak;
        } else {
          winsStreak = 0;
        }
      } else {
        winsStreak = 0;
      }
    }

    // 5. Team Legend
    let isLegend = false;
    const captainOfTeam = await Team.exists({ captain: player._id });
    let maxMatchesForOneTeam = 0;
    if (captainOfTeam) {
      isLegend = true;
      maxMatchesForOneTeam = 5;
    } else {
      const teamMatchCounts = {};
      for (const item of player.matchHistory || []) {
        const match = await Match.findById(item.matchId);
        if (match) {
          let playerTeamId = null;
          if (match.playingXIA.some(id => id.toString() === player._id.toString())) {
            playerTeamId = match.teamA.toString();
          } else if (match.playingXIB.some(id => id.toString() === player._id.toString())) {
            playerTeamId = match.teamB.toString();
          }
          if (playerTeamId) {
            teamMatchCounts[playerTeamId] = (teamMatchCounts[playerTeamId] || 0) + 1;
          }
        }
      }
      maxMatchesForOneTeam = Math.max(...Object.values(teamMatchCounts), 0);
      if (maxMatchesForOneTeam >= 5) {
        isLegend = true;
      }
    }

    responseData.badgeProgress = {
      mvp: {
        earned: mvpEarned,
        current: mvpCount,
        target: 1,
        percentage: mvpEarned ? 100 : 0
      },
      topPerformer: {
        earned: topPerformerEarned,
        current: topPerformerEarned ? 1 : 0,
        target: 1,
        percentage: topPerformerPercentage
      },
      tournamentWinner: {
        earned: wonTournament,
        current: wonTournament ? 1 : 0,
        target: 1,
        percentage: wonTournament ? 100 : 0
      },
      winningStreak: {
        earned: maxStreak >= 3,
        current: maxStreak,
        target: 3,
        percentage: Math.min(100, Math.round((maxStreak / 3) * 100))
      },
      teamLegend: {
        earned: isLegend,
        current: captainOfTeam ? 5 : maxMatchesForOneTeam,
        target: 5,
        percentage: Math.min(100, Math.round(((captainOfTeam ? 5 : maxMatchesForOneTeam) / 5) * 100))
      }
    };

    if (!isAuthorized) {
      responseData.matchHistory = [];
      responseData.isDetailedStatsAuthorized = false;
    } else {
      responseData.isDetailedStatsAuthorized = true;
    }

    res.json({ success: true, data: responseData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update player profile details or career stats
// @route   PUT /api/players/:id
// @access  Private/Scorer/Admin
exports.updatePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Verify authorization:
    // 1. Admin/Organizer can update everything
    // 2. The player profile owner can update their own profile details
    const isOwner = player.username && req.user && req.user.username && (player.username.toLowerCase() === req.user.username.toLowerCase());
    const isStaff = req.user && (req.user.role === 'admin' || req.user.role === 'organizer');

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this player profile' });
    }

    // Perform update
    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: updatedPlayer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a player
// @route   DELETE /api/players/:id
// @access  Private/Scorer/Admin
exports.deletePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    res.json({ success: true, message: 'Player removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add XP to a player
// @route   POST /api/players/xp
// @access  Private
exports.addPlayerXp = async (req, res) => {
  try {
    const { amount, reason, matchId, playerId } = req.body;
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ success: false, message: 'Invalid XP amount' });
    }

    let targetPlayerId = playerId;
    
    // If not admin/organizer, they can only award XP to themselves
    const isStaff = req.user && (req.user.role === 'admin' || req.user.role === 'organizer');
    if (!targetPlayerId || !isStaff) {
      if (!req.user || !req.user.username) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      const playerDoc = await Player.findOne({ username: req.user.username.toLowerCase() });
      if (!playerDoc) {
        return res.status(404).json({ success: false, message: 'Player profile not found for current user' });
      }
      targetPlayerId = playerDoc._id;
    }

    const player = await Player.findById(targetPlayerId);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Push to xpHistory
    player.xpHistory.push({
      amount: Number(amount),
      reason: reason || 'Platform Engagement',
      matchId: matchId || undefined,
      date: new Date()
    });

    await player.save();

    // Recalculate player stats (which calculates level, rank, badges, etc. based on new XP history)
    const { recalculatePlayerStats } = require('../services/statsService');
    await recalculatePlayerStats(player._id);

    // Fetch the updated player profile to return
    const updatedPlayer = await Player.findById(targetPlayerId);

    res.json({
      success: true,
      data: {
        playerXP: updatedPlayer.playerXP,
        playerLevel: updatedPlayer.playerLevel,
        careerRank: updatedPlayer.careerRank,
        badges: updatedPlayer.badges,
        xpHistory: updatedPlayer.xpHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
