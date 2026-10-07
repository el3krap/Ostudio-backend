const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let firebaseApp;

function initializeFirebaseAdmin() {
    if (getApps().length > 0) {
        firebaseApp = getApps()[0];
        return firebaseApp;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    /*
     * Preferred local/deployment configuration:
     *
     * GOOGLE_APPLICATION_CREDENTIALS
     *
     * If the environment variable is configured,
     * Firebase Admin SDK can automatically load
     * the service account credentials.
     */
    if (!projectId && !clientEmail && !privateKey) {
        firebaseApp = initializeApp({
            credential: applicationDefault()
        });

        return firebaseApp;
    }

    /*
     * Environment-variable based service account.
     *
     * FIREBASE_PRIVATE_KEY usually contains escaped
     * newline characters (\n), so we convert them
     * back to real newlines before passing the key.
     */
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin configuration is incomplete. ' +
            'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
        );
    }

    firebaseApp = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n')
        })
    });

    return firebaseApp;
}

initializeFirebaseAdmin();

const firebaseAdminAuth = getAuth(firebaseApp);

module.exports = {
    firebaseApp,
    firebaseAdminAuth,
    initializeFirebaseAdmin
};