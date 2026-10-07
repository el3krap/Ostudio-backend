import React, { useEffect, useRef, useState } from 'react';
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../../services/notificationService';

const NotificationBell = ({ user = null }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const wrapperRef = useRef(null);

    const userId = user?._id || user?.mongoId || user?.id;

    const unreadCount = notifications.filter(
        (notification) => !notification.isRead
    ).length;

    const loadNotifications = async () => {
        if (!userId) {
            setNotifications([]);
            return;
        }

        try {
            setLoading(true);

            const response = await getMyNotifications(userId);

            const data =
                response?.notifications ||
                response?.data ||
                response ||
                [];

            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('❌ Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();

        if (!userId) {
            return undefined;
        }

        const interval = setInterval(() => {
            loadNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification?.isRead && notification?._id) {
                await markNotificationAsRead(notification._id);

                setNotifications((currentNotifications) =>
                    currentNotifications.map((item) =>
                        item._id === notification._id
                            ? {
                                  ...item,
                                  isRead: true,
                                  readAt: new Date().toISOString()
                              }
                            : item
                    )
                );
            }

            if (notification?.link) {
                window.location.href = notification.link;
                return;
            }

            if (notification?.project) {
                const projectId =
                    typeof notification.project === 'object'
                        ? notification.project._id
                        : notification.project;

                if (projectId) {
                    window.location.href = `/projects/${projectId}`;
                }
            }
        } catch (error) {
            console.error('❌ Failed to open notification:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!userId || unreadCount === 0) {
            return;
        }

        try {
            await markAllNotificationsAsRead(userId);

            setNotifications((currentNotifications) =>
                currentNotifications.map((notification) => ({
                    ...notification,
                    isRead: true,
                    readAt:
                        notification.readAt ||
                        new Date().toISOString()
                }))
            );
        } catch (error) {
            console.error(
                '❌ Failed to mark all notifications as read:',
                error
            );
        }
    };

    const formatNotificationDate = (dateValue) => {
        if (!dateValue) {
            return '';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleString('ar-EG', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getNotificationTypeIcon = (type) => {
        switch (type) {
            case 'project-created':
                return '📁';

            case 'project-assigned':
                return '🎨';

            case 'presentation-assigned':
                return '🖼️';

            case 'task-assigned':
                return '📋';

            case 'project-updated':
                return '🔄';

            case 'task-updated':
                return '📝';

            case 'project-completed':
                return '✅';

            case 'presentation-approved':
                return '🎉';

            case 'account-approved':
                return '👤';

            default:
                return '🔔';
        }
    };

    return (
        <div
            ref={wrapperRef}
            className="ostudio-notification-wrapper"
        >
            <button
                type="button"
                className="ostudio-notification-button"
                onClick={() => setIsOpen((current) => !current)}
                aria-label="Notifications"
                aria-expanded={isOpen}
            >
                <span className="ostudio-notification-icon">
                    🔔
                </span>

                {unreadCount > 0 && (
                    <span className="ostudio-notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="ostudio-notification-panel">
                    <div className="ostudio-notification-header">
                        <div>
                            <h3>الإشعارات</h3>

                            {unreadCount > 0 && (
                                <span>
                                    {unreadCount} غير مقروء
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="ostudio-mark-all-button"
                                onClick={handleMarkAllAsRead}
                            >
                                قراءة الكل
                            </button>
                        )}
                    </div>

                    <div className="ostudio-notification-list">
                        {loading && notifications.length === 0 ? (
                            <div className="ostudio-notification-empty">
                                <span className="ostudio-small-spinner" />
                                <p>جاري تحميل الإشعارات...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="ostudio-notification-empty">
                                <div className="ostudio-empty-icon">
                                    🔔
                                </div>

                                <p>لا توجد إشعارات</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    type="button"
                                    key={notification._id || notification.id}
                                    className={`ostudio-notification-item ${
                                        notification.isRead
                                            ? ''
                                            : 'unread'
                                    }`}
                                    onClick={() =>
                                        handleNotificationClick(
                                            notification
                                        )
                                    }
                                >
                                    <div className="ostudio-notification-item-icon">
                                        {getNotificationTypeIcon(
                                            notification.type
                                        )}
                                    </div>

                                    <div className="ostudio-notification-content">
                                        <div className="ostudio-notification-title-row">
                                            <strong>
                                                {notification.title ||
                                                    'إشعار جديد'}
                                            </strong>

                                            {!notification.isRead && (
                                                <span className="ostudio-unread-dot" />
                                            )}
                                        </div>

                                        <p>
                                            {notification.message ||
                                                ''}
                                        </p>

                                        <span className="ostudio-notification-date">
                                            {formatNotificationDate(
                                                notification.createdAt
                                            )}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .ostudio-notification-wrapper {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                }

                .ostudio-notification-button {
                    position: relative;

                    width: 42px;
                    height: 42px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 1px solid #e5e7eb;
                    border-radius: 10px;

                    background: #ffffff;
                    color: #111827;

                    cursor: pointer;

                    transition:
                        background 0.2s ease,
                        border-color 0.2s ease,
                        transform 0.2s ease;
                }

                .ostudio-notification-button:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }

                .ostudio-notification-button:active {
                    transform: scale(0.96);
                }

                .ostudio-notification-icon {
                    font-size: 20px;
                    line-height: 1;
                }

                .ostudio-notification-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;

                    min-width: 20px;
                    height: 20px;

                    padding: 0 5px;
                    box-sizing: border-box;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 2px solid #ffffff;
                    border-radius: 999px;

                    background: #dc2626;
                    color: #ffffff;

                    font-size: 10px;
                    font-weight: 700;
                    line-height: 1;
                }

                .ostudio-notification-panel {
                    position: absolute;
                    top: calc(100% + 10px);
                    right: 0;

                    width: 380px;
                    max-width: calc(100vw - 32px);

                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;

                    box-shadow:
                        0 15px 35px rgba(0, 0, 0, 0.12);

                    overflow: hidden;

                    z-index: 2000;
                    direction: rtl;
                }

                .ostudio-notification-header {
                    min-height: 64px;
                    padding: 12px 16px;

                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    border-bottom: 1px solid #f0f0f0;
                }

                .ostudio-notification-header h3 {
                    margin: 0;

                    color: #111827;

                    font-size: 16px;
                    font-weight: 800;
                }

                .ostudio-notification-header span {
                    display: block;

                    margin-top: 3px;

                    color: #6b7280;

                    font-size: 11px;
                }

                .ostudio-mark-all-button {
                    border: none;
                    background: transparent;

                    color: #2563eb;

                    font-size: 12px;
                    font-weight: 600;

                    cursor: pointer;
                }

                .ostudio-mark-all-button:hover {
                    text-decoration: underline;
                }

                .ostudio-notification-list {
                    max-height: 430px;
                    overflow-y: auto;
                }

                .ostudio-notification-item {
                    width: 100%;

                    display: flex;
                    align-items: flex-start;

                    gap: 12px;

                    padding: 14px 16px;

                    border: none;
                    border-bottom: 1px solid #f3f4f6;

                    background: #ffffff;

                    text-align: right;

                    cursor: pointer;

                    transition: background 0.2s ease;
                }

                .ostudio-notification-item:hover {
                    background: #f9fafb;
                }

                .ostudio-notification-item.unread {
                    background: #f8fafc;
                }

                .ostudio-notification-item-icon {
                    width: 38px;
                    height: 38px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 10px;

                    background: #f3f4f6;

                    font-size: 18px;
                }

                .ostudio-notification-content {
                    min-width: 0;
                    flex: 1;
                }

                .ostudio-notification-title-row {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                }

                .ostudio-notification-title-row strong {
                    color: #111827;

                    font-size: 13px;
                    font-weight: 700;

                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .ostudio-unread-dot {
                    width: 7px;
                    height: 7px;

                    flex-shrink: 0;

                    border-radius: 50%;

                    background: #2563eb;
                }

                .ostudio-notification-content p {
                    margin: 5px 0 6px;

                    color: #4b5563;

                    font-size: 12px;
                    line-height: 1.5;

                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;

                    overflow: hidden;
                }

                .ostudio-notification-date {
                    color: #9ca3af;

                    font-size: 10px;
                }

                .ostudio-notification-empty {
                    min-height: 180px;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;

                    gap: 10px;

                    padding: 25px;
                }

                .ostudio-notification-empty p {
                    margin: 0;

                    color: #6b7280;

                    font-size: 13px;
                }

                .ostudio-empty-icon {
                    font-size: 28px;
                    opacity: 0.6;
                }

                .ostudio-small-spinner {
                    width: 24px;
                    height: 24px;

                    border: 3px solid #e5e7eb;
                    border-top-color: #111827;

                    border-radius: 50%;

                    animation: ostudio-notification-spin 0.8s linear infinite;
                }

                @keyframes ostudio-notification-spin {
                    from {
                        transform: rotate(0deg);
                    }

                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 600px) {
                    .ostudio-notification-panel {
                        position: fixed;

                        top: 70px;
                        right: 16px;
                        left: 16px;

                        width: auto;
                        max-width: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;