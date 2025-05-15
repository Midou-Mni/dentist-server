/**
 * Dental Services Routes
 * Handles CRUD operations for dental services offered by the practice
 * including pricing, duration, and availability status
 */
const express = require('express');
const router = express.Router();
const Service = require('../models/services');
const { auth, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/services
 * @desc    Get all services (active and inactive)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Retrieve all services regardless of active status
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/services/active-services
 * @desc    Get only active services
 * @access  Public
 */
router.get('/active-services', async (req, res) => {
  try {
    // Filter services by active status
    const services = await Service.find({ isActive: true });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/services/:id
 * @desc    Get a specific service by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    // Find service by ID
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/services/create
 * @desc    Create a new dental service
 * @access  Private (doctors only)
 * @note    Auth middleware is commented out during development
 */
router.post('/create', auth, authorize('doctor'), async (req, res) => {
  try {
    const { name, description, duration, price } = req.body;
    
    // Validate required fields
    if (!name || !duration || !price) {
      return res.status(400).json({ message: 'Please provide name, duration, and price' });
    }
    
    // Business logic: Prevent duplicate service names
    const existingService = await Service.findOne({ name });
    if (existingService) {
      return res.status(400).json({ message: 'Service with this name already exists' });
    }
    
    // Create new service
    const service = new Service({
      name,
      description,
      duration,
      price,
      createdBy: req.user._id // Uncomment when auth is enabled
    });
    
    // Save and return the new service
    const savedService = await service.save();
    res.status(201).json(savedService);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/services/edit-service/:id
 * @desc    Update an existing service
 * @access  Private (doctors only)
 */
router.put('/edit-service/:id', auth, authorize('doctor'), async (req, res) => {
  try {
    const { name, description, duration, price, isActive } = req.body;
    
    // Find service by ID
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Business logic: Prevent duplicate service names
    if (name && name !== service.name) {
      const existingService = await Service.findOne({ name });
      if (existingService) {
        return res.status(400).json({ message: 'Service with this name already exists' });
      }
    }
    
    // Update only the provided fields (partial update)
    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration) service.duration = duration;
    if (price !== undefined) service.price = price;
    if (isActive !== undefined) service.isActive = isActive;
    
    // Save and return the updated service
    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   DELETE /api/services/delete-service/:id
 * @desc    Delete a service
 * @access  Private (doctors only)
 * @note    Auth middleware is commented out during development
 */
router.delete('/delete-service/:id', auth, authorize('doctor'), async (req, res) => {
  try {
    // Find and delete service by ID
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 