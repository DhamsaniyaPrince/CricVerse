const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
    required: [true, 'Player role is required']
  },
  battingStyle: {
    type: String,
    enum: ['Right-hand bat', 'Left-hand bat'],
    required: [true, 'Batting style is required']
  },
  bowlingStyle: {
    type: String,
    default: 'None'
  },
  bio: {
    type: String,
    default: ''
  },
  stats: {
    batting: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      ducks: { type: Number, default: 0 }
    },
    bowling: {
      matches: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      ballsBowled: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      bestBowling: { type: String, default: '0/0' },
      economy: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      fiveWickets: { type: Number, default: 0 }
    },
    fielding: {
      catches: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 }
    }
  },
  catches: {
    type: Number,
    default: 0
  },
  mvpAwards: {
    type: Number,
    default: 0
  },
  teamHistory: [{
    teamName: String,
    year: String
  }],
  matchHistory: [{
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match'
    },
    runs: Number,
    balls: Number,
    wickets: Number,
    overs: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  achievements: [{
    title: String,
    date: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Player', playerSchema);
