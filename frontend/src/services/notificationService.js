import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const notificationsRef = collection(db, "notifications");

export const createNotification = async ({
  recipientId,
  recipientRole = "",
  projectId = "",
  taskId = "",
  type = "general",
  title = "Ostudio",
  message,
  createdById,
}) => {
  if (!recipientId) throw new Error("recipientId is required.");
  if (!message) throw new Error("Notification message is required.");

  return addDoc(notificationsRef, {
    recipientId,
    recipientRole,
    projectId,
    taskId,
    type,
    title,
    message,
    read: false,
    createdById,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToMyNotifications = (
  uid,
  callback,
  onError
) => {
  if (!uid) return () => {};

  return onSnapshot(
    query(notificationsRef, where("recipientId", "==", uid)),
    (snapshot) => {
      const notifications = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      callback(notifications);
    },
    onError
  );
};

export const markNotificationAsRead = async (notificationId) => {
  await updateDoc(doc(db, "notifications", notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
};
