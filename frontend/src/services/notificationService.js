
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
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';

// ======================================================
// Configuration
// ======================================================

const NOTIFICATIONS_COLLECTION = 'notifications';

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

async function getCurrentFirebaseUser() {
    const user = auth.currentUser || await waitForFirebaseAuthReady();

    if (!user) {
        throw new Error('المستخدم غير مسجل الدخول.');
    }

    return user;
}

// ======================================================
// Helpers
// ======================================================

function normalizeNotification(snapshot) {
    const data = snapshot.data();

    return {
        id: snapshot.id,
        _id: snapshot.id,
        ...data
    };
}

function getTimestampMilliseconds(value) {
    if (!value) return 0;

    if (typeof value.toMillis === 'function') {
        return value.toMillis();
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'number') {
        return value;
    }

    const parsed = new Date(value).getTime();

    return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNotifications(notifications) {
    return [...notifications].sort((a, b) => {
        return (
            getTimestampMilliseconds(b.createdAt || b.timestamp) -
            getTimestampMilliseconds(a.createdAt || a.timestamp)
        );
    });
}

function getLimit(value) {
    const limit = Number(value);

    if (!Number.isFinite(limit) || limit <= 0) {
        return null;
    }

    return Math.min(Math.floor(limit), 100);
}

function getNotificationReference(notificationId) {
    if (!notificationId) {
        throw new Error('معرف الإشعار غير موجود.');
    }

    return doc(
        db,
        NOTIFICATIONS_COLLECTION,
        notificationId
    );
}

function isRecipient(notification, uid) {
    return notification?.recipientUid === uid;
}

function getStoredRole() {
    try {
        const stored = localStorage.getItem('ostudio_user');

        if (!stored) return '';

        return JSON.parse(stored)?.role || '';
    } catch {
        return '';
    }
}

async function getMyNotificationDocuments() {
    const user = await getCurrentFirebaseUser();

    const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientUid', '==', user.uid)
    );

    const snapshot = await getDocs(notificationsQuery);

    return snapshot.docs.map(normalizeNotification);
}

// ======================================================
// Get My Notifications
// ======================================================

export async function getMyNotifications(options = {}) {
    let notifications = await getMyNotificationDocuments();

    if (options.unreadOnly) {
        notifications = notifications.filter(
            (notification) => !notification.isRead
        );
    }

    notifications = sortNotifications(notifications);

    const limit = getLimit(options.limit);

    if (limit) {
        notifications = notifications.slice(0, limit);
    }

    return notifications;
}

// ======================================================
// Get One Notification
// ======================================================

export async function getNotification(notificationId) {
    const user = await getCurrentFirebaseUser();

    const snapshot = await getDoc(
        getNotificationReference(notificationId)
    );

    if (!snapshot.exists()) {
        throw new Error('الإشعار غير موجود.');
    }

    const notification = normalizeNotification(snapshot);

    if (!isRecipient(notification, user.uid)) {
        throw new Error('ليس لديك صلاحية الوصول إلى هذا الإشعار.');
    }

    return notification;
}

// ======================================================
// Get Unread Notifications
// ======================================================

export async function getUnreadNotifications() {
    return getMyNotifications({
        unreadOnly: true
    });
}

// ======================================================
// Get Unread Count
// ======================================================

export async function getUnreadNotificationCount() {
    const notifications = await getUnreadNotifications();

    return notifications.length;
}

// ======================================================
// Mark One Notification As Read
// ======================================================

export async function markNotificationAsRead(notificationId) {
    const user = await getCurrentFirebaseUser();

    const reference = getNotificationReference(notificationId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
        throw new Error('الإشعار غير موجود.');
    }

    if (!isRecipient(snapshot.data(), user.uid)) {
        throw new Error('ليس لديك صلاحية تعديل هذا الإشعار.');
    }

    await updateDoc(reference, {
        isRead: true,
        readAt: serverTimestamp()
    });

    const updatedSnapshot = await getDoc(reference);

    return normalizeNotification(updatedSnapshot);
}

// ======================================================
// Mark All My Notifications As Read
// ======================================================

export async function markAllNotificationsAsRead() {
    const user = await getCurrentFirebaseUser();

    const notifications = await getMyNotificationDocuments();

    const unreadNotifications = notifications.filter(
        (notification) => !notification.isRead
    );

    if (unreadNotifications.length === 0) {
        return {
            success: true,
            updatedCount: 0
        };
    }

    let updatedCount = 0;

    for (let i = 0; i < unreadNotifications.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = unreadNotifications.slice(i, i + 450);

        chunk.forEach((notification) => {
            if (notification.recipientUid !== user.uid) {
                return;
            }

            const reference = doc(
                db,
                NOTIFICATIONS_COLLECTION,
                notification.id
            );

            batch.update(reference, {
                isRead: true,
                readAt: serverTimestamp()
            });

            updatedCount += 1;
        });

        await batch.commit();
    }

    return {
        success: true,
        updatedCount
    };
}

// ======================================================
// Delete One Notification
// ======================================================

export async function deleteNotification(notificationId) {
    const user = await getCurrentFirebaseUser();

    const reference = getNotificationReference(notificationId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
        throw new Error('الإشعار غير موجود.');
    }

    if (!isRecipient(snapshot.data(), user.uid)) {
        throw new Error('ليس لديك صلاحية حذف هذا الإشعار.');
    }

    await deleteDoc(reference);

    return {
        success: true,
        id: notificationId
    };
}

// ======================================================
// Delete All Read Notifications
// ======================================================

export async function deleteReadNotifications() {
    const user = await getCurrentFirebaseUser();

    const notifications = await getMyNotificationDocuments();

    const readNotifications = notifications.filter(
        (notification) => notification.isRead
    );

    let deletedCount = 0;

    for (let i = 0; i < readNotifications.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = readNotifications.slice(i, i + 450);

        chunk.forEach((notification) => {
            if (notification.recipientUid !== user.uid) {
                return;
            }

            batch.delete(
                doc(
                    db,
                    NOTIFICATIONS_COLLECTION,
                    notification.id
                )
            );

            deletedCount += 1;
        });

        await batch.commit();
    }

    return {
        success: true,
        deletedCount
    };
}

// ======================================================
// Notification Helpers
// ======================================================

export function getNotificationId(notification) {
    if (!notification) return '';

    return (
        notification.id ||
        notification._id ||
        notification.notificationId ||
        ''
    );
}

export function getNotificationProjectId(notification) {
    if (!notification) return '';

    if (
        typeof notification.project === 'object' &&
        notification.project !== null
    ) {
        return (
            notification.project.id ||
            notification.project._id ||
            ''
        );
    }

    return (
        notification.projectId ||
        notification.project ||
        ''
    );
}

export function getNotificationTaskId(notification) {
    if (!notification) return '';

    if (
        typeof notification.task === 'object' &&
        notification.task !== null
    ) {
        return (
            notification.task.id ||
            notification.task._id ||
            ''
        );
    }

    return (
        notification.taskId ||
        notification.task ||
        ''
    );
}

export function getNotificationSender(notification) {
    if (!notification) return null;

    if (
        typeof notification.sender === 'object' &&
        notification.sender !== null
    ) {
        return notification.sender;
    }

    return notification.senderName
        ? { name: notification.senderName }
        : null;
}

export function getNotificationType(notification) {
    return notification?.type || 'general';
}

// ======================================================
// Notification Title
// ======================================================

export function getNotificationTitle(notification) {
    if (notification?.title) {
        return notification.title;
    }

    switch (notification?.type) {
        case 'project-created':
            return 'مشروع جديد';

        case 'project-assigned':
            return 'تم تعيين مشروع';

        case 'presentation-assigned':
            return 'تم تعيين Presentation';

        case 'task-assigned':
            return 'تم تعيين مهمة';

        case 'task-updated':
            return 'تم تحديث مهمة';

        case 'project-updated':
            return 'تم تحديث مشروع';

        case 'project-completed':
            return 'اكتمل المشروع';

        case 'presentation-approved':
            return 'تم اعتماد الـ Presentation';

        case 'account-approved':
            return 'تم قبول الحساب';

        default:
            return 'إشعار جديد';
    }
}

// ======================================================
// Notification Message
// ======================================================

export function getNotificationMessage(notification) {
    return notification?.message || 'لديك إشعار جديد.';
}

// ======================================================
// Role-Aware Notification Links
// ======================================================

export function getNotificationLink(notification) {
    if (notification?.link) {
        return notification.link;
    }

    const role = getStoredRole();
    const projectId = getNotificationProjectId(notification);
    const taskId = getNotificationTaskId(notification);
    const type = getNotificationType(notification);

    const projectRoutes = {
        admin: '/admin/projects',
        manager: '/manager/projects',
        account_manager: '/account-manager/projects',
        coordinator: '/coordinator/projects',
        designer: '/designer/projects'
    };

    const taskRoutes = {
        admin: '/admin/tasks',
        manager: '/manager/tasks',
        coordinator: '/coordinator/tasks',
        designer: '/designer/tasks'
    };

    if (taskId && ['task-assigned', 'task-updated'].includes(type)) {
        const baseRoute = taskRoutes[role];

        return baseRoute
            ? `${baseRoute}/${taskId}`
            : '';
    }

    if (projectId) {
        const baseRoute = projectRoutes[role];

        return baseRoute
            ? `${baseRoute}/${projectId}`
            : '';
    }

    return '';
}

// ======================================================
// Notification Icon
// ======================================================

export function getNotificationIcon(notification) {
    switch (notification?.type) {
        case 'project-created':
            return '📁';

        case 'project-assigned':
            return '🎨';

        case 'presentation-assigned':
            return '🖥️';

        case 'task-assigned':
            return '📋';

        case 'task-updated':
            return '✏️';

        case 'project-updated':
            return '🔄';

        case 'project-completed':
            return '✅';

        case 'presentation-approved':
            return '🏆';

        case 'account-approved':
            return '🎉';

        default:
            return '🔔';
    }
}

// ======================================================
// Notification Time
// ======================================================

export function formatNotificationTime(value) {
    if (!value) return '';

    let date;

    if (typeof value.toDate === 'function') {
        date = value.toDate();
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const diff = Math.max(0, Date.now() - date.getTime());
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) {
        return 'منذ لحظات';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `منذ ${minutes} دقيقة`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `منذ ${hours} ساعة`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `منذ ${days} يوم`;
    }

    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ======================================================
// Read Status
// ======================================================

export function isNotificationRead(notification) {
    return Boolean(notification?.isRead);
}

// ======================================================
// Default Export
// ======================================================

const notificationService = {
    getMyNotifications,
    getNotification,
    getUnreadNotifications,
    getUnreadNotificationCount,

    markNotificationAsRead,
    markAllNotificationsAsRead,

    deleteNotification,
    deleteReadNotifications,

    getNotificationId,
    getNotificationProjectId,
    getNotificationTaskId,
    getNotificationSender,

    getNotificationType,
    getNotificationTitle,
    getNotificationMessage,
    getNotificationLink,
    getNotificationIcon,

    formatNotificationTime,
    isNotificationRead
};

export default notificationService;
