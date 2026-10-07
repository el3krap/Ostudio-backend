// backend/models/Notification.js

const mongoose = require('mongoose');


// ======================================================
// Notification Schema
// ======================================================

const notificationSchema = new mongoose.Schema(
    {
        // ==================================================
        // Recipient
        // الشخص الذي سيستقبل الإشعار
        // ==================================================

        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },


        // ==================================================
        // Sender
        // الشخص الذي تسبب في الإشعار
        // ==================================================

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },


        // ==================================================
        // Notification Type
        // ==================================================

        type: {
            type: String,
            enum: [
                'general',
                'project-created',
                'project-assigned',
                'presentation-assigned',
                'task-assigned',
                'task-updated',
                'project-updated',
                'project-completed',
                'presentation-approved',
                'account-approved',
            ],
            default: 'general',
            index: true,
        },


        // ==================================================
        // Notification Title
        // ==================================================

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },


        // ==================================================
        // Notification Message
        // ==================================================

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },


        // ==================================================
        // Related Project
        // ==================================================

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            default: null,
            index: true,
        },


        // ==================================================
        // Related Task
        // ==================================================

        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            default: null,
            index: true,
        },


        // ==================================================
        // Frontend Navigation Link
        // ==================================================
        //
        // Example:
        //
        // /coordinator/projects/123
        // /designer/projects/123
        // /manager/projects/123
        //
        // The backend decides the correct route
        // based on the recipient's role.
        // ==================================================

        link: {
            type: String,
            default: '',
            trim: true,
            maxlength: 500,
        },


        // ==================================================
        // Read Status
        // ==================================================

        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },


        // ==================================================
        // Read At
        // ==================================================

        readAt: {
            type: Date,
            default: null,
        },
    },

    {
        timestamps: true,
    }
);


// ======================================================
// Indexes
// ======================================================

// Get user's newest notifications quickly.
notificationSchema.index({
    recipient: 1,
    createdAt: -1,
});


// Get unread notifications quickly.
notificationSchema.index({
    recipient: 1,
    isRead: 1,
    createdAt: -1,
});


// Useful when filtering project notifications.
notificationSchema.index({
    project: 1,
    createdAt: -1,
});


// Useful when filtering task notifications.
notificationSchema.index({
    task: 1,
    createdAt: -1,
});


// ======================================================
// Read Helper
// ======================================================

notificationSchema.methods.markAsRead = function () {
    this.isRead = true;
    this.readAt = new Date();

    return this.save();
};


// ======================================================
// Static Helper
// ======================================================

notificationSchema.statics.markAllAsReadForUser =
    async function (userId) {
        return this.updateMany(
            {
                recipient: userId,
                isRead: false,
            },
            {
                $set: {
                    isRead: true,
                    readAt: new Date(),
                },
            }
        );
    };


// ======================================================
// Export
// ======================================================

module.exports = mongoose.model(
    'Notification',
    notificationSchema
);