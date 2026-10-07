// backend/models/User.js

const mongoose = require('mongoose');


// ======================================================
// User Schema
// ======================================================

const userSchema = new mongoose.Schema(
    {
        // ==================================================
        // Basic Information
        // ==================================================

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },


        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
        },


        // ==================================================
        // Legacy Password Field
        // ==================================================
        //
        // Firebase is the actual authentication provider.
        //
        // This field is kept for compatibility with existing
        // legacy data and should NOT be used to authenticate
        // users in the new system.
        // ==================================================

        password: {
            type: String,
            default: '',
        },


        // ==================================================
        // Firebase UID
        // ==================================================

        firebaseUid: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            trim: true,
        },


        // ==================================================
        // User Role
        // ==================================================

        role: {
            type: String,
            enum: [
                'admin',
                'manager',
                'account_manager',
                'coordinator',
                'designer',
            ],
            required: true,
            default: 'designer',
            index: true,
        },


        // ==================================================
        // Account Status
        // ==================================================

        status: {
            type: String,
            enum: [
                'pending',
                'active',
                'approved',
            ],
            default: 'pending',
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

userSchema.index({
    role: 1,
    status: 1,
});


// ======================================================
// Normalize Email Before Validation
// ======================================================

userSchema.pre(
    'validate',
    function (next) {

        if (this.email) {
            this.email =
                this.email
                    .trim()
                    .toLowerCase();
        }

        if (this.name) {
            this.name =
                this.name.trim();
        }

        if (this.firebaseUid) {
            this.firebaseUid =
                this.firebaseUid.trim();
        }

        next();
    }
);


// ======================================================
// Helper - Check Active Account
// ======================================================

userSchema.methods.isActive = function () {
    return (
        this.status === 'active' ||
        this.status === 'approved'
    );
};


// ======================================================
// Helper - Check Role
// ======================================================

userSchema.methods.hasRole = function (role) {
    return this.role === role;
};


// ======================================================
// Helper - Check Any Role
// ======================================================

userSchema.methods.hasAnyRole = function (roles = []) {
    if (!Array.isArray(roles)) {
        return false;
    }

    return roles.includes(this.role);
};


// ======================================================
// Helper - Safe User Object
// ======================================================
//
// Used when returning user information to the Frontend.
// Password is never returned.
// ======================================================

userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,

        _id: this._id,

        mongoId: this._id,

        firebaseUid: this.firebaseUid || null,

        name: this.name,

        email: this.email,

        role: this.role,

        status: this.status,

        createdAt: this.createdAt,

        updatedAt: this.updatedAt,
    };
};


// ======================================================
// JSON Transform
// ======================================================
//
// Prevent password from accidentally being returned.
// ======================================================

userSchema.set(
    'toJSON',
    {
        transform: function (doc, ret) {

            delete ret.password;

            return ret;
        },
    }
);


// ======================================================
// Export
// ======================================================

module.exports = mongoose.model(
    'User',
    userSchema
);