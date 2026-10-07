const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * Get the currently stored frontend user.
 */
const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("ostudioUser");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Failed to read stored user:", error);
    return null;
  }
};

/**
 * Get the MongoDB user ID.
 *
 * IMPORTANT:
 * Firebase UID is NOT the same as MongoDB ObjectId.
 */
const getMongoUserId = (user = getStoredUser()) => {
  if (!user) return null;

  return (
    user._id ||
    user.mongoId ||
    (typeof user.id === "string" && /^[a-f\d]{24}$/i.test(user.id)
      ? user.id
      : null)
  );
};

/**
 * Generic API request helper.
 */
const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

/**
 * Normalize user object returned from backend.
 */
const normalizeUser = (user) => {
  if (!user) return null;

  const mongoId = user._id || user.mongoId || null;

  return {
    ...user,

    id: mongoId || user.id || user.uid || null,

    _id: mongoId,

    mongoId,

    uid: user.firebaseUid || user.uid || null,

    firebaseUid: user.firebaseUid || user.uid || null,

    name: user.name || "",

    email: user.email || "",

    role: user.role || "designer",

    status: user.status || "pending",
  };
};

/**
 * Get one user profile.
 *
 * The backend endpoint returns users by MongoDB ID.
 */
export const getUserProfile = async (userId) => {
  if (!userId) return null;

  try {
    const data = await request(`/auth/users/${userId}`);

    const user = data?.user || data;

    return normalizeUser(user);
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
};

/**
 * Get all users.
 *
 * Used mainly by Admin and Coordinator screens.
 */
export const getUsers = async () => {
  const data = await request("/auth/all-users");

  const users = Array.isArray(data)
    ? data
    : data?.users || data?.data || [];

  return users.map(normalizeUser);
};

/**
 * Compatibility alias.
 */
export const getAllUsers = getUsers;

/**
 * Get users by role.
 */
export const getUsersByRole = async (role) => {
  if (!role) {
    throw new Error("Role is required.");
  }

  const users = await getUsers();

  return users.filter((user) => user.role === role);
};

/**
 * Subscribe to all users.
 *
 * The old implementation used Firestore onSnapshot.
 * The new backend currently uses REST, so polling is used
 * to preserve the same callback-based API expected by the UI.
 */
export const subscribeToUsers = (callback, onError) => {
  let stopped = false;
  let intervalId = null;

  const loadUsers = async () => {
    try {
      const users = await getUsers();

      if (!stopped) {
        callback(users);
      }
    } catch (error) {
      console.error("Failed to subscribe to users:", error);

      if (!stopped && typeof onError === "function") {
        onError(error);
      }
    }
  };

  loadUsers();

  intervalId = setInterval(loadUsers, 10000);

  return () => {
    stopped = true;

    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

/**
 * Subscribe to users by role.
 */
export const subscribeToUsersByRole = (role, callback, onError) => {
  if (!role) {
    if (typeof onError === "function") {
      onError(new Error("Role is required."));
    }

    return () => {};
  }

  let stopped = false;
  let intervalId = null;

  const loadUsers = async () => {
    try {
      const users = await getUsersByRole(role);

      if (!stopped) {
        callback(users);
      }
    } catch (error) {
      console.error(`Failed to load users with role "${role}":`, error);

      if (!stopped && typeof onError === "function") {
        onError(error);
      }
    }
  };

  loadUsers();

  intervalId = setInterval(loadUsers, 10000);

  return () => {
    stopped = true;

    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

/**
 * Update user profile.
 *
 * Admin operations are handled by the backend.
 */
export const updateUserProfile = async (userId, data) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const response = await request(`/auth/update-user/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  const user = response?.user || response;

  return normalizeUser(user);
};

/**
 * Delete user profile.
 *
 * This replaces the old Firestore delete operation.
 */
export const deleteUserProfile = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return request(`/auth/delete-user/${userId}`, {
    method: "DELETE",
  });
};

/**
 * Approve a pending account.
 */
export const approveUser = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const response = await request(`/auth/approve-user/${userId}`, {
    method: "PUT",
  });

  const user = response?.user || response;

  return normalizeUser(user);
};

/**
 * Reject a pending account.
 */
export const rejectUser = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return request(`/auth/reject-user/${userId}`, {
    method: "DELETE",
  });
};

/**
 * Get pending account requests.
 */
export const getPendingUsers = async () => {
  const data = await request("/auth/pending-requests");

  const users = Array.isArray(data)
    ? data
    : data?.users || data?.requests || data?.data || [];

  return users.map(normalizeUser);
};

/**
 * Subscribe to pending account requests.
 */
export const subscribeToPendingUsers = (callback, onError) => {
  let stopped = false;
  let intervalId = null;

  const loadPendingUsers = async () => {
    try {
      const users = await getPendingUsers();

      if (!stopped) {
        callback(users);
      }
    } catch (error) {
      console.error("Failed to load pending users:", error);

      if (!stopped && typeof onError === "function") {
        onError(error);
      }
    }
  };

  loadPendingUsers();

  intervalId = setInterval(loadPendingUsers, 10000);

  return () => {
    stopped = true;

    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

/**
 * Get the current stored user's MongoDB ID.
 */
export const getCurrentMongoUserId = () => {
  return getMongoUserId();
};

/**
 * Get the current stored user.
 */
export const getCurrentUser = () => {
  return normalizeUser(getStoredUser());
};