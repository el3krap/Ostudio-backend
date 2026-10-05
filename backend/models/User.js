const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['manager', 'coordinator', 'designer', 'presenter'], 
        default: 'designer' 
    },
    status: { 
        type: String, 
        enum: ['pending', 'active'], 
        default: 'pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);