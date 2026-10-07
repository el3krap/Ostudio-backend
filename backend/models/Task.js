// backend/models/Task.js

const mongoose = require('mongoose');


// ======================================================
// Task Schema
// ======================================================

const taskSchema = new mongoose.Schema(
    {
        // ==================================================
        // Task Title
        // ==================================================

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },


        // ==================================================
        // Task Description
        // ==================================================

        description: {
            type: String,
            default: '',
            trim: true,
        },


        // ==================================================
        // Related Project
        // ==================================================

        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },


        // ==================================================
        // Task Creator
        // ==================================================
        //
        // IMPORTANT:
        // This value must be assigned by the Backend
        // from req.user.mongoId.
        //
        // Never trust createdBy from req.body.
        // ==================================================

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },


        // ==================================================
        // Assigned Designer
        // ==================================================

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },


        // ==================================================
        // Task Status
        // ==================================================

        status: {
            type: String,
            enum: [
                'pending',
                'in-progress',
                'completed',
            ],
            default: 'pending',
            index: true,
        },


        // ==================================================
        // Task File
        // ==================================================

        fileLink: {
            type: String,
            default: '',
            trim: true,
        },


        fileName: {
            type: String,
            default: '',
            trim: true,
        },


        // ==================================================
        // Task Notes
        // ==================================================

        notes: {
            type: String,
            default: '',
            trim: true,
        },


        // ==================================================
        // Deadline
        // ==================================================

        deadline: {
            type: Date,
            default: null,
            index: true,
        },
    },

    {
        timestamps: true,
    }
);


// ======================================================
// Indexes
// ======================================================

// Tasks belonging to a project
taskSchema.index({
    projectId: 1,
    createdAt: -1,
});


// Tasks created by a specific user
taskSchema.index({
    createdBy: 1,
    createdAt: -1,
});


// Tasks assigned to a specific designer
taskSchema.index({
    assignedTo: 1,
    status: 1,
    createdAt: -1,
});


// Useful for deadline filtering
taskSchema.index({
    deadline: 1,
    status: 1,
});


// ======================================================
// Virtual - Is Assigned
// ======================================================

taskSchema.virtual('isAssigned').get(
    function () {
        return Boolean(this.assignedTo);
    }
);


// ======================================================
// Virtual - Is Overdue
// ======================================================

taskSchema.virtual('isOverdue').get(
    function () {

        if (!this.deadline) {
            return false;
        }

        if (this.status === 'completed') {
            return false;
        }

        return new Date() > new Date(this.deadline);
    }
);


// ======================================================
// JSON / Object Virtuals
// ======================================================

taskSchema.set(
    'toJSON',
    {
        virtuals: true,
    }
);

taskSchema.set(
    'toObject',
    {
        virtuals: true,
    }
);


// ======================================================
// Export
// ======================================================

module.exports = mongoose.model(
    'Task',
    taskSchema
);