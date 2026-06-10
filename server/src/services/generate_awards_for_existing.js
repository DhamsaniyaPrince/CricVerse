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

    const Match = require('../models/Match');
    const { calculateAndSaveMatchAwards } = require('./awardService');

    const completedMatches = await Match.find({ status: 'Completed' });
    console.log(`Found ${completedMatches.length} completed matches to process.`);

    for (const match of completedMatches) {
      console.log(`Calculating awards for match: "${match.title}" (ID: ${match._id})...`);
      await calculateAndSaveMatchAwards(match._id);
    }

    console.log('Successfully completed match awards generation!');
    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

run();
