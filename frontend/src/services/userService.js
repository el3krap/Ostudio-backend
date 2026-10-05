import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export const getUserProfile = async (uid) => {
  if (!uid) return null;

  const snapshot = await getDoc(doc(db, "users", uid));

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data(),
      }
    : null;
};

export const subscribeToUsers = (callback, onError) => {
  return onSnapshot(
    query(collection(db, "users")),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          uid: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
};

export const subscribeToUsersByRole = (role, callback, onError) => {
  return onSnapshot(
    query(collection(db, "users"), where("role", "==", role)),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          uid: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
};

export const updateUserProfile = async (uid, data) => {
  if (!uid) {
    throw new Error("User UID is required.");
  }

  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteUserProfile = async (uid) => {
  if (!uid) {
    throw new Error("User UID is required.");
  }

  await deleteDoc(doc(db, "users", uid));
};