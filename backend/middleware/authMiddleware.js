// backend/middleware/authMiddleware.js

const { firebaseAdminAuth, firebaseAdminDb } =
    require('../config/firebaseAdmin');

const User = require('../models/User');

// ======================================================
// Helpers
// ======================================================

function getBearerToken(req) {
    const authorization =
        req.headers.authorization ||
        req.headers.Authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        return null;
    }

    return authorization.substring(7).trim();
}

function getMongoUserId(user) {
    if (!user) return null;

    return user._id || user.id || user.mongoId || null;
}

function isActiveUserStatus(status) {
    return status === 'active' || status === 'approved';
}

const VALID_ROLES = [
    'admin',
    'manager',
    'account_manager',
    'coordinator',
    'designer'
];

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
                code: 'AUTH_TOKEN_MISSING'
            });
        }

        // Verify Firebase ID token.
        const decodedToken =
            await firebaseAdminAuth.verifyIdToken(token);

        if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token.',
                code: 'AUTH_TOKEN_INVALID'
            });
        }

        const firebaseUid = decodedToken.uid;

        // Firestore is authoritative for account role/status.
        const profileSnapshot = await firebaseAdminDb
            .collection('users')
            .doc(firebaseUid)
            .get();

        let profile = null;

        if (profileSnapshot.exists) {
            profile = profileSnapshot.data();
        }

        // Backward compatibility for older Mongo-only accounts.
        let mongoUser = await User.findOne({
            firebaseUid
        });

        if (!mongoUser && decodedToken.email) {
            mongoUser = await User.findOne({
                email: decodedToken.email.trim().toLowerCase()
            });
        }

        // Resolve account role and status.
        // Never trust a role supplied by the client.
        const role = profile
            ? profile.role
            : mongoUser?.role;

        const status = profile
            ? profile.status
            : mongoUser?.status;

        if (!role || !VALID_ROLES.includes(role)) {
            return res.status(403).json({
                success: false,
                message: 'Your account has no valid assigned role.',
                code: 'USER_ROLE_INVALID'
            });
        }

        if (!isActiveUserStatus(status)) {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval or inactive.',
                code: 'ACCOUNT_NOT_ACTIVE',
                status: status || 'pending'
            });
        }

        const email = String(
            profile?.email || decodedToken.email || mongoUser?.email || ''
        ).trim().toLowerCase();

        const name = String(
            profile?.name ||
            profile?.displayName ||
            decodedToken.name ||
            mongoUser?.name ||
            email.split('@')[0] ||
            'User'
        ).trim();

        if (!email) {
            return res.status(403).json({
                success: false,
                message: 'The authenticated account has no email.',
                code: 'USER_EMAIL_MISSING'
            });
        }

        // Create or synchronize the MongoDB identity bridge.
        // Project and Task references continue using MongoDB IDs.
        if (mongoUser) {
            if (
                mongoUser.firebaseUid &&
                mongoUser.firebaseUid !== firebaseUid
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        'This email is linked to another Firebase account.',
                    code: 'FIREBASE_UID_CONFLICT'
                });
            }

            mongoUser.firebaseUid = firebaseUid;
            mongoUser.name = name;
            mongoUser.email = email;
            mongoUser.role = role;
            mongoUser.status = status;

            await mongoUser.save();
        } else {
            mongoUser = await User.create({
                firebaseUid,
                name,
                email,
                role,
                status
            });
        }

        req.user = {
            firebaseUid,
            uid: firebaseUid,
            mongoId: getMongoUserId(mongoUser),
            _id: getMongoUserId(mongoUser),
            id: getMongoUserId(mongoUser),
            name,
            email,
            role,
            status,
            firebaseToken: decodedToken
        };

        req.mongoUser = mongoUser;

        return next();
    } catch (error) {
        console.error(
            'Authentication middleware error:',
            error.message
        );

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message:
                    'Your authentication session has expired. Please login again.',
                code: 'AUTH_TOKEN_EXPIRED'
            });
        }

        if (
            error.code === 'auth/id-token-revoked' ||
            error.code === 'auth/argument-error'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or revoked authentication token.',
                code: 'AUTH_TOKEN_INVALID'
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    'A user with this email or Firebase UID already exists.',
                code: 'USER_DUPLICATE'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication failed.',
            code: 'AUTHENTICATION_FAILED'
        });
    }
}

// ======================================================
// Require Authentication
// ======================================================

function requireAuthenticated(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
            code: 'AUTH_REQUIRED'
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
                message: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message:
                    'You do not have permission to access this resource.',
                code: 'ROLE_NOT_ALLOWED'
            });
        }

        return next();
    };
}

function requireRole(role) {
    return requireRoles(role);
}

const requireAdmin = requireRoles('admin');
const requireManager = requireRoles('manager');
const requireAccountManager = requireRoles('account_manager');
const requireCoordinator = requireRoles('coordinator');
const requireDesigner = requireRoles('designer');

const requireProjectCreator = requireRoles(
    'admin',
    'manager',
    'account_manager'
);

const requireProjectManager = requireRoles(
    'admin',
    'manager',
    'coordinator'
);

const requireTaskManager = requireRoles(
    'admin',
    'manager',
    'coordinator'
);

const requireAnyRole = requireRoles(
    'admin',
    'manager',
    'account_manager',
    'coordinator',
    'designer'
);

// ======================================================
// Exports
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
    requireAnyRole
};
