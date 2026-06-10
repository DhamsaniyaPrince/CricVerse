const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

// Create and emit notification helper
const createNotification = async ({ recipient, title, message, type, relatedId }) => {
  try {
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type,
      relatedId
    });

    const notificationData = notification.toObject();
    try {
      const io = getIO();
      if (recipient) {
        // Personal notification
        io.to(`user:${recipient.toString()}`).emit('notification:new', notificationData);
      } else {
        // Global/Public notification
        io.emit('notification:new', notificationData);
      }
    } catch (socketErr) {
      // In case socket is not yet initialized (e.g. during script executions/seeding)
      console.warn('Socket emit skipped:', socketErr.message);
    }
    return notification;
  } catch (err) {
    console.error(`Error creating notification: ${err.message}`);
  }
};

// 1. Match Created
const triggerMatchCreatedNotification = async (match) => {
  const title = 'New Match Scheduled';
  const message = `Match "${match.title}" has been created at ${match.venue || 'CricVerse Ground'}.`;
  
  const Team = require('../models/Team');
  const teamA = await Team.findById(match.teamA);
  const teamB = await Team.findById(match.teamB);
  
  const recipients = new Set();
  if (teamA?.owner) recipients.add(teamA.owner.toString());
  if (teamA?.captain) {
    const Player = require('../models/Player');
    const player = await Player.findById(teamA.captain);
    const User = require('../models/User');
    const user = await User.findOne({ username: player?.name });
    if (user) recipients.add(user._id.toString());
  }
  if (teamB?.owner) recipients.add(teamB.owner.toString());
  if (teamB?.captain) {
    const Player = require('../models/Player');
    const player = await Player.findById(teamB.captain);
    const User = require('../models/User');
    const user = await User.findOne({ username: player?.name });
    if (user) recipients.add(user._id.toString());
  }

  for (const rId of recipients) {
    await createNotification({
      recipient: rId,
      title,
      message,
      type: 'match_created',
      relatedId: match._id
    });
  }

  await createNotification({
    recipient: null,
    title,
    message,
    type: 'match_created',
    relatedId: match._id
  });
};

// 2. Match Updated
const triggerMatchUpdatedNotification = async (match) => {
  // Performance optimization: Avoid writing a Notification document to MongoDB and flooding
  // clients with global updates for every ball. Live updates are already handled via room WebSockets.
};

// 3. Match Completed
const triggerMatchCompletedNotification = async (match) => {
  const winnerText = match.result?.winner 
    ? `Winner: ${match.result.margin || 'Match Completed'}` 
    : 'Match ended in a Draw/Tie';
  
  const title = 'Match Completed';
  const message = `Match "${match.title}" is completed. ${winnerText}.`;

  const Team = require('../models/Team');
  const teamA = await Team.findById(match.teamA);
  const teamB = await Team.findById(match.teamB);
  
  const recipients = new Set();
  if (teamA?.owner) recipients.add(teamA.owner.toString());
  if (teamB?.owner) recipients.add(teamB.owner.toString());

  for (const rId of recipients) {
    await createNotification({
      recipient: rId,
      title,
      message,
      type: 'match_completed',
      relatedId: match._id
    });
  }

  await createNotification({
    recipient: null,
    title,
    message,
    type: 'match_completed',
    relatedId: match._id
  });
};

// 4. Team Approved for tournament
const triggerTeamApprovedNotification = async (registration) => {
  const Team = require('../models/Team');
  const Tournament = require('../models/Tournament');
  
  const team = await Team.findById(registration.team);
  const tournament = await Tournament.findById(registration.tournament);
  
  if (!team || !tournament) return;

  const title = 'Team Registration Approved';
  const message = `Your team "${team.name}" has been approved for tournament "${tournament.name}".`;

  if (team.owner) {
    await createNotification({
      recipient: team.owner,
      title,
      message,
      type: 'team_approved',
      relatedId: team._id
    });
  }
};

// 5. Tournament Started
const triggerTournamentStartedNotification = async (tournament) => {
  const title = 'Tournament Started';
  const message = `The tournament "${tournament.name}" is now LIVE! Check fixtures and matches.`;

  await createNotification({
    recipient: null,
    title,
    message,
    type: 'tournament_started',
    relatedId: tournament._id
  });
};

// 6. Tournament Ended
const triggerTournamentEndedNotification = async (tournament) => {
  const title = 'Tournament Completed';
  const message = `The tournament "${tournament.name}" has successfully concluded. See points table standings and leaderboards!`;

  await createNotification({
    recipient: null,
    title,
    message,
    type: 'tournament_ended',
    relatedId: tournament._id
  });
};

// Helper to check if all matches are completed to finish the tournament
const checkTournamentCompletion = async (tournamentId) => {
  if (!tournamentId) return;
  try {
    const Tournament = require('../models/Tournament');
    const Match = require('../models/Match');
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.status === 'Completed') return;

    const fixtureMatchIds = tournament.fixtures.map(f => f.match);
    if (fixtureMatchIds.length === 0) return;

    const unfinishedMatches = await Match.exists({
      _id: { $in: fixtureMatchIds },
      status: { $ne: 'Completed' }
    });

    if (!unfinishedMatches) {
      tournament.status = 'Completed';
      await tournament.save();
      
      await triggerTournamentEndedNotification(tournament);
      
      const { logAction } = require('./auditService');
      await logAction(null, 'Tournament Completed', `Tournament "${tournament.name}" status updated to Completed automatically.`);
    }
  } catch (err) {
    console.error(`Error checking tournament completion: ${err.message}`);
  }
};

module.exports = {
  createNotification,
  triggerMatchCreatedNotification,
  triggerMatchUpdatedNotification,
  triggerMatchCompletedNotification,
  triggerTeamApprovedNotification,
  triggerTournamentStartedNotification,
  triggerTournamentEndedNotification,
  checkTournamentCompletion
};
