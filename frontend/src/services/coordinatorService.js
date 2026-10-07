// frontend/src/services/coordinatorService.js

import { auth } from '../firebase';

/* =========================================================
   Configuration
========================================================= */

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080/api';

/* =========================================================
   Authentication Token
========================================================= */

async function getAuthToken(
    forceRefresh = false
) {
    const currentUser =
        auth.currentUser;

    if (!currentUser) {
        throw new Error(
            'لا يوجد مستخدم مسجل الدخول.'
        );
    }

    return currentUser.getIdToken(
        forceRefresh
    );
}

/* =========================================================
   Coordinator Request
========================================================= */

async function coordinatorRequest(
    endpoint,
    options = {}
) {
    const token =
        await getAuthToken();

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,

                headers: {
                    'Content-Type':
                        'application/json',

                    Authorization:
                        `Bearer ${token}`,

                    ...(options.headers || {})
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
            `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return data;
}

/* =========================================================
   Normalize Response
========================================================= */

function extractData(
    response
) {
    return (
        response?.data ??
        response
    );
}

function extractList(
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

        if (
            Array.isArray(
                response?.data?.[key]
            )
        ) {
            return response.data[key];
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

/* =========================================================
   Current Coordinator
========================================================= */

async function getCurrentCoordinator() {
    return coordinatorRequest(
        '/coordinator/me'
    );
}

/* =========================================================
   Dashboard
========================================================= */

async function getCoordinatorDashboard() {
    const response =
        await coordinatorRequest(
            '/coordinator/dashboard'
        );

    return extractData(
        response
    );
}

/* =========================================================
   Projects
========================================================= */

/*
 * Coordinator can see all projects.
 */

async function getProjects(
    params = {}
) {
    const query =
        new URLSearchParams();

    Object.entries(params)
        .forEach(
            ([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    query.set(
                        key,
                        value
                    );
                }
            }
        );

    const queryString =
        query.toString();

    const endpoint =
        queryString
            ? `/coordinator/projects?${queryString}`
            : '/coordinator/projects';

    const response =
        await coordinatorRequest(
            endpoint
        );

    return extractList(
        response,
        [
            'projects',
            'items',
            'results'
        ]
    );
}

/*
 * Alias for dashboard/project pages.
 */

async function getAllProjects(
    params = {}
) {
    return getProjects(
        params
    );
}

/*
 * Get one project.
 */

async function getProject(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}`
        );

    return extractData(
        response
    );
}

/*
 * Alias used by CoordinatorProjectDetails.
 */

async function getProjectDetails(
    projectId
) {
    return getProject(
        projectId
    );
}

/* =========================================================
   Update Project
========================================================= */

/*
 * Coordinator can update project
 * coordination/details fields.
 *
 * The backend is responsible for
 * enforcing the actual permissions.
 */

async function updateProject(
    projectId,
    projectData = {}
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}`,
            {
                method: 'PUT',

                body:
                    JSON.stringify(
                        projectData
                    )
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Update Coordinator Notes
========================================================= */

async function updateCoordinatorNotes(
    projectId,
    coordinatorNotes
) {
    return updateProject(
        projectId,
        {
            coordinatorNotes
        }
    );
}

/* =========================================================
   Project Status
========================================================= */

async function updateProjectStatus(
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

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/status`,
            {
                method: 'PUT',

                body:
                    JSON.stringify({
                        status
                    })
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Complete Project
========================================================= */

async function completeProject(
    projectId
) {
    return updateProjectStatus(
        projectId,
        'completed'
    );
}

/* =========================================================
   Reopen Project
========================================================= */

async function reopenProject(
    projectId
) {
    return updateProjectStatus(
        projectId,
        'in-progress'
    );
}

/* =========================================================
   Designers
========================================================= */

/*
 * Get active designers that the
 * Coordinator can assign.
 */

async function getDesigners() {
    const response =
        await coordinatorRequest(
            '/coordinator/designers'
        );

    return extractList(
        response,
        [
            'designers',
            'users',
            'items',
            'results'
        ]
    );
}

/*
 * Alias.
 */

async function getAvailableDesigners() {
    return getDesigners();
}

/* =========================================================
   Assign Main Project Designer
========================================================= */

async function assignDesigner(
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

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/assign-designer`,
            {
                method: 'PUT',

                body:
                    JSON.stringify({
                        designerId
                    })
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Remove Main Project Designer
========================================================= */

async function removeDesigner(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/remove-designer`,
            {
                method: 'PUT'
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Presentation Designers
========================================================= */

/*
 * Get users who can be assigned
 * to presentation work.
 *
 * This is intentionally separate
 * from the main project designer.
 */

async function getPresentationDesigners() {
    const response =
        await coordinatorRequest(
            '/coordinator/presentation-designers'
        );

    return extractList(
        response,
        [
            'designers',
            'users',
            'items',
            'results'
        ]
    );
}

/*
 * Assign Presentation Designer.
 *
 * IMPORTANT:
 * This designer does NOT have
 * to be the main project designer.
 */

async function assignPresentationDesigner(
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
            'معرف مصمم العرض التقديمي مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/assign-presenter`,
            {
                method: 'PUT',

                body:
                    JSON.stringify({
                        designerId
                    })
            }
        );

    return extractData(
        response
    );
}

/*
 * Remove Presentation Designer.
 */

async function removePresentationDesigner(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/remove-presenter`,
            {
                method: 'PUT'
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Presentation
========================================================= */

/*
 * Update presentation information.
 */

async function updatePresentation(
    projectId,
    presentationData = {}
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/presentation`,
            {
                method: 'PUT',

                body:
                    JSON.stringify(
                        presentationData
                    )
            }
        );

    return extractData(
        response
    );
}

/*
 * Update presentation note.
 */

async function updatePresenterNote(
    projectId,
    presenterNote
) {
    return updatePresentation(
        projectId,
        {
            presenterNote
        }
    );
}

/*
 * Approve presentation.
 */

async function approvePresentation(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/approve-presentation`,
            {
                method: 'PUT'
            }
        );

    return extractData(
        response
    );
}

/*
 * Reject / reopen presentation.
 */

async function rejectPresentation(
    projectId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/reject-presentation`,
            {
                method: 'PUT'
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Render
========================================================= */

async function updateRender(
    projectId,
    renderData = {}
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/render`,
            {
                method: 'PUT',

                body:
                    JSON.stringify(
                        renderData
                    )
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Checkpoints
========================================================= */

/*
 * Update a checkpoint.
 */

async function updateCheckpoint(
    projectId,
    checkpointId,
    checkpointData = {}
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    if (!checkpointId) {
        throw new Error(
            'معرف الـ Checkpoint مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/checkpoints/${checkpointId}`,
            {
                method: 'PUT',

                body:
                    JSON.stringify(
                        checkpointData
                    )
            }
        );

    return extractData(
        response
    );
}

/*
 * Mark checkpoint completed.
 */

async function completeCheckpoint(
    projectId,
    checkpointId,
    isCompleted = true
) {
    return updateCheckpoint(
        projectId,
        checkpointId,
        {
            isCompleted
        }
    );
}

/*
 * Add checkpoint.
 */

async function addCheckpoint(
    projectId,
    checkpointData = {}
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/checkpoints`,
            {
                method: 'POST',

                body:
                    JSON.stringify(
                        checkpointData
                    )
            }
        );

    return extractData(
        response
    );
}

/*
 * Delete checkpoint.
 */

async function deleteCheckpoint(
    projectId,
    checkpointId
) {
    if (!projectId) {
        throw new Error(
            'معرف المشروع مطلوب.'
        );
    }

    if (!checkpointId) {
        throw new Error(
            'معرف الـ Checkpoint مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/projects/${projectId}/checkpoints/${checkpointId}`,
            {
                method: 'DELETE'
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Tasks
========================================================= */

/*
 * Get all tasks visible to Coordinator.
 */

async function getTasks(
    params = {}
) {
    const query =
        new URLSearchParams();

    Object.entries(params)
        .forEach(
            ([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    query.set(
                        key,
                        value
                    );
                }
            }
        );

    const queryString =
        query.toString();

    const endpoint =
        queryString
            ? `/coordinator/tasks?${queryString}`
            : '/coordinator/tasks';

    const response =
        await coordinatorRequest(
            endpoint
        );

    return extractList(
        response,
        [
            'tasks',
            'items',
            'results'
        ]
    );
}

/*
 * Get one task.
 */

async function getTask(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/tasks/${taskId}`
        );

    return extractData(
        response
    );
}

/*
 * Create task.
 */

async function createTask(
    taskData = {}
) {
    const response =
        await coordinatorRequest(
            '/coordinator/tasks',
            {
                method: 'POST',

                body:
                    JSON.stringify(
                        taskData
                    )
            }
        );

    return extractData(
        response
    );
}

/*
 * Update task.
 */

async function updateTask(
    taskId,
    taskData = {}
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/tasks/${taskId}`,
            {
                method: 'PUT',

                body:
                    JSON.stringify(
                        taskData
                    )
            }
        );

    return extractData(
        response
    );
}

/*
 * Delete task.
 */

async function deleteTask(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/tasks/${taskId}`,
            {
                method: 'DELETE'
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Assign Task
========================================================= */

async function assignTask(
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

    const response =
        await coordinatorRequest(
            `/coordinator/tasks/${taskId}/assign`,
            {
                method: 'PUT',

                body:
                    JSON.stringify({
                        designerId
                    })
            }
        );

    return extractData(
        response
    );
}

/*
 * Remove task assignment.
 */

async function removeTaskAssignment(
    taskId
) {
    if (!taskId) {
        throw new Error(
            'معرف المهمة مطلوب.'
        );
    }

    const response =
        await coordinatorRequest(
            `/coordinator/tasks/${taskId}/remove-assignment`,
            {
                method: 'PUT'
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Task Status
========================================================= */

async function updateTaskStatus(
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

    const response =
        await coordinatorRequest(
            `/coordinator/tasks/${taskId}/status`,
            {
                method: 'PUT',

                body:
                    JSON.stringify({
                        status
                    })
            }
        );

    return extractData(
        response
    );
}

/* =========================================================
   Project Search
========================================================= */

async function searchProjects(
    search
) {
    return getProjects({
        search
    });
}

/* =========================================================
   Project Filters
========================================================= */

async function getProjectsByStatus(
    status
) {
    return getProjects({
        status
    });
}

async function getProjectsByDesigner(
    designerId
) {
    return getProjects({
        designerId
    });
}

async function getProjectsByPresenter(
    presenterId
) {
    return getProjects({
        presenterId
    });
}

/* =========================================================
   Coordinator Summary
========================================================= */

async function getCoordinatorSummary() {
    const projects =
        await getProjects();

    const total =
        projects.length;

    const completed =
        projects.filter(
            (project) =>
                project.status ===
                'completed'
        ).length;

    const inProgress =
        projects.filter(
            (project) =>
                project.status ===
                    'in-progress' ||
                project.status ===
                    'in_progress' ||
                !project.status
        ).length;

    const assigned =
        projects.filter(
            (project) =>
                project.assignedDesigner ||
                project.assignedDesignerId
        ).length;

    const presentationAssigned =
        projects.filter(
            (project) =>
                project.assignedPresenter ||
                project.assignedPresenterId
        ).length;

    return {
        total,
        completed,
        inProgress,
        assigned,
        presentationAssigned
    };
}

/* =========================================================
   Generic Success Message
========================================================= */

function getResponseMessage(
    response,
    fallback = 'تم تنفيذ العملية بنجاح.'
) {
    return (
        response?.message ||
        response?.data?.message ||
        fallback
    );
}

/* =========================================================
   Export
========================================================= */

export {
    getAuthToken,
    coordinatorRequest,

    getCurrentCoordinator,

    getCoordinatorDashboard,
    getCoordinatorSummary,

    getProjects,
    getAllProjects,
    getProject,
    getProjectDetails,
    searchProjects,
    getProjectsByStatus,
    getProjectsByDesigner,
    getProjectsByPresenter,

    updateProject,
    updateCoordinatorNotes,
    updateProjectStatus,
    completeProject,
    reopenProject,

    getDesigners,
    getAvailableDesigners,

    assignDesigner,
    removeDesigner,

    getPresentationDesigners,
    assignPresentationDesigner,
    removePresentationDesigner,

    updatePresentation,
    updatePresenterNote,
    approvePresentation,
    rejectPresentation,

    updateRender,

    addCheckpoint,
    updateCheckpoint,
    completeCheckpoint,
    deleteCheckpoint,

    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,

    assignTask,
    removeTaskAssignment,
    updateTaskStatus,

    getResponseMessage
};

export default {
    getCurrentCoordinator,

    getCoordinatorDashboard,
    getCoordinatorSummary,

    getProjects,
    getAllProjects,
    getProject,
    getProjectDetails,

    updateProject,
    updateCoordinatorNotes,
    updateProjectStatus,
    completeProject,
    reopenProject,

    getDesigners,
    getAvailableDesigners,

    assignDesigner,
    removeDesigner,

    getPresentationDesigners,
    assignPresentationDesigner,
    removePresentationDesigner,

    updatePresentation,
    updatePresenterNote,
    approvePresentation,
    rejectPresentation,

    updateRender,

    addCheckpoint,
    updateCheckpoint,
    completeCheckpoint,
    deleteCheckpoint,

    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,

    assignTask,
    removeTaskAssignment,
    updateTaskStatus
};