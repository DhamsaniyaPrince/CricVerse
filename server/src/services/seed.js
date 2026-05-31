const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Report = require('../models/Report');

const seedData = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully.');

    // Clear old data
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Tournament.deleteMany({});
    await Match.deleteMany({});
    await Report.deleteMany({});
    console.log('Collections cleared.');

    // 1. Create Users (Admin, Scorer, and Player)
    console.log('Creating users...');
    await User.create({
      username: 'cricadmin',
      email: 'admin@cricverse.com',
      password: 'password123',
      role: 'admin'
    });

    await User.create({
      username: 'scorer1',
      email: 'scorer@cricverse.com',
      password: 'password123',
      role: 'organizer'
    });

    await User.create({
      username: 'cricketfan',
      email: 'fan@cricverse.com',
      password: 'password123',
      role: 'player'
    });
    console.log('Users created.');

    console.log('Database seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
