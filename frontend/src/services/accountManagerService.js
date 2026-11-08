import { auth, storage } from '../firebase';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/* =========================================================
   Authentication
========================================================= */

async function getAuthenticatedUser() {
    if (auth.currentUser) return auth.currentUser;

    return new Promise((resolve, reject) => {
        let unsubscribe = () => {};
        unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                if (user) resolve(user);
                else reject(new Error('يجب تسجيل الدخول أولاً.'));
            },
            (error) => {
                unsubscribe();
                reject(error);
            }
        );
    });
}

async function getAuthToken(forceRefresh = false) {
    const currentUser = await getAuthenticatedUser();
    return currentUser.getIdToken(forceRefresh);
}

/* =========================================================
   Backend Request
========================================================= */

async function accountManagerRequest(endpoint, options = {}) {
    const token = await getAuthToken();
    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (options.body !== undefined && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
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
   Upload Brief to Firebase Storage
   The backend receives only the URL and file metadata.
========================================================= */

function sanitizeFileName(fileName = 'brief-file') {
    return fileName
        .normalize('NFKC')
        .replace(/[^\w.\-() ]/g, '_')
        .replace(/\s+/g, '_')
        .slice(-160) || 'brief-file';
}

async function uploadBriefFile(file, onProgress = () => {}) {
    if (!(file instanceof File)) {
        throw new Error('اختار ملف Brief صالح من الجهاز.');
    }

    const currentUser = await getAuthenticatedUser();
    const safeName = sanitizeFileName(file.name);
    const storagePath =
        `briefs/${currentUser.uid}/${Date.now()}-${safeName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
            originalFileName: file.name,
            uploadedBy: currentUser.uid
        }
    });

    await new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const percent = snapshot.totalBytes
                    ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                    : 0;
                onProgress(percent);
            },
            reject,
            resolve
        );
    });

    const url = await getDownloadURL(uploadTask.snapshot.ref);
    onProgress(100);

    return {
        url,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storagePath
    };
}

async function deleteUploadedBriefFile(storagePath) {
    if (!storagePath) return;
    await getAuthenticatedUser();
    await deleteObject(ref(storage, storagePath));
}

/* =========================================================
   Get Active Coordinators
========================================================= */

async function getActiveCoordinators() {
    const response = await accountManagerRequest('/account-manager/coordinators');
    return Array.isArray(response?.coordinators)
        ? response.coordinators
        : Array.isArray(response?.data)
            ? response.data
            : [];
}

/* =========================================================
   Get My Projects
========================================================= */

async function getMyProjects() {
    const response = await accountManagerRequest('/account-manager/projects');
    return response?.projects || response?.data || response || [];
}

/* =========================================================
   Get One Project
========================================================= */

async function getMyProject(projectId) {
    if (!projectId) throw new Error('معرف المشروع غير موجود.');
    const response = await accountManagerRequest(`/account-manager/projects/${projectId}`);
    return response?.project || response?.data || response;
}

/* =========================================================
   Create Project
========================================================= */

async function createProject(projectData = {}) {
    const {
        projectName,
        assignedCoordinator,
        brief,
        briefName,
        briefFileUrl,
        briefFileName,
        briefFileMimeType,
        briefFileSize,
        briefStoragePath,
        managerNotes,
        description,
        startDate,
        deadline
    } = projectData;

    if (!projectName?.trim()) throw new Error('اسم المشروع مطلوب.');
    if (!assignedCoordinator) throw new Error('اختار الـ Coordinator المسؤول عن المشروع.');

    const payload = {
        projectName: projectName.trim(),
        assignedCoordinator,
        brief: brief || '',
        briefName: briefName || '',
        briefFileUrl: briefFileUrl || '',
        briefFileName: briefFileName || '',
        briefFileMimeType: briefFileMimeType || '',
        briefFileSize: Number(briefFileSize) || 0,
        briefStoragePath: briefStoragePath || '',
        managerNotes: managerNotes || '',
        description: description || '',
        startDate: startDate || null,
        deadline: deadline || null
    };

    const response = await accountManagerRequest('/account-manager/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    return response?.project || response?.data || response;
}

/* =========================================================
   Update My Project
========================================================= */

async function updateMyProject(projectId, projectData = {}) {
    if (!projectId) throw new Error('معرف المشروع غير موجود.');

    const response = await accountManagerRequest(
        `/account-manager/projects/${projectId}`,
        {
            method: 'PUT',
            body: JSON.stringify(projectData)
        }
    );

    return response?.project || response?.data || response;
}

/* =========================================================
   Delete My Project
========================================================= */

async function deleteMyProject(projectId) {
    if (!projectId) throw new Error('معرف المشروع غير موجود.');
    return accountManagerRequest(`/account-manager/projects/${projectId}`, {
        method: 'DELETE'
    });
}

/* =========================================================
   Get Project Status
========================================================= */

async function getMyProjectStatus(projectId) {
    const project = await getMyProject(projectId);
    return {
        status: project?.status || 'in-progress',
        isDoneAll: Boolean(project?.isDoneAll),
        isPresentationApproved: Boolean(project?.isPresentationApproved),
        renderStatus: project?.renderStatus || ''
    };
}

/* =========================================================
   Dashboard
========================================================= */

async function getAccountManagerDashboardData() {
    const projects = await getMyProjects();
    const safeProjects = Array.isArray(projects) ? projects : [];

    return {
        projects: safeProjects,
        statistics: {
            totalProjects: safeProjects.length,
            completedProjects: safeProjects.filter((p) => p?.status === 'completed').length,
            activeProjects: safeProjects.filter((p) => p?.status !== 'completed').length,
            projectsWithDeadline: safeProjects.filter((p) => Boolean(p?.deadline)).length
        }
    };
}

export {
    accountManagerRequest,
    uploadBriefFile,
    deleteUploadedBriefFile,
    getActiveCoordinators,
    getMyProjects,
    getMyProject,
    createProject,
    updateMyProject,
    deleteMyProject,
    getMyProjectStatus,
    getAccountManagerDashboardData
};

export default {
    getActiveCoordinators,
    getMyProjects,
    getMyProject,
    createProject,
    updateMyProject,
    deleteMyProject,
    getMyProjectStatus,
    getAccountManagerDashboardData,
    uploadBriefFile,
    deleteUploadedBriefFile
};
