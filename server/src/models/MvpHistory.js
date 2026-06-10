const mongoose = require('mongoose');

const mvpHistorySchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true
  },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  catches: { type: Number, default: 0 },
  runOuts: { type: Number, default: 0 },
  stumpings: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MvpHistory', mvpHistorySchema);
