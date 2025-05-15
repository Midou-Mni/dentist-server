/**
 * Authentication Routes
 * Handles user authentication including login, registration, logout,
 * and retrieving the current user's profile information
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator'); // For request validation
const jwt = require('jsonwebtoken'); // For generating JSON Web Tokens
const User = require('../models/User'); // User model
const { auth } = require('../middleware/auth'); // Authentication middleware

// JWT Secret fallback (for development only)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and generate token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password using the method defined in the User model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with user ID and 24 hour expiration
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  // Input validation rules
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['patient', 'doctor', 'assistant']).withMessage('Invalid role')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user - password hashing happens in the User model's pre-save hook
    const user = new User(req.body);
    await user.save();

    // Generate JWT token for immediate authentication
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return the newly created user data and token
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // Find user by ID (set in auth middleware) and exclude password field
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', auth, (req, res) => {
  // In a more complex implementation, we could blacklist tokens or use refresh tokens
  // For now, just return success - actual token invalidation happens client-side
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 