const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');

// Helper to get total balls bowled from overs (e.g. 3.4 -> 22)
const getBallsCount = (overs) => {
  if (!overs) return 0;
  const oversInt = Math.floor(overs);
  const ballsPart = Math.round((overs - oversInt) * 10);
  return (oversInt * 6) + ballsPart;
};

// Career Rank Helper based on Level
const getRank = (level) => {
  if (level <= 10) return '🏏 Rookie';
  if (level <= 20) return '⭐ Rising Star';
  if (level <= 35) return '🔥 Match Winner';
  if (level <= 50) return '🏆 Elite Performer';
  if (level <= 75) return '💎 Cricket Legend';
  return '👑 Hall of Fame';
};

// Level threshold generator
const getLevelInfo = (xp) => {
  const thresholds = [0, 0, 100, 250, 500, 1000];
  let prevDiff = 500;
  for (let l = 6; l <= 100; l++) {
    const diff = prevDiff + 100 + (l - 5) * 10;
    thresholds.push(thresholds[l - 1] + diff);
    prevDiff = diff;
  }
  
  let currentLevel = 1;
  for (let l = 1; l <= 100; l++) {
    if (xp >= thresholds[l]) {
      currentLevel = l;
    } else {
      break;
    }
  }
  
  const nextLevel = Math.min(100, currentLevel + 1);
  const currentThreshold = thresholds[currentLevel];
  const nextThreshold = thresholds[nextLevel];
  
  return {
    level: currentLevel,
    currentThreshold,
    nextThreshold,
    progressPercent: nextThreshold === currentThreshold ? 100 : Math.min(100, Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
  };
};

// Dynamic Match XP Calculator
const calculateMatchXP = (player, match, playerId) => {
  let matchXP = 0;
  const reasons = [];

  // Find player's batting and bowling scorecard entry
  let batsmanEntry = null;
  let bowlerEntry = null;

  match.innings.forEach(inn => {
    const bat = inn.scorecard.batsmen.find(b => b.player && b.player.toString() === playerId.toString());
    if (bat) batsmanEntry = bat;

    const bowl = inn.scorecard.bowlers.find(bo => bo.player && bo.player.toString() === playerId.toString());
    if (bowl) bowlerEntry = bowl;
  });

  // Check if player's team won
  const isTeamA = match.playingXIA.map(id => id.toString()).includes(playerId.toString()) || 
                  (match.innings[0] && match.innings[0].battingTeam.toString() === match.teamA.toString() && match.innings[0].scorecard.batsmen.some(b => b.player && b.player.toString() === playerId.toString()));
  const playerTeamId = isTeamA ? match.teamA.toString() : match.teamB.toString();
  const teamWon = match.result && match.result.winner && match.result.winner.toString() === playerTeamId;

  // 1. Batsman XP
  if (batsmanEntry) {
    const runs = batsmanEntry.runs || 0;
    const fours = batsmanEntry.fours || 0;
    const sixes = batsmanEntry.sixes || 0;

    if (runs > 0) {
      matchXP += runs;
      reasons.push(`+${runs} XP for ${runs} runs scored`);

      // Milestones
      if (runs >= 200) {
        matchXP += 200;
        reasons.push('+200 XP Double Century Milestone');
      } else if (runs >= 100) {
        matchXP += 100;
        reasons.push('+100 XP Century Milestone');
      } else if (runs >= 50) {
        matchXP += 50;
        reasons.push('+50 XP Half Century Milestone');
      } else if (runs >= 25) {
        matchXP += 25;
        reasons.push('+25 XP 25 Runs Milestone');
      }
    }

    if (fours > 0) {
      matchXP += fours * 2;
      reasons.push(`+${fours * 2} XP for ${fours} Fours`);
    }
    if (sixes > 0) {
      matchXP += sixes * 4;
      reasons.push(`+${sixes * 4} XP for ${sixes} Sixes`);
    }

    // Highest Run Scorer in Match
    let maxRunsInMatch = 0;
    match.innings.forEach(inn => {
      inn.scorecard.batsmen.forEach(b => {
        if ((b.runs || 0) > maxRunsInMatch) maxRunsInMatch = b.runs;
      });
    });
    if (runs > 0 && runs === maxRunsInMatch) {
      matchXP += 50;
      reasons.push('+50 XP Highest Run Scorer');
    }

    // Match Winning Knock
    let isTopScorerForTeam = true;
    match.innings.forEach(inn => {
      const innBattingTeam = inn.battingTeam ? inn.battingTeam.toString() : '';
      if (innBattingTeam === playerTeamId) {
        inn.scorecard.batsmen.forEach(b => {
          if (b.player && b.player.toString() !== playerId.toString() && (b.runs || 0) > runs) {
            isTopScorerForTeam = false;
          }
        });
      }
    });
    if (teamWon && isTopScorerForTeam && runs >= 25) {
      matchXP += 75;
      reasons.push('+75 XP Match Winning Knock');
    }
  }

  // 2. Bowler XP
  if (bowlerEntry) {
    const wickets = bowlerEntry.wickets || 0;
    const runsConceded = bowlerEntry.runs || 0;
    const maidens = bowlerEntry.maidens || 0;
    const overs = bowlerEntry.overs || 0;

    if (wickets > 0) {
      matchXP += wickets * 25;
      reasons.push(`+${wickets * 25} XP for ${wickets} wickets`);

      // Milestones
      if (wickets >= 10) {
        matchXP += 200;
        reasons.push('+200 XP 10 Wickets Milestone');
      } else if (wickets >= 5) {
        matchXP += 100;
        reasons.push('+100 XP 5 Wickets Milestone');
      } else if (wickets >= 3) {
        matchXP += 50;
        reasons.push('+50 XP 3 Wickets Milestone');
      }
    }

    if (maidens > 0) {
      matchXP += maidens * 20;
      reasons.push(`+${maidens * 20} XP for ${maidens} Maiden Overs`);
    }

    // Best Bowler Award in match
    let isBestBowler = true;
    let anyOtherBowled = false;
    match.innings.forEach(inn => {
      inn.scorecard.bowlers.forEach(bo => {
        if (bo.player && bo.player.toString() !== playerId.toString()) {
          anyOtherBowled = true;
          if ((bo.wickets || 0) > wickets) {
            isBestBowler = false;
          } else if ((bo.wickets || 0) === wickets && (bo.runs || 0) < runsConceded) {
            isBestBowler = false;
          }
        }
      });
    });
    if (wickets > 0 && isBestBowler && anyOtherBowled) {
      matchXP += 30;
      reasons.push('+30 XP Best Bowler Award');
    }

    // Economy below 5 (overs >= 1)
    const ballsBowled = getBallsCount(overs);
    const economy = ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : 99;
    if (ballsBowled >= 6 && economy < 5) {
      matchXP += 20;
      reasons.push(`+20 XP Economy below 5 (${economy.toFixed(2)})`);
    }

    // Match Winning Spell
    let isTopWicketTakerForTeam = true;
    match.innings.forEach(inn => {
      const innBowlingTeam = inn.bowlingTeam ? inn.bowlingTeam.toString() : '';
      if (innBowlingTeam === playerTeamId) {
        inn.scorecard.bowlers.forEach(bo => {
          if (bo.player && bo.player.toString() !== playerId.toString() && (bo.wickets || 0) > wickets) {
            isTopWicketTakerForTeam = false;
          }
        });
      }
    });
    if (teamWon && isTopWicketTakerForTeam && wickets >= 1) {
      matchXP += 40;
      reasons.push('+40 XP Match Winning Spell');
    }
  }

  // 3. Player of the Match (POM)
  const isPOM = match.playerOfMatch && match.playerOfMatch.toString() === playerId.toString();
  if (isPOM) {
    matchXP += 100;
    reasons.push('+100 XP Player of the Match');
  }

  // 4. Fielding XP
  let catches = 0;
  let stumpings = 0;
  let runOuts = 0;
  let directHits = 0;

  if (match.commentary) {
    match.commentary.forEach(comm => {
      if (comm.type === 'wicket' && comm.metadata && comm.metadata.isWicket) {
        const meta = comm.metadata;
        if (meta.fielderId && meta.fielderId.toString() === playerId.toString()) {
          if (meta.wicketType === 'caught') {
            catches++;
          } else if (meta.wicketType === 'stumped') {
            stumpings++;
          } else if (meta.wicketType === 'run-out') {
            const text = (comm.text || '').toLowerCase();
            const isDirect = text.includes('direct hit') || text.includes('direct-hit');
            if (isDirect) {
              directHits++;
            } else {
              runOuts++;
            }
          }
        }
      }
    });
  }

  const isWicketKeeper = player.role === 'Wicket-Keeper';

  if (catches > 0) {
    matchXP += catches * 10;
    reasons.push(`+${catches * 10} XP for ${catches} catches`);
  }
  if (stumpings > 0 && isWicketKeeper) {
    matchXP += stumpings * 15;
    reasons.push(`+${stumpings * 15} XP for ${stumpings} stumpings`);
  }
  if (directHits > 0) {
    matchXP += directHits * 15;
    reasons.push(`+${directHits * 15} XP for ${directHits} Direct Hits`);
  }
  if (runOuts > 0) {
    matchXP += runOuts * 20;
    reasons.push(`+${runOuts * 20} XP for ${runOuts} Run Outs`);
  }

  // 5. All-Rounder Bonus
  const matchRuns = batsmanEntry ? batsmanEntry.runs || 0 : 0;
  const matchWkts = bowlerEntry ? bowlerEntry.wickets || 0 : 0;
  if (matchRuns >= 100 && matchWkts >= 5) {
    matchXP += 250;
    reasons.push('+250 XP All-Rounder Mega Contribution (100+ Runs & 5+ Wkts)');
  } else if (matchRuns >= 50 && matchWkts >= 2) {
    matchXP += 100;
    reasons.push('+100 XP All-Rounder Contribution (50+ Runs & 2+ Wkts)');
  }

  return { matchXP, reasons };
};

// Recalculates stats for a single player
const recalculatePlayerStats = async (playerId) => {
  try {
    const playerDoc = await Player.findById(playerId);
    if (!playerDoc) return;

    const matches = await Match.find({
      status: 'Completed',
      $or: [
        { playingXIA: playerId },
        { playingXIB: playerId },
        { 'innings.scorecard.batsmen.player': playerId },
        { 'innings.scorecard.bowlers.player': playerId }
      ]
    });

    let battingMatches = matches.length;
    let battingInnings = 0;
    let battingRuns = 0;
    let battingBallsFaced = 0;
    let battingHighestScore = 0;
    let battingFifties = 0;
    let battingHundreds = 0;
    let battingFours = 0;
    let battingSixes = 0;
    let battingDucks = 0;
    let battingDismissals = 0;

    let bowlingMatches = matches.length;
    let bowlingWickets = 0;
    let bowlingBallsBowled = 0;
    let bowlingRunsConceded = 0;
    let bowlingBestWickets = 0;
    let bowlingBestRuns = 9999;
    let bowlingBestBowling = '0/0';
    let bowlingMaidens = 0;
    let bowlingFiveWickets = 0;

    let fieldingCatches = 0;
    let fieldingRunOuts = 0;
    let fieldingStumpings = 0;

    matches.forEach(match => {
      // 1. Batting & Bowling from scorecard
      match.innings.forEach(innings => {
        // Batting
        const batsmanEntry = innings.scorecard.batsmen.find(
          b => b.player && b.player.toString() === playerId.toString()
        );
        if (batsmanEntry) {
          battingInnings += 1;
          battingRuns += (batsmanEntry.runs || 0);
          battingBallsFaced += (batsmanEntry.balls || 0);
          battingFours += (batsmanEntry.fours || 0);
          battingSixes += (batsmanEntry.sixes || 0);
          
          if (batsmanEntry.runs > battingHighestScore) {
            battingHighestScore = batsmanEntry.runs;
          }
          if (batsmanEntry.runs >= 100) {
            battingHundreds += 1;
          } else if (batsmanEntry.runs >= 50) {
            battingFifties += 1;
          }
          
          const isOut = batsmanEntry.howOut && batsmanEntry.howOut !== 'Not Out' && batsmanEntry.howOut !== 'retired-hurt';
          if (isOut) {
            battingDismissals += 1;
            if (batsmanEntry.runs === 0) {
              battingDucks += 1;
            }
          }
        }

        // Bowling
        const bowlerEntry = innings.scorecard.bowlers.find(
          bo => bo.player && bo.player.toString() === playerId.toString()
        );
        if (bowlerEntry) {
          bowlingWickets += (bowlerEntry.wickets || 0);
          bowlingRunsConceded += (bowlerEntry.runs || 0);
          bowlingMaidens += (bowlerEntry.maidens || 0);
          
          const matchBalls = getBallsCount(bowlerEntry.overs);
          bowlingBallsBowled += matchBalls;

          // Check Best Bowling
          if (bowlerEntry.wickets > bowlingBestWickets) {
            bowlingBestWickets = bowlerEntry.wickets;
            bowlingBestRuns = bowlerEntry.runs;
            bowlingBestBowling = `${bowlerEntry.wickets}/${bowlerEntry.runs}`;
          } else if (bowlerEntry.wickets === bowlingBestWickets && bowlerEntry.runs < bowlingBestRuns) {
            bowlingBestRuns = bowlerEntry.runs;
            bowlingBestBowling = `${bowlerEntry.wickets}/${bowlerEntry.runs}`;
          }

          if (bowlerEntry.wickets >= 5) {
            bowlingFiveWickets += 1;
          }
        }
      });

      // 2. Fielding from commentary metadata
      if (match.commentary && match.commentary.length > 0) {
        match.commentary.forEach(comm => {
          if (comm.type === 'wicket' && comm.metadata && comm.metadata.isWicket) {
            const meta = comm.metadata;
            if (meta.fielderId && meta.fielderId.toString() === playerId.toString()) {
              if (meta.wicketType === 'caught') {
                fieldingCatches += 1;
              } else if (meta.wicketType === 'stumped') {
                fieldingStumpings += 1;
              } else if (meta.wicketType === 'run-out') {
                fieldingRunOuts += 1;
              }
            }
          }
        });
      }
    });

    // Averages and rates
    const battingAverage = battingDismissals > 0 
      ? parseFloat((battingRuns / battingDismissals).toFixed(2)) 
      : (battingInnings > 0 ? battingRuns : 0);

    const battingStrikeRate = battingBallsFaced > 0 
      ? parseFloat(((battingRuns / battingBallsFaced) * 100).toFixed(2)) 
      : 0;

    const bowlingAverage = bowlingWickets > 0 
      ? parseFloat((bowlingRunsConceded / bowlingWickets).toFixed(2)) 
      : 0;

    const bowlingStrikeRate = bowlingWickets > 0 
      ? parseFloat((bowlingBallsBowled / bowlingWickets).toFixed(2)) 
      : 0;

    const bowlingEconomy = bowlingBallsBowled > 0 
      ? parseFloat(((bowlingRunsConceded / bowlingBallsBowled) * 6).toFixed(2)) 
      : 0;

    const updatedStats = {
      batting: {
        matches: battingMatches,
        innings: battingInnings,
        runs: battingRuns,
        ballsFaced: battingBallsFaced,
        highestScore: battingHighestScore,
        average: battingAverage,
        strikeRate: battingStrikeRate,
        fours: battingFours,
        sixes: battingSixes,
        fifties: battingFifties,
        hundreds: battingHundreds,
        ducks: battingDucks
      },
      bowling: {
        matches: bowlingMatches,
        wickets: bowlingWickets,
        ballsBowled: bowlingBallsBowled,
        runsConceded: bowlingRunsConceded,
        bestBowling: (bowlingBestBowling === '0/9999' || bowlingBestBowling === '0/0') ? '0/0' : bowlingBestBowling,
        economy: bowlingEconomy,
        maidens: bowlingMaidens,
        average: bowlingAverage,
        strikeRate: bowlingStrikeRate,
        fiveWickets: bowlingFiveWickets
      },
      fielding: {
        catches: fieldingCatches,
        runOuts: fieldingRunOuts,
        stumpings: fieldingStumpings
      }
    };

    // Calculate dynamic Match History details
    const populatedMatches = await Match.find({ _id: { $in: matches.map(m => m._id) } })
      .populate('teamA teamB', 'name')
      .populate('tournament', 'name')
      .populate('playerOfMatch', 'name')
      .sort({ date: 1, createdAt: 1 });

    const newMatchHistory = [];
    const newMatchXpLogs = [];

    populatedMatches.forEach(match => {
      let playerRuns = 0;
      let playerBalls = 0;
      let playerWickets = 0;
      let playerOvers = 0;

      match.innings.forEach(inn => {
        const bat = inn.scorecard.batsmen.find(b => b.player && b.player.toString() === playerId.toString());
        if (bat) {
          playerRuns = bat.runs || 0;
          playerBalls = bat.balls || 0;
        }
        const bowl = inn.scorecard.bowlers.find(bo => bo.player && bo.player.toString() === playerId.toString());
        if (bowl) {
          playerWickets = bowl.wickets || 0;
          playerOvers = bowl.overs || 0;
        }
      });

      const isTeamA = match.playingXIA.map(id => id.toString()).includes(playerId.toString()) || 
                      (match.innings[0] && match.innings[0].battingTeam.toString() === match.teamA._id.toString() && match.innings[0].scorecard.batsmen.some(b => b.player && b.player.toString() === playerId.toString()));
      const opponent = isTeamA ? match.teamB : match.teamA;
      const opponentName = opponent ? opponent.name : 'Unknown';
      const tournamentName = match.tournament ? match.tournament.name : 'General Match';

      let resultText = 'No Result';
      if (match.result && match.result.winner) {
        const winnerName = match.result.winner.toString() === match.teamA._id.toString() 
          ? match.teamA.name 
          : (match.teamB && match.result.winner.toString() === match.teamB._id.toString() ? match.teamB.name : 'Winner');
        const marginStr = match.result.margin || 'won';
        resultText = `${winnerName} ${marginStr.startsWith('won') ? marginStr : 'won ' + marginStr}`;
      } else if (match.score.teamA.runs === match.score.teamB.runs && match.score.teamA.runs > 0) {
        resultText = 'Match Tied';
      }

      const mvpStatus = match.playerOfMatch && match.playerOfMatch._id.toString() === playerId.toString() ? true : false;

      newMatchHistory.push({
        matchId: match._id,
        runs: playerRuns,
        balls: playerBalls,
        wickets: playerWickets,
        overs: playerOvers,
        opponentName,
        tournamentName,
        resultText,
        mvpStatus,
        date: match.date || match.createdAt
      });

      // Calculate XP for this match
      const { matchXP, reasons } = calculateMatchXP(playerDoc, match, playerId);
      if (matchXP > 0) {
        newMatchXpLogs.push({
          amount: matchXP,
          reason: reasons.join(', '),
          matchId: match._id,
          date: match.date || match.createdAt
        });
      }
    });

    // 1. Filter xpHistory: retain only non-match items (trivia, checkins)
    const nonMatchXpHistory = (playerDoc.xpHistory || []).filter(h => !h.matchId);

    // 2. Combine with fresh recalculated match XP logs
    const finalXpHistory = [...nonMatchXpHistory, ...newMatchXpLogs];

    // 3. Sum up total XP
    const totalXP = finalXpHistory.reduce((sum, log) => sum + log.amount, 0);

    // 4. Calculate Level & Threshold Progress
    const levelInfo = getLevelInfo(totalXP);
    const careerRank = getRank(levelInfo.level);

    // Calculate dynamic Achievements/Badges
    const newAchievements = [];
    let maxSingleMatchRuns = 0;
    let maxSingleMatchWickets = 0;
    let mvpCount = 0;
    let consistentMatchesCount = 0;

    newMatchHistory.forEach(mh => {
      if (mh.runs > maxSingleMatchRuns) maxSingleMatchRuns = mh.runs;
      if (mh.wickets > maxSingleMatchWickets) maxSingleMatchWickets = mh.wickets;
      if (mh.mvpStatus) mvpCount++;
      if (mh.runs >= 30 || mh.wickets >= 2) consistentMatchesCount++;
    });

    // Badge triggers
    const badges = [];
    if (maxSingleMatchRuns >= 50) {
      badges.push('First Fifty');
      newAchievements.push({
        title: 'First Fifty',
        description: 'Awarded for scoring a half-century (50+ runs) in a single match.',
        date: newMatchHistory.find(mh => mh.runs >= 50)?.date || new Date()
      });
    }
    if (maxSingleMatchRuns >= 100) {
      badges.push('First Century');
      newAchievements.push({
        title: 'First Century',
        description: 'Awarded for scoring a century (100+ runs) in a single match.',
        date: newMatchHistory.find(mh => mh.runs >= 100)?.date || new Date()
      });
    }
    if (maxSingleMatchWickets >= 5) {
      badges.push('First Five Wicket Haul');
      newAchievements.push({
        title: 'First Five Wicket Haul',
        description: 'Awarded for taking 5 or more wickets in a single match.',
        date: newMatchHistory.find(mh => mh.wickets >= 5)?.date || new Date()
      });
    }
    if (mvpCount >= 1) {
      badges.push('MVP King');
      newAchievements.push({
        title: 'MVP King',
        description: 'Awarded Player of the Match award in a championship match.',
        date: newMatchHistory.find(mh => mh.mvpStatus)?.date || new Date()
      });
    }
    if (battingSixes >= 10) {
      badges.push('Six Machine');
      newAchievements.push({
        title: 'Six Machine',
        description: 'Awarded for hitting 10 career sixes in CricVerse.',
        date: new Date()
      });
    }
    if (fieldingCatches >= 5) {
      badges.push('Safe Hands');
      newAchievements.push({
        title: 'Safe Hands',
        description: 'Awarded for taking 5 career outfield catches.',
        date: new Date()
      });
    }

    // Bowled wickets count for Yorker Specialist
    let bowledWicketsCount = 0;
    populatedMatches.forEach(m => {
      m.innings.forEach(inn => {
        inn.scorecard.batsmen.forEach(b => {
          if (b.howOut === 'Bowled' && b.bowler && b.bowler.toString() === playerId.toString()) {
            bowledWicketsCount++;
          }
        });
      });
    });
    if (bowledWicketsCount >= 5) {
      badges.push('Yorker Specialist');
      newAchievements.push({
        title: 'Yorker Specialist',
        description: 'Awarded for taking 5 career bowled wickets.',
        date: new Date()
      });
    }

    // Hat trick finder
    let hasHatTrick = false;
    populatedMatches.forEach(m => {
      if (m.commentary) {
        m.commentary.forEach(comm => {
          if (comm.metadata && comm.metadata.bowlerId && comm.metadata.bowlerId.toString() === playerId.toString()) {
            const text = (comm.text || '').toLowerCase();
            if (text.includes('hat-trick') || text.includes('hat trick')) {
              hasHatTrick = true;
            }
          }
        });
      }
    });
    if (hasHatTrick) {
      badges.push('Hat-Trick Hero');
      newAchievements.push({
        title: 'Hat-Trick Hero',
        description: 'Awarded for taking 3 wickets in 3 consecutive deliveries.',
        date: new Date()
      });
    }

    // Tournament winner check
    const wonTournaments = await Tournament.find({ status: 'Completed' });
    const playerTeams = await Team.find({ players: playerId });
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
    if (wonTournament) {
      badges.push('Tournament Champion');
      newAchievements.push({
        title: 'Tournament Champion',
        description: 'Member of a tournament points-table league champion squad.',
        date: new Date()
      });
    }

    // Combine achievements with default legacy checks
    if (consistentMatchesCount >= 3) {
      newAchievements.push({
        title: 'Consistent Performer',
        description: 'Maintained strong performance (30+ runs or 2+ wickets) over 3+ matches.',
        date: new Date()
      });
    }

    // Calculate player form, streak, and match highlights
    let bestMatch = null;
    let worstMatch = null;
    let bestScore = -1;
    let worstScore = 9999;
    let longestStreak = 0;
    let currentStreak = 0;

    newMatchHistory.forEach(mh => {
      const matchScore = (mh.runs || 0) + (mh.wickets || 0) * 25;
      
      const matchObj = populatedMatches.find(m => m._id.toString() === mh.matchId.toString());
      const matchTitle = matchObj ? matchObj.title : 'Match';

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = { 
          matchId: mh.matchId, 
          title: matchTitle, 
          runs: mh.runs || 0, 
          wickets: mh.wickets || 0 
        };
      }
      if (matchScore < worstScore) {
        worstScore = matchScore;
        worstMatch = { 
          matchId: mh.matchId, 
          title: matchTitle, 
          runs: mh.runs || 0, 
          wickets: mh.wickets || 0 
        };
      }

      if ((mh.runs || 0) >= 30 || (mh.wickets || 0) >= 2) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    });

    const recentForm = [...newMatchHistory].slice(-5).reverse();
    let recentFormRating = 0;
    if (recentForm.length > 0) {
      const formScores = recentForm.map(f => (f.runs || 0) + (f.wickets || 0) * 25);
      const avgFormScore = formScores.reduce((sum, val) => sum + val, 0) / formScores.length;
      recentFormRating = Math.max(10, Math.min(99, Math.round((avgFormScore / 80) * 100)));
    }

    // Save all to player document
    await Player.findByIdAndUpdate(playerId, {
      stats: updatedStats,
      catches: fieldingCatches,
      matchHistory: newMatchHistory,
      achievements: newAchievements,
      longestStreak,
      recentFormRating,
      bestMatch: bestMatch || undefined,
      worstMatch: worstMatch || undefined,
      mvpAwards: mvpCount,
      playerLevel: levelInfo.level,
      playerXP: totalXP,
      careerRank: careerRank,
      badges: badges,
      achievementHistory: newAchievements,
      xpHistory: finalXpHistory
    });

    console.log(`Successfully recalculated stats, XP (${totalXP}), Level (${levelInfo.level}), Rank (${careerRank}), Badges (${badges.length}), and Achievements (${newAchievements.length}) for Player: ${playerId}`);
    return updatedStats;
  } catch (error) {
    console.error(`Error recalculating stats for player ${playerId}:`, error);
    throw error;
  }
};

// Recalculates stats for ALL players in the database
const recalculateAllPlayersStats = async () => {
  try {
    const players = await Player.find();
    let count = 0;
    for (const player of players) {
      await recalculatePlayerStats(player._id);
      count += 1;
    }
    return count;
  } catch (error) {
    console.error('Error recalculating stats for all players:', error);
    throw error;
  }
};

module.exports = {
  recalculatePlayerStats,
  recalculateAllPlayersStats
};
