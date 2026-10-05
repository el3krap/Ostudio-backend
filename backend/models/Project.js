const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    brief: { type: String }, // رابط أو نص الـ Brief (فيديو أو ملف)
    managerNotes: { type: String },
    
    // تفاصيل يحطها الـ Coordinator
    description: { type: String },
    startDate: { type: Date },
    deadline: { type: Date },
    
    // Checkpoints (نقاط المراجعة مع مكان لرفع الصورة)
    checkpoints: [
        {
            title: { type: String },
            isCompleted: { type: Boolean, default: false },
            imageLink: { type: String }
        }
    ],

    // زر Done All
    isDoneAll: { type: Boolean, default: false },

    // مرحلة الـ Render
    renderFileLink: { type: String },
    
    // منشن أو إعطاء إمكانية الوصول لمصمم البرزنتيشن
    assignedPresenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    presentationFileLink: { type: String },
    coordinatorNotes: { type: String },
    
    // حالة المراجعة النهائية من الـ Coordinator
    isPresentationApproved: { type: Boolean, default: false },
    
    // حالة المشروع العامة
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);