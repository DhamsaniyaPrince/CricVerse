const mongoose = require('mongoose');
const Award = require('../models/Award');
const MvpHistory = require('../models/MvpHistory');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');

// @desc    Get Season MVP Leaderboard (agg from MvpHistory)
// @route   GET /api/awards/season
// @access  Public
exports.getSeasonMvpLeaderboard = async (req, res) => {
  try {
    const leaderboard = await MvpHistory.aggregate([
      {
        $group: {
          _id: '$player',
          totalMvpScore: { $sum: '$score' },
          matchesCount: { $sum: 1 },
          totalRuns: { $sum: '$runs' },
          totalWickets: { $sum: '$wickets' },
          totalCatches: { $sum: '$catches' },
          totalRunOuts: { $sum: '$runOuts' },
          totalStumpings: { $sum: '$stumpings' },
          totalSixes: { $sum: '$sixes' },
          totalFours: { $sum: '$fours' },
          totalMaidens: { $sum: '$maidens' }
        }
      },
      { $sort: { totalMvpScore: -1 } },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'playerDetails'
        }
      },
      { $unwind: '$playerDetails' },
      {
        $project: {
          _id: 1,
          totalMvpScore: 1,
          matchesCount: 1,
          totalRuns: 1,
          totalWickets: 1,
          totalCatches: 1,
          totalRunOuts: 1,
          totalStumpings: 1,
          totalSixes: 1,
          totalFours: 1,
          totalMaidens: 1,
          name: '$playerDetails.name',
          avatar: '$playerDetails.avatar',
          role: '$playerDetails.role',
          username: '$playerDetails.username'
        }
      }
    ]);

    // Populate team details for each player
    const populatedLeaderboard = [];
    const teams = await Team.find({}).select('name logo players');
    
    for (const entry of leaderboard) {
      const playerTeam = teams.find(t => t.players.some(p => p.toString() === entry._id.toString()));
      populatedLeaderboard.push({
        ...entry,
        team: playerTeam ? { _id: playerTeam._id, name: playerTeam.name, logo: playerTeam.logo } : null
      });
    }

    res.json({ success: true, data: populatedLeaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get Public Awards Gallery (list of completed matches with awards)
// @route   GET /api/awards/gallery
// @access  Public
exports.getAwardsGallery = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'Completed', 'awards.playerOfMatch': { $exists: true, $not: { $size: 0 } } })
      .populate('teamA teamB', 'name logo')
      .sort({ date: -1, createdAt: -1 })
      .select('title venue date score result awards');

    res.json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get Hall of Fame (players with most player of the match awards)
// @route   GET /api/awards/hall-of-fame
// @access  Public
exports.getHallOfFame = async (req, res) => {
  try {
    const hallOfFame = await Award.aggregate([
      { $match: { awardType: 'Player of the Match' } },
      {
        $group: {
          _id: '$player',
          potmCount: { $sum: 1 },
          lastAwardDate: { $max: '$date' }
        }
      },
      { $sort: { potmCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'playerDetails'
        }
      },
      { $unwind: '$playerDetails' },
      {
        $project: {
          _id: 1,
          potmCount: 1,
          lastAwardDate: 1,
          name: '$playerDetails.name',
          avatar: '$playerDetails.avatar',
          role: '$playerDetails.role',
          username: '$playerDetails.username'
        }
      }
    ]);

    // Populate team details
    const populatedHallOfFame = [];
    const teams = await Team.find({}).select('name logo players');
    
    for (const entry of hallOfFame) {
      const playerTeam = teams.find(t => t.players.some(p => p.toString() === entry._id.toString()));
      populatedHallOfFame.push({
        ...entry,
        team: playerTeam ? { _id: playerTeam._id, name: playerTeam.name, logo: playerTeam.logo } : null
      });
    }

    res.json({ success: true, data: populatedHallOfFame });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get Top Performers Ranking (specific awards counts)
// @route   GET /api/awards/top-performers
// @access  Public
exports.getTopPerformers = async (req, res) => {
  try {
    const categories = [
      'Highest Run Scorer',
      'Best Bowler',
      'Best Fielder',
      'Fastest Scorer',
      'Most Sixes',
      'Most Fours',
      'Economy King'
    ];

    const results = {};

    for (const category of categories) {
      const list = await Award.aggregate([
        { $match: { awardType: category } },
        {
          $group: {
            _id: '$player',
            count: { $sum: 1 },
            maxValue: { $max: '$value' }
          }
        },
        { $sort: { count: -1, maxValue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'players',
            localField: '_id',
            foreignField: '_id',
            as: 'playerDetails'
          }
        },
        { $unwind: '$playerDetails' },
        {
          $project: {
            _id: 1,
            count: 1,
            maxValue: 1,
            name: '$playerDetails.name',
            avatar: '$playerDetails.avatar',
            username: '$playerDetails.username'
          }
        }
      ]);

      const populatedList = [];
      const teams = await Team.find({}).select('name logo players');
      
      for (const entry of list) {
        const playerTeam = teams.find(t => t.players.some(p => p.toString() === entry._id.toString()));
        populatedList.push({
          ...entry,
          team: playerTeam ? { name: playerTeam.name, logo: playerTeam.logo } : null
        });
      }

      results[category] = populatedList;
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get Player Awards Timeline
// @route   GET /api/awards/player-timeline/:playerId
// @access  Public
exports.getPlayerAwardsTimeline = async (req, res) => {
  try {
    let { playerId } = req.params;
    
    // Resolve username slug to playerId if it's not a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      const player = await Player.findOne({ username: playerId.toLowerCase() });
      if (!player) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }
      playerId = player._id;
    }

    const awards = await Award.find({ player: playerId })
      .populate('match', 'title venue date result')
      .sort({ date: -1 });

    res.json({ success: true, count: awards.length, data: awards });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
