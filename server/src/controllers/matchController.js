const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');

// Helper to increment balls in overs format (e.g. 5 balls -> 0.5, 6 balls -> 1.0)
const addBallToOvers = (currentOvers, isExtraValidBall) => {
  if (!isExtraValidBall) return currentOvers; // Wide or no-ball doesn't count as a legal ball
  
  const oversInt = Math.floor(currentOvers);
  let balls = Math.round((currentOvers - oversInt) * 10) + 1;
  
  if (balls >= 6) {
    return oversInt + 1;
  }
  return oversInt + (balls / 10);
};

// Helper to suggest Player of the Match
const suggestPlayerOfMatch = (match) => {
  try {
    const playerScores = {}; // playerId -> points

    // Traverse all innings
    match.innings.forEach(innings => {
      // 1. Process Batsmen
      innings.scorecard.batsmen.forEach(batsman => {
        if (!batsman.player) return;
        const pId = batsman.player.toString();
        if (!playerScores[pId]) {
          playerScores[pId] = 0;
        }
        playerScores[pId] += batsman.runs + batsman.fours + (batsman.sixes * 2);
      });

      // 2. Process Bowlers
      innings.scorecard.bowlers.forEach(bowler => {
        if (!bowler.player) return;
        const pId = bowler.player.toString();
        if (!playerScores[pId]) {
          playerScores[pId] = 0;
        }
        playerScores[pId] += (bowler.wickets * 25) - (bowler.runs * 0.5);
      });
    });

    // Find player with max points
    let bestPlayerId = null;
    let maxPoints = -Infinity;
    Object.keys(playerScores).forEach(pId => {
      if (playerScores[pId] > maxPoints) {
        maxPoints = playerScores[pId];
        bestPlayerId = pId;
      }
    });

    return bestPlayerId;
  } catch (err) {
    console.error(`Error in suggestPlayerOfMatch: ${err.message}`);
    return null;
  }
};

// Helper to sync stats for all players in a match
const syncMatchPlayersStats = async (match) => {
  try {
    const { recalculatePlayerStats } = require('../services/statsService');
    const playerIds = new Set();
    
    // Add playing XIs
    if (match.playingXIA) match.playingXIA.forEach(id => playerIds.add(id.toString()));
    if (match.playingXIB) match.playingXIB.forEach(id => playerIds.add(id.toString()));
    
    // Add scorecard players
    if (match.innings) {
      match.innings.forEach(innings => {
        if (innings.scorecard && innings.scorecard.batsmen) {
          innings.scorecard.batsmen.forEach(b => {
            if (b.player) playerIds.add(b.player.toString());
          });
        }
        if (innings.scorecard && innings.scorecard.bowlers) {
          innings.scorecard.bowlers.forEach(bo => {
            if (bo.player) playerIds.add(bo.player.toString());
          });
        }
      });
    }
    
    // Recalculate stats for each unique player
    for (const id of playerIds) {
      await recalculatePlayerStats(id);
    }
    console.log(`Successfully synced stats for all players in match ${match._id}`);
  } catch (err) {
    console.error(`Error syncing match players stats for match ${match._id}:`, err);
  }
};

// Helper to recalculate Tournament points table and Net Run Rate
const recalculateTournamentPointsTable = async (tournamentId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return;

    // Reset pointsTable entries
    const pointsMap = {}; // teamId -> stats
    tournament.teams.forEach(teamId => {
      pointsMap[teamId.toString()] = {
        team: teamId,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        nrr: 0.0,
        runsScored: 0,
        ballsFaced: 0,
        runsConceded: 0,
        ballsBowled: 0
      };
    });

    // Find all completed matches for this tournament
    const matches = await Match.find({
      tournament: tournamentId,
      status: 'Completed'
    });

    const oversToBalls = (overs) => {
      const oversInt = Math.floor(overs);
      const balls = Math.round((overs - oversInt) * 10);
      return (oversInt * 6) + balls;
    };

    matches.forEach(match => {
      if (!match.innings || match.innings.length === 0) return;

      const teamAId = match.teamA.toString();
      const teamBId = match.teamB.toString();

      if (!pointsMap[teamAId]) {
        pointsMap[teamAId] = { team: match.teamA, played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0.0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
      }
      if (!pointsMap[teamBId]) {
        pointsMap[teamBId] = { team: match.teamB, played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0.0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
      }

      const statsA = pointsMap[teamAId];
      const statsB = pointsMap[teamBId];

      statsA.played += 1;
      statsB.played += 1;

      if (match.result && match.result.winner) {
        const winnerId = match.result.winner.toString();
        if (winnerId === teamAId) {
          statsA.won += 1;
          statsA.points += 2;
          statsB.lost += 1;
        } else if (winnerId === teamBId) {
          statsB.won += 1;
          statsB.points += 2;
          statsA.lost += 1;
        }
      } else {
        // Tie
        statsA.tied += 1;
        statsA.points += 1;
        statsB.tied += 1;
        statsB.points += 1;
      }

      const firstInnings = match.innings[0];
      const secondInnings = match.innings.length > 1 ? match.innings[1] : null;

      const teamABattedFirst = firstInnings.battingTeam.toString() === teamAId;

      const runsFirst = teamABattedFirst ? match.score.teamA.runs : match.score.teamB.runs;
      const wicketsFirst = teamABattedFirst ? match.score.teamA.wickets : match.score.teamB.wickets;
      const oversFirst = teamABattedFirst ? match.score.teamA.overs : match.score.teamB.overs;

      const totalFirstPlayers = teamABattedFirst
        ? (match.playingXIA && match.playingXIA.length > 0 ? match.playingXIA.length : 11)
        : (match.playingXIB && match.playingXIB.length > 0 ? match.playingXIB.length : 11);
      const isFirstAllOut = wicketsFirst >= totalFirstPlayers - 1;
      let ballsFirstFaced = isFirstAllOut ? (match.oversCount * 6) : oversToBalls(oversFirst);

      if (secondInnings) {
        const teamABattedSecond = secondInnings.battingTeam.toString() === teamAId;
        const runsSecond = teamABattedSecond ? match.score.teamA.runs : match.score.teamB.runs;
        const wicketsSecond = teamABattedSecond ? match.score.teamA.wickets : match.score.teamB.wickets;
        const oversSecond = teamABattedSecond ? match.score.teamA.overs : match.score.teamB.overs;

        const totalSecondPlayers = teamABattedSecond
          ? (match.playingXIA && match.playingXIA.length > 0 ? match.playingXIA.length : 11)
          : (match.playingXIB && match.playingXIB.length > 0 ? match.playingXIB.length : 11);
        const isSecondAllOut = wicketsSecond >= totalSecondPlayers - 1;
        let ballsSecondFaced = isSecondAllOut ? (match.oversCount * 6) : oversToBalls(oversSecond);

        if (teamABattedFirst) {
          statsA.runsScored += runsFirst;
          statsA.ballsFaced += ballsFirstFaced;
          statsA.runsConceded += runsSecond;
          statsA.ballsBowled += ballsSecondFaced;

          statsB.runsScored += runsSecond;
          statsB.ballsFaced += ballsSecondFaced;
          statsB.runsConceded += runsFirst;
          statsB.ballsBowled += ballsFirstFaced;
        } else {
          statsB.runsScored += runsFirst;
          statsB.ballsFaced += ballsFirstFaced;
          statsB.runsConceded += runsSecond;
          statsB.ballsBowled += ballsSecondFaced;

          statsA.runsScored += runsSecond;
          statsA.ballsFaced += ballsSecondFaced;
          statsA.runsConceded += runsFirst;
          statsA.ballsBowled += ballsFirstFaced;
        }
      } else {
        if (teamABattedFirst) {
          statsA.runsScored += runsFirst;
          statsA.ballsFaced += ballsFirstFaced;
          statsA.runsConceded += 0;
          statsA.ballsBowled += 0;

          statsB.runsScored += 0;
          statsB.ballsFaced += 0;
          statsB.runsConceded += runsFirst;
          statsB.ballsBowled += ballsFirstFaced;
        } else {
          statsB.runsScored += runsFirst;
          statsB.ballsFaced += ballsFirstFaced;
          statsB.runsConceded += 0;
          statsB.ballsBowled += 0;

          statsA.runsScored += 0;
          statsA.ballsFaced += 0;
          statsA.runsConceded += runsFirst;
          statsA.ballsBowled += ballsFirstFaced;
        }
      }
    });

    const updatedTable = Object.values(pointsMap).map(stats => {
      let nrrVal = 0.0;
      if (stats.ballsFaced > 0 && stats.ballsBowled > 0) {
        const rRateScored = (stats.runsScored * 6) / stats.ballsFaced;
        const rRateConceded = (stats.runsConceded * 6) / stats.ballsBowled;
        nrrVal = rRateScored - rRateConceded;
      }
      stats.nrr = parseFloat(nrrVal.toFixed(3));
      return stats;
    });

    updatedTable.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return b.won - a.won;
    });

    tournament.pointsTable = updatedTable;
    await tournament.save();
  } catch (err) {
    console.error(`Error recalculating points table: ${err.message}`);
  }
};

// @desc    Create a new match
// @route   POST /api/matches
// @access  Private/Scorer/Admin
exports.createMatch = async (req, res) => {
  const { tournamentId, teamAId, teamBId, matchName, venue, date, overs } = req.body;

  try {
    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID is required' });
    }
    if (!teamAId || !teamBId) {
      return res.status(400).json({ success: false, message: 'Both Team A and Team B are required' });
    }
    if (teamAId === teamBId) {
      return res.status(400).json({ success: false, message: 'Team A and Team B cannot be the same team' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Permission Check: Organizer of this tournament or Admin
    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to create matches for this tournament' });
    }

    // Validation: Check if teams are registered in tournament
    const registeredTeams = tournament.teams.map(id => id.toString());
    if (!registeredTeams.includes(teamAId.toString())) {
      return res.status(400).json({ success: false, message: 'Team A must be registered in this tournament' });
    }
    if (!registeredTeams.includes(teamBId.toString())) {
      return res.status(400).json({ success: false, message: 'Team B must be registered in this tournament' });
    }

    // Set legacy fields for backwards compatibility
    req.body.tournament = tournamentId;
    req.body.teamA = teamAId;
    req.body.teamB = teamBId;
    req.body.title = matchName || req.body.title || `${tournament.name} Fixture`;
    req.body.oversCount = overs || 20;
    req.body.status = 'Scheduled';

    const match = await Match.create(req.body);
    
    // Link created match to tournament fixtures if applicable
    await Tournament.findByIdAndUpdate(tournamentId, {
      $push: {
        fixtures: {
          match: match._id,
          round: req.body.round || 1,
          scheduledDate: date || new Date(),
          venue: venue || 'CricVerse Ground'
        }
      }
    });

    res.status(201).json({ success: true, data: match });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('teamA', 'name logo')
      .populate('teamB', 'name logo')
      .populate('result.winner', 'name logo')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single match details
// @route   GET /api/matches/:id
// @access  Public
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate({
        path: 'teamA',
        select: 'name logo players',
        populate: {
          path: 'players',
          select: 'name role battingStyle bowlingStyle'
        }
      })
      .populate({
        path: 'teamB',
        select: 'name logo players',
        populate: {
          path: 'players',
          select: 'name role battingStyle bowlingStyle'
        }
      })
      .populate('playingXIA', 'name role battingStyle bowlingStyle')
      .populate('playingXIB', 'name role battingStyle bowlingStyle')
      .populate('innings.battingTeam', 'name logo')
      .populate('innings.bowlingTeam', 'name logo')
      .populate('innings.scorecard.batsmen.player', 'name role')
      .populate('innings.scorecard.batsmen.bowler', 'name')
      .populate('innings.scorecard.bowlers.player', 'name role')
      .populate('liveState.battingTeam', 'name logo')
      .populate('liveState.bowlingTeam', 'name logo')
      .populate('liveState.striker', 'name role battingStyle')
      .populate('liveState.nonStriker', 'name role battingStyle')
      .populate('liveState.currentBowler', 'name role bowlingStyle')
      .populate('tournament', 'name organizer teams')
      .populate('result.winner', 'name logo')
      .populate('playerOfMatch', 'name role');
      
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update live score details (Live Scoring Engine)
// @route   POST /api/matches/:id/ball
// @access  Private/Scorer/Admin
exports.updateMatchScore = async (req, res) => {
  const {
    runs = 0,
    isExtra = false,
    extraType = '', // 'wide', 'no-ball', 'bye', 'leg-bye'
    extraRuns = 0,
    isWicket = false,
    wicketType = '', // 'bowled', 'caught', 'lbw', 'run-out', 'stumped', 'retired-hurt'
    batsmanOutId = null,
    fielderId = null,
    strikerId,
    nonStrikerId,
    bowlerId,
    incomingBatsmanId = null, // new batsman for wicket transition
    wagonWheel = null, // { angle, distance }
    commentaryText = ''
  } = req.body;

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Match is already completed.' });
    }

    if (match.innings.length === 1 && match.target > 0) {
      return res.status(400).json({ success: false, message: 'First innings is completed. Please setup the second innings before scoring.' });
    }

    if (match.status !== 'Live') {
      match.status = 'Live';
    }

    // Capture snapshot of liveState before making any changes
    const previousLiveState = {
      battingTeam: match.liveState.battingTeam,
      bowlingTeam: match.liveState.bowlingTeam,
      striker: match.liveState.striker,
      nonStriker: match.liveState.nonStriker,
      currentBowler: match.liveState.currentBowler,
      currentOverRuns: match.liveState.currentOverRuns ? [...match.liveState.currentOverRuns] : []
    };

    // Determine current innings (normally 0 for 1st innings, 1 for 2nd innings)
    let inningsIndex = match.innings.length - 1;
    if (inningsIndex < 0) {
      // Initialize first innings
      match.innings.push({
        battingTeam: match.liveState.battingTeam || match.teamA,
        bowlingTeam: match.liveState.bowlingTeam || match.teamB,
        scorecard: { batsmen: [], bowlers: [] }
      });
      inningsIndex = 0;
    }

    const activeInnings = match.innings[inningsIndex];
    const battingTeamId = activeInnings.battingTeam.toString();
    const bowlingTeamId = activeInnings.bowlingTeam.toString();

    // Validation Rules
    // 1. Striker and non-striker cannot be the same player
    const currentStrikerId = incomingBatsmanId && batsmanOutId === strikerId ? incomingBatsmanId : strikerId;
    const currentNonStrikerId = incomingBatsmanId && batsmanOutId === nonStrikerId ? incomingBatsmanId : nonStrikerId;
    if (currentStrikerId === currentNonStrikerId) {
      return res.status(400).json({ success: false, message: 'Striker and non-striker cannot be the same player' });
    }

    // 2. Only Playing XI players can participate (if Playing XI has been set)
    if (match.playingXIA && match.playingXIA.length > 0 && match.playingXIB && match.playingXIB.length > 0) {
      const activePlayingXIA = match.playingXIA.map(id => id.toString());
      const activePlayingXIB = match.playingXIB.map(id => id.toString());
      
      const isBattingTeamA = battingTeamId === match.teamA.toString();
      const battingPlayingXI = isBattingTeamA ? activePlayingXIA : activePlayingXIB;
      const bowlingPlayingXI = isBattingTeamA ? activePlayingXIB : activePlayingXIA;

      if (!battingPlayingXI.includes(currentStrikerId)) {
        return res.status(400).json({ success: false, message: 'Striker must belong to the batting team Playing XI' });
      }
      if (!battingPlayingXI.includes(currentNonStrikerId)) {
        return res.status(400).json({ success: false, message: 'Non-striker must belong to the batting team Playing XI' });
      }
      if (!bowlingPlayingXI.includes(bowlerId)) {
        return res.status(400).json({ success: false, message: 'Bowler must belong to the bowling team Playing XI' });
      }

      // 3. Bowler cannot belong to batting team
      if (battingPlayingXI.includes(bowlerId)) {
        return res.status(400).json({ success: false, message: 'Bowler cannot belong to the active batting team' });
      }
    }
    
    // 1. Calculate Score Increments
    let ballRuns = runs;
    let extraRunsAdded = 0;
    let isLegalBall = true;

    if (isExtra) {
      if (extraType === 'wide' || extraType === 'no-ball') {
        extraRunsAdded = extraRuns || 1; // 1 run penalty default
        isLegalBall = false;
      } else if (extraType === 'bye' || extraType === 'leg-bye') {
        extraRunsAdded = extraRuns || runs;
        ballRuns = 0; // runs don't go to batsman
      }
    }

    const totalRunsThisBall = ballRuns + extraRunsAdded;

    // Update match scores
    const isTeamA = battingTeamId === match.teamA.toString();
    const scoreObj = isTeamA ? match.score.teamA : match.score.teamB;

    scoreObj.runs += totalRunsThisBall;
    if (isWicket && wicketType !== 'retired-hurt') {
      scoreObj.wickets += 1;
    }
    scoreObj.overs = addBallToOvers(scoreObj.overs, isLegalBall);

    // 2. Update Batsman Scorecard
    let batsmanCard = activeInnings.scorecard.batsmen.find(
      b => b.player.toString() === strikerId
    );

    if (!batsmanCard) {
      batsmanCard = {
        player: strikerId,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        howOut: 'Not Out'
      };
      activeInnings.scorecard.batsmen.push(batsmanCard);
      // Re-find to get reference
      batsmanCard = activeInnings.scorecard.batsmen[activeInnings.scorecard.batsmen.length - 1];
    }

    if (isLegalBall && extraType !== 'bye' && extraType !== 'leg-bye') {
      batsmanCard.runs += runs;
      batsmanCard.balls += 1;
      if (runs === 4) batsmanCard.fours += 1;
      if (runs === 6) batsmanCard.sixes += 1;
    } else if (extraType === 'no-ball') {
      batsmanCard.runs += runs;
      batsmanCard.balls += 1; // No-ball faced counts for batsman
      if (runs === 4) batsmanCard.fours += 1;
      if (runs === 6) batsmanCard.sixes += 1;
    } else if (extraType === 'bye' || extraType === 'leg-bye') {
      batsmanCard.balls += 1; // legal ball faced but 0 runs
    }

    if (isWicket && batsmanOutId === strikerId) {
      batsmanCard.howOut = wicketType || 'Out';
      batsmanCard.bowler = bowlerId;
    }

    // 3. Update Bowler Scorecard
    let bowlerCard = activeInnings.scorecard.bowlers.find(
      b => b.player.toString() === bowlerId
    );

    if (!bowlerCard) {
      bowlerCard = {
        player: bowlerId,
        overs: 0,
        maidens: 0,
        runs: 0,
        wickets: 0
      };
      activeInnings.scorecard.bowlers.push(bowlerCard);
      bowlerCard = activeInnings.scorecard.bowlers[activeInnings.scorecard.bowlers.length - 1];
    }

    if (isLegalBall) {
      bowlerCard.overs = addBallToOvers(bowlerCard.overs, true);
    }
    
    // Runs conceded by bowler
    if (extraType !== 'bye' && extraType !== 'leg-bye') {
      bowlerCard.runs += totalRunsThisBall;
    }

    if (isWicket && wicketType !== 'run-out' && wicketType !== 'retired-hurt') {
      bowlerCard.wickets += 1;
    }

    // 4. Update non-striker scorecard if they are the one who got out (e.g. run out)
    if (isWicket && batsmanOutId === nonStrikerId) {
      let nonStrikerCard = activeInnings.scorecard.batsmen.find(
        b => b.player.toString() === nonStrikerId
      );
      if (nonStrikerCard) {
        nonStrikerCard.howOut = `Run Out (${wicketType})`;
      }
    }

    // 5. Wagon Wheel points
    if (wagonWheel && wagonWheel.angle !== undefined) {
      match.wagonWheel.push({
        playerId: strikerId,
        angle: wagonWheel.angle,
        distance: wagonWheel.distance || 50,
        runs: runs
      });
    }

    // 6. Handle Commentary
    const overNumber = Math.floor(scoreObj.overs);
    const ballNumberInOver = Math.round((scoreObj.overs - overNumber) * 10);
    
    let defaultCommentary = `${overNumber}.${ballNumberInOver} bowler to batsman, `;
    if (isWicket) {
      defaultCommentary += `OUT! ${wicketType}`;
    } else if (isExtra) {
      defaultCommentary += `${totalRunsThisBall} Run(s) (${extraType})`;
    } else {
      defaultCommentary += `${runs} Run(s)`;
    }

    const newCommentary = {
      overNum: overNumber,
      ballNum: ballNumberInOver,
      text: commentaryText || defaultCommentary,
      type: isWicket ? 'wicket' : (runs === 4 || runs === 6) ? 'boundary' : isExtra ? 'extra' : 'normal',
      runs: totalRunsThisBall,
      metadata: {
        strikerId,
        nonStrikerId,
        bowlerId,
        fielderId: isWicket ? fielderId : null,
        runs,
        extraRuns: isExtra ? extraRunsAdded : 0,
        extraType: isExtra ? extraType : '',
        isExtra,
        isWicket,
        wicketType: isWicket ? wicketType : '',
        batsmanOutId: isWicket ? batsmanOutId : null,
        isLegalBall,
        previousLiveState
      }
    };

    match.commentary.unshift(newCommentary); // Newest commentary first

    // 7. Live state tracking & Striker switching
    let nextStrikerId = strikerId;
    let nextNonStrikerId = nonStrikerId;

    // Determine if they crossed/rotated strike during the delivery (runs/extras)
    let crossed = false;
    if (isExtra) {
      if (extraType === 'wide') {
        const additionalRuns = (extraRunsAdded > 0) ? (extraRunsAdded - 1) : 0;
        if (additionalRuns % 2 !== 0) crossed = true;
      } else if (extraType === 'no-ball') {
        if (runs % 2 !== 0) crossed = true;
      } else if (extraType === 'bye' || extraType === 'leg-bye') {
        if (extraRunsAdded % 2 !== 0) crossed = true;
      }
    } else {
      if (runs % 2 !== 0) crossed = true;
    }

    if (crossed) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    if (isWicket && incomingBatsmanId) {
      if (batsmanOutId === strikerId) {
        // The original striker was dismissed. Find where they are after the swap and replace them.
        if (nextStrikerId === strikerId) {
          nextStrikerId = incomingBatsmanId;
        } else {
          nextNonStrikerId = incomingBatsmanId;
        }
      } else if (batsmanOutId === nonStrikerId) {
        // The original non-striker was dismissed. Find where they are after the swap and replace them.
        if (nextStrikerId === nonStrikerId) {
          nextStrikerId = incomingBatsmanId;
        } else {
          nextNonStrikerId = incomingBatsmanId;
        }
      }

      // Initialize the scorecard for the incoming batsman
      let incomingBatsmanCard = activeInnings.scorecard.batsmen.find(
        b => b.player.toString() === incomingBatsmanId
      );
      if (!incomingBatsmanCard) {
        activeInnings.scorecard.batsmen.push({
          player: incomingBatsmanId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          howOut: 'Not Out'
        });
      }
    }

    match.liveState.striker = nextStrikerId;
    match.liveState.nonStriker = nextNonStrikerId;
    match.liveState.currentBowler = bowlerId;

    // Track runs in the current over
    match.liveState.currentOverRuns.push({
      run: totalRunsThisBall,
      isExtra,
      extraType,
      isWicket
    });

    // Check if over completed (6 legal balls)
    const legalBallsInCurrentOver = match.liveState.currentOverRuns.filter(r => !r.isExtra || (r.extraType !== 'wide' && r.extraType !== 'no-ball')).length;
    
    if (legalBallsInCurrentOver >= 6) {
      // Over completed! Swap ends again for the next bowler
      const temp = match.liveState.striker;
      match.liveState.striker = match.liveState.nonStriker;
      match.liveState.nonStriker = temp;
    }

    // Check automatic completion conditions (only if 2nd innings is active)
    if (match.innings.length >= 2 && match.target > 0) {
      const isSecondInningsTeamA = match.innings[1].battingTeam.toString() === match.teamA.toString();
      const chasingScoreObj = isSecondInningsTeamA ? match.score.teamA : match.score.teamB;
      const defendingScoreObj = isSecondInningsTeamA ? match.score.teamB : match.score.teamA;
      
      const chasingTeamId = isSecondInningsTeamA ? match.teamA.toString() : match.teamB.toString();
      const defendingTeamId = isSecondInningsTeamA ? match.teamB.toString() : match.teamA.toString();
      
      const chasingPlayingXI = isSecondInningsTeamA ? match.playingXIA : match.playingXIB;
      const totalChasingWickets = (chasingPlayingXI && chasingPlayingXI.length > 0) ? chasingPlayingXI.length - 1 : 10;
      
      const oversToBalls = (o) => {
        const oInt = Math.floor(o);
        const b = Math.round((o - oInt) * 10);
        return (oInt * 6) + b;
      };
      
      const ballsBowled = oversToBalls(chasingScoreObj.overs);
      const maxBalls = match.oversCount * 6;

      let isMatchFinished = false;
      let matchWinner = null;
      let matchMargin = '';

      if (chasingScoreObj.runs >= match.target) {
        // Chasing Team Wins
        isMatchFinished = true;
        matchWinner = chasingTeamId;
        const wicketsRemaining = (chasingPlayingXI && chasingPlayingXI.length > 0)
          ? (chasingPlayingXI.length - chasingScoreObj.wickets)
          : (10 - chasingScoreObj.wickets);
        matchMargin = `won by ${wicketsRemaining} wickets`;
      } else if (chasingScoreObj.wickets >= totalChasingWickets || ballsBowled >= maxBalls) {
        // All Out or Overs Completed
        isMatchFinished = true;
        if (chasingScoreObj.runs === match.target - 1) {
          // Tie
          matchWinner = null;
          matchMargin = 'Match Tied';
        } else {
          // Defending Team Wins
          matchWinner = defendingTeamId;
          const runsMargin = match.target - chasingScoreObj.runs - 1;
          matchMargin = `won by ${runsMargin} runs`;
        }
      }

      if (isMatchFinished) {
        match.status = 'Completed';
        match.result = {
          winner: matchWinner,
          margin: matchMargin
        };
        
        // Auto-suggest and set Player of the Match
        const suggestedPOM = suggestPlayerOfMatch(match);
        if (suggestedPOM) {
          match.playerOfMatch = suggestedPOM;
        }
      }
    }

    // Check if 1st innings is completed (overs count reached or batting team all out)
    if (match.innings.length === 1) {
      const activeInnings = match.innings[0];
      const battingTeamId = activeInnings.battingTeam.toString();
      const isTeamA = battingTeamId === match.teamA.toString();
      const scoreObj = isTeamA ? match.score.teamA : match.score.teamB;
      
      const battingPlayingXI = isTeamA ? match.playingXIA : match.playingXIB;
      const totalBattingWickets = (battingPlayingXI && battingPlayingXI.length > 0) ? battingPlayingXI.length - 1 : 10;
      
      const oversToBalls = (o) => {
        const oInt = Math.floor(o);
        const b = Math.round((o - oInt) * 10);
        return (oInt * 6) + b;
      };
      
      const ballsBowled = oversToBalls(scoreObj.overs);
      const maxBalls = match.oversCount * 6;
      
      if (ballsBowled >= maxBalls || scoreObj.wickets >= totalBattingWickets) {
        // First Innings is Completed!
        match.target = scoreObj.runs + 1;
        
        // Clear active live state values to force second innings setup
        match.liveState.striker = null;
        match.liveState.nonStriker = null;
        match.liveState.currentBowler = null;
        match.liveState.currentOverRuns = [];
      }
    }

    await match.save();

    if (match.status === 'Completed') {
      await syncMatchPlayersStats(match);
      if (match.tournament) {
        await recalculateTournamentPointsTable(match.tournament);
      }
    }

    // 8. Emit Live socket updates
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', {
        matchId: match._id,
        score: match.score,
        liveState: {
          ...match.liveState.toObject()
        },
        innings: match.innings
      });
      io.to(`match:${match._id}`).emit('match:commentary', newCommentary);
      if (wagonWheel) {
        io.to(`match:${match._id}`).emit('match:wagonwheel', {
          playerId: strikerId,
          ...wagonWheel,
          runs
        });
      }
    }

    res.json({ success: true, data: match });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    End match and set result
// @route   POST /api/matches/:id/end
// @access  Private/Scorer/Admin
exports.endMatch = async (req, res) => {
  const { winnerId, margin } = req.body;
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.status = 'Completed';
    match.result = {
      winner: winnerId || null,
      margin: margin || 'Match Completed'
    };

    if (!match.playerOfMatch) {
      match.playerOfMatch = suggestPlayerOfMatch(match);
    }

    await match.save();

    await syncMatchPlayersStats(match);

    // If part of tournament, update points table
    if (match.tournament) {
      await recalculateTournamentPointsTable(match.tournament);
    }

    // Also update Team global stats
    if (winnerId) {
      const loserId = match.teamA.toString() === winnerId.toString() ? match.teamB.toString() : match.teamA.toString();
      await Team.findByIdAndUpdate(winnerId, { $inc: { 'stats.played': 1, 'stats.won': 1 } });
      await Team.findByIdAndUpdate(loserId, { $inc: { 'stats.played': 1, 'stats.lost': 1 } });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', match);
    }

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Seed database with mockup cricket players, teams, matches and points tables
// @route   POST /api/matches/seed
// @access  Public
exports.seedMatches = async (req, res) => {
  try {
    const User = require('../models/User');
    // Clear old data
    await User.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Tournament.deleteMany({});
    await Match.deleteMany({});

    // 1. Create Users
    await User.create({
      username: 'cricadmin',
      email: 'admin@cricverse.com',
      password: 'password123',
      role: 'admin'
    });

    await User.create({
      username: 'scorer1',
      email: 'scorer@cricverse.com',
      password: 'password123',
      role: 'organizer'
    });

    await User.create({
      username: 'cricketfan',
      email: 'fan@cricverse.com',
      password: 'password123',
      role: 'player'
    });

    res.status(201).json({ success: true, message: 'Database seeded successfully with default accounts!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Setup and start a match innings
// @route   PUT /api/matches/:id/setup
// @access  Private/Scorer/Admin
exports.setupMatchInnings = async (req, res) => {
  const {
    battingTeamId,
    bowlingTeamId,
    strikerId,
    nonStrikerId,
    bowlerId,
    inningsNumber = 1,
    playingXIA = [],
    playingXIB = [],
    toss = null
  } = req.body;

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.status = 'Live';

    // If starting 1st innings, clear previous scoring data and validate playing XI
    if (inningsNumber === 1) {
      match.innings = [];
      match.commentary = [];
      match.wagonWheel = [];
      match.score.teamA = { runs: 0, wickets: 0, overs: 0 };
      match.score.teamB = { runs: 0, wickets: 0, overs: 0 };

      // Validate playing XI lists (must have same number of players, at least 2)
      if (!playingXIA || playingXIA.length < 2) {
        return res.status(400).json({ success: false, message: 'Team A Playing XI must contain at least 2 players' });
      }
      if (!playingXIB || playingXIB.length < 2) {
        return res.status(400).json({ success: false, message: 'Team B Playing XI must contain at least 2 players' });
      }
      if (playingXIA.length !== playingXIB.length) {
        return res.status(400).json({ success: false, message: 'Both teams must have the same number of players selected for their Playing XI' });
      }

      match.playingXIA = playingXIA;
      match.playingXIB = playingXIB;
    }

    // Toss info
    if (toss && toss.wonBy && toss.decision) {
      match.toss = toss;
    }

    if (!strikerId || !nonStrikerId || !bowlerId) {
      return res.status(400).json({ success: false, message: 'Please select striker, non-striker, and bowler' });
    }

    // Validation Rules
    // 1. Striker and non-striker cannot be the same
    if (strikerId === nonStrikerId) {
      return res.status(400).json({ success: false, message: 'Striker and non-striker cannot be the same player' });
    }

    // 2. Only Playing XI players can participate
    const activePlayingXIA = match.playingXIA.map(id => id.toString());
    const activePlayingXIB = match.playingXIB.map(id => id.toString());

    const isBattingTeamA = battingTeamId === match.teamA.toString();
    const battingPlayingXI = isBattingTeamA ? activePlayingXIA : activePlayingXIB;
    const bowlingPlayingXI = isBattingTeamA ? activePlayingXIB : activePlayingXIA;

    if (!battingPlayingXI.includes(strikerId)) {
      return res.status(400).json({ success: false, message: 'Striker must belong to the batting team Playing XI' });
    }
    if (!battingPlayingXI.includes(nonStrikerId)) {
      return res.status(400).json({ success: false, message: 'Non-striker must belong to the batting team Playing XI' });
    }
    if (!bowlingPlayingXI.includes(bowlerId)) {
      return res.status(400).json({ success: false, message: 'Bowler must belong to the bowling team Playing XI' });
    }

    // 3. Bowler cannot belong to batting team
    if (battingPlayingXI.includes(bowlerId)) {
      return res.status(400).json({ success: false, message: 'Bowler cannot belong to the active batting team' });
    }

    const scorecardBatsmen = [
      { player: strikerId, runs: 0, balls: 0, fours: 0, sixes: 0, howOut: 'Not Out' },
      { player: nonStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, howOut: 'Not Out' }
    ];

    const scorecardBowlers = [
      { player: bowlerId, overs: 0, maidens: 0, runs: 0, wickets: 0 }
    ];

    if (inningsNumber === 1) {
      match.innings = [{
        battingTeam: battingTeamId,
        bowlingTeam: bowlingTeamId,
        scorecard: { batsmen: scorecardBatsmen, bowlers: scorecardBowlers }
      }];
    } else {
      if (match.innings.length >= 2) {
        match.innings[1] = {
          battingTeam: battingTeamId,
          bowlingTeam: bowlingTeamId,
          scorecard: { batsmen: scorecardBatsmen, bowlers: scorecardBowlers }
        };
      } else {
        match.innings.push({
          battingTeam: battingTeamId,
          bowlingTeam: bowlingTeamId,
          scorecard: { batsmen: scorecardBatsmen, bowlers: scorecardBowlers }
        });
      }
    }

    // Set liveState
    match.liveState = {
      battingTeam: battingTeamId,
      bowlingTeam: bowlingTeamId,
      striker: strikerId,
      nonStriker: nonStrikerId,
      currentBowler: bowlerId,
      currentOverRuns: []
    };

    if (inningsNumber === 2 && match.innings.length > 0) {
      const firstInnings = match.innings[0];
      const isFirstInningsTeamA = firstInnings.battingTeam.toString() === match.teamA.toString();
      const firstInningsScore = isFirstInningsTeamA ? match.score.teamA.runs : match.score.teamB.runs;
      match.target = firstInningsScore + 1;
    } else if (inningsNumber === 1) {
      match.target = 0;
    }

    await match.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', {
        matchId: match._id,
        score: match.score,
        liveState: {
          ...match.liveState.toObject()
        },
        innings: match.innings
      });
    }

    res.json({ success: true, data: match, message: `Innings ${inningsNumber} initialized successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Undo the last recorded ball
// @route   POST /api/matches/:id/undo
// @access  Private/Scorer/Admin
exports.undoLastBall = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.commentary.length === 0) {
      return res.status(400).json({ success: false, message: 'No balls recorded to undo' });
    }

    let wasCompleted = false;
    if (match.status === 'Completed') {
      match.status = 'Live';
      match.result = undefined;
      match.playerOfMatch = undefined;
      wasCompleted = true;
    }

    // Get the last ball's commentary
    const lastBall = match.commentary[0];
    const metadata = lastBall.metadata;

    if (!metadata) {
      return res.status(400).json({ success: false, message: 'Last ball has no metadata and cannot be undone' });
    }

    // 1. Revert match scores
    const activeInnings = match.innings[match.innings.length - 1];
    const battingTeamId = activeInnings.battingTeam.toString();
    const isTeamA = battingTeamId === match.teamA.toString();
    const scoreObj = isTeamA ? match.score.teamA : match.score.teamB;

    const totalRunsThisBall = metadata.runs + metadata.extraRuns;
    scoreObj.runs -= totalRunsThisBall;
    if (metadata.isWicket) {
      scoreObj.wickets -= 1;
    }

    // Revert overs count
    if (metadata.isLegalBall) {
      const oversInt = Math.floor(scoreObj.overs);
      let balls = Math.round((scoreObj.overs - oversInt) * 10) - 1;
      if (balls < 0) {
        scoreObj.overs = Math.max(0, oversInt - 1 + 0.5);
      } else {
        scoreObj.overs = oversInt + (balls / 10);
      }
    }

    // 2. Revert batsman stats
    const strikerCard = activeInnings.scorecard.batsmen.find(
      b => b.player.toString() === metadata.strikerId
    );
    if (strikerCard) {
      if (metadata.isLegalBall && metadata.extraType !== 'bye' && metadata.extraType !== 'leg-bye') {
        strikerCard.runs -= metadata.runs;
        strikerCard.balls -= 1;
        if (metadata.runs === 4) strikerCard.fours -= 1;
        if (metadata.runs === 6) strikerCard.sixes -= 1;
      } else if (metadata.extraType === 'no-ball') {
        strikerCard.runs -= metadata.runs;
        strikerCard.balls -= 1;
        if (metadata.runs === 4) strikerCard.fours -= 1;
        if (metadata.runs === 6) strikerCard.sixes -= 1;
      } else if (metadata.extraType === 'bye' || metadata.extraType === 'leg-bye') {
        strikerCard.balls -= 1;
      }

      if (metadata.isWicket && metadata.batsmanOutId === metadata.strikerId) {
        strikerCard.howOut = 'Not Out';
        delete strikerCard.bowler;
      }
    }

    // Revert non-striker stats if they got out (e.g. run out)
    if (metadata.isWicket && metadata.batsmanOutId === metadata.nonStrikerId) {
      const nonStrikerCard = activeInnings.scorecard.batsmen.find(
        b => b.player.toString() === metadata.nonStrikerId
      );
      if (nonStrikerCard) {
        nonStrikerCard.howOut = 'Not Out';
      }
    }

    // 3. Revert bowler stats
    const bowlerCard = activeInnings.scorecard.bowlers.find(
      b => b.player.toString() === metadata.bowlerId
    );
    if (bowlerCard) {
      if (metadata.isLegalBall) {
        const oversInt = Math.floor(bowlerCard.overs);
        let balls = Math.round((bowlerCard.overs - oversInt) * 10) - 1;
        if (balls < 0) {
          bowlerCard.overs = Math.max(0, oversInt - 1 + 0.5);
        } else {
          bowlerCard.overs = oversInt + (balls / 10);
        }
      }

      if (metadata.extraType !== 'bye' && metadata.extraType !== 'leg-bye') {
        bowlerCard.runs -= totalRunsThisBall;
      }

      if (metadata.isWicket && metadata.wicketType !== 'run-out' && metadata.wicketType !== 'retired-hurt') {
        bowlerCard.wickets -= 1;
      }
    }

    // 4. Revert Wagon Wheel
    if (match.wagonWheel.length > 0) {
      const lastWagon = match.wagonWheel[match.wagonWheel.length - 1];
      if (lastWagon.playerId.toString() === metadata.strikerId && lastWagon.runs === metadata.runs) {
        match.wagonWheel.pop();
      }
    }

    // 5. Restore liveState
    match.liveState = metadata.previousLiveState;

    // 6. Delete commentary entry
    match.commentary.shift();

    // If we undo a ball and it is the 1st innings, make sure target is reset to 0
    if (match.innings.length === 1) {
      match.target = 0;
    }

    await match.save();

    if (wasCompleted) {
      await syncMatchPlayersStats(match);
      if (match.tournament) {
        await recalculateTournamentPointsTable(match.tournament);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', {
        matchId: match._id,
        score: match.score,
        liveState: {
          ...match.liveState.toObject()
        },
        innings: match.innings
      });
    }

    res.json({ success: true, data: match, message: 'Last ball successfully undone!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a match
// @route   DELETE /api/matches/:id
// @access  Private/Scorer/Admin
exports.deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (req.user.role !== 'admin') {
      if (match.tournament) {
        const tournament = await Tournament.findById(match.tournament);
        if (tournament && tournament.organizer.toString() !== req.user._id.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized to delete this match' });
        }
      }
    }

    if (match.tournament) {
      await Tournament.findByIdAndUpdate(match.tournament, {
        $pull: { fixtures: { match: match._id } }
      });
    }

    await Match.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Match was successfully deleted.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update match details
// @route   PUT /api/matches/:id
// @access  Private/Organizer/Admin
exports.updateMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const tournamentId = req.body.tournamentId || match.tournamentId || match.tournament;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Permission Check
    if (req.user.role !== 'admin' && tournament.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this match' });
    }

    const { teamAId, teamBId, matchName, venue, date, overs, status } = req.body;

    if (teamAId && teamBId && teamAId.toString() === teamBId.toString()) {
      return res.status(400).json({ success: false, message: 'Team A and Team B cannot be the same team' });
    }

    const registeredTeams = tournament.teams.map(id => id.toString());
    if (teamAId && !registeredTeams.includes(teamAId.toString())) {
      return res.status(400).json({ success: false, message: 'Team A must be registered in the tournament' });
    }
    if (teamBId && !registeredTeams.includes(teamBId.toString())) {
      return res.status(400).json({ success: false, message: 'Team B must be registered in the tournament' });
    }

    if (matchName) match.title = matchName;
    if (teamAId) {
      match.teamA = teamAId;
      match.teamAId = teamAId;
    }
    if (teamBId) {
      match.teamB = teamBId;
      match.teamBId = teamBId;
    }
    if (venue) match.venue = venue;
    if (date) match.date = date;
    if (overs !== undefined) {
      match.overs = overs;
      match.oversCount = overs;
    }
    if (status) match.status = status;

    await match.save();

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Setup playing XI and Toss, transition status to Ready
// @route   PUT /api/matches/:id/setup-ready
// @access  Private/Organizer/Admin
exports.setupMatchReady = async (req, res) => {
  const { playingXIA, playingXIB, toss } = req.body;

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Permission Check
    const tournament = await Tournament.findById(match.tournament);
    if (req.user.role !== 'admin' && (!tournament || tournament.organizer.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized to setup this match' });
    }

    // Validate playing XI lists (must have same number of players, at least 2)
    if (!playingXIA || playingXIA.length < 2) {
      return res.status(400).json({ success: false, message: 'Team A Playing XI must contain at least 2 players' });
    }
    if (!playingXIB || playingXIB.length < 2) {
      return res.status(400).json({ success: false, message: 'Team B Playing XI must contain at least 2 players' });
    }
    if (playingXIA.length !== playingXIB.length) {
      return res.status(400).json({ success: false, message: 'Both teams must have the same number of players selected for their Playing XI' });
    }

    if (!toss || !toss.wonBy || !toss.decision) {
      return res.status(400).json({ success: false, message: 'Toss winner and decision are required' });
    }

    match.playingXIA = playingXIA;
    match.playingXIB = playingXIB;
    match.toss = {
      wonBy: toss.wonBy,
      decision: toss.decision
    };
    match.status = 'Ready';

    await match.save();

    res.json({ success: true, data: match, message: 'Match roster and toss configured. Status set to Ready!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Manually swap striker and non-striker strike
// @route   PUT /api/matches/:id/swap-strike
// @access  Private/Scorer/Admin
exports.swapStrike = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const striker = match.liveState.striker;
    const nonStriker = match.liveState.nonStriker;

    match.liveState.striker = nonStriker;
    match.liveState.nonStriker = striker;

    await match.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', {
        matchId: match._id,
        score: match.score,
        liveState: {
          ...match.liveState.toObject()
        },
        innings: match.innings
      });
    }

    res.json({ success: true, data: match, message: 'Strike swapped successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Manually change current bowler
// @route   PUT /api/matches/:id/change-bowler
// @access  Private/Scorer/Admin
exports.changeBowler = async (req, res) => {
  const { bowlerId } = req.body;
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!bowlerId) {
      return res.status(400).json({ success: false, message: 'Bowler ID is required' });
    }

    // Verify bowler belongs to playing XI of bowling team
    let bowlingTeamId = match.liveState.bowlingTeam.toString();
    const activePlayingXIA = match.playingXIA.map(id => id.toString());
    const activePlayingXIB = match.playingXIB.map(id => id.toString());
    const isTeamA = bowlingTeamId === match.teamA.toString();
    const bowlingPlayingXI = isTeamA ? activePlayingXIA : activePlayingXIB;

    if (bowlingPlayingXI.length > 0 && !bowlingPlayingXI.includes(bowlerId)) {
      return res.status(400).json({ success: false, message: 'Bowler must belong to the bowling team Playing XI' });
    }

    // Bowler cannot be one of the active batsmen
    if (match.liveState.striker && (match.liveState.striker.toString() === bowlerId || (match.liveState.nonStriker && match.liveState.nonStriker.toString() === bowlerId))) {
      return res.status(400).json({ success: false, message: 'Bowler cannot be an active batsman' });
    }

    match.liveState.currentBowler = bowlerId;

    // Clear current over runs if the over was completed
    const legalBallsInCurrentOver = match.liveState.currentOverRuns.filter(r => !r.isExtra || (r.extraType !== 'wide' && r.extraType !== 'no-ball')).length;
    if (legalBallsInCurrentOver >= 6) {
      match.liveState.currentOverRuns = [];
    }

    // Check if bowler is already in the scorecard, if not add them
    let inningsIndex = match.innings.length - 1;
    if (inningsIndex >= 0) {
      const activeInnings = match.innings[inningsIndex];
      let bowlerCard = activeInnings.scorecard.bowlers.find(
        b => b.player.toString() === bowlerId
      );
      if (!bowlerCard) {
        activeInnings.scorecard.bowlers.push({
          player: bowlerId,
          overs: 0,
          maidens: 0,
          runs: 0,
          wickets: 0
        });
      }
    }

    await match.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', {
        matchId: match._id,
        score: match.score,
        liveState: {
          ...match.liveState.toObject()
        },
        innings: match.innings
      });
    }

    res.json({ success: true, data: match, message: 'Bowler changed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Manually update Player of the Match
// @route   PUT /api/matches/:id/player-of-match
// @access  Private/Scorer/Admin
exports.updatePlayerOfMatch = async (req, res) => {
  const { playerId } = req.body;
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'Player ID is required' });
    }

    // Verify player is part of the playing XI of either team
    const activePlayingXIA = match.playingXIA.map(id => id.toString());
    const activePlayingXIB = match.playingXIB.map(id => id.toString());
    if (!activePlayingXIA.includes(playerId) && !activePlayingXIB.includes(playerId)) {
      return res.status(400).json({ success: false, message: 'Player must belong to one of the playing teams' });
    }

    match.playerOfMatch = playerId;
    await match.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('match:update', {
        matchId: match._id,
        score: match.score,
        liveState: {
          ...match.liveState.toObject()
        },
        innings: match.innings
      });
    }

    res.json({ success: true, data: match, message: 'Player of the Match updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

