// frontend/src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// ======================================================
// Firebase Configuration
// ======================================================

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ======================================================
// Validate Firebase Environment Variables
// ======================================================

const requiredFirebaseConfig = [
    ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
    ['VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
    ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
];

const missingFirebaseConfig = requiredFirebaseConfig
    .filter(([, value]) => !value)
    .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
    console.error(
        '❌ Missing Firebase configuration:',
        missingFirebaseConfig.join(', ')
    );
}

// ======================================================
// Initialize Firebase
// ======================================================

const app = initializeApp(firebaseConfig);

// ======================================================
// Firebase Authentication
// ======================================================

const auth = getAuth(app);

// ======================================================
// Exports
// ======================================================

export { app, auth };

export default app;