const Player = require('../models/Player');

// @desc    Create a new player
// @route   POST /api/players
// @access  Private/Scorer/Admin
exports.createPlayer = async (req, res) => {
  try {
    const player = await Player.create(req.body);
    res.status(201).json({ success: true, data: player });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all players with optional search & filter
// @route   GET /api/players
// @access  Public
exports.getPlayers = async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (role) {
      query.role = role;
    }

    const players = await Player.find(query).limit(50);
    res.json({ success: true, count: players.length, data: players });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single player profile & stats
// @route   GET /api/players/:id
// @access  Public
exports.getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.id || req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    res.json({ success: true, data: player });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update player profile details or career stats
// @route   PUT /api/players/:id
// @access  Private/Scorer/Admin
exports.updatePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    res.json({ success: true, data: player });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete a player
// @route   DELETE /api/players/:id
// @access  Private/Scorer/Admin
exports.deletePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    res.json({ success: true, message: 'Player removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
