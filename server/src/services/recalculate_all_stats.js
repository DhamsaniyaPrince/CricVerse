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

    const { recalculateAllPlayersStats } = require('./statsService');
    console.log('Starting full recalculation of statistics for all players in database...');
    
    const count = await recalculateAllPlayersStats();
    console.log(`Successfully recalculated stats and form metrics for ${count} players.`);

    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

run();
