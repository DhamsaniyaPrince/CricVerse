const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { recalculateAllPlayersStats } = require('./statsService');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected. Recalculating player stats from historical match scorecards...');
    
    const count = await recalculateAllPlayersStats();
    console.log(`Successfully recalculated stats for all ${count} players.`);
    
    mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error recalculating stats:', error);
    process.exit(1);
  }
};

run();
