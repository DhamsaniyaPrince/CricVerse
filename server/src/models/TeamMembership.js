const mongoose = require('mongoose');

const teamMembershipSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamRole: {
    type: String,
    enum: ['Captain', 'Vice Captain', 'Player'],
    default: 'Player',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

teamMembershipSchema.index({ teamId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TeamMembership', teamMembershipSchema);
