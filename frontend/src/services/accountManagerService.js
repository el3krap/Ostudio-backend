import { auth } from '../firebase';

const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/* =========================================================
   Get Firebase ID Token
========================================================= */

async function getAuthToken() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('يجب تسجيل الدخول أولاً.');
    }

    return currentUser.getIdToken();
}

/* =========================================================
   Backend Request
========================================================= */

async function accountManagerRequest(endpoint, options = {}) {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,

        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
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
            `فشل الطلب (${response.status})`
        );
    }

    return data;
}

/* =========================================================
   Get My Projects
========================================================= */

/*
 * مهم:
 * لا نرسل userId من Frontend لكي نحدد صاحب المشاريع.
 *
 * الـ Backend يعرف المستخدم من Firebase Token
 * ويستخدم req.user.mongoId.
 */

async function getMyProjects() {
    const response = await accountManagerRequest(
        '/account-manager/projects'
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

async function getMyProject(projectId) {
    if (!projectId) {
        throw new Error('معرف المشروع غير موجود.');
    }

    const response = await accountManagerRequest(
        `/account-manager/projects/${projectId}`
    );

    return (
        response?.project ||
        response?.data ||
        response
    );
}

/* =========================================================
   Create Project
========================================================= */

async function createProject(projectData = {}) {
    const {
        projectName,
        brief,
        briefName,
        managerNotes,
        description,
        startDate,
        deadline,
        checkpoints,
        renderFileLink,
        renderFileName,
        renderStatus,
        presentationFileLink,
        presentationFileName,
        presenterNote,
        coordinatorNotes,
        status
    } = projectData;

    if (!projectName?.trim()) {
        throw new Error('اسم المشروع مطلوب.');
    }

    const payload = {
        projectName: projectName.trim(),

        brief: brief || '',
        briefName: briefName || '',

        managerNotes: managerNotes || '',
        description: description || '',

        startDate: startDate || null,
        deadline: deadline || null,

        checkpoints: Array.isArray(checkpoints)
            ? checkpoints
            : [],

        renderFileLink: renderFileLink || '',
        renderFileName: renderFileName || '',
        renderStatus: renderStatus || '',

        presentationFileLink:
            presentationFileLink || '',

        presentationFileName:
            presentationFileName || '',

        presenterNote: presenterNote || '',

        coordinatorNotes:
            coordinatorNotes || '',

        status: status || 'in-progress'
    };

    const response = await accountManagerRequest(
        '/account-manager/projects',
        {
            method: 'POST',
            body: JSON.stringify(payload)
        }
    );

    return (
        response?.project ||
        response?.data ||
        response
    );
}

/* =========================================================
   Update My Project
========================================================= */

async function updateMyProject(
    projectId,
    projectData = {}
) {
    if (!projectId) {
        throw new Error('معرف المشروع غير موجود.');
    }

    const response = await accountManagerRequest(
        `/account-manager/projects/${projectId}`,
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
   Delete My Project
========================================================= */

/*
 * لا نستخدم الحذف إلا إذا كان Backend يسمح به.
 *
 * حالياً لا نفترض وجود Delete Route.
 */

async function deleteMyProject(projectId) {
    if (!projectId) {
        throw new Error('معرف المشروع غير موجود.');
    }

    const response = await accountManagerRequest(
        `/account-manager/projects/${projectId}`,
        {
            method: 'DELETE'
        }
    );

    return response;
}

/* =========================================================
   Get Project Status
========================================================= */

async function getMyProjectStatus(projectId) {
    const project = await getMyProject(projectId);

    return {
        status: project?.status || 'in-progress',

        isDoneAll:
            Boolean(project?.isDoneAll),

        isPresentationApproved:
            Boolean(
                project?.isPresentationApproved
            ),

        renderStatus:
            project?.renderStatus || ''
    };
}

/* =========================================================
   Get My Dashboard Data
========================================================= */

async function getAccountManagerDashboardData() {
    const projects = await getMyProjects();

    const safeProjects = Array.isArray(projects)
        ? projects
        : [];

    const totalProjects = safeProjects.length;

    const completedProjects =
        safeProjects.filter(
            (project) =>
                project?.status === 'completed'
        ).length;

    const activeProjects =
        safeProjects.filter(
            (project) =>
                project?.status !== 'completed'
        ).length;

    const projectsWithDeadline =
        safeProjects.filter(
            (project) =>
                project?.deadline
        ).length;

    return {
        projects: safeProjects,

        statistics: {
            totalProjects,
            activeProjects,
            completedProjects,
            projectsWithDeadline
        }
    };
}

/* =========================================================
   Export
========================================================= */

export {
    accountManagerRequest,

    getMyProjects,
    getMyProject,

    createProject,
    updateMyProject,
    deleteMyProject,

    getMyProjectStatus,

    getAccountManagerDashboardData
};

export default {
    getMyProjects,
    getMyProject,
    createProject,
    updateMyProject,
    deleteMyProject,
    getMyProjectStatus,
    getAccountManagerDashboardData
};