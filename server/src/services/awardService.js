const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');

// Helper to calculate balls from overs (e.g., 3.4 -> 22 balls)
const getBallsCount = (overs) => {
  if (!overs) return 0;
  const oversInt = Math.floor(overs);
  const ballsPart = Math.round((overs - oversInt) * 10);
  return (oversInt * 6) + ballsPart;
};

const calculateAndSaveMatchAwards = async (matchId) => {
  try {
    const match = await Match.findById(matchId)
      .populate('teamA teamB', 'name logo')
      .populate('playingXIA playingXIB');

    if (!match) {
      console.error(`Match not found for awards calculation: ${matchId}`);
      return null;
    }

    if (match.status !== 'Completed') {
      console.warn(`Match ${matchId} is not completed. Skipping awards calculation.`);
      return null;
    }

    // Combine playing XIs to easily map player details
    const allPlayers = [...(match.playingXIA || []), ...(match.playingXIB || [])];
    const playerMap = new Map();
    allPlayers.forEach(p => {
      if (p) playerMap.set(p._id.toString(), p);
    });

    // Resolve which team each player belongs to
    const getTeamName = (playerId) => {
      if (match.playingXIA && match.playingXIA.some(p => p && p._id.toString() === playerId.toString())) {
        return match.teamA ? match.teamA.name : 'Team A';
      }
      if (match.playingXIB && match.playingXIB.some(p => p && p._id.toString() === playerId.toString())) {
        return match.teamB ? match.teamB.name : 'Team B';
      }
      return 'Unknown Team';
    };

    // 1. Gather all individual stats from scorecard
    const playerStats = {}; // playerId -> stats object

    // Helper to get stats entry
    const getStatsEntry = (playerId) => {
      const idStr = playerId.toString();
      if (!playerStats[idStr]) {
        const pObj = playerMap.get(idStr);
        playerStats[idStr] = {
          playerId: idStr,
          name: pObj ? pObj.name : 'Unknown Player',
          teamName: getTeamName(idStr),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          runsConceded: 0,
          overs: 0,
          maidens: 0,
          catches: 0,
          runOuts: 0,
          stumpings: 0,
          isWinner: match.result && match.result.winner && match.result.winner.toString() === (match.playingXIA.some(p => p && p._id.toString() === idStr) ? match.teamA._id.toString() : match.teamB._id.toString()),
          matchesPlayed: pObj && pObj.matchHistory ? pObj.matchHistory.length : 0
        };
      }
      return playerStats[idStr];
    };

    // Batting stats
    match.innings.forEach(inn => {
      if (inn.scorecard && inn.scorecard.batsmen) {
        inn.scorecard.batsmen.forEach(b => {
          if (b.player) {
            const entry = getStatsEntry(b.player);
            entry.runs = b.runs || 0;
            entry.balls = b.balls || 0;
            entry.fours = b.fours || 0;
            entry.sixes = b.sixes || 0;
          }
        });
      }

      // Bowling stats
      if (inn.scorecard && inn.scorecard.bowlers) {
        inn.scorecard.bowlers.forEach(bo => {
          if (bo.player) {
            const entry = getStatsEntry(bo.player);
            entry.wickets = bo.wickets || 0;
            entry.runsConceded = bo.runs || 0;
            entry.overs = bo.overs || 0;
            entry.maidens = bo.maidens || 0;
          }
        });
      }
    });

    // Fielding stats from commentary metadata
    if (match.commentary) {
      match.commentary.forEach(comm => {
        if (comm.type === 'wicket' && comm.metadata && comm.metadata.isWicket) {
          const meta = comm.metadata;
          if (meta.fielderId) {
            const entry = getStatsEntry(meta.fielderId);
            if (meta.wicketType === 'caught') {
              entry.catches += 1;
            } else if (meta.wicketType === 'stumped') {
              entry.stumpings += 1;
            } else if (meta.wicketType === 'run-out') {
              entry.runOuts += 1;
            }
          }
        }
      });
    }

    const statsArray = Object.values(playerStats);
    if (statsArray.length === 0) {
      console.warn(`No statistics found for match ${matchId}. Skipping awards.`);
      return null;
    }

    // 2. MVP Score Calculations
    // Formula: (Runs × 1) + (Wickets × 25) + (Catches × 10) + (Run Outs × 15) + (Stumpings × 15) + (Sixes × 2) + (Fours × 1) + (Maiden Overs × 10)
    statsArray.forEach(p => {
      p.mvpScore = (p.runs * 1) + 
                   (p.wickets * 25) + 
                   (p.catches * 10) + 
                   (p.runOuts * 15) + 
                   (p.stumpings * 15) + 
                   (p.sixes * 2) + 
                   (p.fours * 1) + 
                   (p.maidens * 10);
    });

    // --- AWARD 1: Player of the Match ---
    const maxMvp = Math.max(...statsArray.map(p => p.mvpScore), -1);
    const potmList = statsArray.filter(p => p.mvpScore === maxMvp && maxMvp > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      runs: p.runs,
      wickets: p.wickets,
      catches: p.catches + p.stumpings + p.runOuts,
      score: p.mvpScore
    }));

    // Save primary Player of the Match reference to the root match document
    if (potmList.length > 0) {
      match.playerOfMatch = potmList[0].player;
    }

    // --- AWARD 2: Highest Run Scorer ---
    const maxRuns = Math.max(...statsArray.map(p => p.runs), -1);
    const highestRunScorer = statsArray.filter(p => p.runs === maxRuns && maxRuns > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      runs: p.runs,
      balls: p.balls
    }));

    // --- AWARD 3: Best Bowler ---
    // Criteria: most wickets. If tied, fewest runs. If tied, overs bowled.
    let bestBowlerList = [];
    let bestWickets = -1;
    let bestRunsConceded = 9999;
    
    statsArray.forEach(p => {
      if (p.wickets > 0 || p.overs > 0) {
        if (p.wickets > bestWickets) {
          bestWickets = p.wickets;
          bestRunsConceded = p.runsConceded;
          bestBowlerList = [p];
        } else if (p.wickets === bestWickets) {
          if (p.runsConceded < bestRunsConceded) {
            bestRunsConceded = p.runsConceded;
            bestBowlerList = [p];
          } else if (p.runsConceded === bestRunsConceded) {
            bestBowlerList.push(p);
          }
        }
      }
    });
    
    const bestBowlers = bestBowlerList.map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      wickets: p.wickets,
      runs: p.runsConceded,
      overs: p.overs
    }));

    // --- AWARD 4: Best Fielder ---
    const maxFielding = Math.max(...statsArray.map(p => p.catches + p.runOuts + p.stumpings), -1);
    const bestFielder = statsArray.filter(p => (p.catches + p.runOuts + p.stumpings) === maxFielding && maxFielding > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      catches: p.catches,
      runOuts: p.runOuts,
      stumpings: p.stumpings
    }));

    // --- AWARD 5: Fastest Scorer (Min 15 balls faced) ---
    const battingEntries = statsArray.filter(p => p.balls >= 15);
    const maxStrikeRate = battingEntries.length > 0 ? Math.max(...battingEntries.map(p => (p.runs / p.balls) * 100)) : -1;
    const fastestScorer = battingEntries.filter(p => ((p.runs / p.balls) * 100) === maxStrikeRate && maxStrikeRate > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      strikeRate: parseFloat(maxStrikeRate.toFixed(2)),
      runs: p.runs,
      balls: p.balls
    }));

    // --- AWARD 6: Most Sixes ---
    const maxSixes = Math.max(...statsArray.map(p => p.sixes), -1);
    const mostSixes = statsArray.filter(p => p.sixes === maxSixes && maxSixes > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      sixes: p.sixes
    }));

    // --- AWARD 7: Most Fours ---
    const maxFours = Math.max(...statsArray.map(p => p.fours), -1);
    const mostFours = statsArray.filter(p => p.fours === maxFours && maxFours > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      fours: p.fours
    }));

    // --- AWARD 8: Best Partnership ---
    // Parse commentary to extract partnership runs
    let bestPartnership = { batsman1: 'N/A', batsman2: 'N/A', runs: 0 };
    
    // Fallback: top scoring partnership of the match from innings scorecards if commentary parsing has no results
    let maxPartnershipRuns = 0;
    
    match.innings.forEach(inn => {
      // Very simple commentary-based partnership tracker
      if (match.commentary && match.commentary.length > 0) {
        // Filter commentary of the current innings
        const innTeamId = inn.battingTeam.toString();
        const isTeamA = innTeamId === (match.teamA ? match.teamA._id.toString() : '');
        
        let pRuns = 0;
        let b1 = null;
        let b2 = null;
        
        // Sort commentary chronologically for the innings
        const innComms = match.commentary
          .filter(c => {
            // Find if this ball matches the batting team
            if (!c.metadata) return false;
            const bId = c.metadata.strikerId;
            const isStrikerInTeam = isTeamA 
              ? match.playingXIA.some(p => p && p._id.toString() === bId)
              : match.playingXIB.some(p => p && p._id.toString() === bId);
            return isStrikerInTeam;
          })
          .sort((a, b) => (a.overNum * 6 + a.ballNum) - (b.overNum * 6 + b.ballNum));

        innComms.forEach(c => {
          if (c.metadata) {
            const striker = playerMap.get(c.metadata.strikerId);
            const nonStriker = playerMap.get(c.metadata.nonStrikerId);
            
            const strikerName = striker ? striker.name : 'Unknown';
            const nonStrikerName = nonStriker ? nonStriker.name : 'Unknown';

            if (!b1 || !b2) {
              b1 = strikerName;
              b2 = nonStrikerName;
            }

            // If a batsman changes (not because of strike rotation, but because of wicket)
            if (c.metadata.isWicket) {
              pRuns += (c.runs || 0);
              if (pRuns > maxPartnershipRuns) {
                maxPartnershipRuns = pRuns;
                bestPartnership = { batsman1: b1, batsman2: b2, runs: pRuns };
              }
              pRuns = 0;
              // Reset batsmen
              b1 = null;
              b2 = null;
            } else {
              pRuns += (c.runs || 0);
            }
          }
        });

        // Add the last partnership of the innings
        if (pRuns > maxPartnershipRuns) {
          maxPartnershipRuns = pRuns;
          bestPartnership = { batsman1: b1 || 'N/A', batsman2: b2 || 'N/A', runs: pRuns };
        }
      }
    });

    // Fallback: If no partnership runs parsed, find top 2 batsmen in either scorecard innings
    if (bestPartnership.runs === 0) {
      match.innings.forEach(inn => {
        if (inn.scorecard && inn.scorecard.batsmen && inn.scorecard.batsmen.length >= 2) {
          const sortedBatsmen = [...inn.scorecard.batsmen].sort((a, b) => (b.runs || 0) - (a.runs || 0));
          const b1Obj = playerMap.get(sortedBatsmen[0].player.toString());
          const b2Obj = playerMap.get(sortedBatsmen[1].player.toString());
          const totalRuns = (sortedBatsmen[0].runs || 0) + (sortedBatsmen[1].runs || 0);
          if (totalRuns > maxPartnershipRuns) {
            maxPartnershipRuns = totalRuns;
            bestPartnership = {
              batsman1: b1Obj ? b1Obj.name : 'Batsman 1',
              batsman2: b2Obj ? b2Obj.name : 'Batsman 2',
              runs: totalRuns
            };
          }
        }
      });
    }

    // --- AWARD 9: Best All-Rounder (Runs > 0 && Overs > 0) ---
    const allRounders = statsArray.filter(p => p.runs > 0 && p.overs > 0);
    const maxAllRounderScore = allRounders.length > 0 ? Math.max(...allRounders.map(p => p.runs + p.wickets * 25)) : -1;
    const bestAllRounder = allRounders.filter(p => (p.runs + p.wickets * 25) === maxAllRounderScore && maxAllRounderScore > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      runs: p.runs,
      wickets: p.wickets
    }));

    // --- AWARD 10: Game Changer Award (Highest MVP Score from Winning Team) ---
    const winningTeamPlayers = statsArray.filter(p => p.isWinner);
    const maxWinnerMvp = winningTeamPlayers.length > 0 ? Math.max(...winningTeamPlayers.map(p => p.mvpScore)) : -1;
    const gameChangerList = winningTeamPlayers.length > 0 
      ? winningTeamPlayers.filter(p => p.mvpScore === maxWinnerMvp && maxWinnerMvp > 0) 
      : statsArray.filter(p => p.mvpScore === maxMvp && maxMvp > 0); // Fallback to overall POTM if no winner / tie

    const gameChanger = gameChangerList.map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      score: p.mvpScore
    }));

    // --- AWARD 11: Economy King (Min 2 overs / 12 balls bowled) ---
    const bowlersWith2Overs = statsArray.filter(p => getBallsCount(p.overs) >= 12);
    const minEconomy = bowlersWith2Overs.length > 0 ? Math.min(...bowlersWith2Overs.map(p => (p.runsConceded / getBallsCount(p.overs)) * 6)) : 999;
    const economyKing = bowlersWith2Overs.filter(p => ((p.runsConceded / getBallsCount(p.overs)) * 6) === minEconomy && minEconomy < 999).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      economy: parseFloat(minEconomy.toFixed(2)),
      runs: p.runsConceded,
      overs: p.overs
    }));

    // --- AWARD 12: Emerging Player (Fewest Matches Played, highest MVP Score) ---
    // Let's filter players with <= 5 matches. If none, filter players with <= 10 matches, or just all.
    let emergingCandidates = statsArray.filter(p => p.matchesPlayed <= 5 && p.mvpScore > 0);
    if (emergingCandidates.length === 0) {
      emergingCandidates = statsArray.filter(p => p.mvpScore > 0);
    }
    const maxEmergingMvp = emergingCandidates.length > 0 ? Math.max(...emergingCandidates.map(p => p.mvpScore)) : -1;
    const emergingPlayer = emergingCandidates.filter(p => p.mvpScore === maxEmergingMvp && maxEmergingMvp > 0).map(p => ({
      player: p.playerId,
      name: p.name,
      teamName: p.teamName,
      score: p.mvpScore
    }));

    // 3. Assemble and save awards object
    match.awards = {
      playerOfMatch: potmList,
      highestRunScorer,
      bestBowler: bestBowlers,
      bestFielder,
      fastestScorer,
      mostSixes,
      mostFours,
      bestPartnership,
      bestAllRounder,
      gameChanger,
      economyKing,
      emergingPlayer
    };

    // --- Save individual Award and MvpHistory records permanently in DB ---
    const Award = require('../models/Award');
    const MvpHistory = require('../models/MvpHistory');

    // Clean up first to ensure idempotency
    await Award.deleteMany({ match: matchId });
    await MvpHistory.deleteMany({ match: matchId });

    const awardRecords = [];

    // Helper to add award records
    const addAwardRecord = (list, type, perfBuilder, valGetter) => {
      if (list && list.length > 0) {
        list.forEach(item => {
          awardRecords.push({
            player: item.player,
            match: matchId,
            teamName: item.teamName,
            awardType: type,
            performance: perfBuilder(item),
            value: valGetter(item),
            date: match.date || match.createdAt || new Date()
          });
        });
      }
    };

    addAwardRecord(potmList, 'Player of the Match', 
      item => `${item.runs} Runs | ${item.wickets} Wickets | ${item.catches} Fielding Dismissals`, 
      item => item.score
    );

    addAwardRecord(highestRunScorer, 'Highest Run Scorer', 
      item => `${item.runs} Runs (${item.balls} Balls)`, 
      item => item.runs
    );

    addAwardRecord(bestBowlers, 'Best Bowler', 
      item => `${item.wickets} Wkts / ${item.runs} Runs (${item.overs} Ov)`, 
      item => item.wickets
    );

    addAwardRecord(bestFielder, 'Best Fielder', 
      item => `${item.catches} Catches, ${item.runOuts} Run Outs, ${item.stumpings} Stumpings`, 
      item => item.catches + item.runOuts + item.stumpings
    );

    addAwardRecord(fastestScorer, 'Fastest Scorer', 
      item => `${item.strikeRate}% SR (${item.runs} Runs / ${item.balls} Balls)`, 
      item => item.strikeRate
    );

    addAwardRecord(mostSixes, 'Most Sixes', 
      item => `${item.sixes} Sixes`, 
      item => item.sixes
    );

    addAwardRecord(mostFours, 'Most Fours', 
      item => `${item.fours} Fours`, 
      item => item.fours
    );

    addAwardRecord(bestAllRounder, 'Best All-Rounder', 
      item => `${item.runs} Runs & ${item.wickets} Wkts`, 
      item => item.runs + item.wickets * 25
    );

    addAwardRecord(gameChanger, 'Game Changer', 
      item => `${item.score} MVP Score`, 
      item => item.score
    );

    addAwardRecord(economyKing, 'Economy King', 
      item => `${item.economy} Econ (${item.runs} Runs Conceded)`, 
      item => item.economy
    );

    addAwardRecord(emergingPlayer, 'Emerging Player', 
      item => `${item.score} MVP Score`, 
      item => item.score
    );

    // Partnership Award (tackled for both players if they are found in playerMap)
    if (bestPartnership && bestPartnership.runs > 0) {
      const p1 = statsArray.find(p => p.name === bestPartnership.batsman1);
      const p2 = statsArray.find(p => p.name === bestPartnership.batsman2);
      
      if (p1) {
        awardRecords.push({
          player: p1.playerId,
          match: matchId,
          teamName: p1.teamName,
          awardType: 'Best Partnership',
          performance: `${bestPartnership.runs} Runs Partnership with ${bestPartnership.batsman2}`,
          value: bestPartnership.runs,
          date: match.date || match.createdAt || new Date()
        });
      }
      if (p2) {
        awardRecords.push({
          player: p2.playerId,
          match: matchId,
          teamName: p2.teamName,
          awardType: 'Best Partnership',
          performance: `${bestPartnership.runs} Runs Partnership with ${bestPartnership.batsman1}`,
          value: bestPartnership.runs,
          date: match.date || match.createdAt || new Date()
        });
      }
    }

    if (awardRecords.length > 0) {
      await Award.insertMany(awardRecords);
      console.log(`Successfully persisted ${awardRecords.length} Award records in DB`);
    }

    // Save MvpHistory for all participants with positive score
    const mvpHistories = statsArray
      .filter(p => p.mvpScore > 0)
      .map(p => ({
        player: p.playerId,
        match: matchId,
        score: p.mvpScore,
        runs: p.runs,
        wickets: p.wickets,
        catches: p.catches,
        runOuts: p.runOuts,
        stumpings: p.stumpings,
        sixes: p.sixes,
        fours: p.fours,
        maidens: p.maidens,
        date: match.date || match.createdAt || new Date()
      }));

    if (mvpHistories.length > 0) {
      await MvpHistory.insertMany(mvpHistories);
      console.log(`Successfully persisted ${mvpHistories.length} MvpHistory records in DB`);
    }

    await match.save();
    console.log(`Successfully calculated and saved Match Awards for match ${match._id}`);
    return match.awards;
  } catch (error) {
    console.error(`Error in calculateAndSaveMatchAwards for match ${matchId}:`, error);
    throw error;
  }
};

module.exports = {
  calculateAndSaveMatchAwards
};
