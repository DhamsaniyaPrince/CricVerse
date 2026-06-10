const ShareLink = require('../models/ShareLink');
const crypto = require('crypto');

// Helper to generate a random 6-character alphanumeric code
const generateUniqueCode = async () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await ShareLink.exists({ code });
    if (!exists) {
      isUnique = true;
    }
  }
  return code;
};

// @desc    Create a share link
// @route   POST /api/share-links
// @access  Public
exports.createShareLink = async (req, res) => {
  try {
    const { targetUrl, title, description, type } = req.body;
    
    if (!targetUrl || !type) {
      return res.status(400).json({ success: false, message: 'targetUrl and type are required' });
    }

    // Check if a share link for this URL already exists
    let shareLink = await ShareLink.findOne({ targetUrl });
    if (!shareLink) {
      const code = await generateUniqueCode();
      shareLink = await ShareLink.create({
        code,
        targetUrl,
        title: title || '',
        description: description || '',
        type
      });
    }

    res.status(201).json({ success: true, data: shareLink });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Resolve a share link code
// @route   GET /api/share-links/:code
// @access  Public
exports.resolveShareLink = async (req, res) => {
  try {
    const { code } = req.params;
    const shareLink = await ShareLink.findOne({ code });
    
    if (!shareLink) {
      return res.status(404).json({ success: false, message: 'Share link not found' });
    }
    
    res.json({ success: true, data: shareLink });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
