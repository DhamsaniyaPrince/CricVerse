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

    const matches = await Match.find();
    console.log(`Total Matches in DB: ${matches.length}`);
    matches.forEach((m, idx) => {
      console.log(`\nMatch #${idx + 1}:`);
      console.log(`  ID: ${m._id}`);
      console.log(`  Title: ${m.title}`);
      console.log(`  Status: ${m.status}`);
      console.log(`  Date: ${m.date || m.createdAt}`);
      console.log(`  TeamA: ${m.teamA} vs TeamB: ${m.teamB}`);
      console.log(`  Score: TeamA (${m.score.teamA.runs}/${m.score.teamA.wickets} in ${m.score.teamA.overs} ov), TeamB (${m.score.teamB.runs}/${m.score.teamB.wickets} in ${m.score.teamB.overs} ov)`);
      console.log(`  Result: ${JSON.stringify(m.result)}`);
      console.log(`  Player of Match: ${m.playerOfMatch}`);
      console.log(`  Has Innings: ${m.innings && m.innings.length}`);
      if (m.innings && m.innings.length > 0) {
        m.innings.forEach((inn, i) => {
          console.log(`    Innings ${i + 1} batting team: ${inn.battingTeam}`);
          console.log(`      Batsmen in scorecard:`);
          inn.scorecard.batsmen.forEach(b => {
            console.log(`        Player ${b.player}: ${b.runs} runs (${b.balls} balls), howOut: ${b.howOut}`);
          });
          console.log(`      Bowlers in scorecard:`);
          inn.scorecard.bowlers.forEach(b => {
            console.log(`        Player ${b.player}: ${b.wickets} wickets, ${b.runs} runs conceded`);
          });
        });
      }
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

run();
