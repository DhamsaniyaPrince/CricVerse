const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);


module.exports = router;
