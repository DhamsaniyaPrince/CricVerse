const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    console.log('Connecting to database:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const Player = require('../models/Player');
    const Match = require('../models/Match');
    const Team = require('../models/Team');
    const Tournament = require('../models/Tournament');

    // 1. Delete all old matches
    console.log('Clearing existing Match and Tournament collections...');
    await Match.deleteMany({});
    await Tournament.deleteMany({});
    console.log('Cleared.');

    // 2. Fetch Teams and Players
    const rcbTeam = await Team.findById('6a1b2ff911ee2ff923c2f505').populate('players');
    const gtTeam = await Team.findById('6a1b30fe11ee2ff923c2f694').populate('players');

    if (!rcbTeam || !gtTeam) {
      console.error('RCB or GT team not found. Run the app or migrations first.');
      process.exit(1);
    }

    console.log(`Found Team RCB with ${rcbTeam.players.length} players.`);
    console.log(`Found Team GT with ${gtTeam.players.length} players.`);

    // 3. Create Tournament with correct fields
    const tournament = await Tournament.create({
      name: 'CricVerse Premier League 2026',
      description: 'The ultimate cricket showdown.',
      location: 'Bangalore',
      maxTeams: 8,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      status: 'Live',
      isApproved: true
    });
    console.log(`Created Tournament: ${tournament.name}`);

    // Map Player IDs
    const rcbPlayers = rcbTeam.players;
    const gtPlayers = gtTeam.players;

    const vk = rcbPlayers.find(p => p.name === 'Virat Kohli') || rcbPlayers[0];
    const rcb2 = rcbPlayers[1];
    const rcb3 = rcbPlayers[2];
    const rcb4 = rcbPlayers[3];
    const rcb5 = rcbPlayers[4];
    const rcb6 = rcbPlayers[5];
    const rcb7 = rcbPlayers[6];
    const rcb8 = rcbPlayers[7];
    const rcb9 = rcbPlayers[8];
    const rcb10 = rcbPlayers[9];
    const rcb11 = rcbPlayers[10];

    const gt1 = gtPlayers[0];
    const gt2 = gtPlayers[1];
    const gt3 = gtPlayers[2];
    const gt4 = gtPlayers[3];
    const gt5 = gtPlayers[4];
    const gt6 = gtPlayers[5];
    const gt7 = gtPlayers[6];
    const gt8 = gtPlayers[7];
    const gt9 = gtPlayers[8];
    const gt10 = gtPlayers[9];
    const gt11 = gtPlayers[10];

    // Reset team stats to 0 first
    rcbTeam.stats = { played: 0, won: 0, lost: 0, tied: 0 };
    gtTeam.stats = { played: 0, won: 0, lost: 0, tied: 0 };
    await rcbTeam.save();
    await gtTeam.save();

    // MATCH 1: RCB vs GT (RCB won by 30 runs) - June 1, 2026
    console.log('Creating Match 1...');
    const match1 = await Match.create({
      title: 'CPL Match 1: RCB vs GT',
      tournament: tournament._id,
      tournamentId: tournament._id,
      teamA: rcbTeam._id,
      teamAId: rcbTeam._id,
      teamB: gtTeam._id,
      teamBId: gtTeam._id,
      playingXIA: rcbPlayers.map(p => p._id),
      playingXIB: gtPlayers.map(p => p._id),
      status: 'Completed',
      oversCount: 20,
      overs: 20,
      venue: 'Chinnaswamy Stadium',
      date: new Date('2026-06-01T19:30:00Z'),
      score: {
        teamA: { runs: 182, wickets: 4, overs: 20 },
        teamB: { runs: 152, wickets: 8, overs: 20 }
      },
      innings: [
        {
          battingTeam: rcbTeam._id,
          bowlingTeam: gtTeam._id,
          scorecard: {
            batsmen: [
              { player: vk._id, runs: 102, balls: 54, fours: 8, sixes: 5, howOut: 'Not Out' },
              { player: rcb2._id, runs: 35, balls: 24, fours: 3, sixes: 1, howOut: 'Caught', bowler: gt1._id },
              { player: rcb3._id, runs: 38, balls: 32, fours: 4, sixes: 0, howOut: 'Bowled', bowler: gt2._id },
              { player: rcb4._id, runs: 0, balls: 2, fours: 0, sixes: 0, howOut: 'LBW', bowler: gt2._id },
              { player: rcb5._id, runs: 7, balls: 10, fours: 0, sixes: 0, howOut: 'Not Out' }
            ],
            bowlers: [
              { player: gt1._id, overs: 4, maidens: 1, runs: 30, wickets: 1 },
              { player: gt2._id, overs: 4, maidens: 0, runs: 40, wickets: 2 },
              { player: gt3._id, overs: 4, maidens: 0, runs: 35, wickets: 0 },
              { player: gt4._id, overs: 4, maidens: 0, runs: 38, wickets: 0 },
              { player: gt5._id, overs: 4, maidens: 0, runs: 39, wickets: 0 }
            ]
          }
        },
        {
          battingTeam: gtTeam._id,
          bowlingTeam: rcbTeam._id,
          scorecard: {
            batsmen: [
              { player: gt1._id, runs: 55, balls: 36, fours: 4, sixes: 2, howOut: 'Caught', bowler: rcb5._id },
              { player: gt2._id, runs: 12, balls: 15, fours: 1, sixes: 0, howOut: 'LBW', bowler: vk._id },
              { player: gt3._id, runs: 20, balls: 22, fours: 2, sixes: 0, howOut: 'Caught', bowler: rcb5._id },
              { player: gt4._id, runs: 5, balls: 8, fours: 0, sixes: 0, howOut: 'Bowled', bowler: rcb5._id },
              { player: gt5._id, runs: 15, balls: 18, fours: 1, sixes: 0, howOut: 'Caught', bowler: rcb5._id },
              { player: gt6._id, runs: 8, balls: 12, fours: 0, sixes: 0, howOut: 'Run Out', bowler: rcb5._id },
              { player: gt7._id, runs: 10, balls: 10, fours: 1, sixes: 0, howOut: 'Not Out' },
              { player: gt8._id, runs: 0, balls: 1, fours: 0, sixes: 0, howOut: 'Caught', bowler: rcb5._id },
              { player: gt9._id, runs: 12, balls: 10, fours: 1, sixes: 0, howOut: 'Not Out' }
            ],
            bowlers: [
              { player: vk._id, overs: 2, maidens: 0, runs: 12, wickets: 1 },
              { player: rcb5._id, overs: 4, maidens: 0, runs: 25, wickets: 5 },
              { player: rcb2._id, overs: 4, maidens: 0, runs: 30, wickets: 0 },
              { player: rcb3._id, overs: 4, maidens: 0, runs: 35, wickets: 0 },
              { player: rcb4._id, overs: 4, maidens: 0, runs: 28, wickets: 0 },
              { player: rcb11._id, overs: 2, maidens: 0, runs: 22, wickets: 0 }
            ]
          }
        }
      ],
      commentary: [
        {
          overNum: 5, ballNum: 4, text: 'WICKET! rcb2 caught by gt3', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: gt3._id, bowlerId: gt1._id, batsmanOutId: rcb2._id }
        },
        {
          overNum: 8, ballNum: 2, text: 'WICKET! gt1 caught by rcb2', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb2._id, bowlerId: rcb5._id, batsmanOutId: gt1._id }
        },
        {
          overNum: 10, ballNum: 5, text: 'WICKET! gt3 caught by Virat Kohli', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: vk._id, bowlerId: rcb5._id, batsmanOutId: gt3._id }
        },
        {
          overNum: 14, ballNum: 1, text: 'WICKET! gt5 caught by rcb3', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb3._id, bowlerId: rcb5._id, batsmanOutId: gt5._id }
        },
        {
          overNum: 16, ballNum: 3, text: 'WICKET! gt6 run out by rcb2', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'run-out', fielderId: rcb2._id, bowlerId: rcb5._id, batsmanOutId: gt6._id }
        },
        {
          overNum: 17, ballNum: 6, text: 'WICKET! gt8 caught by rcb2', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb2._id, bowlerId: rcb5._id, batsmanOutId: gt8._id }
        }
      ],
      result: { winner: rcbTeam._id, margin: 'won by 30 runs' },
      playerOfMatch: vk._id,
      target: 183
    });
    
    rcbTeam.stats.played += 1;
    rcbTeam.stats.won += 1;
    gtTeam.stats.played += 1;
    gtTeam.stats.lost += 1;

    // MATCH 2: GT vs RCB (RCB won by 7 wickets) - June 2, 2026
    console.log('Creating Match 2...');
    const match2 = await Match.create({
      title: 'CPL Match 2: GT vs RCB',
      tournament: tournament._id,
      tournamentId: tournament._id,
      teamA: gtTeam._id,
      teamAId: gtTeam._id,
      teamB: rcbTeam._id,
      teamBId: rcbTeam._id,
      playingXIA: gtPlayers.map(p => p._id),
      playingXIB: rcbPlayers.map(p => p._id),
      status: 'Completed',
      oversCount: 20,
      overs: 20,
      venue: 'Narendra Modi Stadium',
      date: new Date('2026-06-02T19:30:00Z'),
      score: {
        teamA: { runs: 145, wickets: 8, overs: 20 },
        teamB: { runs: 149, wickets: 3, overs: 18.2 }
      },
      innings: [
        {
          battingTeam: gtTeam._id,
          bowlingTeam: rcbTeam._id,
          scorecard: {
            batsmen: [
              { player: gt1._id, runs: 18, balls: 14, fours: 2, howOut: 'Caught', bowler: rcb4._id },
              { player: gt2._id, runs: 62, balls: 45, fours: 5, sixes: 2, howOut: 'Caught', bowler: rcb4._id },
              { player: gt3._id, runs: 30, balls: 28, fours: 3, howOut: 'Bowled', bowler: rcb5._id },
              { player: gt4._id, runs: 12, balls: 14, howOut: 'Not Out' },
              { player: gt5._id, runs: 2, balls: 4, howOut: 'LBW', bowler: rcb3._id },
              { player: gt6._id, runs: 5, balls: 8, howOut: 'Caught', bowler: rcb3._id },
              { player: gt7._id, runs: 6, balls: 7, howOut: 'Not Out' }
            ],
            bowlers: [
              { player: vk._id, overs: 1, maidens: 0, runs: 10, wickets: 0 },
              { player: rcb5._id, overs: 4, maidens: 0, runs: 28, wickets: 1 },
              { player: rcb2._id, overs: 4, maidens: 0, runs: 26, wickets: 0 },
              { player: rcb3._id, overs: 4, maidens: 0, runs: 24, wickets: 2 },
              { player: rcb4._id, overs: 4, maidens: 1, runs: 20, wickets: 2 },
              { player: rcb11._id, overs: 3, maidens: 0, runs: 32, wickets: 0 }
            ]
          }
        },
        {
          battingTeam: rcbTeam._id,
          bowlingTeam: gtTeam._id,
          scorecard: {
            batsmen: [
              { player: vk._id, runs: 58, balls: 40, fours: 4, sixes: 1, howOut: 'Not Out' },
              { player: rcb2._id, runs: 32, balls: 24, fours: 2, sixes: 1, howOut: 'Caught', bowler: gt1._id },
              { player: rcb3._id, runs: 42, balls: 30, fours: 4, howOut: 'Caught', bowler: gt2._id },
              { player: rcb4._id, runs: 8, balls: 10, howOut: 'Bowled', bowler: gt3._id },
              { player: rcb5._id, runs: 5, balls: 6, howOut: 'Not Out' }
            ],
            bowlers: [
              { player: gt1._id, overs: 4, maidens: 0, runs: 28, wickets: 1 },
              { player: gt2._id, overs: 4, maidens: 0, runs: 32, wickets: 1 },
              { player: gt3._id, overs: 4, maidens: 0, runs: 30, wickets: 1 },
              { player: gt4._id, overs: 4, maidens: 0, runs: 35, wickets: 0 },
              { player: gt5._id, overs: 2.2, maidens: 0, runs: 24, wickets: 0 }
            ]
          }
        }
      ],
      commentary: [
        {
          overNum: 3, ballNum: 1, text: 'WICKET! gt1 caught by vk', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: vk._id, bowlerId: rcb4._id, batsmanOutId: gt1._id }
        },
        {
          overNum: 12, ballNum: 4, text: 'WICKET! gt2 caught by rcb2', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb2._id, bowlerId: rcb4._id, batsmanOutId: gt2._id }
        },
        {
          overNum: 15, ballNum: 5, text: 'WICKET! gt6 caught by rcb5', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb5._id, bowlerId: rcb3._id, batsmanOutId: gt6._id }
        },
        {
          overNum: 8, ballNum: 1, text: 'WICKET! rcb2 caught by gt4', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: gt4._id, bowlerId: gt1._id, batsmanOutId: rcb2._id }
        },
        {
          overNum: 14, ballNum: 6, text: 'WICKET! rcb3 caught by gt3', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: gt3._id, bowlerId: gt2._id, batsmanOutId: rcb3._id }
        }
      ],
      result: { winner: rcbTeam._id, margin: 'won by 7 wickets' },
      playerOfMatch: vk._id,
      target: 146
    });

    rcbTeam.stats.played += 1;
    rcbTeam.stats.won += 1;
    gtTeam.stats.played += 1;
    gtTeam.stats.lost += 1;

    // MATCH 3: RCB vs GT (GT won by 5 wickets) - June 3, 2026
    console.log('Creating Match 3...');
    const match3 = await Match.create({
      title: 'CPL Match 3: RCB vs GT',
      tournament: tournament._id,
      tournamentId: tournament._id,
      teamA: rcbTeam._id,
      teamAId: rcbTeam._id,
      teamB: gtTeam._id,
      teamBId: gtTeam._id,
      playingXIA: rcbPlayers.map(p => p._id),
      playingXIB: gtPlayers.map(p => p._id),
      status: 'Completed',
      oversCount: 20,
      overs: 20,
      venue: 'Chinnaswamy Stadium',
      date: new Date('2026-06-03T19:30:00Z'),
      score: {
        teamA: { runs: 195, wickets: 3, overs: 20 },
        teamB: { runs: 196, wickets: 5, overs: 19.4 }
      },
      innings: [
        {
          battingTeam: rcbTeam._id,
          bowlingTeam: gtTeam._id,
          scorecard: {
            batsmen: [
              { player: vk._id, runs: 112, balls: 56, fours: 12, sixes: 6, howOut: 'Not Out' },
              { player: rcb2._id, runs: 42, balls: 28, fours: 4, sixes: 1, howOut: 'Caught', bowler: gt1._id },
              { player: rcb3._id, runs: 28, balls: 20, fours: 3, howOut: 'Caught', bowler: gt3._id },
              { player: rcb4._id, runs: 6, balls: 8, howOut: 'Bowled', bowler: gt5._id },
              { player: rcb5._id, runs: 1, balls: 8, howOut: 'Not Out' }
            ],
            bowlers: [
              { player: gt1._id, overs: 4, maidens: 0, runs: 42, wickets: 1 },
              { player: gt2._id, overs: 4, maidens: 0, runs: 38, wickets: 0 },
              { player: gt3._id, overs: 4, maidens: 0, runs: 32, wickets: 1 },
              { player: gt4._id, overs: 4, maidens: 0, runs: 40, wickets: 0 },
              { player: gt5._id, overs: 4, maidens: 0, runs: 38, wickets: 1 }
            ]
          }
        },
        {
          battingTeam: gtTeam._id,
          bowlingTeam: rcbTeam._id,
          scorecard: {
            batsmen: [
              { player: gt1._id, runs: 94, balls: 48, fours: 9, sixes: 4, howOut: 'Caught', bowler: rcb3._id },
              { player: gt2._id, runs: 48, balls: 32, fours: 4, sixes: 1, howOut: 'Caught', bowler: rcb5._id },
              { player: gt3._id, runs: 25, balls: 18, fours: 2, howOut: 'Not Out' },
              { player: gt4._id, runs: 10, balls: 10, howOut: 'Run Out', bowler: rcb2._id },
              { player: gt5._id, runs: 12, balls: 8, howOut: 'Caught', bowler: rcb2._id },
              { player: gt6._id, runs: 2, balls: 4, howOut: 'Not Out' }
            ],
            bowlers: [
              { player: vk._id, overs: 1, maidens: 0, runs: 14, wickets: 0 },
              { player: rcb5._id, overs: 4, maidens: 0, runs: 38, wickets: 1 },
              { player: rcb2._id, overs: 4, maidens: 0, runs: 45, wickets: 1 },
              { player: rcb3._id, overs: 4, maidens: 0, runs: 32, wickets: 1 },
              { player: rcb4._id, overs: 4, maidens: 0, runs: 35, wickets: 0 },
              { player: rcb11._id, overs: 2.4, maidens: 0, runs: 32, wickets: 0 }
            ]
          }
        }
      ],
      commentary: [
        {
          overNum: 8, ballNum: 3, text: 'WICKET! rcb2 caught by gt2', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: gt2._id, bowlerId: gt1._id, batsmanOutId: rcb2._id }
        },
        {
          overNum: 14, ballNum: 2, text: 'WICKET! rcb3 caught by gt1', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: gt1._id, bowlerId: gt3._id, batsmanOutId: rcb3._id }
        },
        {
          overNum: 12, ballNum: 4, text: 'WICKET! gt1 caught by vk', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: vk._id, bowlerId: rcb3._id, batsmanOutId: gt1._id }
        },
        {
          overNum: 16, ballNum: 1, text: 'WICKET! gt2 caught by rcb5', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb5._id, bowlerId: rcb5._id, batsmanOutId: gt2._id }
        },
        {
          overNum: 18, ballNum: 5, text: 'WICKET! gt5 caught by rcb2', type: 'wicket',
          metadata: { isWicket: true, wicketType: 'caught', fielderId: rcb2._id, bowlerId: rcb2._id, batsmanOutId: gt5._id }
        }
      ],
      result: { winner: gtTeam._id, margin: 'won by 5 wickets' },
      playerOfMatch: gt1._id,
      target: 196
    });

    rcbTeam.stats.played += 1;
    rcbTeam.stats.lost += 1;
    gtTeam.stats.played += 1;
    gtTeam.stats.won += 1;

    // Save teams with updated global stats
    await rcbTeam.save();
    await gtTeam.save();
    console.log('Seeded 3 completed matches successfully and updated team standings!');

    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding matches error:', error);
  }
};

run();
