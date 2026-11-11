
const mongoose = require('mongoose');

// ======================================================
// Checkpoint Review History Schema
// ======================================================
const checkpointReviewHistorySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ['approve', 'request_revision'],
            required: true,
        },

        note: {
            type: String,
            default: '',
            trim: true,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: true,
    }
);

// ======================================================
// Checkpoint File History Schema
// ======================================================
const checkpointFileHistorySchema = new mongoose.Schema(
    {
        fileUrl: {
            type: String,
            default: '',
            trim: true,
        },

        imageLink: {
            type: String,
            default: '',
            trim: true,
        },

        fileName: {
            type: String,
            default: '',
            trim: true,
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: true,
    }
);

// ======================================================
// Checkpoint Schema
// ======================================================
const checkpointSchema = new mongoose.Schema(
    {
        // Legacy / frontend-compatible ID
        id: {
            type: String,
            default: null,
        },

        // Checkpoint title
        title: {
            type: String,
            trim: true,
            default: '',
        },

        // Completion status
        // This becomes true only after Coordinator approval.
        isCompleted: {
            type: Boolean,
            default: false,
        },

        // Image link
        imageLink: {
            type: String,
            default: '',
            trim: true,
        },

        // File URL
        fileUrl: {
            type: String,
            default: '',
            trim: true,
        },

        // File name
        fileName: {
            type: String,
            default: '',
            trim: true,
        },

        // Checkpoint note
        note: {
            type: String,
            default: '',
            trim: true,
        },

        // --------------------------------------------------
        // Review Workflow
        // --------------------------------------------------

        reviewStatus: {
            type: String,
            enum: [
                'pending',
                'submitted',
                'approved',
                'revision_requested',
            ],
            default: 'pending',
            index: true,
        },

        revisionNote: {
            type: String,
            default: '',
            trim: true,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        // --------------------------------------------------
        // Uploaded File History
        // --------------------------------------------------

        fileHistory: {
            type: [checkpointFileHistorySchema],
            default: [],
        },

        // --------------------------------------------------
        // Review History
        // --------------------------------------------------

        reviewHistory: {
            type: [checkpointReviewHistorySchema],
            default: [],
        },
    },
    {
        _id: true,
    }
);

// ======================================================
// Project Schema
// ======================================================
const projectSchema = new mongoose.Schema(
    {
        // Basic project information
        projectName: {
            type: String,
            required: true,
            trim: true,
        },

        brief: {
            type: String,
            default: '',
            trim: true,
        },

        // Legacy field
        briefName: {
            type: String,
            default: '',
            trim: true,
        },

        // Uploaded project brief (stored in Firebase Storage).
        briefFileUrl: {
            type: String,
            default: '',
            trim: true,
        },

        briefFileName: {
            type: String,
            default: '',
            trim: true,
        },

        briefFileMimeType: {
            type: String,
            default: '',
            trim: true,
        },

        briefFileSize: {
            type: Number,
            default: 0,
            min: 0,
        },

        briefStoragePath: {
            type: String,
            default: '',
            trim: true,
        },

        description: {
            type: String,
            default: '',
            trim: true,
        },

        // Project creator is set by the backend using req.user.mongoId.
        // Never trust createdBy supplied by the frontend.
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // Manager notes
        managerNotes: {
            type: String,
            default: '',
            trim: true,
        },

        // Dates
        startDate: {
            type: Date,
            default: null,
        },

        deadline: {
            type: Date,
            default: null,
        },

        // Coordinator assigned to follow up on this project.
        // Optional for backward compatibility with existing projects.
        assignedCoordinator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },

        // Main project designer
        assignedDesigner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },

        // Legacy / compatibility fields
        assignedDesignerId: {
            type: String,
            default: '',
            trim: true,
        },

        assignedDesignerName: {
            type: String,
            default: '',
            trim: true,
        },

        // Checkpoints
        checkpoints: {
            type: [checkpointSchema],
            default: [],
        },

        // Project completion
        isDoneAll: {
            type: Boolean,
            default: false,
        },

        // Render files
        renderFileLink: {
            type: String,
            default: '',
            trim: true,
        },

        renderFileName: {
            type: String,
            default: '',
            trim: true,
        },

        renderStatus: {
            type: String,
            default: '',
            trim: true,
        },

        // Presentation designer is independent from the main project designer.
        assignedPresenter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },

        // Legacy / compatibility fields
        assignedPresenterId: {
            type: String,
            default: '',
            trim: true,
        },

        assignedPresenterName: {
            type: String,
            default: '',
            trim: true,
        },

        // Presentation files
        presentationFileLink: {
            type: String,
            default: '',
            trim: true,
        },

        presentationFileName: {
            type: String,
            default: '',
            trim: true,
        },

        presenterNote: {
            type: String,
            default: '',
            trim: true,
        },

        // Coordinator notes
        coordinatorNotes: {
            type: String,
            default: '',
            trim: true,
        },

        // Presentation approval
        isPresentationApproved: {
            type: Boolean,
            default: false,
        },

        // Project status
        status: {
            type: String,
            enum: ['in-progress', 'completed'],
            default: 'in-progress',
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
projectSchema.index({
    createdBy: 1,
    createdAt: -1,
});

projectSchema.index({ deadline: 1 });

// ======================================================
// Virtual - Checkpoint Progress
// ======================================================
// Progress is calculated from Coordinator-approved checkpoints.
projectSchema.virtual('checkpointProgress').get(function () {
    const checkpoints = Array.isArray(this.checkpoints)
        ? this.checkpoints
        : [];

    if (checkpoints.length === 0) {
        return 0;
    }

    const completed = checkpoints.filter(
        (checkpoint) =>
            checkpoint.reviewStatus === 'approved' ||
            checkpoint.isCompleted === true
    ).length;

    return Math.round((completed / checkpoints.length) * 100);
});

// ======================================================
// Virtual - Approved Checkpoints Count
// ======================================================
projectSchema.virtual('approvedCheckpointsCount').get(function () {
    const checkpoints = Array.isArray(this.checkpoints)
        ? this.checkpoints
        : [];

    return checkpoints.filter(
        (checkpoint) =>
            checkpoint.reviewStatus === 'approved' ||
            checkpoint.isCompleted === true
    ).length;
});

// ======================================================
// Virtual - Total Checkpoints Count
// ======================================================
projectSchema.virtual('totalCheckpointsCount').get(function () {
    return Array.isArray(this.checkpoints)
        ? this.checkpoints.length
        : 0;
});

// ======================================================
// Virtual - Pending Review Count
// ======================================================
projectSchema.virtual('pendingReviewCount').get(function () {
    const checkpoints = Array.isArray(this.checkpoints)
        ? this.checkpoints
        : [];

    return checkpoints.filter(
        (checkpoint) =>
            checkpoint.reviewStatus === 'submitted'
    ).length;
});

// ======================================================
// Virtual - Is Assigned
// ======================================================
projectSchema.virtual('isAssigned').get(function () {
    return Boolean(this.assignedDesigner || this.assignedPresenter);
});

// ======================================================
// Virtual - Is Fully Assigned
// ======================================================
projectSchema.virtual('isFullyAssigned').get(function () {
    return Boolean(this.assignedDesigner && this.assignedPresenter);
});

// ======================================================
// Virtual - Are All Checkpoints Approved
// ======================================================
projectSchema.virtual('areAllCheckpointsApproved').get(function () {
    const checkpoints = Array.isArray(this.checkpoints)
        ? this.checkpoints
        : [];

    return (
        checkpoints.length > 0 &&
        checkpoints.every(
            (checkpoint) =>
                checkpoint.reviewStatus === 'approved' ||
                checkpoint.isCompleted === true
        )
    );
});

// ======================================================
// Convert Virtuals to JSON / Object
// ======================================================
projectSchema.set('toJSON', {
    virtuals: true,
});

projectSchema.set('toObject', {
    virtuals: true,
});

// ======================================================
// Pre-save - Keep Legacy Assignment Fields in Sync
// ======================================================
// Authorization and validation of assigned users must be handled by backend routes.
projectSchema.pre('save', function (next) {
    if (!this.assignedDesigner) {
        this.assignedDesignerId = '';
    }

    if (!this.assignedPresenter) {
        this.assignedPresenterId = '';
    }

    next();
});

// ======================================================
// Export
// ======================================================
module.exports = mongoose.model('Project', projectSchema);
