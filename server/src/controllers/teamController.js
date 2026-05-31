const Team = require('../models/Team');
const Player = require('../models/Player');
const crypto = require('crypto');

// Helper to generate a 6-character unique join code
const generateJoinCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
exports.createTeam = async (req, res) => {
  try {
    if (!req.body.owner) {
      req.body.owner = req.user._id;
    }
    // Generate a unique join code
    req.body.joinCode = generateJoinCode();
    
    // Find or create Player profile corresponding to user
    let playerProfile = await Player.findOne({ name: req.user.username });
    if (!playerProfile) {
      playerProfile = await Player.create({
        name: req.user.username,
        role: 'Batsman',
        battingStyle: 'Right-hand bat'
      });
    }

    req.body.players = [playerProfile._id];
    req.body.captain = playerProfile._id;

    const team = await Team.create(req.body);

    // Create TeamMembership record
    const TeamMembership = require('../models/TeamMembership');
    await TeamMembership.create({
      teamId: team._id,
      userId: req.user._id,
      teamRole: 'Captain'
    });

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('captain', 'name role')
      .populate('owner', 'username email');
    res.json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single team details
// @route   GET /api/teams/:id
// @access  Public
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('captain', 'name role battingStyle bowlingStyle')
      .populate('players', 'name role battingStyle bowlingStyle avatar stats')
      .populate('owner', 'username email')
      .populate('joinRequests.user', 'username email')
      .populate('invitations.user', 'username email');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const TeamMembership = require('../models/TeamMembership');
    const User = require('../models/User');

    const teamObj = team.toObject();
    const memberships = await TeamMembership.find({ teamId: team._id }).populate('userId', 'username');

    teamObj.players = await Promise.all(teamObj.players.map(async (player) => {
      // Find corresponding user
      const memberUser = await User.findOne({ username: player.name });
      if (memberUser) {
        const membership = memberships.find(m => m.userId && m.userId._id.toString() === memberUser._id.toString());
        return {
          ...player,
          teamRole: membership ? membership.teamRole : 'Player'
        };
      }
      return {
        ...player,
        teamRole: 'Player'
      };
    }));

    res.json({ success: true, data: teamObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update team info
// @route   PUT /api/teams/:id
// @access  Private
exports.updateTeam = async (req, res) => {
  try {
    let team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this team' });
    }

    team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: team });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Join a team via Join Code
// @route   POST /api/teams/join-code
// @access  Private
exports.joinTeamViaCode = async (req, res) => {
  const { code } = req.body;
  try {
    const team = await Team.findOne({ joinCode: code.toUpperCase() });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Invalid team join code' });
    }

    // Check if user is already a player
    // Note: players array stores Player references (not User references).
    // Let's check if they already requested to join
    const alreadyRequested = team.joinRequests.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyRequested) {
      return res.status(400).json({ success: false, message: 'You have already requested to join this team' });
    }

    // Add join request
    team.joinRequests.push({
      user: req.user._id,
      status: 'Pending'
    });

    await team.save();
    res.json({ success: true, message: 'Join request submitted successfully!', data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Invite player to team
// @route   POST /api/teams/:id/invite
// @access  Private
exports.invitePlayer = async (req, res) => {
  const { userEmail } = req.body;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to invite to this team' });
    }

    // Find the user by email
    const User = require('../models/User');
    const targetUser = await User.findOne({ email: userEmail });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'No registered user found with that email' });
    }

    const alreadyInvited = team.invitations.find(i => i.user.toString() === targetUser._id.toString());
    if (alreadyInvited) {
      return res.status(400).json({ success: false, message: 'Player is already invited' });
    }

    team.invitations.push({
      user: targetUser._id,
      status: 'Pending'
    });

    await team.save();
    res.json({ success: true, message: 'Invitation sent successfully!', data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Respond to Team Invitation (Accept / Decline)
// @route   POST /api/teams/:id/invitations/respond
// @access  Private
exports.respondToInvitation = async (req, res) => {
  const { response } = req.body; // 'Accepted' or 'Declined'
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const invite = team.invitations.find(i => i.user.toString() === req.user._id.toString() && i.status === 'Pending');
    if (!invite) {
      return res.status(404).json({ success: false, message: 'No pending invitation found for your user' });
    }

    invite.status = response;

    if (response === 'Accepted') {
      // Find or create Player profile corresponding to user
      let playerProfile = await Player.findOne({ name: req.user.username });
      if (!playerProfile) {
        playerProfile = await Player.create({
          name: req.user.username,
          role: 'Batsman',
          battingStyle: 'Right-hand bat'
        });
      }

      if (!team.players.includes(playerProfile._id)) {
        team.players.push(playerProfile._id);
      }

      // Create team membership
      const TeamMembership = require('../models/TeamMembership');
      await TeamMembership.findOneAndUpdate(
        { teamId: team._id, userId: req.user._id },
        { teamRole: 'Player' },
        { upsert: true, new: true }
      );
    }

    await team.save();
    res.json({ success: true, message: `Invitation ${response.toLowerCase()}!`, data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Handle Join Request (Approve / Reject)
// @route   POST /api/teams/:id/requests/respond
// @access  Private
exports.respondToJoinRequest = async (req, res) => {
  const { requestId, response } = req.body; // response: 'Approved' or 'Rejected'
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to manage join requests' });
    }

    const request = team.joinRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Join request not found' });
    }

    request.status = response === 'Approved' ? 'Approved' : 'Rejected';

    if (response === 'Approved') {
      // Find or create corresponding player profile
      const User = require('../models/User');
      const requestingUser = await User.findById(request.user);
      
      let playerProfile = await Player.findOne({ name: requestingUser.username });
      if (!playerProfile) {
        playerProfile = await Player.create({
          name: requestingUser.username,
          role: 'Batsman',
          battingStyle: 'Right-hand bat'
        });
      }

      if (!team.players.includes(playerProfile._id)) {
        team.players.push(playerProfile._id);
      }

      // Create team membership
      const TeamMembership = require('../models/TeamMembership');
      await TeamMembership.findOneAndUpdate(
        { teamId: team._id, userId: requestingUser._id },
        { teamRole: 'Player' },
        { upsert: true, new: true }
      );
    }

    await team.save();
    res.json({ success: true, message: `Request successfully ${response.toLowerCase()}!`, data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Remove a player from the team roster
// @route   DELETE /api/teams/:id/players/:playerId
// @access  Private
exports.removePlayer = async (req, res) => {
  const { playerId } = req.params;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const playerObj = await Player.findById(playerId);
    if (playerObj) {
      const User = require('../models/User');
      const deletedMemberUser = await User.findOne({ username: playerObj.name });
      if (deletedMemberUser) {
        const TeamMembership = require('../models/TeamMembership');
        await TeamMembership.deleteOne({ teamId: team._id, userId: deletedMemberUser._id });
      }
    }

    team.players = team.players.filter(p => p.toString() !== playerId);
    
    // If the removed player was the captain, unassign captain
    if (team.captain && team.captain.toString() === playerId) {
      team.captain = undefined;
    }

    await team.save();
    res.json({ success: true, message: 'Player removed from squad', data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Assign captain to the team
// @route   POST /api/teams/:id/captain
// @access  Private
exports.assignCaptain = async (req, res) => {
  const { captainId } = req.body; // Player ID
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!team.players.includes(captainId)) {
      return res.status(400).json({ success: false, message: 'Captain must be an active player on the squad' });
    }

    const player = await Player.findById(captainId);
    if (player) {
      const User = require('../models/User');
      const memberUser = await User.findOne({ username: player.name });
      if (memberUser) {
        const TeamMembership = require('../models/TeamMembership');
        // Demote previous captain(s)
        await TeamMembership.updateMany(
          { teamId: team._id, teamRole: 'Captain' },
          { teamRole: 'Player' }
        );
        // Set new Captain
        await TeamMembership.findOneAndUpdate(
          { teamId: team._id, userId: memberUser._id },
          { teamRole: 'Captain' },
          { upsert: true, new: true }
        );
      }
    }

    team.captain = captainId;
    await team.save();
    res.json({ success: true, message: 'Captain assigned successfully!', data: team });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a team
// @route   DELETE /api/teams/:id
// @access  Private
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this team' });
    }

    await Team.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get only teams that the user manages (owner, Captain, or Vice Captain)
// @route   GET /api/teams/managed
// @access  Private
exports.getManagedTeams = async (req, res) => {
  try {
    const TeamMembership = require('../models/TeamMembership');
    // Find memberships where user is Captain or Vice Captain
    const memberships = await TeamMembership.find({
      userId: req.user._id,
      teamRole: { $in: ['Captain', 'Vice Captain'] }
    });

    const teamIds = memberships.map(m => m.teamId);

    const teams = await Team.find({
      $or: [
        { owner: req.user._id },
        { _id: { $in: teamIds } }
      ]
    })
    .populate('captain', 'name role')
    .populate('owner', 'username email');

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Assign a team-level role (Captain, Vice Captain, Player) to a player
// @route   POST /api/teams/:id/member-role
// @access  Private
exports.assignMemberRole = async (req, res) => {
  const { playerId, teamRole } = req.body;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to change roles' });
    }

    if (!team.players.includes(playerId)) {
      return res.status(400).json({ success: false, message: 'Player must be an active squad member' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found' });
    }

    const User = require('../models/User');
    const memberUser = await User.findOne({ username: player.name });
    if (!memberUser) {
      return res.status(404).json({ success: false, message: 'No registered user account found for this player profile' });
    }

    const TeamMembership = require('../models/TeamMembership');

    if (teamRole === 'Captain') {
      // 1. Demote previous captain(s)
      await TeamMembership.updateMany(
        { teamId: team._id, teamRole: 'Captain' },
        { teamRole: 'Player' }
      );
      // 2. Set new Captain
      await TeamMembership.findOneAndUpdate(
        { teamId: team._id, userId: memberUser._id },
        { teamRole: 'Captain' },
        { upsert: true, new: true }
      );
      // 3. Update Team model captain reference
      team.captain = player._id;
      await team.save();
    } else if (teamRole === 'Vice Captain') {
      await TeamMembership.findOneAndUpdate(
        { teamId: team._id, userId: memberUser._id },
        { teamRole: 'Vice Captain' },
        { upsert: true, new: true }
      );
    } else {
      // Role is 'Player'
      await TeamMembership.findOneAndUpdate(
        { teamId: team._id, userId: memberUser._id },
        { teamRole: 'Player' },
        { upsert: true, new: true }
      );
      if (team.captain && team.captain.toString() === player._id.toString()) {
        team.captain = undefined;
        await team.save();
      }
    }

    res.json({ success: true, message: `Role updated to ${teamRole} successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
