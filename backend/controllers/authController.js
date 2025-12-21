const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Generate JWT Token
 * @param {string} userId - User ID to embed in token
 * @returns {string} - JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user (password will be hashed automatically by middleware)
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        muteHours: user.muteHours
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        muteHours: user.muteHours
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        muteHours: user.muteHours
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user info',
      error: error.message
    });
  }
};

/**
 * @desc    Update mute hours preference
 * @route   PUT /api/auth/mute-hours
 * @access  Private
 */
const updateMuteHours = async (req, res) => {
  try {
    const { enabled, start, end } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Basic validation HH:mm
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (start && !timeRegex.test(start)) {
      return res.status(400).json({ success: false, message: 'Invalid start time format. Use HH:mm' });
    }
    if (end && !timeRegex.test(end)) {
      return res.status(400).json({ success: false, message: 'Invalid end time format. Use HH:mm' });
    }

    user.muteHours.enabled = !!enabled;
    if (start) user.muteHours.start = start;
    if (end) user.muteHours.end = end;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mute hours updated',
      muteHours: user.muteHours
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update mute hours', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMuteHours
};
