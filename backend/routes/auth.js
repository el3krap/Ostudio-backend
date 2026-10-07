// backend/routes/auth.js

const express = require('express');

const router = express.Router();

const {
    firebaseAdminAuth,
} = require('../config/firebaseAdmin');

const User = require('../models/User');
const Notification = require('../models/Notification');

const {
    authenticateUser,
} = require('../middleware/authMiddleware');


// ======================================================
// Constants
// ======================================================

const REQUESTABLE_ROLES = [
    'manager',
    'account_manager',
    'coordinator',
    'designer',
];

const VALID_ROLES = [
    'admin',
    'manager',
    'account_manager',
    'coordinator',
    'designer',
];

const ACTIVE_STATUSES = [
    'active',
    'approved',
];


// ======================================================
// Helpers
// ======================================================

function cleanString(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return '';
    }

    return String(value).trim();
}


function normalizeEmail(value) {
    return cleanString(value).toLowerCase();
}


function isValidRole(role) {
    return VALID_ROLES.includes(role);
}


function isRequestableRole(role) {
    return REQUESTABLE_ROLES.includes(role);
}


function isActiveStatus(status) {
    return ACTIVE_STATUSES.includes(status);
}


function safeUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user._id,
        _id: user._id,
        mongoId: user._id,

        firebaseUid:
            user.firebaseUid || null,

        name:
            user.name || '',

        email:
            user.email || '',

        role:
            user.role,

        status:
            user.status,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt,
    };
}


function getBearerToken(req) {
    const authorization =
        req.headers.authorization ||
        req.headers.Authorization;

    if (!authorization) {
        return null;
    }

    if (
        !authorization.startsWith(
            'Bearer '
        )
    ) {
        return null;
    }

    return authorization
        .substring(7)
        .trim();
}


// ======================================================
// GET CURRENT USER
// ======================================================
//
// Useful for checking the currently authenticated
// Firebase user against MongoDB.
//
// GET /api/auth/me
// ======================================================

router.get(
    '/me',
    authenticateUser,
    async (req, res) => {
        try {

            const user =
                await User.findById(
                    req.user.mongoId
                ).select('-password');


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            return res.status(200).json({
                success: true,

                user:
                    safeUser(user),

                data:
                    safeUser(user),
            });

        } catch (error) {

            console.error(
                '❌ Auth /me error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load current user.',
            });
        }
    }
);


// ======================================================
// SYNC FIREBASE USER WITH MONGODB
// ======================================================
//
// POST /api/auth/sync-user
//
// IMPORTANT:
// The frontend may send requestedRole.
// It may NOT be trusted as an existing account role.
//
// Firebase token is verified here directly.
// Firebase UID comes from decodedToken.uid.
//
// ======================================================

router.post(
    '/sync-user',
    async (req, res) => {
        try {

            const token =
                getBearerToken(req);


            if (!token) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token is required.',
                    code:
                        'AUTH_TOKEN_MISSING',
                });
            }


            // --------------------------------------------------
            // Verify Firebase Token
            // --------------------------------------------------

            const decodedToken =
                await firebaseAdminAuth.verifyIdToken(
                    token
                );


            if (
                !decodedToken ||
                !decodedToken.uid
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid Firebase authentication token.',
                    code:
                        'AUTH_TOKEN_INVALID',
                });
            }


            const firebaseUid =
                decodedToken.uid;


            const firebaseEmail =
                normalizeEmail(
                    decodedToken.email
                );


            const firebaseName =
                cleanString(
                    decodedToken.name
                );


            const requestedRole =
                cleanString(
                    req.body?.requestedRole
                );


            // --------------------------------------------------
            // Find existing Mongo user by Firebase UID
            // --------------------------------------------------

            let user =
                await User.findOne({
                    firebaseUid,
                });


            // --------------------------------------------------
            // Fallback for legacy users
            // --------------------------------------------------
            //
            // If an old Mongo user exists using the same email
            // but does not have firebaseUid yet, connect it
            // to the verified Firebase account.
            // --------------------------------------------------

            if (!user && firebaseEmail) {

                user =
                    await User.findOne({
                        email:
                            firebaseEmail,
                    });


                if (user) {

                    // Do not overwrite an existing Firebase UID
                    // belonging to another Firebase account.
                    if (
                        user.firebaseUid &&
                        user.firebaseUid !==
                            firebaseUid
                    ) {
                        return res.status(409).json({
                            success: false,
                            message:
                                'This email is already linked to another account.',
                            code:
                                'EMAIL_ALREADY_LINKED',
                        });
                    }


                    user.firebaseUid =
                        firebaseUid;
                }
            }


            // --------------------------------------------------
            // Existing User
            // --------------------------------------------------

            if (user) {

                // Update safe profile information only.
                if (
                    firebaseName &&
                    !user.name
                ) {
                    user.name =
                        firebaseName;
                }


                if (
                    firebaseEmail &&
                    user.email !==
                        firebaseEmail
                ) {
                    // Keep Mongo email normalized with Firebase.
                    user.email =
                        firebaseEmail;
                }


                await user.save();


                const currentUser =
                    await User.findById(
                        user._id
                    ).select('-password');


                return res.status(200).json({
                    success: true,

                    message:
                        'User synchronized successfully.',

                    user:
                        safeUser(
                            currentUser
                        ),

                    data:
                        safeUser(
                            currentUser
                        ),
                });
            }


            // --------------------------------------------------
            // No Mongo User
            // --------------------------------------------------
            //
            // A user should normally arrive here after signup.
            // We allow creation only when a valid requestable
            // role was explicitly requested.
            //
            // Admin cannot be created through this endpoint.
            // --------------------------------------------------

            if (
                !isRequestableRole(
                    requestedRole
                )
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'No approved account exists for this Firebase user.',
                    code:
                        'ACCOUNT_NOT_REGISTERED',
                });
            }


            if (!firebaseEmail) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Firebase account must have an email address.',
                });
            }


            const existingEmailUser =
                await User.findOne({
                    email:
                        firebaseEmail,
                });


            if (existingEmailUser) {
                return res.status(409).json({
                    success: false,
                    message:
                        'An account with this email already exists.',
                    code:
                        'EMAIL_ALREADY_EXISTS',
                });
            }


            user =
                await User.create({
                    name:
                        firebaseName ||
                        firebaseEmail
                            .split('@')[0],

                    email:
                        firebaseEmail,

                    firebaseUid,

                    role:
                        requestedRole,

                    status:
                        'pending',

                    // Firebase handles the real password.
                    password:
                        '',
                });


            const newUser =
                await User.findById(
                    user._id
                ).select('-password');


            return res.status(201).json({
                success: true,

                message:
                    'Account request created and is waiting for admin approval.',

                user:
                    safeUser(newUser),

                data:
                    safeUser(newUser),
            });

        } catch (error) {

            console.error(
                '❌ Auth sync-user error:',
                error
            );


            if (
                error.code ===
                'auth/id-token-expired'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token has expired.',
                    code:
                        'AUTH_TOKEN_EXPIRED',
                });
            }


            if (
                error.code ===
                'auth/id-token-revoked'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token has been revoked.',
                    code:
                        'AUTH_TOKEN_REVOKED',
                });
            }


            if (
                error.code ===
                'auth/argument-error'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid Firebase authentication token.',
                    code:
                        'AUTH_TOKEN_INVALID',
                });
            }


            if (
                error.code ===
                11000
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        'An account with this information already exists.',
                    code:
                        'DUPLICATE_ACCOUNT',
                });
            }


            return res.status(500).json({
                success: false,
                message:
                    'Failed to synchronize account.',
            });
        }
    }
);


// ======================================================
// SIGNUP REQUEST
// ======================================================
//
// POST /api/auth/signup-request
//
// Called after Firebase account creation.
//
// This route verifies the Firebase token directly.
// It NEVER trusts firebaseUid from req.body.
//
// ======================================================

router.post(
    '/signup-request',
    async (req, res) => {
        try {

            const token =
                getBearerToken(req);


            if (!token) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token is required.',
                    code:
                        'AUTH_TOKEN_MISSING',
                });
            }


            const decodedToken =
                await firebaseAdminAuth.verifyIdToken(
                    token
                );


            if (
                !decodedToken ||
                !decodedToken.uid
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid Firebase authentication token.',
                    code:
                        'AUTH_TOKEN_INVALID',
                });
            }


            const firebaseUid =
                decodedToken.uid;


            const email =
                normalizeEmail(
                    decodedToken.email
                );


            const name =
                cleanString(
                    req.body?.name
                ) ||
                cleanString(
                    decodedToken.name
                );


            const requestedRole =
                cleanString(
                    req.body?.requestedRole
                );


            // --------------------------------------------------
            // Validate Public Role
            // --------------------------------------------------

            if (
                !isRequestableRole(
                    requestedRole
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'This role cannot be requested through public signup.',
                    code:
                        'ROLE_NOT_REQUESTABLE',
                });
            }


            // --------------------------------------------------
            // Validate Firebase Email
            // --------------------------------------------------

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message:
                        'A valid email address is required.',
                });
            }


            // --------------------------------------------------
            // Find Existing Firebase User
            // --------------------------------------------------

            let user =
                await User.findOne({
                    firebaseUid,
                });


            if (user) {

                return res.status(409).json({
                    success: false,
                    message:
                        'An account request already exists for this Firebase account.',
                    code:
                        'ACCOUNT_ALREADY_EXISTS',
                    user:
                        safeUser(user),
                });
            }


            // --------------------------------------------------
            // Check Email
            // --------------------------------------------------

            user =
                await User.findOne({
                    email,
                });


            if (user) {

                return res.status(409).json({
                    success: false,
                    message:
                        'An account with this email already exists.',
                    code:
                        'EMAIL_ALREADY_EXISTS',
                });
            }


            // --------------------------------------------------
            // Create Pending Account
            // --------------------------------------------------

            user =
                await User.create({
                    name:
                        name ||
                        email.split('@')[0],

                    email,

                    firebaseUid,

                    role:
                        requestedRole,

                    status:
                        'pending',

                    password:
                        '',
                });


            const createdUser =
                await User.findById(
                    user._id
                ).select('-password');


            return res.status(201).json({
                success: true,

                message:
                    'Your account request has been submitted and is waiting for admin approval.',

                user:
                    safeUser(createdUser),

                data:
                    safeUser(createdUser),
            });

        } catch (error) {

            console.error(
                '❌ Auth signup-request error:',
                error
            );


            if (
                error.code ===
                'auth/id-token-expired'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token has expired.',
                    code:
                        'AUTH_TOKEN_EXPIRED',
                });
            }


            if (
                error.code ===
                'auth/id-token-revoked'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token has been revoked.',
                    code:
                        'AUTH_TOKEN_REVOKED',
                });
            }


            if (
                error.code ===
                'auth/argument-error'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid Firebase authentication token.',
                    code:
                        'AUTH_TOKEN_INVALID',
                });
            }


            if (
                error.code ===
                11000
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        'An account with this information already exists.',
                    code:
                        'DUPLICATE_ACCOUNT',
                });
            }


            return res.status(500).json({
                success: false,
                message:
                    'Failed to submit account request.',
            });
        }
    }
);


// ======================================================
// LOGIN / ACCOUNT CHECK
// ======================================================
//
// POST /api/auth/login
//
// Firebase performs the actual email/password login
// on the frontend.
//
// This endpoint is for backend-side account validation
// after Firebase authentication.
//
// It does NOT accept role from the client.
//
// ======================================================

router.post(
    '/login',
    async (req, res) => {
        try {

            const token =
                getBearerToken(req);


            if (!token) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Firebase authentication token is required.',
                    code:
                        'AUTH_TOKEN_MISSING',
                });
            }


            const decodedToken =
                await firebaseAdminAuth.verifyIdToken(
                    token
                );


            if (
                !decodedToken ||
                !decodedToken.uid
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid authentication token.',
                    code:
                        'AUTH_TOKEN_INVALID',
                });
            }


            const user =
                await User.findOne({
                    firebaseUid:
                        decodedToken.uid,
                }).select('-password');


            if (!user) {
                return res.status(403).json({
                    success: false,
                    message:
                        'No application account is associated with this Firebase account.',
                    code:
                        'ACCOUNT_NOT_FOUND',
                });
            }


            // --------------------------------------------------
            // Account Status
            // --------------------------------------------------

            if (
                !isActiveStatus(
                    user.status
                )
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        'Your account is waiting for admin approval or is inactive.',
                    code:
                        'ACCOUNT_NOT_ACTIVE',
                    status:
                        user.status,
                    user:
                        safeUser(user),
                });
            }


            // --------------------------------------------------
            // Validate Role
            // --------------------------------------------------

            if (
                !isValidRole(
                    user.role
                )
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Your account has an invalid role.',
                    code:
                        'INVALID_ACCOUNT_ROLE',
                });
            }


            return res.status(200).json({
                success: true,

                message:
                    'Login validation successful.',

                user:
                    safeUser(user),

                data:
                    safeUser(user),
            });

        } catch (error) {

            console.error(
                '❌ Auth login error:',
                error
            );


            if (
                error.code ===
                'auth/id-token-expired'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Authentication token has expired.',
                    code:
                        'AUTH_TOKEN_EXPIRED',
                });
            }


            if (
                error.code ===
                'auth/id-token-revoked'
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Authentication token has been revoked.',
                    code:
                        'AUTH_TOKEN_REVOKED',
                });
            }


            return res.status(401).json({
                success: false,
                message:
                    'Authentication validation failed.',
                code:
                    'AUTHENTICATION_FAILED',
            });
        }
    }
);


// ======================================================
// LOGOUT
// ======================================================
//
// Firebase logout is handled by the frontend.
// This endpoint exists only as an optional backend hook.
// No server-side session is stored here.
// ======================================================

router.post(
    '/logout',
    authenticateUser,
    async (req, res) => {
        return res.status(200).json({
            success: true,
            message:
                'Logout acknowledged.',
        });
    }
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;