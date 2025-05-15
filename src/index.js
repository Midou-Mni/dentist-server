/**
 * Main server entry point for the Dental Practice Management System
 * This file sets up the Express server, connects to MongoDB,
 * configures middleware, and defines API routes
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Middleware configuration
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('dev')); // HTTP request logger

// MongoDB database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// API Routes configuration
app.use('/api/auth', require('./routes/auth')); // Authentication routes (login, register, etc.)
app.use('/api/users', require('./routes/users')); // User management routes
app.use('/api/appointments', require('./routes/appointments')); // Appointment scheduling routes
app.use('/api/reminders', require('./routes/reminders')); // Reminder notification routes
app.use('/api/payments', require('./routes/payments')); // Payment processing routes
app.use('/api/dashboard', require('./routes/dashboard')); // Dashboard analytics routes
app.use('/api/services', require('./routes/services')); // Dental services routes

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
