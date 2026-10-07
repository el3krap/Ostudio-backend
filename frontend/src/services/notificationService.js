// frontend/src/services/notificationService.js

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
    if (!auth.currentUser) {
        throw new Error(
            'المستخدم غير مسجل الدخول.'
        );
    }

    return auth.currentUser.getIdToken();
}


/* =========================================================
   Response Helpers
========================================================= */

async function parseResponse(response) {
    const contentType =
        response.headers.get(
            'content-type'
        ) || '';

    let data = null;

    try {
        if (
            contentType.includes(
                'application/json'
            )
        ) {
            data =
                await response.json();
        } else {
            const text =
                await response.text();

            data = text
                ? { message: text }
                : null;
        }
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
   Generic Request
========================================================= */

async function notificationRequest(
    endpoint,
    options = {}
) {
    const token =
        await getAuthToken();

    const config = {
        method:
            options.method ||
            'GET',

        headers: {
            Authorization:
                `Bearer ${token}`,

            ...(options.body
                ? {
                    'Content-Type':
                        'application/json'
                }
                : {}),

            ...(options.headers || {})
        }
    };

    if (
        options.body !== undefined
    ) {
        config.body =
            typeof options.body ===
            'string'
                ? options.body
                : JSON.stringify(
                    options.body
                );
    }

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            config
        );

    return parseResponse(
        response
    );
}


/* =========================================================
   Response Normalization
========================================================= */

function extractNotifications(
    response
) {
    if (
        Array.isArray(response)
    ) {
        return response;
    }

    if (
        Array.isArray(
            response?.notifications
        )
    ) {
        return response.notifications;
    }

    if (
        Array.isArray(
            response?.data
        )
    ) {
        return response.data;
    }

    if (
        Array.isArray(
            response?.items
        )
    ) {
        return response.items;
    }

    return [];
}


function extractNotification(
    response
) {
    if (!response) {
        return null;
    }

    if (
        response.notification
    ) {
        return response.notification;
    }

    if (
        response.data &&
        !Array.isArray(
            response.data
        )
    ) {
        return response.data;
    }

    return response;
}


/* =========================================================
   Get My Notifications
========================================================= */

/**
 * Get notifications belonging
 * to the currently authenticated user.
 *
 * The backend determines the
 * recipient from the Firebase token.
 */
export async function getMyNotifications(
    options = {}
) {
    const params =
        new URLSearchParams();

    if (
        options.limit
    ) {
        params.set(
            'limit',
            String(
                options.limit
            )
        );
    }

    if (
        options.unreadOnly
    ) {
        params.set(
            'unreadOnly',
            'true'
        );
    }

    const query =
        params.toString();

    const endpoint =
        query
            ? `/notifications?${query}`
            : '/notifications';

    const response =
        await notificationRequest(
            endpoint
        );

    return extractNotifications(
        response
    );
}


/* =========================================================
   Get Single Notification
========================================================= */

export async function getNotification(
    notificationId
) {
    if (!notificationId) {
        throw new Error(
            'معرف الإشعار غير موجود.'
        );
    }

    const response =
        await notificationRequest(
            `/notifications/${notificationId}`
        );

    return extractNotification(
        response
    );
}


/* =========================================================
   Get Unread Notifications
========================================================= */

export async function getUnreadNotifications() {
    const response =
        await notificationRequest(
            '/notifications?unreadOnly=true'
        );

    return extractNotifications(
        response
    );
}


/* =========================================================
   Get Unread Count
========================================================= */

export async function getUnreadNotificationCount() {
    const notifications =
        await getUnreadNotifications();

    return notifications.length;
}


/* =========================================================
   Mark One Notification As Read
========================================================= */

export async function markNotificationAsRead(
    notificationId
) {
    if (!notificationId) {
        throw new Error(
            'معرف الإشعار غير موجود.'
        );
    }

    const response =
        await notificationRequest(
            `/notifications/${notificationId}/read`,
            {
                method: 'PUT'
            }
        );

    return extractNotification(
        response
    );
}


/* =========================================================
   Mark All Notifications As Read
========================================================= */

export async function markAllNotificationsAsRead() {
    const response =
        await notificationRequest(
            '/notifications/read-all',
            {
                method: 'PUT'
            }
        );

    return response;
}


/* =========================================================
   Delete Notification
========================================================= */

export async function deleteNotification(
    notificationId
) {
    if (!notificationId) {
        throw new Error(
            'معرف الإشعار غير موجود.'
        );
    }

    const response =
        await notificationRequest(
            `/notifications/${notificationId}`,
            {
                method: 'DELETE'
            }
        );

    return response;
}


/* =========================================================
   Delete All Read Notifications
========================================================= */

export async function deleteReadNotifications() {
    const response =
        await notificationRequest(
            '/notifications/read',
            {
                method: 'DELETE'
            }
        );

    return response;
}


/* =========================================================
   Notification Helpers
========================================================= */

export function getNotificationId(
    notification
) {
    if (!notification) {
        return '';
    }

    return (
        notification._id ||
        notification.id ||
        notification.mongoId ||
        ''
    );
}


export function getNotificationProjectId(
    notification
) {
    if (!notification) {
        return '';
    }

    if (
        typeof notification.project ===
        'object' &&
        notification.project !== null
    ) {
        return (
            notification.project._id ||
            notification.project.id ||
            ''
        );
    }

    return (
        notification.project ||
        notification.projectId ||
        ''
    );
}


export function getNotificationTaskId(
    notification
) {
    if (!notification) {
        return '';
    }

    if (
        typeof notification.task ===
        'object' &&
        notification.task !== null
    ) {
        return (
            notification.task._id ||
            notification.task.id ||
            ''
        );
    }

    return (
        notification.task ||
        notification.taskId ||
        ''
    );
}


export function getNotificationSender(
    notification
) {
    if (!notification) {
        return null;
    }

    if (
        typeof notification.sender ===
        'object'
    ) {
        return notification.sender;
    }

    return null;
}


export function getNotificationType(
    notification
) {
    return (
        notification?.type ||
        'general'
    );
}


/* =========================================================
   Notification Title
========================================================= */

export function getNotificationTitle(
    notification
) {
    if (
        notification?.title
    ) {
        return notification.title;
    }

    switch (
        notification?.type
    ) {
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


/* =========================================================
   Notification Message
========================================================= */

export function getNotificationMessage(
    notification
) {
    return (
        notification?.message ||
        'لديك إشعار جديد.'
    );
}


/* =========================================================
   Notification Link
========================================================= */

export function getNotificationLink(
    notification
) {
    if (
        notification?.link
    ) {
        return notification.link;
    }

    const projectId =
        getNotificationProjectId(
            notification
        );

    const taskId =
        getNotificationTaskId(
            notification
        );

    const type =
        getNotificationType(
            notification
        );

    if (
        taskId &&
        (
            type ===
                'task-assigned' ||
            type ===
                'task-updated'
        )
    ) {
        return `/tasks/${taskId}`;
    }

    if (
        projectId
    ) {
        return `/projects/${projectId}`;
    }

    return '';
}


/* =========================================================
   Notification Icon
========================================================= */

export function getNotificationIcon(
    notification
) {
    switch (
        notification?.type
    ) {
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


/* =========================================================
   Notification Time
========================================================= */

export function formatNotificationTime(
    value
) {
    if (!value) {
        return '';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '';
    }

    const now =
        Date.now();

    const diff =
        Math.max(
            0,
            now -
                date.getTime()
        );

    const seconds =
        Math.floor(
            diff / 1000
        );

    if (
        seconds < 60
    ) {
        return 'منذ لحظات';
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (
        minutes < 60
    ) {
        return `منذ ${minutes} دقيقة`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (
        hours < 24
    ) {
        return `منذ ${hours} ساعة`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (
        days < 7
    ) {
        return `منذ ${days} يوم`;
    }

    return date.toLocaleDateString(
        'ar-EG',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }
    );
}


/* =========================================================
   Check Read Status
========================================================= */

export function isNotificationRead(
    notification
) {
    return Boolean(
        notification?.isRead
    );
}


/* =========================================================
   Default Export
========================================================= */

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