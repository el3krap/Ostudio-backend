// backend/config/firebaseAdmin.js

const admin = require('firebase-admin');


// ======================================================
// Firebase Admin Configuration
// ======================================================

const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
} = process.env;


// ======================================================
// Validate Environment Variables
// ======================================================

const missingFirebaseConfig = [];

if (!FIREBASE_PROJECT_ID) {
    missingFirebaseConfig.push('FIREBASE_PROJECT_ID');
}

if (!FIREBASE_CLIENT_EMAIL) {
    missingFirebaseConfig.push('FIREBASE_CLIENT_EMAIL');
}

if (!FIREBASE_PRIVATE_KEY) {
    missingFirebaseConfig.push('FIREBASE_PRIVATE_KEY');
}

if (missingFirebaseConfig.length > 0) {
    throw new Error(
        `❌ Missing Firebase Admin configuration: ${missingFirebaseConfig.join(', ')}`
    );
}


// ======================================================
// Prepare Private Key
// ======================================================

const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');


// ======================================================
// Initialize Firebase Admin
// ======================================================

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey,
        }),
    });
}


// ======================================================
// Firebase Admin Services
// ======================================================

const firebaseAdminAuth = admin.auth();


// ======================================================
// Exports
// ======================================================

module.exports = {
    admin,
    firebaseAdminAuth,
};