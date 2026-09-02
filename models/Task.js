const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'in-progress', 'completed'], 
        default: 'pending' 
    },
    fileLink: { type: String },
    notes: { type: String },
    deadline: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);