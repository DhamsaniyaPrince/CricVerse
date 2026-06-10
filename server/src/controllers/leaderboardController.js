const mongoose = require('mongoose');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');

// Helper to filter matches based on status and tournamentId
const getMatchQuery = (tournamentId) => {
  const query = { status: { $in: ['Completed', 'Live'] } };
  if (tournamentId) {
    try {
      query.tournament = new mongoose.Types.ObjectId(tournamentId);
    } catch (err) {
      query.tournament = null;
    }
  }
  return query;
};

// Helper to calculate dynamic Player form trends
const getPlayerTrend = (player, type) => {
  const matchHistory = player.matchHistory || [];
  if (matchHistory.length === 0) return 'stable';

  const sortedHistory = [...matchHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastMatch = sortedHistory[0];

  if (type === 'bowler') {
    const avgWkts = (player.stats?.bowling?.wickets || 0) / (player.stats?.bowling?.matches || 1);
    const lastWkts = lastMatch.wickets || 0;
    if (lastWkts > avgWkts) return 'up';
    if (lastWkts < avgWkts) return 'down';
    return 'stable';
  } else {
    const avgRuns = (player.stats?.batting?.runs || 0) / (player.stats?.batting?.innings || 1);
    const lastRuns = lastMatch.runs || 0;
    if (lastRuns > avgRuns) return 'up';
    if (lastRuns < avgRuns) return 'down';
    return 'stable';
  }
};

// Helper to augment players list with team details and trends
const augmentPlayerList = async (list, type) => {
  if (!list || list.length === 0) return [];

  const teams = await Team.find({}).select('name logo players');
  const playerTeamMap = {};
  teams.forEach(t => {
    if (t.players) {
      t.players.forEach(pId => {
        playerTeamMap[pId.toString()] = {
          _id: t._id,
          name: t.name,
          logo: t.logo
        };
      });
    }
  });

  const augmented = [];
  for (const item of list) {
    const playerObj = typeof item.toObject === 'function' ? item.toObject() : item;
    
    let playerDoc = null;
    if (playerObj.matchHistory && playerObj.stats) {
      playerDoc = playerObj;
    } else {
      playerDoc = await Player.findById(playerObj._id);
    }

    const trend = playerDoc ? getPlayerTrend(playerDoc, type) : 'stable';
    const team = playerTeamMap[playerObj._id.toString()] || null;

    augmented.push({
      ...playerObj,
      team,
      trend,
      achievements: playerDoc ? playerDoc.achievements : []
    });
  }

  return augmented;
};

// 1. Top Batsmen (Runs)
const getTopBatsmen = async (tournamentId) => {
  if (!tournamentId) {
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
      strikeRate: p.stats.batting.strikeRate,
      stats: p.stats,
      matchHistory: p.matchHistory
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
        economy: p.stats.bowling.economy,
        stats: p.stats,
        matchHistory: p.matchHistory
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
      strikeRate: p.stats.batting.strikeRate,
      stats: p.stats,
      matchHistory: p.matchHistory
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
      matchCount: p.stats.batting.matches,
      stats: p.stats,
      matchHistory: p.matchHistory
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
const getMvpRankings = async (tournamentId) => {
  if (!tournamentId) {
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
        mvpPoints,
        stats: p.stats,
        matchHistory: p.matchHistory
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

// 6. Team Trend calculations
const getTeamTrend = async (teamId, tournamentId) => {
  const query = {
    $or: [{ teamA: teamId }, { teamB: teamId }],
    status: 'Completed'
  };
  if (tournamentId) {
    query.tournament = tournamentId;
  }

  const lastMatches = await Match.find(query)
    .sort({ date: -1 })
    .limit(3);

  if (lastMatches.length === 0) return 'stable';

  let wins = 0;
  let losses = 0;
  lastMatches.forEach(m => {
    if (m.result && m.result.winner) {
      if (m.result.winner.toString() === teamId.toString()) {
        wins++;
      } else {
        losses++;
      }
    }
  });

  if (wins > losses) return 'up';
  if (losses > wins) return 'down';
  return 'stable';
};

// Helper to fetch Team Form Pills (e.g. W - L - W)
const getTeamForm = async (teamId, tournamentId) => {
  const query = {
    $or: [{ teamA: teamId }, { teamB: teamId }],
    status: 'Completed'
  };
  if (tournamentId) {
    query.tournament = tournamentId;
  }

  const lastMatches = await Match.find(query)
    .sort({ date: -1 })
    .limit(5);

  return lastMatches.map(m => {
    if (m.result && m.result.winner) {
      return m.result.winner.toString() === teamId.toString() ? 'W' : 'L';
    }
    return 'T';
  }).reverse();
};

// 7. Overall Team Rankings
const getTeamRankings = async (tournamentId) => {
  if (tournamentId) {
    const tournament = await Tournament.findById(tournamentId).populate('pointsTable.team', 'name logo stats');
    if (!tournament) return [];

    const sortedTable = (tournament.pointsTable || []).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.nrr - a.nrr;
    });

    const result = [];
    for (let idx = 0; idx < sortedTable.length; idx++) {
      const entry = sortedTable[idx];
      const teamId = entry.team?._id;
      let trend = 'stable';
      let form = [];
      if (teamId) {
        trend = await getTeamTrend(teamId, tournamentId);
        form = await getTeamForm(teamId, tournamentId);
      }

      result.push({
        rank: idx + 1,
        _id: teamId,
        name: entry.team?.name || 'Unknown Team',
        logo: entry.team?.logo,
        played: entry.played,
        won: entry.won,
        lost: entry.lost,
        tied: entry.tied,
        points: entry.points,
        nrr: entry.nrr || 0,
        trend,
        form
      });
    }
    return result;
  }

  const teams = await Team.find({});
  const mapped = [];
  for (const t of teams) {
    const played = t.stats?.played || 0;
    const won = t.stats?.won || 0;
    const lost = t.stats?.lost || 0;
    const tied = t.stats?.tied || 0;
    const points = (won * 2) + (tied * 1);
    const winRate = played > 0 ? parseFloat(((won / played) * 100).toFixed(1)) : 0;
    
    const trend = await getTeamTrend(t._id);
    const form = await getTeamForm(t._id);

    mapped.push({
      _id: t._id,
      name: t.name,
      logo: t.logo,
      played,
      won,
      lost,
      tied,
      points,
      winRate,
      trend,
      form
    });
  }

  const sorted = mapped.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });

  return sorted.map((t, idx) => ({
    ...t,
    rank: idx + 1
  }));
};

// 8. Historical Records
const getHistoricalRecords = async () => {
  // 1. Highest Individual Score (Player)
  const highestIndividualRuns = await Match.aggregate([
    { $unwind: '$innings' },
    { $unwind: '$innings.scorecard.batsmen' },
    {
      $lookup: {
        from: 'players',
        localField: 'innings.scorecard.batsmen.player',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' },
    {
      $project: {
        matchTitle: '$title',
        date: 1,
        value: '$innings.scorecard.batsmen.runs',
        balls: '$innings.scorecard.batsmen.balls',
        holderName: '$player.name',
        holderId: '$player._id',
        holderAvatar: '$player.avatar'
      }
    },
    { $sort: { value: -1 } },
    { $limit: 1 }
  ]);

  // 2. Best Bowling Figures (Player)
  const bestBowlingFigures = await Match.aggregate([
    { $unwind: '$innings' },
    { $unwind: '$innings.scorecard.bowlers' },
    {
      $lookup: {
        from: 'players',
        localField: 'innings.scorecard.bowlers.player',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' },
    {
      $project: {
        matchTitle: '$title',
        date: 1,
        wickets: '$innings.scorecard.bowlers.wickets',
        runsConceded: '$innings.scorecard.bowlers.runs',
        holderName: '$player.name',
        holderId: '$player._id',
        holderAvatar: '$player.avatar'
      }
    },
    { $sort: { wickets: -1, runsConceded: 1 } },
    { $limit: 1 }
  ]);

  // 3. Highest Team Total
  const highestTeamTotal = await Match.aggregate([
    {
      $project: {
        title: 1,
        date: 1,
        totals: [
          { teamId: '$teamA', runs: '$score.teamA.runs', wickets: '$score.teamA.wickets', overs: '$score.teamA.overs' },
          { teamId: '$teamB', runs: '$score.teamB.runs', wickets: '$score.teamB.wickets', overs: '$score.teamB.overs' }
        ]
      }
    },
    { $unwind: '$totals' },
    {
      $lookup: {
        from: 'teams',
        localField: 'totals.teamId',
        foreignField: '_id',
        as: 'team'
      }
    },
    { $unwind: '$team' },
    {
      $project: {
        matchTitle: '$title',
        date: 1,
        value: '$totals.runs',
        wickets: '$totals.wickets',
        overs: '$totals.overs',
        holderName: '$team.name',
        holderId: '$team._id',
        holderLogo: '$team.logo'
      }
    },
    { $sort: { value: -1 } },
    { $limit: 1 }
  ]);

  // 4. Most Career Runs (Player)
  const mostCareerRuns = await Player.find({ 'stats.batting.runs': { $gt: 0 } })
    .sort({ 'stats.batting.runs': -1 })
    .limit(1);

  // 5. Most Career Wickets (Player)
  const mostCareerWickets = await Player.find({ 'stats.bowling.wickets': { $gt: 0 } })
    .sort({ 'stats.bowling.wickets': -1 })
    .limit(1);

  // 6. Most Career Sixes (Player)
  const mostCareerSixes = await Player.find({ 'stats.batting.sixes': { $gt: 0 } })
    .sort({ 'stats.batting.sixes': -1 })
    .limit(1);

  return {
    highestIndividualScore: highestIndividualRuns[0] ? {
      title: 'Highest Match Innings Score',
      value: `${highestIndividualRuns[0].value} runs (${highestIndividualRuns[0].balls} balls)`,
      holderName: highestIndividualRuns[0].holderName,
      holderId: highestIndividualRuns[0].holderId,
      holderAvatar: highestIndividualRuns[0].holderAvatar,
      match: highestIndividualRuns[0].matchTitle,
      date: highestIndividualRuns[0].date
    } : null,
    bestBowlingFigures: bestBowlingFigures[0] ? {
      title: 'Best Match Bowling Spell',
      value: `${bestBowlingFigures[0].wickets} wkts for ${bestBowlingFigures[0].runsConceded} runs`,
      holderName: bestBowlingFigures[0].holderName,
      holderId: bestBowlingFigures[0].holderId,
      holderAvatar: bestBowlingFigures[0].holderAvatar,
      match: bestBowlingFigures[0].matchTitle,
      date: bestBowlingFigures[0].date
    } : null,
    highestTeamTotal: highestTeamTotal[0] ? {
      title: 'Highest Team Innings Total',
      value: `${highestTeamTotal[0].value}/${highestTeamTotal[0].wickets} (${highestTeamTotal[0].overs} overs)`,
      holderName: highestTeamTotal[0].holderName,
      holderId: highestTeamTotal[0].holderId,
      holderLogo: highestTeamTotal[0].holderLogo,
      match: highestTeamTotal[0].matchTitle,
      date: highestTeamTotal[0].date
    } : null,
    mostCareerRuns: mostCareerRuns[0] ? {
      title: 'Most Career Runs',
      value: `${mostCareerRuns[0].stats.batting.runs} runs`,
      holderName: mostCareerRuns[0].name,
      holderId: mostCareerRuns[0]._id,
      holderAvatar: mostCareerRuns[0].avatar
    } : null,
    mostCareerWickets: mostCareerWickets[0] ? {
      title: 'Most Career Wickets',
      value: `${mostCareerWickets[0].stats.bowling.wickets} wickets`,
      holderName: mostCareerWickets[0].name,
      holderId: mostCareerWickets[0]._id,
      holderAvatar: mostCareerWickets[0].avatar
    } : null,
    mostCareerSixes: mostCareerSixes[0] ? {
      title: 'Most Career Sixes',
      value: `${mostCareerSixes[0].stats.batting.sixes} sixes`,
      holderName: mostCareerSixes[0].name,
      holderId: mostCareerSixes[0]._id,
      holderAvatar: mostCareerSixes[0].avatar
    } : null
  };
};

// 9. Highest Level Players
const getHighestLevelPlayers = async () => {
  const players = await Player.find({})
    .sort({ playerLevel: -1, playerXP: -1 })
    .limit(10);
  return players;
};

// 10. Most XP Earned
const getMostXpEarned = async () => {
  const players = await Player.find({})
    .sort({ playerXP: -1 })
    .limit(10);
  return players;
};

// 11. Most Achievements
const getMostAchievements = async () => {
  return Player.aggregate([
    {
      $project: {
        name: 1,
        avatar: 1,
        role: 1,
        username: 1,
        badges: 1,
        achievementsCount: { $size: { $ifNull: ['$badges', []] } },
        stats: 1,
        matchHistory: 1
      }
    },
    { $sort: { achievementsCount: -1 } },
    { $limit: 10 }
  ]);
};

// 12. Top All-Rounders
const getTopAllRounders = async () => {
  const players = await Player.find({ role: 'All-Rounder' })
    .sort({ playerXP: -1 })
    .limit(10);
  return players;
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
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'bowlers':
          data = await getTopBowlers(tournamentId);
          data = await augmentPlayerList(data, 'bowler');
          break;
        case 'strikerate':
          data = await getHighestStrikeRate(tournamentId);
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'sixes':
          data = await getMostSixes(tournamentId);
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'mvp':
          data = await getMvpRankings(tournamentId);
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'levels':
          data = await getHighestLevelPlayers();
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'xp':
          data = await getMostXpEarned();
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'achievements':
          data = await getMostAchievements();
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'all-rounders':
          data = await getTopAllRounders();
          data = await augmentPlayerList(data, 'batsman');
          break;
        case 'teams':
          data = await getTeamRankings(tournamentId);
          break;
        case 'records':
          data = await getHistoricalRecords();
          break;
        default:
          return res.status(400).json({ success: false, message: `Invalid leaderboard type '${type}'` });
      }
      return res.json({ success: true, data });
    }

    // Default: return all leaderboards aggregated in a single request
    const [batsmen, bowlers, strikeRates, sixes, mvp, levels, xp, achievements, allRounders] = await Promise.all([
      getTopBatsmen(tournamentId),
      getTopBowlers(tournamentId),
      getHighestStrikeRate(tournamentId),
      getMostSixes(tournamentId),
      getMvpRankings(tournamentId),
      getHighestLevelPlayers(),
      getMostXpEarned(),
      getMostAchievements(),
      getTopAllRounders()
    ]);

    const [augBatsmen, augBowlers, augStrikeRates, augSixes, augMvp, augLevels, augXp, augAchievements, augAllRounders] = await Promise.all([
      augmentPlayerList(batsmen, 'batsman'),
      augmentPlayerList(bowlers, 'bowler'),
      augmentPlayerList(strikeRates, 'batsman'),
      augmentPlayerList(sixes, 'batsman'),
      augmentPlayerList(mvp, 'batsman'),
      augmentPlayerList(levels, 'batsman'),
      augmentPlayerList(xp, 'batsman'),
      augmentPlayerList(achievements, 'batsman'),
      augmentPlayerList(allRounders, 'batsman')
    ]);

    res.json({
      success: true,
      data: {
        batsmen: augBatsmen,
        bowlers: augBowlers,
        strikeRates: augStrikeRates,
        sixes: augSixes,
        mvp: augMvp,
        levels: augLevels,
        xp: augXp,
        achievements: augAchievements,
        allRounders: augAllRounders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
