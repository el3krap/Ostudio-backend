
const {
  initializeApp,
  getApps,
  cert,
  applicationDefault
} = require('firebase-admin/app');

const { getAuth } = require('firebase-admin/auth');

const {
  getFirestore,
  FieldValue
} = require('firebase-admin/firestore');

let firebaseApp;

function initializeFirebaseAdmin() {
  // Reuse existing Firebase app
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Use default credentials only if all explicit credentials are absent
  if (!projectId && !clientEmail && !privateKey) {
    firebaseApp = initializeApp({
      credential: applicationDefault()
    });

    return firebaseApp;
  }

  // Reject incomplete configuration
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin configuration is incomplete. ' +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, ' +
      'and FIREBASE_PRIVATE_KEY.'
    );
  }

  // Convert escaped newlines into actual newlines
  const normalizedPrivateKey = privateKey.replace(/\\n/g, '\n');

  firebaseApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: normalizedPrivateKey
    }),
    projectId
  });

  return firebaseApp;
}

initializeFirebaseAdmin();

const firebaseAdminAuth = getAuth(firebaseApp);
const firebaseAdminDb = getFirestore(firebaseApp);

module.exports = {
  firebaseApp,
  firebaseAdminAuth,
  firebaseAdminDb,
  initializeFirebaseAdmin,
  FieldValue
};
