const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      if (req.user.isBanned) {
        return res.status(403).json({ success: false, message: 'Access denied. Your account is suspended.' });
      }
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this resource`
      });
    }
    next();
  };
};

const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      console.error('Optional protect token error:', error.message);
    }
  }
  next();
};

const isCaptainOrAdminOfTeam = async (user, teamId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const Team = require('../models/Team');
  const TeamMembership = require('../models/TeamMembership');
  const Player = require('../models/Player');

  // Check TeamMembership
  const isCaptain = await TeamMembership.exists({
    userId: user._id,
    teamId: teamId,
    teamRole: 'Captain'
  });
  if (isCaptain) return true;

  // Check Team owner
  const team = await Team.findById(teamId);
  if (!team) return false;
  if (team.owner && team.owner.toString() === user._id.toString()) return true;

  // Check Team captain (Player ID matching User's Player profile)
  const playerProfile = await Player.findOne({ name: user.username });
  if (playerProfile && team.captain && team.captain.toString() === playerProfile._id.toString()) {
    return true;
  }

  return false;
};

const isCaptainOrAdminOfPlayer = async (user, playerId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const Player = require('../models/Player');
  const Team = require('../models/Team');

  // Check if it's the player themselves checking their own data
  const queries = [{ name: user.username }];
  if (user.name) queries.push({ name: user.name });
  const playerProfile = await Player.findOne({ $or: queries });
  if (playerProfile && playerProfile._id.toString() === playerId.toString()) {
    return true;
  }

  // Find teams where player is a member
  const teams = await Team.find({ players: playerId });
  if (teams.length === 0) return false;

  // Check if user is Captain or owner of any of these teams
  for (const team of teams) {
    const isCap = await isCaptainOrAdminOfTeam(user, team._id);
    if (isCap) return true;
  }

  return false;
};

module.exports = {
  protect,
  authorize,
  optionalProtect,
  isCaptainOrAdminOfTeam,
  isCaptainOrAdminOfPlayer
};
