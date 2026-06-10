const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  username: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
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
    opponentName: String,
    tournamentName: String,
    resultText: String,
    mvpStatus: {
      type: Boolean,
      default: false
    },
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
  longestStreak: {
    type: Number,
    default: 0
  },
  recentFormRating: {
    type: Number,
    default: 0
  },
  bestMatch: {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    title: String,
    runs: Number,
    wickets: Number
  },
  worstMatch: {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    title: String,
    runs: Number,
    wickets: Number
  },
  playerLevel: {
    type: Number,
    default: 1
  },
  playerXP: {
    type: Number,
    default: 0
  },
  careerRank: {
    type: String,
    default: '🏏 Rookie'
  },
  badges: {
    type: [String],
    default: []
  },
  achievementHistory: [{
    title: String,
    description: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  xpHistory: [{
    amount: Number,
    reason: String,
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

playerSchema.pre('save', async function(next) {
  if (!this.username) {
    // Generate slug from name
    let slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    const Player = mongoose.model('Player');
    let usernameExists = await Player.exists({ username: slug });
    let counter = 1;
    let uniqueSlug = slug;
    while (usernameExists) {
      uniqueSlug = `${slug}-${counter}`;
      usernameExists = await Player.exists({ username: uniqueSlug });
      counter++;
    }
    this.username = uniqueSlug;
  } else {
    this.username = this.username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Player', playerSchema);
