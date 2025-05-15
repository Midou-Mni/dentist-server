/**
 * Appointment Management Routes
 * Handles scheduling, viewing, updating, and cancelling dental appointments
 * including validation, authorization, and business logic
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Service = require('../models/services');
const { auth, authorize } = require('../middleware/auth');

/**
 * Validation middleware for appointment data
 * Ensures required fields are present and properly formatted
 */
const validateAppointment = [
  body('user').isMongoId().withMessage('Invalid user ID'),
  body('doctor').isMongoId().withMessage('Invalid doctor ID'),
  body('date').isISO8601().withMessage('Invalid date format'),
  body('service').isMongoId().withMessage('Invalid service ID'),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().trim()
];

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments
 * @access  Private
 * @note    Auth middleware is commented out during development
 */
router.get('/', auth, async (req, res) => {
  try {
    // For patients, only return their own appointments
    // For staff (doctors, assistants), return all appointments
    let query = {};
    if (req.user.role === 'patient') {
      query = { user: req.user._id };
    }
    
    // Retrieve appointments with related user, doctor, and service information
    const appointments = await Appointment.find(query)
      .populate('user', 'name email')
      .populate('doctor', 'name email')
      .populate('service', 'name duration price');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private (staff or appointment owner)
 * @note    Auth middleware is commented out during development
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Find appointment and populate related data
    const appointment = await Appointment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('doctor', 'name email')
      .populate('service', 'name description duration price');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization check: Patients can only view their own appointments
    if (req.user.role === 'patient' && 
        appointment.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/appointments/user/:userId
 * @desc    Get appointments for a specific user
 * @access  Private (own appointments or staff only)
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Authorization check:
    // Users can only view their own appointments unless they're staff
    if (req.user._id.toString() !== req.params.userId && 
        !['doctor', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view these appointments' });
    }

    // Find appointments for user and populate related data
    const appointments = await Appointment.find({ user: req.params.userId })
      .populate('user', 'name email')
      .populate('doctor', 'name email')
      .populate('service', 'name duration price')
      .sort({ date: -1 }); // Sort by date (newest first)
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Private
 * @note    Auth middleware is commented out during development
 */
router.post('/', auth, validateAppointment, async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Security: If user is a patient, enforce their own user ID
    if (req.user.role === 'patient') {
      req.body.user = req.user._id;
    }

    // Business logic: Verify service exists and is available
    const service = await Service.findById(req.body.service);
    if (!service || !service.isActive) {
      return res.status(400).json({ message: 'Selected service is not available' });
    }

    // Check if appointment is within working hours (Saturday to Wednesday, 8 AM to 6 PM)
    const appointmentDate = new Date(req.body.date);
    const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = appointmentDate.getHours();
    
    // Check if day is valid (Saturday=6, Sunday=0, Monday=1, Tuesday=2, Wednesday=3)
    if (![6, 0, 1, 2, 3].includes(dayOfWeek)) {
      return res.status(400).json({ 
        message: 'Appointments can only be booked from Saturday to Wednesday' 
      });
    }
    
    // Check if time is valid (8 AM to 6 PM)
    if (hour < 8 || hour >= 18) {
      return res.status(400).json({ 
        message: 'Appointments can only be booked between 8 AM and 6 PM' 
      });
    }

    // Create and save new appointment
    const appointment = new Appointment(req.body);
    await appointment.save();

    // Return newly created appointment with populated references
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('doctor', 'name email')
      .populate('service', 'name duration price');

    res.status(201).json(populatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment details
 * @access  Private (staff or appointment owner with restrictions)
 * @note    Auth middleware is commented out during development
 */
router.put('/:id', auth, validateAppointment, async (req, res) => {
  try {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Find appointment by ID
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization check:
    // Staff can update any appointment, patients can only update their own
    const isPatient = req.user.role === 'patient';
    const isStaff = ['doctor', 'assistant'].includes(req.user.role);
    const isOwner = appointment.user.toString() === req.user._id.toString();

    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    // Business logic: Patients cannot change appointment status
    if (isPatient && req.body.status && req.body.status !== appointment.status) {
      return res.status(403).json({ message: 'Patients cannot change appointment status' });
    }

    // Business logic: Verify new service exists and is available
    if (req.body.service && req.body.service !== appointment.service.toString()) {
      const service = await Service.findById(req.body.service);
      if (!service || !service.isActive) {
        return res.status(400).json({ message: 'Selected service is not available' });
      }
    }

    // If date is being updated, check if it's within working hours
    if (req.body.date) {
      const appointmentDate = new Date(req.body.date);
      const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const hour = appointmentDate.getHours();
      
      // Check if day is valid (Saturday=6, Sunday=0, Monday=1, Tuesday=2, Wednesday=3)
      if (![6, 0, 1, 2, 3].includes(dayOfWeek)) {
        return res.status(400).json({ 
          message: 'Appointments can only be scheduled from Saturday to Wednesday' 
        });
      }
      
      // Check if time is valid (8 AM to 6 PM)
      if (hour < 8 || hour >= 18) {
        return res.status(400).json({ 
          message: 'Appointments can only be scheduled between 8 AM and 6 PM' 
        });
      }
    }

    // Update appointment with request data
    Object.assign(appointment, req.body);
    await appointment.save();

    // Return updated appointment with populated references
    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('doctor', 'name email')
      .populate('service', 'name duration price');

    res.json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel/delete appointment
 * @access  Private (appointment owner only)
 * @note    Auth middleware is commented out during development
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find appointment by ID
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization check: Only the appointment owner can cancel it
    if (appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the patient who booked the appointment can cancel it' });
    }

    // Remove the appointment
    await appointment.remove();
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 