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

    // Find existing RCB and GT teams to preserve their IDs
    console.log('Locating existing RCB and GT team documents...');
    const rcbTeam = await Team.findOne({ name: 'RCB' });
    const gtTeam = await Team.findOne({ name: 'GT' });

    if (!rcbTeam || !gtTeam) {
      throw new Error('RCB or GT team not found in database! Please make sure teams exist.');
    }

    console.log(`Preserved RCB ID: ${rcbTeam._id}`);
    console.log(`Preserved GT ID: ${gtTeam._id}`);

    // Clear other collections (DO NOT delete Team documents, just reset their player arrays and stats)
    console.log('Clearing database collections except Team documents...');
    await User.deleteMany({});
    await Player.deleteMany({});
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

    // Reset preserved teams
    rcbTeam.players = [];
    rcbTeam.captain = undefined;
    rcbTeam.stats = { played: 0, won: 0, lost: 0, tied: 0 };
    await rcbTeam.save();

    gtTeam.players = [];
    gtTeam.captain = undefined;
    gtTeam.stats = { played: 0, won: 0, lost: 0, tied: 0 };
    await gtTeam.save();

    console.log('Database collections cleared and teams reset.');

    // 1. Create Default Users (Admin & Scorer)
    console.log('Creating admin and scorer users...');
    const adminUser = await User.create({
      username: 'cricadmin',
      email: 'admin@cricverse.com',
      password: 'password123',
      role: 'admin',
      isEmailVerified: true
    });

    const scorerUser = await User.create({
      username: 'scorer1',
      email: 'scorer@cricverse.com',
      password: 'password123',
      role: 'organizer',
      isEmailVerified: true
    });

    await User.create({
      username: 'cricketfan',
      email: 'fan@cricverse.com',
      password: 'password123',
      role: 'player',
      isEmailVerified: true
    });

    // Helper function to create player + user together
    const createPlayerUser = async (name, username, role, battingStyle, bowlingStyle, email, userRole) => {
      // Create Player profile
      const player = await Player.create({
        name,
        username,
        role,
        battingStyle,
        bowlingStyle
      });

      // Create corresponding User account
      const user = await User.create({
        username,
        email,
        password: 'password123', // Easy password is same for everyone
        role: userRole,
        isEmailVerified: true
      });

      return { player, user };
    };

    // 2. Create RCB Roster (11 players & users)
    console.log('Creating RCB players and user accounts...');
    const rcbRoster = [
      { name: 'PRINCE', username: 'prince', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', email: 'prince@rcb.com', userRole: 'captain' },
      { name: 'R. Challenger 1', username: 'rchallenger1', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'rchallenger1@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 2', username: 'rchallenger2', role: 'Batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'None', email: 'rchallenger2@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 3', username: 'rchallenger3', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'rchallenger3@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 4', username: 'rchallenger4', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'rchallenger4@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 5', username: 'rchallenger5', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm spin', email: 'rchallenger5@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 6', username: 'rchallenger6', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'rchallenger6@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 7', username: 'rchallenger7', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', email: 'rchallenger7@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 8', username: 'rchallenger8', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', email: 'rchallenger8@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 9', username: 'rchallenger9', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast', email: 'rchallenger9@rcb.com', userRole: 'player' },
      { name: 'R. Challenger 10', username: 'rchallenger10', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin', email: 'rchallenger10@rcb.com', userRole: 'player' }
    ];

    const rcbPlayerIds = [];
    let rcbCaptainId = null;

    for (const p of rcbRoster) {
      const { player } = await createPlayerUser(p.name, p.username, p.role, p.battingStyle, p.bowlingStyle, p.email, p.userRole);
      rcbPlayerIds.push(player._id);
      if (p.username === 'prince') {
        rcbCaptainId = player._id;
      }
    }

    rcbTeam.players = rcbPlayerIds;
    rcbTeam.captain = rcbCaptainId;
    await rcbTeam.save();
    console.log('RCB Team updated.');

    // 3. Create GT Roster (11 players & users)
    console.log('Creating GT players and user accounts...');
    const gtRoster = [
      { name: 'POOJA', username: 'pooja', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', email: 'pooja@gt.com', userRole: 'captain' },
      { name: 'G. Titan 1', username: 'gtitan1', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'gtitan1@gt.com', userRole: 'player' },
      { name: 'G. Titan 2', username: 'gtitan2', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'gtitan2@gt.com', userRole: 'player' },
      { name: 'G. Titan 3', username: 'gtitan3', role: 'Batsman', battingStyle: 'Left-hand bat', bowlingStyle: 'None', email: 'gtitan3@gt.com', userRole: 'player' },
      { name: 'G. Titan 4', username: 'gtitan4', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'gtitan4@gt.com', userRole: 'player' },
      { name: 'G. Titan 5', username: 'gtitan5', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm spin', email: 'gtitan5@gt.com', userRole: 'player' },
      { name: 'G. Titan 6', username: 'gtitan6', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None', email: 'gtitan6@gt.com', userRole: 'player' },
      { name: 'G. Titan 7', username: 'gtitan7', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm spin', email: 'gtitan7@gt.com', userRole: 'player' },
      { name: 'G. Titan 8', username: 'gtitan8', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', email: 'gtitan8@gt.com', userRole: 'player' },
      { name: 'G. Titan 9', username: 'gtitan9', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', email: 'gtitan9@gt.com', userRole: 'player' },
      { name: 'G. Titan 10', username: 'gtitan10', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm spin', email: 'gtitan10@gt.com', userRole: 'player' }
    ];

    const gtPlayerIds = [];
    let gtCaptainId = null;

    for (const p of gtRoster) {
      const { player } = await createPlayerUser(p.name, p.username, p.role, p.battingStyle, p.bowlingStyle, p.email, p.userRole);
      gtPlayerIds.push(player._id);
      if (p.username === 'pooja') {
        gtCaptainId = player._id;
      }
    }

    gtTeam.players = gtPlayerIds;
    gtTeam.captain = gtCaptainId;
    await gtTeam.save();
    console.log('GT Team updated.');

    // 4. Recreate Tournament "1V1 MATCHE'S"
    console.log('Creating Tournament "1V1 MATCHE\'S"...');
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    await Tournament.create({
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

    console.log('Database successfully seeded while preserving team documents!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
