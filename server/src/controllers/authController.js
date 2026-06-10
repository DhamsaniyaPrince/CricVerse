const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { username, email, password, role = 'player' } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    // Generate random verification token for email validation
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const user = await User.create({
      username,
      email,
      password,
      role,
      emailVerificationToken: verificationToken
    });

    if (user) {
      req.user = user;
      const { logAction } = require('../services/auditService');
      await logAction(req, 'User Registered', `User "${user.username}" registered with role "${user.role}".`);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Verification email generated.',
        verificationToken, // Returned in JSON response for easy local testing
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      if (user.isBanned) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended by an administrator.' });
      }

      req.user = user;
      const { logAction } = require('../services/auditService');
      await logAction(req, 'User Login', `User "${user.username}" logged in.`);

      user.lastLogin = Date.now();
      await user.save();

      res.json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ emailVerificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully!'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Forgot Password - Request reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    console.log(`Password reset link: ${resetUrl}`);

    res.json({
      success: true,
      message: 'Password reset email sent (or printed in development console)',
      resetToken, // Returned in JSON response for easy testing
      resetUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful!'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateProfile = async (req, res) => {
  const { username, email, role, avatar } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if new email is already taken by another user
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already taken by another account.' });
      }
      user.email = email;
    }

    // Check if new username is already taken by another user
    let oldUsername = user.username;
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ success: false, message: 'Username is already taken by another account.' });
      }
      user.username = username;
    }

    if (role) {
      user.role = role;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    // If username or avatar changed, find and update corresponding Player profile!
    if (username || avatar) {
      const Player = require('../models/Player');
      const player = await Player.findOne({ name: { $regex: new RegExp(`^${oldUsername}$`, 'i') } });
      if (player) {
        if (username) player.name = username;
        if (avatar) player.avatar = avatar;
        await player.save();
      }
    }

    res.json({
      success: true,
      message: 'Profile details updated successfully!',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update user password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully!'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper function to verify Google ID token via Google Tokeninfo API
const verifyGoogleToken = async (idToken) => {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) {
      console.error('Google token verification response failed:', response.status);
      return null;
    }
    const data = await response.json();
    
    // Safety check: Validate client ID audience matches Google ID configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && data.aud !== clientId && clientId !== 'dummy_google_client_id') {
      console.error('Audience mismatch. Token aud:', data.aud, 'Configured Client ID:', clientId);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying Google Token:', error);
    return null;
  }
};

// @desc    Google Sign In / Login
// @route   POST /api/auth/google-login
// @access  Public
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Google ID Token is required.' });
  }

  try {
    // Verify Google ID Token
    const payload = await verifyGoogleToken(idToken);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google token.' });
    }

    const { sub: googleId, email, name, picture: profileImage } = payload;

    // Check if user already exists with this googleId
    let user = await User.findOne({ googleId });

    // Link account if email matches but googleId isn't linked yet (duplication prevention)
    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.name) user.name = name;
        if (!user.profileImage) user.profileImage = profileImage;
        if (!user.avatar) user.avatar = profileImage;
        user.lastLogin = Date.now();
        await user.save();
      }
    }

    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended by an administrator.' });
      }

      user.lastLogin = Date.now();
      await user.save();

      res.json({
        success: true,
        exists: true,
        data: {
          _id: user._id,
          username: user.username,
          name: user.name || user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar || user.profileImage,
          authProvider: user.authProvider,
          isEmailVerified: user.isEmailVerified,
          token: generateToken(user._id)
        }
      });
    } else {
      // First-time user: return details so frontend client can redirect to onboarding/role selection
      res.json({
        success: true,
        exists: false,
        googleProfile: {
          name,
          email,
          googleId,
          avatar: profileImage
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Google Onboarding / Registration
// @route   POST /api/auth/google-register
// @access  Public
exports.googleRegister = async (req, res) => {
  const { name, email, googleId, avatar, role } = req.body;

  if (!email || !googleId || !role) {
    return res.status(400).json({ success: false, message: 'Missing required registration details.' });
  }

  if (!['player', 'captain', 'organizer', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role selection. Must be player, captain, organizer, or admin.' });
  }

  try {
    // Confirm user doesn't already exist to prevent duplicates
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.googleId = googleId;
      existingUser.authProvider = 'google';
      if (name) existingUser.name = name;
      if (avatar) {
        existingUser.profileImage = avatar;
        existingUser.avatar = avatar;
      }
      existingUser.role = role;
      existingUser.lastLogin = Date.now();
      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: 'Account linked and onboarded successfully!',
        data: {
          _id: existingUser._id,
          username: existingUser.username,
          name: existingUser.name || existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
          avatar: existingUser.avatar,
          authProvider: existingUser.authProvider,
          isEmailVerified: existingUser.isEmailVerified,
          token: generateToken(existingUser._id)
        }
      });
    }

    // Generate a unique clean username
    let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (baseUsername.length < 3) {
      baseUsername = name ? name.replace(/\s+/g, '').toLowerCase() : 'cricketer';
    }
    
    let username = baseUsername;
    let count = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${count}`;
      count++;
    }

    // Create User record
    const user = await User.create({
      username,
      name: name || username,
      email,
      googleId,
      authProvider: 'google',
      profileImage: avatar || '',
      avatar: avatar || '',
      role,
      isEmailVerified: true,
      lastLogin: Date.now()
    });

    // If role is player, automatically instantiate a Player stats profile record
    if (role === 'player') {
      const Player = require('../models/Player');
      let player = await Player.findOne({ name: { $regex: new RegExp(`^${username}$`, 'i') } });
      if (!player) {
        await Player.create({
          name: name || username,
          avatar: avatar || '',
          role: 'All-Rounder',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Right-arm medium'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Google registration completed!',
      data: {
        _id: user._id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


