const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter user ID is required']
  },
  reportedType: {
    type: String,
    enum: ['Player', 'Match', 'Team'],
    required: [true, 'Reported type must be Player, Match, or Team']
  },
  reportedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Reported document ID is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason for report is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Resolved', 'Dismissed'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
