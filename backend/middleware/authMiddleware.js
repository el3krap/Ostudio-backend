// backend/middleware/authMiddleware.js

const { firebaseAdminAuth } = require('../config/firebaseAdmin');
const User = require('../models/User');


// ======================================================
// Helpers
// ======================================================

function getBearerToken(req) {
    const authorization =
        req.headers.authorization ||
        req.headers.Authorization;

    if (!authorization) {
        return null;
    }

    if (!authorization.startsWith('Bearer ')) {
        return null;
    }

    return authorization.substring(7).trim();
}


function getMongoUserId(user) {
    if (!user) {
        return null;
    }

    return user._id || user.id || user.mongoId || null;
}


function isActiveUserStatus(status) {
    return (
        status === 'active' ||
        status === 'approved'
    );
}


// ======================================================
// Authenticate Firebase User
// ======================================================

async function authenticateUser(req, res, next) {
    try {
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
                code: 'AUTH_TOKEN_MISSING',
            });
        }


        // --------------------------------------------------
        // Verify Firebase ID Token
        // --------------------------------------------------

        const decodedToken =
            await firebaseAdminAuth.verifyIdToken(token);


        if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token.',
                code: 'AUTH_TOKEN_INVALID',
            });
        }


        // --------------------------------------------------
        // Find MongoDB User
        // --------------------------------------------------

        const user =
            await User.findOne({
                firebaseUid: decodedToken.uid,
            }).select(
                '-password'
            );


        if (!user) {
            return res.status(403).json({
                success: false,
                message:
                    'Your account is not registered in the system.',
                code: 'USER_NOT_FOUND',
            });
        }


        // --------------------------------------------------
        // Check Account Status
        // --------------------------------------------------

        if (!isActiveUserStatus(user.status)) {
            return res.status(403).json({
                success: false,
                message:
                    'Your account is pending approval or inactive.',
                code: 'ACCOUNT_NOT_ACTIVE',
                status: user.status,
            });
        }


        // --------------------------------------------------
        // Attach Authenticated User
        // --------------------------------------------------

        req.user = {
            firebaseUid:
                decodedToken.uid,

            uid:
                decodedToken.uid,

            mongoId:
                getMongoUserId(user),

            _id:
                getMongoUserId(user),

            id:
                getMongoUserId(user),

            name:
                user.name ||
                decodedToken.name ||
                '',

            email:
                user.email ||
                decodedToken.email ||
                '',

            role:
                user.role,

            status:
                user.status,

            firebaseToken:
                decodedToken,
        };


        // Keep the complete Mongo document available
        // when a route needs additional user information.
        req.mongoUser = user;


        return next();

    } catch (error) {

        console.error(
            '❌ Authentication middleware error:',
            error.message
        );


        if (
            error.code ===
            'auth/id-token-expired'
        ) {
            return res.status(401).json({
                success: false,
                message:
                    'Your authentication session has expired. Please login again.',
                code: 'AUTH_TOKEN_EXPIRED',
            });
        }


        if (
            error.code ===
            'auth/id-token-revoked'
        ) {
            return res.status(401).json({
                success: false,
                message:
                    'Your authentication session has been revoked. Please login again.',
                code: 'AUTH_TOKEN_REVOKED',
            });
        }


        if (
            error.code ===
            'auth/argument-error'
        ) {
            return res.status(401).json({
                success: false,
                message:
                    'Invalid authentication token.',
                code: 'AUTH_TOKEN_INVALID',
            });
        }


        return res.status(401).json({
            success: false,
            message:
                'Authentication failed.',
            code: 'AUTHENTICATION_FAILED',
        });
    }
}


// ======================================================
// Require Authentication
// ======================================================

function requireAuthenticated(
    req,
    res,
    next
) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
            code: 'AUTH_REQUIRED',
        });
    }

    return next();
}


// ======================================================
// Require Specific Roles
// ======================================================

function requireRoles(...allowedRoles) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message:
                    'Authentication required.',
                code: 'AUTH_REQUIRED',
            });
        }


        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message:
                    'You do not have permission to access this resource.',
                code: 'ROLE_NOT_ALLOWED',
            });
        }


        return next();
    };
}


// ======================================================
// Single Role Middleware
// ======================================================

function requireRole(role) {
    return requireRoles(role);
}


// ======================================================
// Admin
// ======================================================

const requireAdmin =
    requireRoles('admin');


// ======================================================
// Manager
// ======================================================

const requireManager =
    requireRoles(
        'manager'
    );


// ======================================================
// Account Manager
// ======================================================

const requireAccountManager =
    requireRoles(
        'account_manager'
    );


// ======================================================
// Coordinator
// ======================================================

const requireCoordinator =
    requireRoles(
        'coordinator'
    );


// ======================================================
// Designer
// ======================================================

const requireDesigner =
    requireRoles(
        'designer'
    );


// ======================================================
// Project Creator
// ======================================================
//
// Manager + Account Manager + Admin
//
// Coordinator is intentionally NOT included here
// because project creation belongs to project creators.
// ======================================================

const requireProjectCreator =
    requireRoles(
        'admin',
        'manager',
        'account_manager'
    );


// ======================================================
// Project Management
// ======================================================
//
// Admin + Manager + Coordinator
//
// Used for operations such as project management,
// assignments, project workflow, etc.
// ======================================================

const requireProjectManager =
    requireRoles(
        'admin',
        'manager',
        'coordinator'
    );


// ======================================================
// Task Management
// ======================================================
//
// Admin + Manager + Coordinator
// ======================================================

const requireTaskManager =
    requireRoles(
        'admin',
        'manager',
        'coordinator'
    );


// ======================================================
// Any Valid Application Role
// ======================================================

const requireAnyRole =
    requireRoles(
        'admin',
        'manager',
        'account_manager',
        'coordinator',
        'designer'
    );


// ======================================================
// Export
// ======================================================

module.exports = {
    authenticateUser,

    requireAuthenticated,

    requireRoles,
    requireRole,

    requireAdmin,
    requireManager,
    requireAccountManager,
    requireCoordinator,
    requireDesigner,

    requireProjectCreator,
    requireProjectManager,
    requireTaskManager,

    requireAnyRole,
};