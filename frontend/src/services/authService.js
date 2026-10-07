import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged
} from 'firebase/auth';

import { auth } from '../firebase';

/* =========================================================
   Configuration
========================================================= */

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080/api';

const SESSION_KEY = 'ostudio_user';

/*
 * Roles allowed to request an account through public Signup.
 *
 * IMPORTANT:
 * - manager is allowed
 * - account_manager is allowed
 * - coordinator is allowed
 * - designer is allowed
 * - admin is NOT allowed
 *
 * Admin account will be created manually.
 */

const REQUESTABLE_ROLES = [
    'manager',
    'account_manager',
    'coordinator',
    'designer'
];

/*
 * All roles that can exist inside Ostudio.
 */

const VALID_ROLES = [
    'admin',
    'manager',
    'account_manager',
    'coordinator',
    'designer'
];

const ACTIVE_STATUSES = [
    'active',
    'approved'
];

/* =========================================================
   Basic API Request
========================================================= */

async function backendRequest(
    endpoint,
    options = {}
) {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                'Content-Type':
                    'application/json',

                ...(options.headers || {})
            }
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return data;
}

/* =========================================================
   Firebase Token
========================================================= */

async function getFirebaseIdToken(
    forceRefresh = false
) {
    const currentUser =
        auth.currentUser;

    if (!currentUser) {
        throw new Error(
            'لا يوجد مستخدم مسجل الدخول.'
        );
    }

    return currentUser.getIdToken(
        forceRefresh
    );
}

/* =========================================================
   Sync Firebase User With Ostudio Backend
========================================================= */

async function syncUserWithBackend({
    firebaseUser,
    requestedRole = null
}) {
    if (!firebaseUser) {
        throw new Error(
            'Firebase user is required.'
        );
    }

    const idToken =
        await firebaseUser.getIdToken(true);

    const payload = {
        firebaseUid:
            firebaseUser.uid,

        name:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'Ostudio User',

        email:
            firebaseUser.email || '',

        requestedRole
    };

    const result =
        await backendRequest(
            '/auth/sync-user',
            {
                method: 'POST',

                headers: {
                    Authorization:
                        `Bearer ${idToken}`
                },

                body:
                    JSON.stringify(payload)
            }
        );

    return result;
}

/* =========================================================
   Normalize Backend User
========================================================= */

function normalizeUser(
    user = {}
) {
    const normalizedRole =
        String(
            user.role || ''
        ).trim();

    return {
        ...user,

        _id:
            user._id ||
            user.mongoId ||
            user.id ||
            null,

        mongoId:
            user.mongoId ||
            user._id ||
            user.id ||
            null,

        id:
            user._id ||
            user.mongoId ||
            user.id ||
            user.firebaseUid ||
            user.uid ||
            null,

        uid:
            user.firebaseUid ||
            user.uid ||
            null,

        firebaseUid:
            user.firebaseUid ||
            user.uid ||
            null,

        name:
            user.name ||
            'Ostudio User',

        email:
            user.email ||
            '',

        role:
            VALID_ROLES.includes(
                normalizedRole
            )
                ? normalizedRole
                : null,

        status:
            user.status ||
            'pending'
    };
}

/* =========================================================
   Store Session
========================================================= */

function storeSession(user) {
    const normalizedUser =
        normalizeUser(user);

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(normalizedUser)
    );

    return normalizedUser;
}

/* =========================================================
   Get Stored Session
========================================================= */

function getStoredUser() {
    try {
        const storedUser =
            localStorage.getItem(
                SESSION_KEY
            );

        if (!storedUser) {
            return null;
        }

        const parsedUser =
            JSON.parse(storedUser);

        return normalizeUser(
            parsedUser
        );

    } catch (error) {
        console.error(
            '❌ Failed to read Ostudio session:',
            error
        );

        localStorage.removeItem(
            SESSION_KEY
        );

        return null;
    }
}

/* =========================================================
   Clear Session
========================================================= */

function clearStoredSession() {
    localStorage.removeItem(
        SESSION_KEY
    );

    // Remove old session key
    // for backward compatibility.
    localStorage.removeItem(
        'ostudioUser'
    );

    // Remove old project/session keys.
    localStorage.removeItem(
        'ostudio_active_project'
    );

    localStorage.removeItem(
        'ostudio_coord_active_proj'
    );
}

/* =========================================================
   Validate Role
========================================================= */

function validateRole(role) {
    const normalizedRole =
        String(role || '')
            .trim()
            .toLowerCase();

    if (
        !VALID_ROLES.includes(
            normalizedRole
        )
    ) {
        throw new Error(
            'نوع الحساب غير صالح أو غير معروف.'
        );
    }

    return normalizedRole;
}

/* =========================================================
   Validate Active Account
========================================================= */

function validateActiveStatus(
    status
) {
    if (
        !ACTIVE_STATUSES.includes(
            status
        )
    ) {
        throw new Error(
            'الحساب غير مفعل أو لم تتم الموافقة عليه بعد.'
        );
    }
}

/* =========================================================
   Login
========================================================= */

async function loginUser(
    email,
    password
) {
    const normalizedEmail =
        String(email || '')
            .trim()
            .toLowerCase();

    if (!normalizedEmail) {
        throw new Error(
            'من فضلك أدخل البريد الإلكتروني.'
        );
    }

    if (!password) {
        throw new Error(
            'من فضلك أدخل كلمة المرور.'
        );
    }

    let firebaseUser = null;

    try {
        /*
         * Firebase verifies email/password.
         */

        const credential =
            await signInWithEmailAndPassword(
                auth,
                normalizedEmail,
                password
            );

        firebaseUser =
            credential.user;

        /*
         * IMPORTANT:
         *
         * We do NOT trust a role coming
         * from the Login page.
         *
         * Firebase verifies credentials.
         *
         * Backend identifies Firebase UID
         * and gets actual Ostudio role
         * from MongoDB.
         */

        const backendResponse =
            await syncUserWithBackend({
                firebaseUser
            });

        const backendUser =
            backendResponse?.user ||
            backendResponse?.data?.user ||
            backendResponse?.data ||
            backendResponse;

        const user =
            normalizeUser(
                backendUser
            );

        if (!user.role) {
            throw new Error(
                'لم يتم العثور على نوع الحساب الخاص بك.'
            );
        }

        validateRole(
            user.role
        );

        validateActiveStatus(
            user.status
        );

        /*
         * Make sure Firebase account
         * and backend account belong
         * to the same user.
         */

        if (
            user.firebaseUid &&
            user.firebaseUid !==
                firebaseUser.uid
        ) {
            throw new Error(
                'بيانات الحساب غير متطابقة.'
            );
        }

        const sessionUser =
            storeSession({
                ...user,

                firebaseUid:
                    firebaseUser.uid,

                uid:
                    firebaseUser.uid
            });

        return sessionUser;

    } catch (error) {

        /*
         * If backend authentication/profile
         * validation fails after Firebase login,
         * sign out immediately.
         */

        if (firebaseUser) {
            try {
                await signOut(auth);
            } catch (
                signOutError
            ) {
                console.error(
                    '❌ Firebase sign-out after failed login:',
                    signOutError
                );
            }
        }

        clearStoredSession();

        console.error(
            '❌ Login Error:',
            error
        );

        throw new Error(
            error?.message ||
            'فشل تسجيل الدخول. حاول مرة أخرى.'
        );
    }
}

/* =========================================================
   Signup Request
========================================================= */

async function registerUser({
    name,
    email,
    password,
    role
}) {
    const normalizedName =
        String(name || '').trim();

    const normalizedEmail =
        String(email || '')
            .trim()
            .toLowerCase();

    const normalizedRole =
        String(role || '')
            .trim()
            .toLowerCase();

    if (!normalizedName) {
        throw new Error(
            'من فضلك أدخل الاسم.'
        );
    }

    if (!normalizedEmail) {
        throw new Error(
            'من فضلك أدخل البريد الإلكتروني.'
        );
    }

    if (!password) {
        throw new Error(
            'من فضلك أدخل كلمة المرور.'
        );
    }

    /*
     * Public Signup roles:
     *
     * manager
     * account_manager
     * coordinator
     * designer
     *
     * Admin is intentionally excluded.
     */

    if (
        !REQUESTABLE_ROLES.includes(
            normalizedRole
        )
    ) {
        throw new Error(
            'نوع الحساب المطلوب غير مسموح بالتسجيل العام.'
        );
    }

    let firebaseUser = null;

    try {
        /*
         * Create Firebase Authentication account.
         */

        const credential =
            await createUserWithEmailAndPassword(
                auth,
                normalizedEmail,
                password
            );

        firebaseUser =
            credential.user;

        /*
         * Save display name
         * in Firebase profile.
         */

        await updateProfile(
            firebaseUser,
            {
                displayName:
                    normalizedName
            }
        );

        /*
         * Get Firebase token after
         * creating the account.
         */

        const idToken =
            await firebaseUser.getIdToken(
                true
            );

        /*
         * Send signup request
         * to Ostudio Backend.
         *
         * Backend creates MongoDB
         * account as pending.
         */

        const response =
            await backendRequest(
                '/auth/signup-request',
                {
                    method: 'POST',

                    headers: {
                        Authorization:
                            `Bearer ${idToken}`
                    },

                    body:
                        JSON.stringify({
                            name:
                                normalizedName,

                            email:
                                normalizedEmail,

                            requestedRole:
                                normalizedRole,

                            firebaseUid:
                                firebaseUser.uid
                        })
                }
            );

        /*
         * Signup is a request.
         *
         * User should NOT automatically
         * enter a dashboard.
         */

        await signOut(auth);

        clearStoredSession();

        return {
            success: true,

            message:
                response?.message ||
                'تم إرسال طلب إنشاء الحساب بنجاح. انتظر موافقة الإدارة.',

            user:
                response?.user ||
                null
        };

    } catch (error) {

        console.error(
            '❌ Signup Error:',
            error
        );

        /*
         * If Firebase account was created
         * but backend request failed,
         * sign out.
         *
         * We intentionally do NOT delete
         * the Firebase account automatically.
         */

        if (firebaseUser) {
            try {
                await signOut(auth);
            } catch (
                signOutError
            ) {
                console.error(
                    '❌ Firebase sign-out after signup error:',
                    signOutError
                );
            }
        }

        clearStoredSession();

        throw new Error(
            error?.message ||
            'فشل إرسال طلب إنشاء الحساب.'
        );
    }
}

/* =========================================================
   Logout
========================================================= */

async function logoutUser() {
    try {
        await signOut(auth);

    } catch (error) {
        console.error(
            '❌ Firebase Logout Error:',
            error
        );

        throw error;

    } finally {
        clearStoredSession();
    }
}

/* =========================================================
   Current Firebase User
========================================================= */

function getCurrentFirebaseUser() {
    return auth.currentUser || null;
}

/* =========================================================
   Current Stored Ostudio User
========================================================= */

function getCurrentUser() {
    return getStoredUser();
}

/* =========================================================
   Check Authentication
========================================================= */

function isAuthenticated() {
    const firebaseUser =
        auth.currentUser;

    const storedUser =
        getStoredUser();

    return Boolean(
        firebaseUser &&
        storedUser &&
        storedUser.role &&
        ACTIVE_STATUSES.includes(
            storedUser.status
        )
    );
}

/* =========================================================
   Get Current ID Token
========================================================= */

async function getCurrentIdToken(
    forceRefresh = false
) {
    return getFirebaseIdToken(
        forceRefresh
    );
}

/* =========================================================
   Firebase Auth State Listener
========================================================= */

function subscribeToAuthState(
    callback
) {
    return onAuthStateChanged(
        auth,
        callback
    );
}

/* =========================================================
   Role Helpers
========================================================= */

function isAdmin(
    user = getStoredUser()
) {
    return user?.role === 'admin';
}

function isManager(
    user = getStoredUser()
) {
    return user?.role === 'manager';
}

function isAccountManager(
    user = getStoredUser()
) {
    return (
        user?.role ===
        'account_manager'
    );
}

function isCoordinator(
    user = getStoredUser()
) {
    return user?.role ===
        'coordinator';
}

function isDesigner(
    user = getStoredUser()
) {
    return user?.role ===
        'designer';
}

/* =========================================================
   Export
========================================================= */

export {
    backendRequest,

    getFirebaseIdToken,
    getCurrentIdToken,

    syncUserWithBackend,

    loginUser,
    registerUser,
    logoutUser,

    getCurrentFirebaseUser,
    getCurrentUser,

    storeSession,
    getStoredUser,
    clearStoredSession,

    isAuthenticated,

    subscribeToAuthState,

    isAdmin,
    isManager,
    isAccountManager,
    isCoordinator,
    isDesigner,

    normalizeUser
};

export default {
    loginUser,
    registerUser,
    logoutUser,

    getCurrentUser,
    getCurrentFirebaseUser,
    getCurrentIdToken,

    isAuthenticated,
    subscribeToAuthState
};