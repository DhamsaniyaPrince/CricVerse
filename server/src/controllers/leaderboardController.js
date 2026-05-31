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
    { $match: { balls: { $gte: 20 } } }, // Filter out small sample sizes
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
