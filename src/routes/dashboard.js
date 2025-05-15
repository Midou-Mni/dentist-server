/**
 * Dashboard Routes
 * Provides analytics, reporting, and summary data for the dental practice
 * Used primarily by administrative staff and doctors to monitor operations
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const { auth, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get summary statistics for practice dashboard
 * @access  Private (doctors and assistants only)
 */
router.get('/overview', auth, authorize('doctor', 'assistant'), async (req, res) => {
  try {
    // Fetch multiple data points in parallel for efficiency
    const [
      totalPatients,
      totalAppointments,
      totalPayments,
      recentPayments
    ] = await Promise.all([
      // Count of patients in the system
      User.countDocuments({ role: 'patient' }),
      // Total number of appointments
      Appointment.countDocuments(),
      // Total number of payment records
      Payment.countDocuments(),
      // Most recent 5 payments for quick review
      Payment.find()
        .populate('user', 'name email')
        .populate('appointment')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Calculate total revenue from completed payments using MongoDB aggregation
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Return dashboard overview data
    res.json({
      totalPatients,
      totalAppointments,
      totalPayments,
      totalRevenue: totalRevenue[0]?.total || 0, // Handle case with no completed payments
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/dashboard/appointments/today
 * @desc    Get all appointments scheduled for today
 * @access  Private (doctors and assistants only)
 */
router.get('/appointments/today', auth, authorize('doctor', 'assistant'), async (req, res) => {
  try {
    // Calculate today's date range (midnight to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find appointments within today's date range
    const appointments = await Appointment.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('user', 'name email phone')
    .populate('doctor', 'name')
    .sort({ date: 1 }); // Sort by appointment time

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/dashboard/patients
 * @desc    Get all patients with their activity statistics
 * @access  Private (doctors and assistants only)
 */
router.get('/patients', auth, authorize('doctor', 'assistant'), async (req, res) => {
  try {
    // Get all patients with basic information
    const patients = await User.find({ role: 'patient' })
      .select('name email phone createdAt')
      .sort({ createdAt: -1 }); // Newest patients first

    // Enhance patient data with appointment and payment statistics
    const patientsWithStats = await Promise.all(
      patients.map(async (patient) => {
        // For each patient, get their appointment and payment counts
        const [appointmentCount, paymentCount] = await Promise.all([
          Appointment.countDocuments({ user: patient._id }),
          Payment.countDocuments({ user: patient._id })
        ]);

        // Return enhanced patient object with activity stats
        return {
          ...patient.toObject(),
          appointmentCount,
          paymentCount
        };
      })
    );

    res.json(patientsWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 