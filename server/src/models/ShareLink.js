const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['player', 'match', 'team', 'tournament'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ShareLink', shareLinkSchema);
