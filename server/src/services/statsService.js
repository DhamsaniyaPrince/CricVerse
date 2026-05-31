const Match = require('../models/Match');
const Player = require('../models/Player');

// Helper to get total balls bowled from overs (e.g. 3.4 -> 22)
const getBallsCount = (overs) => {
  if (!overs) return 0;
  const oversInt = Math.floor(overs);
  const ballsPart = Math.round((overs - oversInt) * 10);
  return (oversInt * 6) + ballsPart;
};

// Recalculates stats for a single player
const recalculatePlayerStats = async (playerId) => {
  try {
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

    await Player.findByIdAndUpdate(playerId, {
      stats: updatedStats,
      catches: fieldingCatches // Keep root catches field for backward compatibility
    });

    console.log(`Successfully recalculated stats for Player: ${playerId}`);
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
