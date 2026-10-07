const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api";

// ============================================================
// Helpers
// ============================================================

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("ostudio_user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error(
      "Failed to read stored Ostudio user:",
      error
    );

    return null;
  }
};

const getMongoUserId = () => {
  const user = getStoredUser();

  if (!user) {
    return null;
  }

  return (
    user._id ||
    user.mongoId ||
    user.id ||
    null
  );
};

const request = async (
  endpoint,
  options = {}
) => {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }
  );

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
        data?.details ||
        "حدث خطأ أثناء الاتصال بالسيرفر."
    );
  }

  return data;
};

// ============================================================
// Normalize Project
// ============================================================

const normalizeProject = (project) => {
  if (!project) {
    return null;
  }

  return {
    ...project,

    // MongoDB ID
    id: project._id || project.id,

    _id: project._id || project.id,

    // Keep creator information accessible.
    createdById:
      project.createdBy?._id ||
      project.createdBy ||
      project.createdById ||
      null,

    createdByName:
      project.createdBy?.name ||
      project.createdByName ||
      "",

    // Main designer
    assignedDesignerId:
      project.assignedDesigner?._id ||
      project.assignedDesigner ||
      project.assignedDesignerId ||
      "",

    assignedDesignerName:
      project.assignedDesigner?.name ||
      project.assignedDesignerName ||
      "",

    // Presentation designer
    assignedPresenterId:
      project.assignedPresenter?._id ||
      project.assignedPresenter ||
      project.assignedPresenterId ||
      "",

    assignedPresenterName:
      project.assignedPresenter?.name ||
      project.assignedPresenterName ||
      "",

    // Preserve existing project data.
    checkpoints:
      Array.isArray(project.checkpoints)
        ? project.checkpoints
        : [],

    status:
      project.status ||
      "in-progress",

    isDoneAll:
      project.isDoneAll === true,

    renderFileLink:
      project.renderFileLink || "",

    presentationFileLink:
      project.presentationFileLink || "",

    coordinatorNotes:
      project.coordinatorNotes || "",

    presenterNote:
      project.presenterNote || "",
  };
};

// ============================================================
// Get All / Allowed Projects
// ============================================================
//
// IMPORTANT:
// The backend decides which projects the current user
// is allowed to see.
//
// Endpoint:
// GET /api/projects/all
//
// ============================================================

export const getProjects = async () => {
  const userId = getMongoUserId();

  if (!userId) {
    throw new Error(
      "لم يتم العثور على معرف مستخدم صالح."
    );
  }

  const data =
    await request("/projects/all");

  const projects = Array.isArray(data)
    ? data
    : data?.projects || [];

  return projects.map(
    normalizeProject
  );
};

// ============================================================
// Compatibility: Subscribe To All Projects
// ============================================================
//
// Old components may still call this function.
//
// Firestore onSnapshot has been replaced by API polling.
//
// ============================================================

export const subscribeToAllProjects = (
  callback,
  onError
) => {
  let stopped = false;
  let timer = null;

  const loadProjects = async () => {
    if (stopped) {
      return;
    }

    try {
      const projects =
        await getProjects();

      if (!stopped) {
        callback(projects);
      }
    } catch (error) {
      console.error(
        "Get projects error:",
        error
      );

      if (
        !stopped &&
        typeof onError === "function"
      ) {
        onError(error);
      }
    }
  };

  loadProjects();

  // Refresh every 10 seconds.
  timer = window.setInterval(
    loadProjects,
    10000
  );

  return () => {
    stopped = true;

    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
};

// ============================================================
// Get Assigned Projects
// ============================================================
//
// The backend already filters projects according to the
// logged-in user's role.
//
// For Designer:
// assignedDesigner == current user
//
// For Account Manager:
// createdBy == current user
//
// ============================================================

export const getAssignedProjects =
  async (uid = null) => {
    const userId =
      uid || getMongoUserId();

    if (!userId) {
      return [];
    }

    const projects =
      await getProjects();

    return projects;
  };

// ============================================================
// Compatibility: Subscribe To Assigned Projects
// ============================================================

export const subscribeToAssignedProjects = (
  uid,
  callback,
  onError
) => {
  if (!uid) {
    return () => {};
  }

  let stopped = false;
  let timer = null;

  const loadProjects = async () => {
    if (stopped) {
      return;
    }

    try {
      const projects =
        await getAssignedProjects(
          uid
        );

      if (!stopped) {
        callback(projects);
      }
    } catch (error) {
      console.error(
        "Get assigned projects error:",
        error
      );

      if (
        !stopped &&
        typeof onError === "function"
      ) {
        onError(error);
      }
    }
  };

  loadProjects();

  timer = window.setInterval(
    loadProjects,
    10000
  );

  return () => {
    stopped = true;

    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
};

// ============================================================
// Get One Project
// ============================================================

export const getProject = async (
  projectId
) => {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  const data =
    await request(
      `/projects/${encodeURIComponent(
        projectId
      )}`
    );

  const project =
    data?.project || data;

  return normalizeProject(project);
};

// ============================================================
// Subscribe To One Project
// ============================================================
//
// Compatibility with old UI.
//
// Backend polling replaces Firestore onSnapshot.
//
// ============================================================

export const subscribeToProject = (
  projectId,
  callback,
  onError
) => {
  if (!projectId) {
    return () => {};
  }

  let stopped = false;
  let timer = null;

  const loadProject = async () => {
    if (stopped) {
      return;
    }

    try {
      const project =
        await getProject(projectId);

      if (!stopped) {
        callback(project);
      }
    } catch (error) {
      console.error(
        "Get project error:",
        error
      );

      if (
        !stopped &&
        typeof onError === "function"
      ) {
        onError(error);
      }
    }
  };

  loadProject();

  timer = window.setInterval(
    loadProject,
    10000
  );

  return () => {
    stopped = true;

    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
};

// ============================================================
// Create Project
// ============================================================

export const createProject = async ({
  projectName,
  brief = "",
  briefName = "",
  managerNotes = "",
  createdById,
  createdByName,
}) => {
  const cleanProjectName =
    String(
      projectName || ""
    ).trim();

  if (!cleanProjectName) {
    throw new Error(
      "اسم المشروع مطلوب."
    );
  }

  /*
    The backend determines the real creator
    from the authenticated user.

    createdById / createdByName are kept here
    for compatibility with existing UI calls.
  */

  const data =
    await request(
      "/projects/create",
      {
        method: "POST",

        body: JSON.stringify({
          projectName:
            cleanProjectName,

          brief:
            brief || "",

          briefName:
            briefName || "",

          managerNotes:
            String(
              managerNotes || ""
            ).trim(),

          /*
            Temporary compatibility.

            The backend should ultimately use
            the authenticated MongoDB user.
          */

          userId:
            createdById ||
            getMongoUserId(),

          createdByName:
            createdByName || "",
        }),
      }
    );

  return normalizeProject(
    data?.project || data
  );
};

// ============================================================
// Update Project
// ============================================================

export const updateProject = async (
  projectId,
  data
) => {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "Project update data is required."
    );
  }

  const response =
    await request(
      `/projects/update/${encodeURIComponent(
        projectId
      )}`,
      {
        method: "PUT",

        body: JSON.stringify(data),
      }
    );

  return normalizeProject(
    response?.project ||
      response
  );
};

// ============================================================
// Assign Main Designer
// ============================================================

export const assignDesigner = async (
  projectId,
  designerId
) => {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  if (!designerId) {
    throw new Error(
      "Designer ID is required."
    );
  }

  const response =
    await request(
      `/projects/${encodeURIComponent(
        projectId
      )}/assign-designer`,
      {
        method: "PUT",

        body: JSON.stringify({
          designerId,
        }),
      }
    );

  return normalizeProject(
    response?.project ||
      response
  );
};

// ============================================================
// Assign Presentation Designer
// ============================================================

export const assignPresenter = async (
  projectId,
  presenterId
) => {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  if (!presenterId) {
    throw new Error(
      "Presentation designer ID is required."
    );
  }

  const response =
    await request(
      `/projects/${encodeURIComponent(
        projectId
      )}/assign-presenter`,
      {
        method: "PUT",

        body: JSON.stringify({
          presenterId,
        }),
      }
    );

  return normalizeProject(
    response?.project ||
      response
  );
};

// ============================================================
// Remove Main Designer
// ============================================================

export const removeDesigner = async (
  projectId
) => {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  const response =
    await request(
      `/projects/${encodeURIComponent(
        projectId
      )}/remove-designer`,
      {
        method: "PUT",
      }
    );

  return normalizeProject(
    response?.project ||
      response
  );
};

// ============================================================
// Remove Presentation Designer
// ============================================================

export const removePresenter = async (
  projectId
) => {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  const response =
    await request(
      `/projects/${encodeURIComponent(
        projectId
      )}/remove-presenter`,
      {
        method: "PUT",
      }
    );

  return normalizeProject(
    response?.project ||
      response
  );
};

// ============================================================
// Delete Project
// ============================================================
//
// NOTE:
// The current backend does not expose a delete project
// endpoint in the new projects.js.
//
// Therefore we intentionally do NOT send a fake request.
// ============================================================

export const deleteProject = async () => {
  throw new Error(
    "حذف المشاريع غير متاح في الـ Backend الحالي."
  );
};