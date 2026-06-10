const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Player = require('../models/Player');
    const player = await Player.findOne({ name: 'Virat Kohli' });
    console.log('Player match history in DB:');
    console.log(JSON.stringify(player.matchHistory, null, 2));
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
