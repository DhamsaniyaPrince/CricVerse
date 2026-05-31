const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamAId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  teamBId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  playingXIA: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  playingXIB: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  toss: {
    wonBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    decision: { type: String, enum: ['Batting', 'Bowling'] }
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Ready', 'Live', 'Completed', 'Cancelled', 'Upcoming'],
    default: 'Scheduled'
  },
  oversCount: {
    type: Number,
    default: 20
  },
  overs: {
    type: Number,
    default: 20
  },
  venue: {
    type: String,
    default: 'CricVerse Ground'
  },
  date: {
    type: Date
  },
  score: {
    teamA: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 }
    },
    teamB: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 }
    }
  },
  innings: [{
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    scorecard: {
      batsmen: [{
        player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        runs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
        howOut: { type: String, default: 'Not Out' }, // 'Not Out', 'Bowled', 'Caught', 'LBW', 'Run Out', etc.
        bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
      }],
      bowlers: [{
        player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        overs: { type: Number, default: 0 },
        maidens: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 }
      }]
    }
  }],
  liveState: {
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    striker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    currentOverRuns: [{
      run: Number,
      isExtra: Boolean,
      extraType: String, // 'wide', 'no-ball', 'bye', 'leg-bye'
      isWicket: Boolean
    }]
  },
  commentary: [{
    overNum: Number,
    ballNum: Number,
    text: String,
    type: {
      type: String,
      enum: ['normal', 'wicket', 'boundary', 'extra'],
      default: 'normal'
    },
    runs: Number,
    metadata: {
      strikerId: String,
      nonStrikerId: String,
      bowlerId: String,
      runs: Number,
      extraRuns: Number,
      extraType: String,
      isExtra: Boolean,
      isWicket: Boolean,
      wicketType: String,
      batsmanOutId: String,
      isLegalBall: Boolean,
      previousLiveState: mongoose.Schema.Types.Mixed
    }
  }],
  wagonWheel: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    angle: Number, // angle in degrees 0-360
    distance: Number, // distance in yards/meters
    runs: Number
  }],
  result: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    margin: String // e.g. "by 7 wickets", "by 12 runs"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

matchSchema.pre('save', function(next) {
  if (this.tournamentId && !this.tournament) {
    this.tournament = this.tournamentId;
  } else if (this.tournament && !this.tournamentId) {
    this.tournamentId = this.tournament;
  }
  if (this.teamAId && !this.teamA) {
    this.teamA = this.teamAId;
  } else if (this.teamA && !this.teamAId) {
    this.teamAId = this.teamA;
  }
  if (this.teamBId && !this.teamB) {
    this.teamB = this.teamBId;
  } else if (this.teamB && !this.teamBId) {
    this.teamBId = this.teamB;
  }
  if (this.overs !== undefined && this.oversCount === 20) {
    this.oversCount = this.overs;
  } else if (this.oversCount !== undefined && this.overs === 20) {
    this.overs = this.oversCount;
  }
  next();
});

module.exports = mongoose.model('Match', matchSchema);
