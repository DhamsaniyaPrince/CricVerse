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
const AuditLog = require('../models/AuditLog');
const Award = require('../models/Award');
const MvpHistory = require('../models/MvpHistory');
const Notification = require('../models/Notification');
const ShareLink = require('../models/ShareLink');
const TeamMembership = require('../models/TeamMembership');
const TournamentRegistration = require('../models/TournamentRegistration');

const seedData = async () => {
  try {
    console.log('Connecting to database:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Clear everything
    console.log('Clearing database collections...');
    await User.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Tournament.deleteMany({});
    await Match.deleteMany({});
    await Report.deleteMany({});
    await AuditLog.deleteMany({});
    await Award.deleteMany({});
    await MvpHistory.deleteMany({});
    await Notification.deleteMany({});
    await ShareLink.deleteMany({});
    await TeamMembership.deleteMany({});
    await TournamentRegistration.deleteMany({});
    console.log('Cleared.');

    // 1. Create Default Users
    console.log('Creating default users...');
    const adminUser = await User.create({
      username: 'cricadmin',
      email: 'prince@gmail.com',
      password: 'princedhamsaniya',
      role: 'admin'
    });

    const scorerUser = await User.create({
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

    // 2. Create RCB Players (11 Players)
    console.log('Creating RCB players...');
    const rcbPlayersData = [
      { name: 'PRINCE', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
      { name: 'R. Challenger 1', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'R. Challenger 2', role: 'Batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'None' },
      { name: 'R. Challenger 3', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'R. Challenger 4', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'R. Challenger 5', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm spin' },
      { name: 'R. Challenger 6', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'R. Challenger 7', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast' },
      { name: 'R. Challenger 8', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium' },
      { name: 'R. Challenger 9', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast' },
      { name: 'R. Challenger 10', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin' }
    ];

    const rcbPlayers = [];
    for (const p of rcbPlayersData) {
      const playerDoc = await Player.create(p);
      rcbPlayers.push(playerDoc);
    }
    const rcbCaptain = rcbPlayers[0]; // PRINCE

    // 3. Create GT Players (11 Players)
    console.log('Creating GT players...');
    const gtPlayersData = [
      { name: 'POOJA', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
      { name: 'G. Titan 1', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'G. Titan 2', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'G. Titan 3', role: 'Batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'None' },
      { name: 'G. Titan 4', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'G. Titan 5', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin' },
      { name: 'G. Titan 6', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None' },
      { name: 'G. Titan 7', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm spin' },
      { name: 'G. Titan 8', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
      { name: 'G. Titan 9', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
      { name: 'G. Titan 10', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm spin' }
    ];

    const gtPlayers = [];
    for (const p of gtPlayersData) {
      const playerDoc = await Player.create(p);
      gtPlayers.push(playerDoc);
    }
    const gtCaptain = gtPlayers[0]; // POOJA

    // 4. Create RCB Team
    console.log('Creating RCB Team...');
    const rcbTeam = await Team.create({
      name: 'RCB',
      owner: adminUser._id,
      captain: rcbCaptain._id,
      players: rcbPlayers.map(p => p._id),
      description: 'Royal Challengers Bangalore'
    });

    // 5. Create GT Team
    console.log('Creating GT Team...');
    const gtTeam = await Team.create({
      name: 'GT',
      owner: adminUser._id,
      captain: gtCaptain._id,
      players: gtPlayers.map(p => p._id),
      description: 'Gujarat Titans'
    });

    // 6. Create Tournament
    console.log('Creating Tournament "1V1 MATCHE\'S"...');
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const tournament = await Tournament.create({
      name: "1V1 MATCHE'S",
      location: 'CricVerse Stadium',
      maxTeams: 2,
      startDate: today,
      endDate: nextWeek,
      isApproved: true,
      status: 'Live',
      organizer: adminUser._id,
      teams: [rcbTeam._id, gtTeam._id],
      description: 'Exhilarating head-to-head match series between RCB and GT.',
      pointsTable: [
        {
          team: rcbTeam._id,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          points: 0,
          nrr: 0.0,
          runsScored: 0,
          ballsFaced: 0,
          runsConceded: 0,
          ballsBowled: 0
        },
        {
          team: gtTeam._id,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          points: 0,
          nrr: 0.0,
          runsScored: 0,
          ballsFaced: 0,
          runsConceded: 0,
          ballsBowled: 0
        }
      ]
    });

    console.log('Database seeded with RCB, GT, captains, and "1V1 MATCHE\'S" tournament successfully.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
