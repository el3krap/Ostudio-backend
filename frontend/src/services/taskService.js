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

const tasksRef = collection(db, "tasks");

export const subscribeToUserTasks = (uid, callback, onError) => {
  if (!uid) return () => {};

  return onSnapshot(
    query(tasksRef, where("assignedToId", "==", uid)),
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          _id: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
};

export const createTask = async ({
  title,
  description = "",
  assignedToId,
  assignedToName = "",
  projectId = "",
  deadline = null,
  createdById,
  createdByName = "",
}) => {
  return addDoc(tasksRef, {
    title: title.trim(),
    description: description.trim(),
    assignedToId,
    assignedToName,
    projectId,
    deadline,
    createdById,
    createdByName,
    status: "pending",
    fileLink: "",
    fileName: "",
    notes: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateTask = async (taskId, data) => {
  if (!taskId) throw new Error("Task ID is required.");

  return updateDoc(doc(db, "tasks", taskId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};
