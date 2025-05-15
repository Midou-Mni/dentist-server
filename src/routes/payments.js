/**
 * Payment Management Routes
 * Handles processing and tracking payments for dental appointments
 * including payment status tracking and financial record keeping
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const { auth, authorize } = require('../middleware/auth');

/**
 * Validation middleware for payment data
 * Ensures required fields are present and properly formatted
 */
const validatePayment = [
  body('user').isMongoId().withMessage('Invalid user ID'),
  body('appointment').isMongoId().withMessage('Invalid appointment ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('status').optional().isIn(['pending', 'completed', 'failed']).withMessage('Invalid status'),
  body('paymentMethod').optional().trim()
];

/**
 * @route   GET /api/payments
 * @desc    Get all payments (for financial reporting)
 * @access  Private (doctors and assistants only)
 */
router.get('/', auth, authorize('doctor', /*'assistant'*/), async (req, res) => {
  try {
    // Retrieve all payments with user and appointment details
    // Sort by creation date (newest first)
    const payments = await Payment.find()
      .populate('user', 'name email')
      .populate('appointment')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details by ID
 * @access  Private (payment owner or staff)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Find payment and populate related data
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('appointment');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Authorization check:
    // Only payment owner or staff can view payment details
    if (payment.user._id.toString() !== req.user._id.toString() && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this payment' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/payments/user/:userId
 * @desc    Get all payments for a specific user
 * @access  Private (payment owner or staff)
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Authorization check:
    // Users can only view their own payments unless they're staff
    if (req.user._id.toString() !== req.params.userId && 
        !['doctor', /*'assistant'*/].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view these payments' });
    }

    // Find all payments for the specified user
    // Sort by creation date (newest first)
    const payments = await Payment.find({ user: req.params.userId })
      .populate('appointment')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/payments
 * @desc    Process a new payment
 * @access  Private (primarily for assistants, but can be used by patients)
 */
router.post('/', auth, validatePayment, async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Security: If user is a patient, enforce their own user ID
    // This prevents patients from creating payments for other users
    if (req.user.role === 'patient') {
      req.body.user = req.user._id;
    }

    // Create and save new payment
    const payment = new Payment(req.body);
    await payment.save();

    // Return newly created payment with populated references
    const populatedPayment = await Payment.findById(payment._id)
      .populate('user', 'name email')
      .populate('appointment');

    res.status(201).json(populatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/payments/:id
 * @desc    Update payment status (e.g. mark as completed)
 * @access  Private (staff only)
 */
router.put('/:id', auth, authorize('doctor', 'assistant'), async (req, res) => {
  try {
    // Validate payment status
    const { status } = req.body;
    if (!status || !['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find payment by ID
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    payment.status = status;
    await payment.save();

    // Return updated payment with populated references
    const updatedPayment = await Payment.findById(payment._id)
      .populate('user', 'name email')
      .populate('appointment');

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 