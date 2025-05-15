const mongoose = require('mongoose');

const patientInfoSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    age: {
        type: Number,
        required: false
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: false
    },
    address: {
        type: String,
        required: false
    },
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: false
    },
    medicalHistory: {
        type: String,
        required: false
    },
    allergies: {
        type: String,
        required: false
    },
    medications: {
        type: String,
        required: false
    },
    emergencyContact: {
        name: {
            type: String,
            required: false
        },
        phone: {
            type: String,
            required: false
        },
        relationship: {
            type: String,
            required: false
        }
    },
    lastVisit: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
patientInfoSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const PatientInfo = mongoose.model('PatientInfo', patientInfoSchema);

module.exports = PatientInfo;
