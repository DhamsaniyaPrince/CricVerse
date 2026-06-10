const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');

    const Team = require('../models/Team');
    const Player = require('../models/Player');

    const teams = await Team.find().populate('players');
    teams.forEach(t => {
      console.log(`Team: ${t.name} (ID: ${t._id})`);
      console.log(`  Players count: ${t.players.length}`);
      t.players.forEach(p => {
        console.log(`    - Player: ${p.name} (ID: ${p._id}, Role: ${p.role})`);
      });
    });

    mongoose.connection.close();
  } catch (error) {
    console.error(error);
  }
};

run();
