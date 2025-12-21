const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMuteHours } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);  // POST /api/auth/register - Register new user
router.post('/login', login);        // POST /api/auth/login - Login user

// Protected routes
router.get('/me', protect, getMe);   // GET /api/auth/me - Get current user
router.put('/mute-hours', protect, updateMuteHours); // PUT /api/auth/mute-hours - Update mute hours

module.exports = router;
