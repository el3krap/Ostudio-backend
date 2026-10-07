// frontend/src/services/designerService.js

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
            'يجب تسجيل الدخول أولًا.'
        );
    }

    return currentUser.getIdToken();
}

/* =========================================================
   Generic Request
========================================================= */

async function designerRequest(
    endpoint,
    options = {}
) {
    const token =
        await getAuthToken();

    const {
        headers = {},
        ...restOptions
    } = options;

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...restOptions,

                headers: {
                    'Content-Type':
                        'application/json',

                    Authorization:
                        `Bearer ${token}`,

                    ...headers
                }
            }
        );

    let data = null;

    try {
        data =
            await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error ||
            'حدث خطأ أثناء تنفيذ الطلب.';

        const error =
            new Error(message);

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }

    return data;
}

/* =========================================================
   Normalize Helpers
========================================================= */

function normalizeListResponse(
    response,
    possibleKeys = []
) {
    if (Array.isArray(response)) {
        return response;
    }

    for (const key of possibleKeys) {
        if (
            Array.isArray(
                response?.[key]
            )
        ) {
            return response[key];
        }
    }

    if (
        Array.isArray(
            response?.data
        )
    ) {
        return response.data;
    }

    return [];
}

function normalizeObjectResponse(
    response,
    possibleKeys = []
) {
    if (
        response &&
        typeof response === 'object'
    ) {
        for (const key of possibleKeys) {
            if (
                response[key] &&
                typeof response[key] ===
                    'object'
            ) {
                return response[key];
            }
        }

        if (
            response.data &&
            typeof response.data ===
                'object'
        ) {
            return response.data;
        }
    }

    return response;
}

/* =========================================================
   Projects
========================================================= */

/**
 * Get only projects assigned to the
 * currently authenticated Designer.
 *
 * Backend decides whether the Designer
 * is assigned as:
 *
 * - Main Designer
 * - Presentation Designer
 */
export async function getMyProjects() {
    const response =
        await designerRequest(
            '/designer/projects',
            {
                method: 'GET'
            }
        );

    return normalizeListResponse(
        response,
        [
            'projects',
            'items',
            'results'
        ]
    );
}

/**
 * Get one project assigned to the
 * currently authenticated Designer.
 */
export async function getMyProject(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}`,
            {
                method: 'GET'
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'project'
        ]
    );
}

/**
 * Get Designer project status.
 */
export async function getMyProjectStatus(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/status`,
            {
                method: 'GET'
            }
        );

    return response;
}

/* =========================================================
   Project Updates
========================================================= */

/**
 * Designer can update only the fields
 * that the backend allows.
 *
 * IMPORTANT:
 * The backend must enforce the actual
 * permissions. The frontend never decides
 * authorization.
 */
export async function updateMyProject(
    projectId,
    projectData
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}`,
            {
                method: 'PUT',

                body: JSON.stringify(
                    projectData || {}
                )
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'project'
        ]
    );
}

/* =========================================================
   Checkpoints
========================================================= */

/**
 * Get checkpoints for an assigned project.
 */
export async function getProjectCheckpoints(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/checkpoints`,
            {
                method: 'GET'
            }
        );

    return normalizeListResponse(
        response,
        [
            'checkpoints',
            'items',
            'results'
        ]
    );
}

/**
 * Update a checkpoint.
 *
 * The backend must verify that this
 * Designer is assigned to the project.
 */
export async function updateCheckpoint(
    projectId,
    checkpointId,
    checkpointData
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    if (!checkpointId) {
        throw new Error(
            'معرف الـ Checkpoint غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/checkpoints/${encodeURIComponent(
                checkpointId
            )}`,
            {
                method: 'PUT',

                body: JSON.stringify(
                    checkpointData || {}
                )
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'checkpoint',
            'project'
        ]
    );
}

/**
 * Mark checkpoint as completed.
 */
export async function completeCheckpoint(
    projectId,
    checkpointId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    if (!checkpointId) {
        throw new Error(
            'معرف الـ Checkpoint غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/checkpoints/${encodeURIComponent(
                checkpointId
            )}/complete`,
            {
                method: 'PUT'
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'checkpoint',
            'project'
        ]
    );
}

/**
 * Re-open a completed checkpoint.
 */
export async function reopenCheckpoint(
    projectId,
    checkpointId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    if (!checkpointId) {
        throw new Error(
            'معرف الـ Checkpoint غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/checkpoints/${encodeURIComponent(
                checkpointId
            )}/reopen`,
            {
                method: 'PUT'
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'checkpoint',
            'project'
        ]
    );
}

/* =========================================================
   Render
========================================================= */

/**
 * Update Render information.
 *
 * Supported legacy fields:
 *
 * - renderFileLink
 * - renderFileName
 * - renderStatus
 */
export async function updateRender(
    projectId,
    renderData
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/render`,
            {
                method: 'PUT',

                body: JSON.stringify(
                    renderData || {}
                )
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'project'
        ]
    );
}

/**
 * Update Render status only.
 */
export async function updateRenderStatus(
    projectId,
    renderStatus
) {
    return updateRender(
        projectId,
        {
            renderStatus
        }
    );
}

/* =========================================================
   Presentation
========================================================= */

/**
 * Get presentation information
 * for an assigned presentation project.
 */
export async function getPresentation(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/presentation`,
            {
                method: 'GET'
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'presentation',
            'project'
        ]
    );
}

/**
 * Update presentation information.
 *
 * Supported legacy fields:
 *
 * - presentationFileLink
 * - presentationFileName
 * - presenterNote
 */
export async function updatePresentation(
    projectId,
    presentationData
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/projects/${encodeURIComponent(
                projectId
            )}/presentation`,
            {
                method: 'PUT',

                body: JSON.stringify(
                    presentationData || {}
                )
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'presentation',
            'project'
        ]
    );
}

/**
 * Update presentation file.
 */
export async function updatePresentationFile(
    projectId,
    fileData
) {
    return updatePresentation(
        projectId,
        fileData
    );
}

/* =========================================================
   Tasks
========================================================= */

/**
 * Get tasks assigned to the current Designer.
 *
 * Backend derives the Designer from
 * Firebase authentication.
 */
export async function getMyTasks() {
    const response =
        await designerRequest(
            '/designer/tasks',
            {
                method: 'GET'
            }
        );

    return normalizeListResponse(
        response,
        [
            'tasks',
            'items',
            'results'
        ]
    );
}

/**
 * Get one assigned task.
 */
export async function getMyTask(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/tasks/${encodeURIComponent(
                taskId
            )}`,
            {
                method: 'GET'
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'task'
        ]
    );
}

/**
 * Update a task assigned to the current Designer.
 *
 * The backend must verify that the task
 * is assigned to this Designer.
 */
export async function updateMyTask(
    taskId,
    taskData
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/tasks/${encodeURIComponent(
                taskId
            )}`,
            {
                method: 'PUT',

                body: JSON.stringify(
                    taskData || {}
                )
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'task'
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
            'معرف المهمة غير موجود.'
        );
    }

    if (!status) {
        throw new Error(
            'حالة المهمة غير موجودة.'
        );
    }

    const response =
        await designerRequest(
            `/designer/tasks/${encodeURIComponent(
                taskId
            )}/status`,
            {
                method: 'PUT',

                body: JSON.stringify({
                    status
                })
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'task'
        ]
    );
}

/**
 * Mark task as completed.
 */
export async function completeTask(
    taskId
) {
    return updateTaskStatus(
        taskId,
        'completed'
    );
}

/**
 * Move task back to in-progress.
 */
export async function startTask(
    taskId
) {
    return updateTaskStatus(
        taskId,
        'in-progress'
    );
}

/**
 * Move task back to pending.
 */
export async function resetTask(
    taskId
) {
    return updateTaskStatus(
        taskId,
        'pending'
    );
}

/* =========================================================
   Task Files
========================================================= */

/**
 * Update task file information.
 *
 * Supported legacy fields:
 *
 * - fileLink
 * - fileName
 */
export async function updateTaskFile(
    taskId,
    fileData
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة غير موجود.'
        );
    }

    const response =
        await designerRequest(
            `/designer/tasks/${encodeURIComponent(
                taskId
            )}/file`,
            {
                method: 'PUT',

                body: JSON.stringify(
                    fileData || {}
                )
            }
        );

    return normalizeObjectResponse(
        response,
        [
            'task'
        ]
    );
}

/* =========================================================
   Dashboard
========================================================= */

/**
 * Build Designer dashboard data
 * from assigned projects and tasks.
 */
export async function getDesignerDashboardData() {
    const [
        projects,
        tasks
    ] = await Promise.all([
        getMyProjects(),
        getMyTasks()
    ]);

    const normalizedTasks =
        Array.isArray(tasks)
            ? tasks
            : [];

    const normalizedProjects =
        Array.isArray(projects)
            ? projects
            : [];

    const completedTasks =
        normalizedTasks.filter(
            (task) =>
                task?.status ===
                    'completed' ||
                task?.status ===
                    'complete' ||
                task?.status ===
                    'done'
        ).length;

    const inProgressTasks =
        normalizedTasks.filter(
            (task) =>
                task?.status ===
                    'in-progress' ||
                task?.status ===
                    'in_progress' ||
                task?.status ===
                    'progress'
        ).length;

    const pendingTasks =
        normalizedTasks.filter(
            (task) =>
                ![
                    'completed',
                    'complete',
                    'done',
                    'in-progress',
                    'in_progress',
                    'progress'
                ].includes(
                    task?.status
                )
        ).length;

    const completedProjects =
        normalizedProjects.filter(
            (project) =>
                project?.status ===
                    'completed' ||
                project?.status ===
                    'complete' ||
                project?.status ===
                    'done'
        ).length;

    const assignedMainProjects =
        normalizedProjects.filter(
            (project) => {
                const designer =
                    project?.assignedDesigner;

                if (
                    designer &&
                    typeof designer ===
                        'object'
                ) {
                    return true;
                }

                return Boolean(
                    project?.assignedDesignerId
                );
            }
        ).length;

    const assignedPresentationProjects =
        normalizedProjects.filter(
            (project) => {
                const presenter =
                    project?.assignedPresenter;

                if (
                    presenter &&
                    typeof presenter ===
                        'object'
                ) {
                    return true;
                }

                return Boolean(
                    project?.assignedPresenterId
                );
            }
        ).length;

    return {
        projects:
            normalizedProjects,

        tasks:
            normalizedTasks,

        stats: {
            totalProjects:
                normalizedProjects.length,

            completedProjects,

            totalTasks:
                normalizedTasks.length,

            completedTasks,

            inProgressTasks,

            pendingTasks,

            assignedMainProjects,

            assignedPresentationProjects
        }
    };
}

/* =========================================================
   Auth / Session Helpers
========================================================= */

/**
 * Check whether Firebase currently has
 * an authenticated user.
 */
export function isDesignerAuthenticated() {
    return Boolean(
        auth.currentUser
    );
}

/**
 * Get current Firebase user.
 */
export function getDesignerFirebaseUser() {
    return auth.currentUser;
}

/* =========================================================
   Default Export
========================================================= */

const designerService = {
    getMyProjects,
    getMyProject,
    getMyProjectStatus,

    updateMyProject,

    getProjectCheckpoints,
    updateCheckpoint,
    completeCheckpoint,
    reopenCheckpoint,

    updateRender,
    updateRenderStatus,

    getPresentation,
    updatePresentation,
    updatePresentationFile,

    getMyTasks,
    getMyTask,
    updateMyTask,
    updateTaskStatus,
    completeTask,
    startTask,
    resetTask,
    updateTaskFile,

    getDesignerDashboardData,

    isDesignerAuthenticated,
    getDesignerFirebaseUser
};

export default designerService;