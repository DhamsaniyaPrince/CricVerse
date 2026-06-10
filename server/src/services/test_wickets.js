const assert = require('assert');

// The result calculation logic directly extracted from matchController.js
function calculateMatchResult(match) {
  const target = match.target;
  const score = match.score;
  const teamA = match.teamA;
  const teamB = match.teamB;
  const innings = match.innings;
  const status = match.status;
  
  if (status === 'Cancelled') {
    return { status: 'Cancelled', result: { winner: null, margin: 'Match Cancelled' } };
  }
  if (status === 'No Result') {
    return { status: 'No Result', result: { winner: null, margin: 'No Result' } };
  }
  if (status === 'Walkover') {
    return { status: 'Completed', result: { winner: match.result?.winner || null, margin: 'Walkover' } };
  }

  if (innings && innings.length >= 2 && target > 0) {
    const isSecondInningsTeamA = innings[1].battingTeam.toString() === teamA.toString();
    const chasingTeamId = isSecondInningsTeamA ? teamA.toString() : teamB.toString();
    const defendingTeamId = isSecondInningsTeamA ? teamB.toString() : teamA.toString();
    
    const chasingScoreObj = isSecondInningsTeamA ? score.teamA : score.teamB;
    
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

    if (chasingScoreObj.runs >= target) {
      // Chasing Team Wins
      isMatchFinished = true;
      matchWinner = chasingTeamId;
      const wicketsRemaining = totalChasingWickets - chasingScoreObj.wickets;
      matchMargin = `won by ${wicketsRemaining} wickets`;
    } else if (chasingScoreObj.wickets >= totalChasingWickets || ballsBowled >= maxBalls) {
      // All Out or Overs Completed
      isMatchFinished = true;
      if (chasingScoreObj.runs === target - 1) {
        // Tie
        matchWinner = null;
        matchMargin = 'Match Tied';
      } else {
        // Defending Team Wins
        matchWinner = defendingTeamId;
        const runsMargin = target - chasingScoreObj.runs - 1;
        matchMargin = `won by ${runsMargin} runs`;
      }
    }

    if (isMatchFinished) {
      return {
        status: 'Completed',
        result: {
          winner: matchWinner,
          margin: matchMargin
        }
      };
    }
  }

  return { status: status || 'Live', result: match.result };
}

// Run Test Suite
const runTests = () => {
  console.log('==================================================');
  console.log('CRICVERSE AUTOMATED TEST SUITE: WICKETS CALCULATION');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  const testCases = [
    // 1. Chasing Team Target: 25, Opponent Score: 24
    {
      name: '24/0 -> Tie (Overs Completed)',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'), // Team A playing XI has 11 players (starts with 10 wickets)
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 24, wickets: 0, overs: 20 }, // Chasing Team
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: null, margin: 'Match Tied' }
      }
    },
    {
      name: '25/0 -> Won by 10 wickets',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'),
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 25, wickets: 0, overs: 5.2 },
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamA_ID', margin: 'won by 10 wickets' }
      }
    },
    {
      name: '25/1 -> Won by 9 wickets',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'),
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 25, wickets: 1, overs: 5.4 },
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamA_ID', margin: 'won by 9 wickets' }
      }
    },
    {
      name: '25/2 -> Won by 8 wickets',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'),
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 25, wickets: 2, overs: 6.1 },
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamA_ID', margin: 'won by 8 wickets' }
      }
    },
    {
      name: '25/3 -> Won by 7 wickets',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'),
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 25, wickets: 3, overs: 6.3 },
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamA_ID', margin: 'won by 7 wickets' }
      }
    },
    {
      name: '25/4 -> Won by 6 wickets',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'),
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 25, wickets: 4, overs: 7.2 },
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamA_ID', margin: 'won by 6 wickets' }
      }
    },
    // 2. Win by Runs
    {
      name: 'Defending Team wins by Runs (All Out at 15 runs chasing 25)',
      match: {
        target: 25,
        oversCount: 20,
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        playingXIA: Array(11).fill('player'),
        playingXIB: Array(11).fill('player'),
        score: {
          teamA: { runs: 15, wickets: 10, overs: 8.5 }, // Chasing team all out at 15
          teamB: { runs: 24, wickets: 4, overs: 20 }
        },
        innings: [
          { battingTeam: 'TeamB_ID', bowlingTeam: 'TeamA_ID' },
          { battingTeam: 'TeamA_ID', bowlingTeam: 'TeamB_ID' }
        ],
        status: 'Live'
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamB_ID', margin: 'won by 9 runs' }
      }
    },
    // 3. Edge Cases: Cancelled, No Result, Walkover
    {
      name: 'Cancelled Match',
      match: {
        status: 'Cancelled',
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        result: null
      },
      expected: {
        status: 'Cancelled',
        result: { winner: null, margin: 'Match Cancelled' }
      }
    },
    {
      name: 'No Result Match',
      match: {
        status: 'No Result',
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        result: null
      },
      expected: {
        status: 'No Result',
        result: { winner: null, margin: 'No Result' }
      }
    },
    {
      name: 'Walkover Match',
      match: {
        status: 'Walkover',
        teamA: 'TeamA_ID',
        teamB: 'TeamB_ID',
        result: { winner: 'TeamA_ID', margin: 'Walkover' }
      },
      expected: {
        status: 'Completed',
        result: { winner: 'TeamA_ID', margin: 'Walkover' }
      }
    }
  ];

  testCases.forEach((tc, idx) => {
    try {
      const output = calculateMatchResult(tc.match);
      assert.strictEqual(output.status, tc.expected.status);
      assert.strictEqual(output.result.winner, tc.expected.result.winner);
      assert.strictEqual(output.result.margin, tc.expected.result.margin);
      console.log(`[PASS] Test #${idx + 1}: ${tc.name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test #${idx + 1}: ${tc.name}`);
      console.error(`  Expected:`, tc.expected);
      console.error(`  Got:`, err.message);
      failed++;
    }
  });

  console.log('==================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All test cases passed successfully!');
    process.exit(0);
  }
};

runTests();
