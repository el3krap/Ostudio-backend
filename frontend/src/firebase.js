import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCABZ8AqjAkGfrRExbYe6DXvAe72XBF6Ho",
  authDomain: "ostudio-98af9.firebaseapp.com",
  projectId: "ostudio-98af9",
  storageBucket: "ostudio-98af9.firebasestorage.app",
  messagingSenderId: "560656548815",
  appId: "1:560656548815:web:e1ded530aa383bdcd7c8ba",
  measurementId: "G-L4HKDNTSSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;