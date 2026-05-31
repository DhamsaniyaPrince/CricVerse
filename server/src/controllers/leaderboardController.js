const mongoose = require('mongoose');
const Match = require('../models/Match');

// Helper to filter matches based on status and tournamentId
const getMatchQuery = (tournamentId) => {
  const query = { status: { $in: ['Completed', 'Live'] } };
  if (tournamentId) {
    try {
      query.tournament = new mongoose.Types.ObjectId(tournamentId);
    } catch (err) {
      // If invalid ObjectId, query won't match anything
      query.tournament = null;
    }
  }
  return query;
};

// 1. Top Batsmen (Runs)
const getTopBatsmen = async (tournamentId) => {
  if (!tournamentId) {
    const Player = require('../models/Player');
    const players = await Player.find({ 'stats.batting.runs': { $gt: 0 } })
      .sort({ 'stats.batting.runs': -1 })
      .limit(10);
    return players.map(p => ({
      _id: p._id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      runs: p.stats.batting.runs,
      balls: p.stats.batting.ballsFaced,
      fours: p.stats.batting.fours,
      sixes: p.stats.batting.sixes,
      matchCount: p.stats.batting.matches,
      strikeRate: p.stats.batting.strikeRate
    }));
  }

  return Match.aggregate([
    { $match: getMatchQuery(tournamentId) },
    { $unwind: '$innings' },
    { $unwind: '$innings.scorecard.batsmen' },
    {
      $group: {
        _id: '$innings.scorecard.batsmen.player',
        runs: { $sum: '$innings.scorecard.batsmen.runs' },
        balls: { $sum: '$innings.scorecard.batsmen.balls' },
        fours: { $sum: '$innings.scorecard.batsmen.fours' },
        sixes: { $sum: '$innings.scorecard.batsmen.sixes' },
        matches: { $addToSet: '$_id' }
      }
    },
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
        name: '$playerDetails.name',
        avatar: '$playerDetails.avatar',
        role: '$playerDetails.role',
        runs: 1,
        balls: 1,
        fours: 1,
        sixes: 1,
        matchCount: { $size: '$matches' },
        strikeRate: {
          $cond: {
            if: { $gt: ['$balls', 0] },
            then: { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 100] }, 1] },
            else: 0
          }
        }
      }
    },
    { $sort: { runs: -1 } },
    { $limit: 10 }
  ]);
};

// 2. Top Bowlers (Wickets)
const getTopBowlers = async (tournamentId) => {
  if (!tournamentId) {
    const Player = require('../models/Player');
    const players = await Player.find({ 'stats.bowling.wickets': { $gt: 0 } })
      .sort({ 'stats.bowling.wickets': -1, 'stats.bowling.economy': 1 })
      .limit(10);
    return players.map(p => {
      const overs = parseFloat((Math.floor(p.stats.bowling.ballsBowled / 6) + (p.stats.bowling.ballsBowled % 6) / 10).toFixed(1));
      return {
        _id: p._id,
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        wickets: p.stats.bowling.wickets,
        runsConceded: p.stats.bowling.runsConceded,
        overs: overs,
        matchCount: p.stats.bowling.matches,
        economy: p.stats.bowling.economy
      };
    });
  }

  return Match.aggregate([
    { $match: getMatchQuery(tournamentId) },
    { $unwind: '$innings' },
    { $unwind: '$innings.scorecard.bowlers' },
    {
      $group: {
        _id: '$innings.scorecard.bowlers.player',
        wickets: { $sum: '$innings.scorecard.bowlers.wickets' },
        runsConceded: { $sum: '$innings.scorecard.bowlers.runs' },
        overs: { $sum: '$innings.scorecard.bowlers.overs' },
        matches: { $addToSet: '$_id' }
      }
    },
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
        name: '$playerDetails.name',
        avatar: '$playerDetails.avatar',
        role: '$playerDetails.role',
        wickets: 1,
        runsConceded: 1,
        overs: 1,
        matchCount: { $size: '$matches' },
        economy: {
          $cond: {
            if: { $gt: ['$overs', 0] },
            then: { $round: [{ $divide: ['$runsConceded', '$overs'] }, 2] },
            else: 0
          }
        }
      }
    },
    { $sort: { wickets: -1, economy: 1 } },
    { $limit: 10 }
  ]);
};

// 3. Highest Strike Rate (SR) - Minimum 20 balls faced
const getHighestStrikeRate = async (tournamentId) => {
  if (!tournamentId) {
    const Player = require('../models/Player');
    const players = await Player.find({ 'stats.batting.ballsFaced': { $gte: 20 } })
      .sort({ 'stats.batting.strikeRate': -1 })
      .limit(10);
    return players.map(p => ({
      _id: p._id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      runs: p.stats.batting.runs,
      balls: p.stats.batting.ballsFaced,
      matchCount: p.stats.batting.matches,
      strikeRate: p.stats.batting.strikeRate
    }));
  }

  return Match.aggregate([
    { $match: getMatchQuery(tournamentId) },
    { $unwind: '$innings' },
    { $unwind: '$innings.scorecard.batsmen' },
    {
      $group: {
        _id: '$innings.scorecard.batsmen.player',
        runs: { $sum: '$innings.scorecard.batsmen.runs' },
        balls: { $sum: '$innings.scorecard.batsmen.balls' },
        matches: { $addToSet: '$_id' }
      }
    },
    { $match: { balls: { $gte: 20 } } },
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
        name: '$playerDetails.name',
        avatar: '$playerDetails.avatar',
        role: '$playerDetails.role',
        runs: 1,
        balls: 1,
        matchCount: { $size: '$matches' },
        strikeRate: {
          $cond: {
            if: { $gt: ['$balls', 0] },
            then: { $round: [{ $multiply: [{ $divide: ['$runs', '$balls'] }, 100] }, 1] },
            else: 0
          }
        }
      }
    },
    { $sort: { strikeRate: -1 } },
    { $limit: 10 }
  ]);
};

// 4. Most Sixes
const getMostSixes = async (tournamentId) => {
  if (!tournamentId) {
    const Player = require('../models/Player');
    const players = await Player.find({ 'stats.batting.sixes': { $gt: 0 } })
      .sort({ 'stats.batting.sixes': -1, 'stats.batting.runs': -1 })
      .limit(10);
    return players.map(p => ({
      _id: p._id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      sixes: p.stats.batting.sixes,
      runs: p.stats.batting.runs,
      matchCount: p.stats.batting.matches
    }));
  }

  return Match.aggregate([
    { $match: getMatchQuery(tournamentId) },
    { $unwind: '$innings' },
    { $unwind: '$innings.scorecard.batsmen' },
    {
      $group: {
        _id: '$innings.scorecard.batsmen.player',
        sixes: { $sum: '$innings.scorecard.batsmen.sixes' },
        runs: { $sum: '$innings.scorecard.batsmen.runs' },
        matches: { $addToSet: '$_id' }
      }
    },
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
        name: '$playerDetails.name',
        avatar: '$playerDetails.avatar',
        role: '$playerDetails.role',
        sixes: 1,
        runs: 1,
        matchCount: { $size: '$matches' }
      }
    },
    { $sort: { sixes: -1, runs: -1 } },
    { $limit: 10 }
  ]);
};

// 5. MVP Rankings
// Formula: Runs + Fours*2 + Sixes*4 + Wickets*25
const getMvpRankings = async (tournamentId) => {
  if (!tournamentId) {
    const Player = require('../models/Player');
    const players = await Player.find({
      $or: [
        { 'stats.batting.runs': { $gt: 0 } },
        { 'stats.bowling.wickets': { $gt: 0 } }
      ]
    });
    const mapped = players.map(p => {
      const runs = p.stats.batting.runs || 0;
      const fours = p.stats.batting.fours || 0;
      const sixes = p.stats.batting.sixes || 0;
      const wickets = p.stats.bowling.wickets || 0;
      const mvpPoints = runs + (fours * 2) + (sixes * 4) + (wickets * 25);
      return {
        _id: p._id,
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        runs,
        fours,
        sixes,
        wickets,
        mvpPoints
      };
    });
    return mapped.sort((a, b) => b.mvpPoints - a.mvpPoints).slice(0, 10);
  }

  return Match.aggregate([
    { $match: getMatchQuery(tournamentId) },
    {
      $facet: {
        batting: [
          { $unwind: '$innings' },
          { $unwind: '$innings.scorecard.batsmen' },
          {
            $group: {
              _id: '$innings.scorecard.batsmen.player',
              runs: { $sum: '$innings.scorecard.batsmen.runs' },
              fours: { $sum: '$innings.scorecard.batsmen.fours' },
              sixes: { $sum: '$innings.scorecard.batsmen.sixes' }
            }
          }
        ],
        bowling: [
          { $unwind: '$innings' },
          { $unwind: '$innings.scorecard.bowlers' },
          {
            $group: {
              _id: '$innings.scorecard.bowlers.player',
              wickets: { $sum: '$innings.scorecard.bowlers.wickets' }
            }
          }
        ]
      }
    },
    {
      $project: {
        combined: { $concatArrays: ['$batting', '$bowling'] }
      }
    },
    { $unwind: '$combined' },
    {
      $group: {
        _id: '$combined._id',
        runs: { $sum: { $ifNull: ['$combined.runs', 0] } },
        fours: { $sum: { $ifNull: ['$combined.fours', 0] } },
        sixes: { $sum: { $ifNull: ['$combined.sixes', 0] } },
        wickets: { $sum: { $ifNull: ['$combined.wickets', 0] } }
      }
    },
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
        name: '$playerDetails.name',
        avatar: '$playerDetails.avatar',
        role: '$playerDetails.role',
        runs: 1,
        fours: 1,
        sixes: 1,
        wickets: 1,
        mvpPoints: {
          $add: [
            '$runs',
            { $multiply: ['$fours', 2] },
            { $multiply: ['$sixes', 4] },
            { $multiply: ['$wickets', 25] }
          ]
        }
      }
    },
    { $sort: { mvpPoints: -1 } },
    { $limit: 10 }
  ]);
};

// @desc    Get global or tournament-specific leaderboard statistics
// @route   GET /api/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  const { tournamentId, type } = req.query;

  try {
    if (type) {
      let data = [];
      switch (type) {
        case 'batsmen':
          data = await getTopBatsmen(tournamentId);
          break;
        case 'bowlers':
          data = await getTopBowlers(tournamentId);
          break;
        case 'strikerate':
          data = await getHighestStrikeRate(tournamentId);
          break;
        case 'sixes':
          data = await getMostSixes(tournamentId);
          break;
        case 'mvp':
          data = await getMvpRankings(tournamentId);
          break;
        default:
          return res.status(400).json({ success: false, message: `Invalid leaderboard type '${type}'` });
      }
      return res.json({ success: true, data });
    }

    // Default: return all leaderboards aggregated in a single request
    const [batsmen, bowlers, strikeRates, sixes, mvp] = await Promise.all([
      getTopBatsmen(tournamentId),
      getTopBowlers(tournamentId),
      getHighestStrikeRate(tournamentId),
      getMostSixes(tournamentId),
      getMvpRankings(tournamentId)
    ]);

    res.json({
      success: true,
      data: {
        batsmen,
        bowlers,
        strikeRates,
        sixes,
        mvp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
