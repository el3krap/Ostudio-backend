import { auth } from '../firebase';

/* =========================================================
   API Configuration
========================================================= */

const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:8080/api';


/* =========================================================
   Authentication Token
========================================================= */

async function getAuthToken() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('يجب تسجيل الدخول أولاً.');
    }

    return currentUser.getIdToken();
}


/* =========================================================
   Admin API Request
========================================================= */

async function adminRequest(endpoint, options = {}) {
    const token = await getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
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
            `فشل الطلب (${response.status})`
        );
    }

    return data;
}


/* =========================================================
   Get All Users
========================================================= */

async function getAllUsers() {
    const response = await adminRequest(
        '/admin/users'
    );

    return (
        response?.users ||
        response?.data ||
        response ||
        []
    );
}


/* =========================================================
   Get Users By Role
========================================================= */

async function getUsersByRole(role) {
    if (!role) {
        throw new Error('نوع الحساب غير محدد.');
    }

    const response = await adminRequest(
        `/admin/users?role=${encodeURIComponent(role)}`
    );

    return (
        response?.users ||
        response?.data ||
        response ||
        []
    );
}


/* =========================================================
   Get Pending Account Requests
========================================================= */

async function getPendingUsers() {
    const response = await adminRequest(
        '/admin/users/pending'
    );

    return (
        response?.users ||
        response?.pendingUsers ||
        response?.data ||
        response ||
        []
    );
}


/* =========================================================
   Get One User
========================================================= */

async function getUser(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}`
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Approve User
========================================================= */

async function approveUser(userId, role = null) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const payload = {};

    if (role) {
        payload.role = role;
    }

    const response = await adminRequest(
        `/admin/users/${userId}/approve`,
        {
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Reject User
========================================================= */

async function rejectUser(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}/reject`,
        {
            method: 'PUT'
        }
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Update User
========================================================= */

async function updateUser(userId, userData = {}) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}`,
        {
            method: 'PUT',
            body: JSON.stringify(userData)
        }
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Change User Role
========================================================= */

async function changeUserRole(userId, role) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    if (!role) {
        throw new Error('نوع الحساب غير محدد.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}/role`,
        {
            method: 'PUT',
            body: JSON.stringify({
                role
            })
        }
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Activate User
========================================================= */

async function activateUser(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}/activate`,
        {
            method: 'PUT'
        }
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Deactivate User
========================================================= */

async function deactivateUser(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}/deactivate`,
        {
            method: 'PUT'
        }
    );

    return (
        response?.user ||
        response?.data ||
        response
    );
}


/* =========================================================
   Delete User
========================================================= */

async function deleteUser(userId) {
    if (!userId) {
        throw new Error('معرف المستخدم غير موجود.');
    }

    const response = await adminRequest(
        `/admin/users/${userId}`,
        {
            method: 'DELETE'
        }
    );

    return response;
}


/* =========================================================
   Get All Projects
========================================================= */

async function getAllProjects() {
    const response = await adminRequest(
        '/admin/projects'
    );

    return (
        response?.projects ||
        response?.data ||
        response ||
        []
    );
}


/* =========================================================
   Get One Project
========================================================= */

async function getProject(projectId) {
    if (!projectId) {
        throw new Error('معرف المشروع غير موجود.');
    }

    const response = await adminRequest(
        `/admin/projects/${projectId}`
    );

    return (
        response?.project ||
        response?.data ||
        response
    );
}


/* =========================================================
   Update Project
========================================================= */

async function updateProject(projectId, projectData = {}) {
    if (!projectId) {
        throw new Error('معرف المشروع غير موجود.');
    }

    const response = await adminRequest(
        `/admin/projects/${projectId}`,
        {
            method: 'PUT',
            body: JSON.stringify(projectData)
        }
    );

    return (
        response?.project ||
        response?.data ||
        response
    );
}


/* =========================================================
   Delete Project
========================================================= */

async function deleteProject(projectId) {
    if (!projectId) {
        throw new Error('معرف المشروع غير موجود.');
    }

    const response = await adminRequest(
        `/admin/projects/${projectId}`,
        {
            method: 'DELETE'
        }
    );

    return response;
}


/* =========================================================
   Get All Tasks
========================================================= */

async function getAllTasks() {
    const response = await adminRequest(
        '/admin/tasks'
    );

    return (
        response?.tasks ||
        response?.data ||
        response ||
        []
    );
}


/* =========================================================
   Get One Task
========================================================= */

async function getTask(taskId) {
    if (!taskId) {
        throw new Error('معرف المهمة غير موجود.');
    }

    const response = await adminRequest(
        `/admin/tasks/${taskId}`
    );

    return (
        response?.task ||
        response?.data ||
        response
    );
}


/* =========================================================
   Update Task
========================================================= */

async function updateTask(taskId, taskData = {}) {
    if (!taskId) {
        throw new Error('معرف المهمة غير موجود.');
    }

    const response = await adminRequest(
        `/admin/tasks/${taskId}`,
        {
            method: 'PUT',
            body: JSON.stringify(taskData)
        }
    );

    return (
        response?.task ||
        response?.data ||
        response
    );
}


/* =========================================================
   Delete Task
========================================================= */

async function deleteTask(taskId) {
    if (!taskId) {
        throw new Error('معرف المهمة غير موجود.');
    }

    const response = await adminRequest(
        `/admin/tasks/${taskId}`,
        {
            method: 'DELETE'
        }
    );

    return response;
}


/* =========================================================
   Admin Dashboard Statistics
========================================================= */

async function getAdminDashboardData() {
    const response = await adminRequest(
        '/admin/dashboard'
    );

    return (
        response?.data ||
        response ||
        {}
    );
}


/* =========================================================
   Backward-Compatible Aliases
   Used by existing Admin pages
========================================================= */

// AdminDashboard.jsx
const getDashboardStats = getAdminDashboardData;
const getUsers = getAllUsers;
const getProjects = getAllProjects;
const getTasks = getAllTasks;

// AdminUsers.jsx
const updateUserRole = changeUserRole;


/* =========================================================
   Export
========================================================= */

export {
    adminRequest,

    // Users
    getAllUsers,
    getUsers,
    getUsersByRole,
    getPendingUsers,
    getUser,

    // User actions
    approveUser,
    rejectUser,
    updateUser,
    changeUserRole,
    updateUserRole,
    activateUser,
    deactivateUser,
    deleteUser,

    // Projects
    getAllProjects,
    getProjects,
    getProject,
    updateProject,
    deleteProject,

    // Tasks
    getAllTasks,
    getTasks,
    getTask,
    updateTask,
    deleteTask,

    // Dashboard
    getAdminDashboardData,
    getDashboardStats
};


/* =========================================================
   Default Export
========================================================= */

export default {
    // Users
    getAllUsers,
    getUsers,
    getUsersByRole,
    getPendingUsers,
    getUser,

    // User actions
    approveUser,
    rejectUser,
    updateUser,
    changeUserRole,
    updateUserRole,
    activateUser,
    deactivateUser,
    deleteUser,

    // Projects
    getAllProjects,
    getProjects,
    getProject,
    updateProject,
    deleteProject,

    // Tasks
    getAllTasks,
    getTasks,
    getTask,
    updateTask,
    deleteTask,

    // Dashboard
    getAdminDashboardData,
    getDashboardStats
};