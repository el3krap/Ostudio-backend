

import { auth, db } from '../firebase';

import { onAuthStateChanged } from 'firebase/auth';

import {

    collection,

    doc,

    getDoc,

    getDocs,

    query,

    where,

    updateDoc,

    deleteDoc,

    serverTimestamp

} from 'firebase/firestore';



// ======================================================

// Configuration

// ======================================================



const VALID_ROLES = [

    'admin',

    'manager',

    'account_manager',

    'coordinator',

    'designer'

];



const PUBLIC_ROLES = [

    'manager',

    'account_manager',

    'coordinator',

    'designer'

];



const ACTIVE_STATUSES = ['active', 'approved'];



// ======================================================

// Firebase Authentication Readiness

// ======================================================



let authReadyPromise = null;



function waitForFirebaseAuthReady() {

    if (auth.currentUser) {

        return Promise.resolve(auth.currentUser);

    }



    if (!authReadyPromise) {

        authReadyPromise = new Promise((resolve, reject) => {

            let unsubscribe = () => {};



            unsubscribe = onAuthStateChanged(

                auth,

                (user) => {

                    unsubscribe();

                    resolve(user || null);

                },

                (error) => {

                    unsubscribe();

                    reject(error);

                }

            );

        }).finally(() => {

            authReadyPromise = null;

        });

    }



    return authReadyPromise;

}



async function requireSignedInUser() {

    const user = auth.currentUser || await waitForFirebaseAuthReady();



    if (!user) {

        throw new Error(

            'يجب تسجيل الدخول أولاً. سجّل الدخول ثم أعد المحاولة.'

        );

    }



    return user;

}



// ======================================================

// Admin Authorization

// ======================================================



async function requireAdmin() {

    const firebaseUser = await requireSignedInUser();



    const snapshot = await getDoc(

        doc(db, 'users', firebaseUser.uid)

    );



    if (!snapshot.exists()) {

        throw new Error('ملف المستخدم غير موجود في Firestore.');

    }



    const user = snapshot.data();



    if (

        user.role !== 'admin' ||

        !ACTIVE_STATUSES.includes(user.status)

    ) {

        throw new Error('هذه العملية متاحة للأدمن فقط.');

    }



    return {

        ...user,

        uid: firebaseUser.uid,

        id: firebaseUser.uid,

        _id: firebaseUser.uid

    };

}



// ======================================================

// General Helpers

// ======================================================



function normalizeDocument(snapshot) {

    return {

        id: snapshot.id,

        _id: snapshot.id,

        ...snapshot.data()

    };

}



function validateId(id, label = 'المستند') {

    if (!id || typeof id !== 'string') {

        throw new Error(`معرّف ${label} غير صالح.`);

    }



    return id;

}



function validateRole(role) {

    if (!VALID_ROLES.includes(role)) {

        throw new Error('نوع الحساب غير صالح.');

    }



    return role;

}



function validatePublicRole(role) {

    if (!PUBLIC_ROLES.includes(role)) {

        throw new Error('لا يمكن طلب هذا الدور من التسجيل العام.');

    }



    return role;

}



function validatePatch(data, forbiddenFields = []) {

    if (!data || typeof data !== 'object' || Array.isArray(data)) {

        throw new Error('البيانات المرسلة غير صالحة.');

    }



    for (const field of forbiddenFields) {

        if (Object.prototype.hasOwnProperty.call(data, field)) {

            throw new Error(

                `لا يمكن تعديل الحقل ${field} بهذه الطريقة.`

            );

        }

    }



    return data;

}



// ======================================================

// Generic Firestore Operations

// ======================================================



async function getCollectionDocuments(collectionName) {

    await requireAdmin();



    const snapshot = await getDocs(

        collection(db, collectionName)

    );



    return snapshot.docs.map(normalizeDocument);

}



async function getOneDocument(collectionName, id, label) {

    await requireAdmin();



    const validId = validateId(id, label);



    const snapshot = await getDoc(

        doc(db, collectionName, validId)

    );



    if (!snapshot.exists()) {

        throw new Error(`${label} غير موجود.`);

    }



    return normalizeDocument(snapshot);

}



async function updateOneDocument(

    collectionName,

    id,

    data,

    label,

    forbiddenFields = []

) {

    await requireAdmin();



    const validId = validateId(id, label);

    const patch = validatePatch(data, forbiddenFields);



    const reference = doc(db, collectionName, validId);

    const snapshot = await getDoc(reference);



    if (!snapshot.exists()) {

        throw new Error(`${label} غير موجود.`);

    }



    await updateDoc(reference, {

        ...patch,

        updatedAt: serverTimestamp()

    });



    const updated = await getDoc(reference);



    return normalizeDocument(updated);

}



async function deleteOneDocument(collectionName, id, label) {

    await requireAdmin();



    const validId = validateId(id, label);

    const reference = doc(db, collectionName, validId);

    const snapshot = await getDoc(reference);



    if (!snapshot.exists()) {

        throw new Error(`${label} غير موجود.`);

    }



    await deleteDoc(reference);



    return {

        success: true,

        id: validId

    };

}



// ======================================================

// Users

// Collection: users

// ======================================================



async function getAllUsers() {

    return getCollectionDocuments('users');

}



async function getUsers() {

    return getAllUsers();

}



async function getUsersByRole(role) {

    await requireAdmin();



    const validRole = validateRole(role);



    const snapshot = await getDocs(

        query(

            collection(db, 'users'),

            where('role', '==', validRole)

        )

    );



    return snapshot.docs.map(normalizeDocument);

}



async function getPendingUsers() {

    await requireAdmin();



    const snapshot = await getDocs(

        query(

            collection(db, 'signupRequests'),

            where('status', '==', 'pending')

        )

    );



    return snapshot.docs.map(normalizeDocument);

}



async function getUser(userId) {

    return getOneDocument('users', userId, 'المستخدم');

}



// ======================================================

// Signup Requests

// ======================================================



async function approveUser(userId, role = null) {
    // Approval is performed by the trusted Express backend.
    await requireAdmin();
    const validId = validateId(userId, 'المستخدم');
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
        throw new Error('يجب تسجيل الدخول أولاً. سجّل الدخول ثم أعد المحاولة.');
    }

    const token = await firebaseUser.getIdToken();
    const apiBaseUrl = String(
        import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
    ).replace(/\/+$/, '');

    const response = await fetch(
        `${apiBaseUrl}/admin/users/${encodeURIComponent(validId)}/approve`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: role || undefined })
        }
    );

    let result = null;
    try {
        result = await response.json();
    } catch {
        // Keep a useful HTTP error if the server did not return JSON.
    }

    if (!response.ok || result?.success === false) {
        throw new Error(
            result?.message ||
            result?.error ||
            `فشلت الموافقة على الحساب (HTTP ${response.status}).`
        );
    }

    return result?.user || result?.data || result;
}

async function rejectUser(userId) {

    const admin = await requireAdmin();



    const validId = validateId(userId, 'المستخدم');

    const requestRef = doc(db, 'signupRequests', validId);

    const snapshot = await getDoc(requestRef);



    if (!snapshot.exists()) {

        throw new Error('طلب التسجيل غير موجود.');

    }



    if (snapshot.data().status !== 'pending') {

        throw new Error('طلب التسجيل ليس في حالة انتظار.');

    }



    await updateDoc(requestRef, {

        status: 'rejected',

        reviewedAt: serverTimestamp(),

        reviewedBy: admin.uid

    });



    return {

        success: true,

        id: validId,

        status: 'rejected'

    };

}



// ======================================================

// User Profile Management

// ======================================================



async function updateUser(userId, userData = {}) {

    return updateOneDocument(

        'users',

        userId,

        userData,

        'المستخدم',

        ['uid', 'firebaseUid', 'role', 'status', 'password']

    );

}



async function changeUserRole(userId, role) {

    const admin = await requireAdmin();



    const validId = validateId(userId, 'المستخدم');

    const validRole = validateRole(role);



    if (validId === admin.uid && validRole !== 'admin') {

        throw new Error(

            'لا يمكن تغيير دور حساب الأدمن الحالي بهذه الطريقة.'

        );

    }



    const reference = doc(db, 'users', validId);

    const snapshot = await getDoc(reference);



    if (!snapshot.exists()) {

        throw new Error('المستخدم غير موجود.');

    }



    await updateDoc(reference, {

        role: validRole,

        updatedAt: serverTimestamp()

    });



    return getUser(validId);

}



async function updateUserRole(userId, role) {

    return changeUserRole(userId, role);

}



async function activateUser(userId) {

    return updateOneDocument(

        'users',

        userId,

        { status: 'active' },

        'المستخدم'

    );

}



async function deactivateUser(userId) {

    const admin = await requireAdmin();

    const validId = validateId(userId, 'المستخدم');



    if (admin.uid === validId) {

        throw new Error('لا يمكن تعطيل حساب الأدمن الحالي.');

    }



    return updateOneDocument(

        'users',

        validId,

        { status: 'inactive' },

        'المستخدم'

    );

}



async function deleteUser(userId) {

    const admin = await requireAdmin();

    const validId = validateId(userId, 'المستخدم');



    if (admin.uid === validId) {

        throw new Error('لا يمكن حذف حساب الأدمن الحالي.');

    }



    throw new Error(

        'حذف المستخدم يحتاج Cloud Function لحذف حساب Firebase Authentication وملف Firestore معًا.'

    );

}



// ======================================================

// Projects

// Collection: projects

// ======================================================



async function getAllProjects() {

    return getCollectionDocuments('projects');

}



async function getProjects() {

    return getAllProjects();

}



async function getProject(projectId) {

    return getOneDocument('projects', projectId, 'المشروع');

}



async function updateProject(projectId, projectData = {}) {

    return updateOneDocument(

        'projects',

        projectId,

        projectData,

        'المشروع',

        ['createdBy', 'assignedDesigner', 'assignedPresenter']

    );

}



async function deleteProject(projectId) {

    return deleteOneDocument('projects', projectId, 'المشروع');

}



// ======================================================

// Tasks

// Collection: tasks

// ======================================================



async function getAllTasks() {

    return getCollectionDocuments('tasks');

}



async function getTasks() {

    return getAllTasks();

}



async function getTask(taskId) {

    return getOneDocument('tasks', taskId, 'المهمة');

}



async function updateTask(taskId, taskData = {}) {

    return updateOneDocument(

        'tasks',

        taskId,

        taskData,

        'المهمة',

        ['createdBy']

    );

}



async function deleteTask(taskId) {

    return deleteOneDocument('tasks', taskId, 'المهمة');

}



// ======================================================

// Dashboard Statistics

// ======================================================



async function getAdminDashboardData() {

    await requireAdmin();



    const [users, projects, tasks] = await Promise.all([

        getAllUsers(),

        getAllProjects(),

        getAllTasks()

    ]);



    const completedProjects = projects.filter(

        (project) => project.status === 'completed'

    ).length;



    const completedTasks = tasks.filter(

        (task) => task.status === 'completed'

    ).length;



    return {

        totalUsers: users.length,

        totalProjects: projects.length,

        totalTasks: tasks.length,

        completedProjects,

        completedTasks,

        pendingUsers: users.filter(

            (user) => user.status === 'pending'

        ).length,

        activeUsers: users.filter(

            (user) => ACTIVE_STATUSES.includes(user.status)

        ).length,

        designers: users.filter(

            (user) => user.role === 'designer'

        ).length,

        coordinators: users.filter(

            (user) => user.role === 'coordinator'

        ).length

    };

}



const getDashboardStats = getAdminDashboardData;



// ======================================================

// Exports

// ======================================================



export {

    requireAdmin,



    getAllUsers,

    getUsers,

    getUsersByRole,

    getPendingUsers,

    getUser,



    approveUser,

    rejectUser,

    updateUser,

    changeUserRole,

    updateUserRole,

    activateUser,

    deactivateUser,

    deleteUser,



    getAllProjects,

    getProjects,

    getProject,

    updateProject,

    deleteProject,



    getAllTasks,

    getTasks,

    getTask,

    updateTask,

    deleteTask,



    getAdminDashboardData,

    getDashboardStats

};



export default {

    getAllUsers,

    getUsers,

    getUsersByRole,

    getPendingUsers,

    getUser,



    approveUser,

    rejectUser,

    updateUser,

    changeUserRole,

    updateUserRole,

    activateUser,

    deactivateUser,

    deleteUser,



    getAllProjects,

    getProjects,

    getProject,

    updateProject,

    deleteProject,



    getAllTasks,

    getTasks,

    getTask,

    updateTask,

    deleteTask,



    getAdminDashboardData,

    getDashboardStats

};
