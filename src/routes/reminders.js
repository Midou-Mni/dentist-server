/**
 * Reminder Notification Routes
 * Handles appointment reminders, follow-up notifications,
 * and other patient communications
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Reminder = require('../models/Reminder');
const { auth, authorize } = require('../middleware/auth');

/**
 * Validation middleware for reminder data
 * Ensures required fields are present and properly formatted
 */
const validateReminder = [
  body('user').isMongoId().withMessage('Invalid user ID'),
  body('appointment').isMongoId().withMessage('Invalid appointment ID'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('date').isISO8601().withMessage('Invalid date format')
];

/**
 * @route   GET /api/reminders
 * @desc    Get all reminders (for staff to monitor)
 * @access  Private (doctors and assistants only)
 * @note    Auth middleware is commented out during development
 */
router.get('/', auth, authorize('doctor', 'assistant'), async (req, res) => {
  try {
    // Retrieve all reminders with user and appointment information
    const reminders = await Reminder.find()
      .populate('user', 'name email')
      .populate('appointment');
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/reminders/user/:userId
 * @desc    Get reminders for a specific user
 * @access  Private (own reminders or staff only)
 * @note    Auth middleware is commented out during development
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Authorization check:
    // Users can only view their own reminders unless they're staff
    if (req.user._id.toString() !== req.params.userId && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view these reminders' });
    }

    // Find reminders for user and sort by date (upcoming first)
    const reminders = await Reminder.find({ user: req.params.userId })
      .populate('appointment')
      .sort({ date: 1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/reminders
 * @desc    Create a new reminder notification
 * @access  Private (staff only)
 * @note    Auth middleware is commented out during development
 */
router.post('/', auth, authorize('doctor', 'assistant'), validateReminder, async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Create and save new reminder
    const reminder = new Reminder(req.body);
    await reminder.save();

    // Return newly created reminder with populated references
    const populatedReminder = await Reminder.findById(reminder._id)
      .populate('user', 'name email')
      .populate('appointment');

    res.status(201).json(populatedReminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/reminders/:id/read
 * @desc    Mark a reminder as read
 * @access  Private (reminder recipient only)
 * @note    Auth middleware is commented out during development
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    // Find reminder by ID
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Authorization check: Only the recipient can mark as read
    if (reminder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this reminder' });
    }

    // Update read status
    reminder.isRead = true;
    await reminder.save();

    res.json(reminder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   DELETE /api/reminders/:id
 * @desc    Delete a reminder
 * @access  Private (reminder recipient or staff)
 * @note    Auth middleware is commented out during development
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find reminder by ID
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Authorization check:
    // Users can delete their own reminders, staff can delete any reminder
    if (reminder.user.toString() !== req.user._id.toString() && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this reminder' });
    }

    // Remove the reminder
    await reminder.remove();
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 