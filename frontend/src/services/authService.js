
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged
} from 'firebase/auth';

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../firebase';

// ======================================================
// Configuration
// ======================================================

const SESSION_KEY = 'ostudio_user';

const VALID_ROLES = [
    'admin',
    'manager',
    'account_manager',
    'coordinator',
    'designer'
];

const REQUESTABLE_ROLES = [
    'manager',
    'account_manager',
    'coordinator',
    'designer'
];

const ACTIVE_STATUSES = ['active', 'approved'];

// ======================================================
// Firebase ID Token
// ======================================================

async function getFirebaseIdToken(forceRefresh = false) {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
        throw new Error('لا يوجد مستخدم مسجل الدخول.');
    }

    return firebaseUser.getIdToken(forceRefresh);
}

// ======================================================
// Normalize User
// ======================================================

function normalizeUser(user = {}) {
    const role = String(user.role || '').trim().toLowerCase();

    const uid =
        user.uid ||
        user.firebaseUid ||
        user.id ||
        user._id ||
        null;

    return {
        ...user,
        id: uid,
        _id: uid,
        uid,
        firebaseUid: uid,
        mongoId: null,
        name: user.name || 'Ostudio User',
        email: String(user.email || '').trim().toLowerCase(),
        role: VALID_ROLES.includes(role) ? role : null,
        status: user.status || 'pending'
    };
}

// ======================================================
// Store Session
// localStorage is for UI convenience only.
// It is NOT an authorization source.
// ======================================================

function storeSession(user) {
    const normalizedUser = normalizeUser(user);

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(normalizedUser)
    );

    return normalizedUser;
}

function getStoredUser() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);

        if (!stored) {
            return null;
        }

        return normalizeUser(JSON.parse(stored));
    } catch (error) {
        console.error('Failed to read OStudio session:', error);
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

function clearStoredSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('ostudioUser');
    localStorage.removeItem('ostudio_active_project');
    localStorage.removeItem('ostudio_coord_active_proj');
}

// ======================================================
// Validate Role and Account Status
// ======================================================

function validateRole(role) {
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (!VALID_ROLES.includes(normalizedRole)) {
        throw new Error('نوع الحساب غير صالح أو غير معروف.');
    }

    return normalizedRole;
}

function validateActiveStatus(status) {
    if (!ACTIVE_STATUSES.includes(status)) {
        throw new Error(
            'الحساب غير مفعل أو لم تتم الموافقة عليه بعد.'
        );
    }
}

// ======================================================
// Get User Profile from Firestore
// Document ID must equal Firebase Authentication UID.
// ======================================================

async function getUserProfile(firebaseUser) {
    if (!firebaseUser?.uid) {
        throw new Error('تعذر تحديد هوية مستخدم Firebase.');
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
        throw new Error(
            'الحساب موجود في Firebase Authentication، لكن ملف المستخدم غير موجود في Firestore.'
        );
    }

    const profile = userSnapshot.data();

    // Prevent a mismatched UID from being accepted.
    if (
        profile.uid &&
        profile.uid !== firebaseUser.uid
    ) {
        throw new Error('معرّف المستخدم لا يتطابق مع ملف الحساب.');
    }

    if (
        profile.email &&
        profile.email.toLowerCase() !==
            (firebaseUser.email || '').toLowerCase()
    ) {
        throw new Error('البريد الإلكتروني لا يتطابق مع ملف المستخدم.');
    }

    const user = normalizeUser({
        ...profile,
        uid: firebaseUser.uid,
        email: firebaseUser.email || profile.email,
        name:
            profile.name ||
            firebaseUser.displayName ||
            'Ostudio User'
    });

    validateRole(user.role);
    validateActiveStatus(user.status);

    return user;
}

// ======================================================
// Login - Firebase Authentication + Firestore
// ======================================================

async function loginUser(email, password) {
    const normalizedEmail = String(email || '')
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
        throw new Error('من فضلك أدخل البريد الإلكتروني.');
    }

    if (!password) {
        throw new Error('من فضلك أدخل كلمة المرور.');
    }

    let firebaseUser = null;

    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
        );

        firebaseUser = credential.user;

        // Read the actual role and status from Firestore.
        const user = await getUserProfile(firebaseUser);

        return storeSession({
            ...user,
            uid: firebaseUser.uid,
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || normalizedEmail
        });
    } catch (error) {
        if (firebaseUser) {
            try {
                await signOut(auth);
            } catch (signOutError) {
                console.error(
                    'Firebase sign-out after failed login:',
                    signOutError
                );
            }
        }

        clearStoredSession();

        console.error('OStudio login failed:', error);

        throw new Error(
            error?.message || 'فشل تسجيل الدخول. حاول مرة أخرى.'
        );
    }
}

// ======================================================
// Signup Request
//
// 1. Create Firebase Authentication account.
// 2. Create signupRequests/{uid} in Firestore.
// 3. Do not create an active user profile here.
// 4. Do not allow public Admin registration.
// ======================================================

async function registerUser({ name, email, password, role }) {
    const normalizedName = String(name || '').trim();

    const normalizedEmail = String(email || '')
        .trim()
        .toLowerCase();

    const normalizedRole = String(role || '')
        .trim()
        .toLowerCase();

    if (!normalizedName) {
        throw new Error('من فضلك أدخل الاسم.');
    }

    if (!normalizedEmail) {
        throw new Error('من فضلك أدخل البريد الإلكتروني.');
    }

    if (!password) {
        throw new Error('من فضلك أدخل كلمة المرور.');
    }

    if (password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
    }

    if (!REQUESTABLE_ROLES.includes(normalizedRole)) {
        throw new Error(
            'نوع الحساب المطلوب غير مسموح بالتسجيل العام.'
        );
    }

    let firebaseUser = null;

    try {
        const credential = await createUserWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
        );

        firebaseUser = credential.user;

        await updateProfile(firebaseUser, {
            displayName: normalizedName
        });

        // The signupRequests rules must require:
        // requestId == request.auth.uid
        // data.uid == request.auth.uid
        // status == 'pending'
        // role is a public, non-admin role.
        const requestRef = doc(
            db,
            'signupRequests',
            firebaseUser.uid
        );

        await setDoc(requestRef, {
            uid: firebaseUser.uid,
            name: normalizedName,
            email: normalizedEmail,
            role: normalizedRole,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        await signOut(auth);
        clearStoredSession();

        return {
            success: true,
            message:
                'تم إرسال طلب إنشاء الحساب بنجاح. انتظر موافقة الإدارة.'
        };
    } catch (error) {
        if (firebaseUser) {
            try {
                await signOut(auth);
            } catch (signOutError) {
                console.error(
                    'Firebase sign-out after signup error:',
                    signOutError
                );
            }
        }

        clearStoredSession();

        console.error('OStudio signup failed:', error);

        // If the Authentication account was created but the
        // Firestore write failed, the Auth account may remain.
        // Do not silently delete the account automatically.
        throw new Error(
            error?.message ||
                'تعذر إرسال طلب الحساب. تحقق من إعدادات Firestore.'
        );
    }
}

// ======================================================
// Logout
// ======================================================

async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Firebase logout failed:', error);
        throw error;
    } finally {
        clearStoredSession();
    }
}

// ======================================================
// Current User Helpers
// ======================================================

function getCurrentFirebaseUser() {
    return auth.currentUser || null;
}

function getCurrentUser() {
    return getStoredUser();
}

function isAuthenticated() {
    const firebaseUser = auth.currentUser;
    const storedUser = getStoredUser();

    return Boolean(
        firebaseUser &&
        storedUser &&
        storedUser.uid === firebaseUser.uid &&
        storedUser.role &&
        ACTIVE_STATUSES.includes(storedUser.status)
    );
}

async function getCurrentIdToken(forceRefresh = false) {
    return getFirebaseIdToken(forceRefresh);
}

// ======================================================
// Refresh Current Profile from Firestore
// Use this when the UI needs current role/status data.
// ======================================================

async function refreshCurrentUser() {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
        clearStoredSession();
        return null;
    }

    try {
        const user = await getUserProfile(firebaseUser);
        return storeSession(user);
    } catch (error) {
        clearStoredSession();
        throw error;
    }
}

// ======================================================
// Firebase Auth State Listener
// ======================================================

function subscribeToAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}

// ======================================================
// Role Helpers
// These helpers are for UI rendering only.
// Firestore Security Rules must enforce permissions.
// ======================================================

function isAdmin(user = getStoredUser()) {
    return user?.role === 'admin';
}

function isManager(user = getStoredUser()) {
    return user?.role === 'manager';
}

function isAccountManager(user = getStoredUser()) {
    return user?.role === 'account_manager';
}

function isCoordinator(user = getStoredUser()) {
    return user?.role === 'coordinator';
}

function isDesigner(user = getStoredUser()) {
    return user?.role === 'designer';
}

// ======================================================
// Legacy compatibility
//
// These exports are retained so older imports do not fail
// immediately. They do not call MongoDB or the backend.
// Migrate any service still using backendRequest separately.
// ======================================================

async function backendRequest() {
    throw new Error(
        'backendRequest لم يعد مستخدمًا في المصادقة. انقل هذه العملية إلى Firebase.'
    );
}

async function syncUserWithBackend() {
    throw new Error(
        'syncUserWithBackend تم إيقافه. بيانات المستخدم تُقرأ من Firestore.'
    );
}

// ======================================================
// Exports
// ======================================================

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
    normalizeUser,
    getUserProfile,
    refreshCurrentUser
};

export default {
    loginUser,
    registerUser,
    logoutUser,
    getCurrentUser,
    getCurrentFirebaseUser,
    getCurrentIdToken,
    isAuthenticated,
    subscribeToAuthState,
    refreshCurrentUser
};
