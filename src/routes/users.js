/**
 * User Management Routes
 * Handles CRUD operations for dental practice users including
 * patients, doctors, and assistants
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const PatientInfo = require('../models/patientInfo');
const { auth, authorize } = require('../middleware/auth');

/**
 * Validation middleware for user data
 * Ensures required fields are present and properly formatted
 */
const validateUser = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['patient', 'doctor', 'assistant']).withMessage('Invalid role')
];

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (doctors and assistants only)
 * @note    Auth middleware is commented out during development
 */
router.get('/', /* auth, authorize('doctor', 'assistant')*/ async (req, res) => {
  try {
    // Retrieve all users but exclude password field for security
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 * @note    Auth middleware is commented out during development
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Find user by ID and exclude password
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user information
 * @access  Private (own profile or staff members)
 * @note    Auth middleware is commented out during development
 */
router.put('/:id', auth, validateUser, async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Authorization check:
    // Users can only update their own profile unless they're doctor/assistant
    if (req.user._id.toString() !== req.params.id && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    // Find user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields with request body data
    Object.assign(user, req.body);
    await user.save();

    // Return updated user data (excluding password)
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user
 * @access  Private (own profile or staff members)
 * @note    Auth middleware is commented out during development
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Authorization check:
    // Users can only delete their own account unless they're doctor/assistant
    if (req.user._id.toString() !== req.params.id && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this user' });
    }

    // Find and delete user
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/users/patient-info/:patientId
 * @desc    Get patient information
 * @access  Private (own profile or staff members)
 */
router.get('/patient-info/:patientId', auth, async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Special case for 'me' - use the current user's ID
    const targetPatientId = patientId === 'me' ? req.user._id : patientId;
    
    // Authorization check:
    // Users can only view their own info unless they're doctor/assistant
    if (req.user._id.toString() !== targetPatientId.toString() && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this patient info' });
    }
    
    // Find patient info
    const patientInfo = await PatientInfo.findOne({ patientId: targetPatientId });
    if (!patientInfo) {
      return res.status(404).json({ message: 'Patient information not found' });
    }
    
    res.json(patientInfo);
  } catch (error) {
    console.error('Error fetching patient info:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/users/patient-info
 * @desc    Create patient information
 * @access  Private (own profile or staff members)
 */
router.post('/patient-info', auth, async (req, res) => {
  try {
    const { 
      patientId, 
      age, 
      gender, 
      address, 
      bloodType, 
      medicalHistory,
      allergies,
      medications,
      emergencyContact
    } = req.body;
    
    // Use the authenticated user's ID if patientId is not provided
    const targetPatientId = patientId || req.user._id;
    
    // Authorization check:
    // Users can only create their own info unless they're doctor/assistant
    if (req.user._id.toString() !== targetPatientId.toString() && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create info for this patient' });
    }
    
    // Check if patient info already exists
    let patientInfo = await PatientInfo.findOne({ patientId: targetPatientId });
    if (patientInfo) {
      return res.status(400).json({ message: 'Patient information already exists' });
    }
    
    // Create new patient info
    patientInfo = new PatientInfo({
      patientId: targetPatientId,
      age,
      gender,
      address,
      bloodType,
      medicalHistory,
      allergies,
      medications,
      emergencyContact
    });
    
    await patientInfo.save();
    res.status(201).json(patientInfo);
  } catch (error) {
    console.error('Error creating patient info:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/users/patient-info/:patientId
 * @desc    Update patient information
 * @access  Private (own profile or staff members)
 */
router.put('/patient-info/:patientId', auth, async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Special case for 'me' - use the current user's ID
    const targetPatientId = patientId === 'me' ? req.user._id : patientId;
    
    // Authorization check:
    // Users can only update their own info unless they're doctor/assistant
    if (req.user._id.toString() !== targetPatientId.toString() && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this patient info' });
    }
    
    // Find patient info
    let patientInfo = await PatientInfo.findOne({ patientId: targetPatientId });
    
    // If patient info doesn't exist, create it
    if (!patientInfo) {
      patientInfo = new PatientInfo({
        patientId: targetPatientId
      });
    }
    
    // Update fields
    const fieldsToUpdate = [
      'age', 'gender', 'address', 'bloodType', 'medicalHistory', 
      'allergies', 'medications', 'emergencyContact'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        patientInfo[field] = req.body[field];
      }
    });
    
    // Update lastVisit field if requested
    if (req.body.updateLastVisit) {
      patientInfo.lastVisit = Date.now();
    }
    
    await patientInfo.save();
    res.json(patientInfo);
  } catch (error) {
    console.error('Error updating patient info:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 