const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricverse';
    console.log('Connecting to database:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const Player = require('../models/Player');

    const players = await Player.find();
    console.log(`Found ${players.length} players to migrate.`);

    for (const player of players) {
      if (!player.username) {
        // Trigger pre-save hook by saving the document
        await player.save();
        console.log(`Assigned username slug "${player.username}" to player "${player.name}".`);
      } else {
        console.log(`Player "${player.name}" already has username "${player.username}".`);
      }
    }

    console.log('Successfully completed username migration!');
    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

run();
