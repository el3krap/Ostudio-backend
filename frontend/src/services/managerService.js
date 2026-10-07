// frontend/src/services/managerService.js

import { auth } from '../firebase';


/* =========================================================
   Configuration
========================================================= */

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080/api';


/* =========================================================
   Authentication
========================================================= */

async function getAuthToken() {
    const currentUser =
        auth.currentUser;

    if (!currentUser) {
        throw new Error(
            'المستخدم غير مسجل الدخول.'
        );
    }

    return currentUser.getIdToken();
}


/* =========================================================
   Generic Manager Request
========================================================= */

async function managerRequest(
    endpoint,
    options = {}
) {
    const token =
        await getAuthToken();

    const {
        body,
        ...restOptions
    } = options;

    const requestOptions = {
        ...restOptions,
        headers: {
            ...(restOptions.headers || {}),
            Authorization:
                `Bearer ${token}`
        }
    };

    if (body !== undefined) {
        requestOptions.headers[
            'Content-Type'
        ] =
            'application/json';

        requestOptions.body =
            JSON.stringify(body);
    }

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            requestOptions
        );

    let data = null;

    try {
        data =
            await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error =
            new Error(
                data?.message ||
                data?.error ||
                `Request failed with status ${response.status}`
            );

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }

    return data;
}


/* =========================================================
   Normalize API Response
========================================================= */

function extractList(data, keys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    for (const key of keys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

function extractItem(data, keys = []) {
    if (!data) {
        return null;
    }

    for (const key of keys) {
        if (data?.[key]) {
            return data[key];
        }
    }

    return data;
}


/* =========================================================
   Projects
========================================================= */

/**
 * Get ALL projects.
 *
 * Manager is allowed to see all projects.
 */
export async function getProjects() {
    const data =
        await managerRequest(
            '/manager/projects'
        );

    return extractList(
        data,
        [
            'projects',
            'data',
            'results'
        ]
    );
}


/**
 * Get one project.
 */
export async function getProject(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}`
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/**
 * Create project.
 *
 * IMPORTANT:
 * No userId / createdBy is sent.
 * Backend gets the authenticated manager
 * from the Firebase token.
 */
export async function createProject(
    projectData = {}
) {
    const data =
        await managerRequest(
            '/manager/projects',
            {
                method: 'POST',

                body: {
                    projectName:
                        projectData.projectName ||
                        '',

                    brief:
                        projectData.brief ||
                        '',

                    briefName:
                        projectData.briefName ||
                        '',

                    managerNotes:
                        projectData.managerNotes ||
                        '',

                    description:
                        projectData.description ||
                        '',

                    startDate:
                        projectData.startDate ||
                        null,

                    deadline:
                        projectData.deadline ||
                        null,

                    checkpoints:
                        Array.isArray(
                            projectData.checkpoints
                        )
                            ? projectData.checkpoints
                            : [],

                    renderFileLink:
                        projectData.renderFileLink ||
                        '',

                    renderFileName:
                        projectData.renderFileName ||
                        '',

                    renderStatus:
                        projectData.renderStatus ||
                        '',

                    presentationFileLink:
                        projectData.presentationFileLink ||
                        '',

                    presentationFileName:
                        projectData.presentationFileName ||
                        '',

                    presenterNote:
                        projectData.presenterNote ||
                        '',

                    coordinatorNotes:
                        projectData.coordinatorNotes ||
                        '',

                    status:
                        projectData.status ||
                        'in-progress'
                }
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/**
 * Update any project.
 *
 * Manager has permission to update
 * projects regardless of creator.
 */
export async function updateProject(
    projectId,
    projectData = {}
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}`,
            {
                method: 'PUT',

                body: {
                    projectName:
                        projectData.projectName,

                    brief:
                        projectData.brief,

                    briefName:
                        projectData.briefName,

                    managerNotes:
                        projectData.managerNotes,

                    description:
                        projectData.description,

                    startDate:
                        projectData.startDate,

                    deadline:
                        projectData.deadline,

                    checkpoints:
                        Array.isArray(
                            projectData.checkpoints
                        )
                            ? projectData.checkpoints
                            : undefined,

                    renderFileLink:
                        projectData.renderFileLink,

                    renderFileName:
                        projectData.renderFileName,

                    renderStatus:
                        projectData.renderStatus,

                    presentationFileLink:
                        projectData.presentationFileLink,

                    presentationFileName:
                        projectData.presentationFileName,

                    presenterNote:
                        projectData.presenterNote,

                    coordinatorNotes:
                        projectData.coordinatorNotes,

                    isDoneAll:
                        projectData.isDoneAll,

                    isPresentationApproved:
                        projectData.isPresentationApproved,

                    status:
                        projectData.status
                }
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/**
 * Delete project.
 */
export async function deleteProject(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    return managerRequest(
        `/manager/projects/${encodeURIComponent(
            projectId
        )}`,
        {
            method: 'DELETE'
        }
    );
}


/* =========================================================
   Project Status
========================================================= */

export async function updateProjectStatus(
    projectId,
    status
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    if (!status) {
        throw new Error(
            'حالة المشروع مطلوبة.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}/status`,
            {
                method: 'PUT',

                body: {
                    status
                }
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/* =========================================================
   Designer Assignment
========================================================= */

/**
 * Assign main Designer to project.
 */
export async function assignDesigner(
    projectId,
    designerId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    if (!designerId) {
        throw new Error(
            'معرف المصمم مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}/assign-designer`,
            {
                method: 'PUT',

                body: {
                    designerId
                }
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/**
 * Remove main Designer.
 */
export async function removeDesigner(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}/remove-designer`,
            {
                method: 'PUT'
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/* =========================================================
   Presentation Designer Assignment
========================================================= */

/**
 * Assign Presentation Designer.
 *
 * This is intentionally independent
 * from the main Designer assignment.
 */
export async function assignPresenter(
    projectId,
    designerId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    if (!designerId) {
        throw new Error(
            'معرف مصمم العرض مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}/assign-presenter`,
            {
                method: 'PUT',

                body: {
                    designerId
                }
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/**
 * Remove Presentation Designer.
 */
export async function removePresenter(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/projects/${encodeURIComponent(
                projectId
            )}/remove-presenter`,
            {
                method: 'PUT'
            }
        );

    return extractItem(
        data,
        [
            'project',
            'data'
        ]
    );
}


/* =========================================================
   Designers
========================================================= */

/**
 * Get all active Designers.
 *
 * Used by Manager when assigning
 * project/presentation designers.
 */
export async function getDesigners() {
    const data =
        await managerRequest(
            '/manager/designers'
        );

    return extractList(
        data,
        [
            'designers',
            'users',
            'data',
            'results'
        ]
    );
}


/**
 * Get one Designer.
 */
export async function getDesigner(
    designerId
) {
    if (!designerId) {
        throw new Error(
            'معرف المصمم مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/designers/${encodeURIComponent(
                designerId
            )}`
        );

    return extractItem(
        data,
        [
            'designer',
            'user',
            'data'
        ]
    );
}


/* =========================================================
   Tasks
========================================================= */

/**
 * Get all tasks visible to Manager.
 */
export async function getTasks() {
    const data =
        await managerRequest(
            '/manager/tasks'
        );

    return extractList(
        data,
        [
            'tasks',
            'data',
            'results'
        ]
    );
}


/**
 * Get one task.
 */
export async function getTask(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/tasks/${encodeURIComponent(
                taskId
            )}`
        );

    return extractItem(
        data,
        [
            'task',
            'data'
        ]
    );
}


/**
 * Create task.
 *
 * Manager can create tasks.
 */
export async function createTask(
    taskData = {}
) {
    const data =
        await managerRequest(
            '/manager/tasks',
            {
                method: 'POST',

                body: {
                    title:
                        taskData.title ||
                        '',

                    description:
                        taskData.description ||
                        '',

                    projectId:
                        taskData.projectId ||
                        null,

                    assignedTo:
                        taskData.assignedTo ||
                        null,

                    status:
                        taskData.status ||
                        'pending',

                    fileLink:
                        taskData.fileLink ||
                        '',

                    fileName:
                        taskData.fileName ||
                        '',

                    notes:
                        taskData.notes ||
                        '',

                    deadline:
                        taskData.deadline ||
                        null
                }
            }
        );

    return extractItem(
        data,
        [
            'task',
            'data'
        ]
    );
}


/**
 * Update task.
 */
export async function updateTask(
    taskId,
    taskData = {}
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/tasks/${encodeURIComponent(
                taskId
            )}`,
            {
                method: 'PUT',

                body: {
                    title:
                        taskData.title,

                    description:
                        taskData.description,

                    projectId:
                        taskData.projectId,

                    assignedTo:
                        taskData.assignedTo,

                    status:
                        taskData.status,

                    fileLink:
                        taskData.fileLink,

                    fileName:
                        taskData.fileName,

                    notes:
                        taskData.notes,

                    deadline:
                        taskData.deadline
                }
            }
        );

    return extractItem(
        data,
        [
            'task',
            'data'
        ]
    );
}


/**
 * Delete task.
 */
export async function deleteTask(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    return managerRequest(
        `/manager/tasks/${encodeURIComponent(
            taskId
        )}`,
        {
            method: 'DELETE'
        }
    );
}


/* =========================================================
   Task Assignment
========================================================= */

/**
 * Assign task to Designer.
 */
export async function assignTask(
    taskId,
    designerId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    if (!designerId) {
        throw new Error(
            'معرف المصمم مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/tasks/${encodeURIComponent(
                taskId
            )}/assign`,
            {
                method: 'PUT',

                body: {
                    designerId
                }
            }
        );

    return extractItem(
        data,
        [
            'task',
            'data'
        ]
    );
}


/**
 * Remove task assignment.
 */
export async function removeTaskAssignment(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const data =
        await managerRequest(
            `/manager/tasks/${encodeURIComponent(
                taskId
            )}/remove-assignment`,
            {
                method: 'PUT'
            }
        );

    return extractItem(
        data,
        [
            'task',
            'data'
        ]
    );
}


/**
 * Update task status.
 */
export async function updateTaskStatus(
    taskId,
    status
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    if (!status) {
        throw new Error(
            'حالة المهمة مطلوبة.'
        );
    }

    const data =
        await managerRequest(
            `/manager/tasks/${encodeURIComponent(
                taskId
            )}/status`,
            {
                method: 'PUT',

                body: {
                    status
                }
            }
        );

    return extractItem(
        data,
        [
            'task',
            'data'
        ]
    );
}


/* =========================================================
   Dashboard
========================================================= */

export async function getDashboardData() {
    const data =
        await managerRequest(
            '/manager/dashboard'
        );

    return (
        data?.dashboard ||
        data?.data ||
        data
    );
}


/* =========================================================
   Notifications
========================================================= */

export async function getNotifications() {
    const data =
        await managerRequest(
            '/notifications'
        );

    return extractList(
        data,
        [
            'notifications',
            'data',
            'results'
        ]
    );
}


/**
 * Mark one notification as read.
 */
export async function markNotificationAsRead(
    notificationId
) {
    if (!notificationId) {
        throw new Error(
            'معرف الإشعار مطلوب.'
        );
    }

    return managerRequest(
        `/notifications/${encodeURIComponent(
            notificationId
        )}/read`,
        {
            method: 'PUT'
        }
    );
}


/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead() {
    return managerRequest(
        '/notifications/read-all',
        {
            method: 'PUT'
        }
    );
}


/* =========================================================
   Default Export
========================================================= */

const managerService = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,

    updateProjectStatus,

    assignDesigner,
    removeDesigner,

    assignPresenter,
    removePresenter,

    getDesigners,
    getDesigner,

    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,

    assignTask,
    removeTaskAssignment,
    updateTaskStatus,

    getDashboardData,

    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
};

export default managerService;