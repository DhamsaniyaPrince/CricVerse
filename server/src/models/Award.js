const mongoose = require('mongoose');

const awardSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  teamName: {
    type: String,
    required: true
  },
  awardType: {
    type: String,
    required: true
  },
  performance: {
    type: String,
    default: ''
  },
  value: {
    type: mongoose.Schema.Types.Mixed
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Award', awardSchema);
