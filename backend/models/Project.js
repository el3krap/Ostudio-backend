// backend/models/Project.js

const mongoose = require('mongoose');


// ======================================================
// Checkpoint Schema
// ======================================================

const checkpointSchema = new mongoose.Schema(
    {
        // --------------------------------------------------
        // Legacy / Frontend Compatible ID
        // --------------------------------------------------

        id: {
            type: String,
            default: null,
        },


        // --------------------------------------------------
        // Checkpoint Title
        // --------------------------------------------------

        title: {
            type: String,
            trim: true,
            default: '',
        },


        // --------------------------------------------------
        // Completion Status
        // --------------------------------------------------

        isCompleted: {
            type: Boolean,
            default: false,
        },


        // --------------------------------------------------
        // Image Link
        // --------------------------------------------------

        imageLink: {
            type: String,
            default: '',
            trim: true,
        },


        // --------------------------------------------------
        // File URL
        // --------------------------------------------------

        fileUrl: {
            type: String,
            default: '',
            trim: true,
        },


        // --------------------------------------------------
        // File Name
        // --------------------------------------------------

        fileName: {
            type: String,
            default: '',
            trim: true,
        },


        // --------------------------------------------------
        // Checkpoint Note
        // --------------------------------------------------

        note: {
            type: String,
            default: '',
            trim: true,
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
        // ==================================================
        // Basic Project Information
        // ==================================================

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


        description: {
            type: String,
            default: '',
            trim: true,
        },


        // ==================================================
        // Project Creator
        // ==================================================
        //
        // IMPORTANT:
        // This must always be set by the Backend using
        // req.user.mongoId.
        //
        // Never trust createdBy from the frontend.
        // ==================================================

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },


        // ==================================================
        // Manager Notes
        // ==================================================

        managerNotes: {
            type: String,
            default: '',
            trim: true,
        },


        // ==================================================
        // Dates
        // ==================================================

        startDate: {
            type: Date,
            default: null,
        },


        deadline: {
            type: Date,
            default: null,
        },


        // ==================================================
        // Main Project Designer
        // ==================================================

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


        // ==================================================
        // Checkpoints
        // ==================================================

        checkpoints: {
            type: [checkpointSchema],
            default: [],
        },


        // ==================================================
        // Project Completion
        // ==================================================

        isDoneAll: {
            type: Boolean,
            default: false,
        },


        // ==================================================
        // Render Files
        // ==================================================

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


        // ==================================================
        // Presentation Designer
        // ==================================================
        //
        // IMPORTANT:
        // Presentation Designer is independent from the
        // Main Project Designer.
        // ==================================================

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


        // ==================================================
        // Presentation Files
        // ==================================================

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


        // ==================================================
        // Coordinator Notes
        // ==================================================

        coordinatorNotes: {
            type: String,
            default: '',
            trim: true,
        },


        // ==================================================
        // Presentation Approval
        // ==================================================

        isPresentationApproved: {
            type: Boolean,
            default: false,
        },


        // ==================================================
        // Project Status
        // ==================================================

        status: {
            type: String,
            enum: [
                'in-progress',
                'completed',
            ],
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

projectSchema.index({
    assignedDesigner: 1,
});

projectSchema.index({
    assignedPresenter: 1,
});

projectSchema.index({
    status: 1,
});

projectSchema.index({
    deadline: 1,
});


// ======================================================
// Virtual - Checkpoint Progress
// ======================================================

projectSchema.virtual('checkpointProgress').get(
    function () {
        const checkpoints =
            Array.isArray(this.checkpoints)
                ? this.checkpoints
                : [];

        if (checkpoints.length === 0) {
            return 0;
        }

        const completed =
            checkpoints.filter(
                (checkpoint) =>
                    checkpoint.isCompleted === true
            ).length;

        return Math.round(
            (completed / checkpoints.length) * 100
        );
    }
);


// ======================================================
// Virtual - Is Assigned
// ======================================================

projectSchema.virtual('isAssigned').get(
    function () {
        return Boolean(
            this.assignedDesigner ||
            this.assignedPresenter
        );
    }
);


// ======================================================
// Virtual - Is Fully Assigned
// ======================================================

projectSchema.virtual('isFullyAssigned').get(
    function () {
        return Boolean(
            this.assignedDesigner &&
            this.assignedPresenter
        );
    }
);


// ======================================================
// Convert Virtuals to JSON
// ======================================================

projectSchema.set(
    'toJSON',
    {
        virtuals: true,
    }
);

projectSchema.set(
    'toObject',
    {
        virtuals: true,
    }
);


// ======================================================
// Pre Save - Keep Legacy Assignment Fields in Sync
// ======================================================
//
// This keeps the compatibility fields synchronized when
// the referenced User documents are populated/available.
//
// The actual assignment authorization is handled by the
// Backend routes, not by this model.
// ======================================================

projectSchema.pre(
    'save',
    function (next) {

        if (!this.assignedDesigner) {
            this.assignedDesignerId = '';
        }

        if (!this.assignedPresenter) {
            this.assignedPresenterId = '';
        }

        next();
    }
);


// ======================================================
// Export
// ======================================================

module.exports = mongoose.model(
    'Project',
    projectSchema
);