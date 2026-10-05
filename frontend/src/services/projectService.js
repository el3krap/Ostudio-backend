import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const projectsRef = collection(db, "projects");

const normalizeProject = (snapshot) => ({
  id: snapshot.id,
  _id: snapshot.id,
  ...snapshot.data(),
});

export const subscribeToAllProjects = (callback, onError) => {
  return onSnapshot(
    query(projectsRef, orderBy("createdAt", "desc")),
    (snapshot) => callback(snapshot.docs.map(normalizeProject)),
    onError
  );
};

export const subscribeToAssignedProjects = (
  uid,
  callback,
  onError,
  field = "assignedDesignerId"
) => {
  if (!uid) return () => {};

  return onSnapshot(
    query(projectsRef, where(field, "==", uid)),
    (snapshot) => callback(snapshot.docs.map(normalizeProject)),
    onError
  );
};

export const createProject = async ({
  projectName,
  brief = "",
  briefName = "",
  managerNotes = "",
  createdById,
  createdByName,
}) => {
  const now = serverTimestamp();

  const project = {
    projectName: projectName.trim(),
    brief,
    briefName,
    managerNotes: managerNotes.trim(),
    createdById,
    createdByName,
    assignedDesignerId: "",
    assignedDesignerName: "",
    assignedPresenterId: "",
    assignedPresenterName: "",
    description: "",
    startDate: null,
    deadline: null,
    status: "created",
    isDoneAll: false,
    render: {
      url: "",
      fileName: "",
      status: "pending",
    },
    presentation: {
      url: "",
      fileName: "",
      status: "pending",
    },
    coordinatorNotes: "",
    presenterNote: "",
    checkpoints: [],
    createdAt: now,
    updatedAt: now,
  };

  return addDoc(projectsRef, project);
};

export const updateProject = async (projectId, data) => {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return updateDoc(doc(db, "projects", projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProject = async (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return deleteDoc(doc(db, "projects", projectId));
};

export const subscribeToProject = (projectId, callback, onError) => {
  if (!projectId) return () => {};

  return onSnapshot(
    doc(db, "projects", projectId),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? {
              id: snapshot.id,
              _id: snapshot.id,
              ...snapshot.data(),
            }
          : null
      );
    },
    onError
  );
};