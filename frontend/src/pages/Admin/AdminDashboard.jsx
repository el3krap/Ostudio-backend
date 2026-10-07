import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getDashboardStats,
    getUsers,
    getPendingUsers,
    getProjects,
    getTasks
} from '../../services/adminService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AdminDashboard = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    const [stats, setStats] = useState({
        users: 0,
        projects: 0,
        tasks: 0,
        pendingUsers: 0,
        completedProjects: 0,
        activeProjects: 0,
        completedTasks: 0,
        activeTasks: 0
    });

    const [recentUsers, setRecentUsers] = useState([]);
    const [recentProjects, setRecentProjects] = useState([]);
    const [recentTasks, setRecentTasks] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    /* =========================================================
       Current User
    ========================================================= */

    useEffect(() => {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            navigate('/login', {
                replace: true
            });

            return;
        }

        if (currentUser.role !== 'admin') {
            navigate('/login', {
                replace: true
            });

            return;
        }

        setUser(currentUser);
    }, [navigate]);

    /* =========================================================
       Helpers
    ========================================================= */

    const getArray = (response, keys = []) => {
        if (Array.isArray(response)) {
            return response;
        }

        for (const key of keys) {
            if (Array.isArray(response?.[key])) {
                return response[key];
            }
        }

        return [];
    };

    const getObject = (response) => {
        if (!response || typeof response !== 'object') {
            return {};
        }

        if (
            response.data &&
            typeof response.data === 'object' &&
            !Array.isArray(response.data)
        ) {
            return response.data;
        }

        return response;
    };

    /* =========================================================
       Load Dashboard
    ========================================================= */

    const loadDashboard = useCallback(
        async (showFullLoader = false) => {
            try {
                if (showFullLoader) {
                    setLoading(true);
                } else {
                    setRefreshing(true);
                }

                setError('');

                const [
                    dashboardResponse,
                    usersResponse,
                    pendingUsersResponse,
                    projectsResponse,
                    tasksResponse
                ] = await Promise.all([
                    getDashboardStats().catch(() => null),
                    getUsers().catch(() => []),
                    getPendingUsers().catch(() => []),
                    getProjects().catch(() => []),
                    getTasks().catch(() => [])
                ]);

                const dashboardData =
                    getObject(dashboardResponse);

                const users = getArray(
                    usersResponse,
                    ['users', 'data']
                );

                const pendingUsers = getArray(
                    pendingUsersResponse,
                    ['users', 'pendingUsers', 'data']
                );

                const projects = getArray(
                    projectsResponse,
                    ['projects', 'data']
                );

                const tasks = getArray(
                    tasksResponse,
                    ['tasks', 'data']
                );

                const calculatedCompletedProjects =
                    projects.filter(
                        (project) =>
                            project?.status === 'completed'
                    ).length;

                const calculatedActiveProjects =
                    projects.filter(
                        (project) =>
                            project?.status !== 'completed'
                    ).length;

                const calculatedCompletedTasks =
                    tasks.filter(
                        (task) =>
                            task?.status === 'completed'
                    ).length;

                const calculatedActiveTasks =
                    tasks.filter(
                        (task) =>
                            task?.status !== 'completed'
                    ).length;

                setStats({
                    users:
                        dashboardData.users ??
                        dashboardData.totalUsers ??
                        users.length,

                    projects:
                        dashboardData.projects ??
                        dashboardData.totalProjects ??
                        projects.length,

                    tasks:
                        dashboardData.tasks ??
                        dashboardData.totalTasks ??
                        tasks.length,

                    pendingUsers:
                        dashboardData.pendingUsers ??
                        dashboardData.pending ??
                        pendingUsers.length,

                    completedProjects:
                        dashboardData.completedProjects ??
                        calculatedCompletedProjects,

                    activeProjects:
                        dashboardData.activeProjects ??
                        calculatedActiveProjects,

                    completedTasks:
                        dashboardData.completedTasks ??
                        calculatedCompletedTasks,

                    activeTasks:
                        dashboardData.activeTasks ??
                        calculatedActiveTasks
                });

                const sortedUsers = [...users]
                    .sort(
                        (a, b) =>
                            new Date(
                                b?.createdAt || 0
                            ) -
                            new Date(
                                a?.createdAt || 0
                            )
                    )
                    .slice(0, 5);

                const sortedProjects = [...projects]
                    .sort(
                        (a, b) =>
                            new Date(
                                b?.createdAt || 0
                            ) -
                            new Date(
                                a?.createdAt || 0
                            )
                    )
                    .slice(0, 5);

                const sortedTasks = [...tasks]
                    .sort(
                        (a, b) =>
                            new Date(
                                b?.createdAt || 0
                            ) -
                            new Date(
                                a?.createdAt || 0
                            )
                    )
                    .slice(0, 5);

                setRecentUsers(sortedUsers);
                setRecentProjects(sortedProjects);
                setRecentTasks(sortedTasks);
            } catch (err) {
                console.error(
                    '❌ Admin Dashboard Error:',
                    err
                );

                setError(
                    err?.message ||
                    'حدث خطأ أثناء تحميل لوحة تحكم الأدمن.'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!user) {
            return;
        }

        loadDashboard(true);
    }, [user, loadDashboard]);

    /* =========================================================
       Logout
    ========================================================= */

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (err) {
            console.error(
                '❌ Logout Error:',
                err
            );
        } finally {
            navigate('/login', {
                replace: true
            });
        }
    };

    /* =========================================================
       Formatting
    ========================================================= */

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return 'غير محدد';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return 'غير محدد';
        }

        return date.toLocaleDateString(
            'ar-EG',
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin':
                return 'Admin';

            case 'manager':
                return 'Manager';

            case 'account_manager':
                return 'Account Manager';

            case 'coordinator':
                return 'Coordinator';

            case 'designer':
                return 'Designer';

            default:
                return role || 'غير محدد';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'نشط';

            case 'approved':
                return 'مقبول';

            case 'pending':
                return 'معلق';

            case 'completed':
                return 'مكتمل';

            case 'in-progress':
                return 'قيد التنفيذ';

            case 'pending':
                return 'معلق';

            default:
                return status || 'غير محدد';
        }
    };

    const getStatusClass = (status) => {
        if (
            status === 'completed' ||
            status === 'active' ||
            status === 'approved'
        ) {
            return 'success';
        }

        if (
            status === 'pending' ||
            status === 'in-progress'
        ) {
            return 'warning';
        }

        return 'neutral';
    };

    const getUserName = (item) => {
        return (
            item?.name ||
            item?.displayName ||
            item?.email ||
            'مستخدم'
        );
    };

    /* =========================================================
       Loading
    ========================================================= */

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل لوحة تحكم الأدمن..."
            />
        );
    }

    return (
        <div className="admin-dashboard">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="dashboard-content">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="dashboard-header">

                    <div>
                        <span className="eyebrow">
                            ADMIN CONTROL CENTER
                        </span>

                        <h1>
                            لوحة تحكم الأدمن
                        </h1>

                        <p>
                            إدارة المستخدمين والمشاريع
                            والمهام في نظام OSTUDIO.
                        </p>
                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={() =>
                                loadDashboard(false)
                            }
                            disabled={refreshing}
                        >
                            {refreshing
                                ? 'جاري التحديث...'
                                : '↻ تحديث'}
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Error
                ================================================= */}

                {error && (
                    <div className="error-box">

                        <span>
                            ⚠️
                        </span>

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError('')
                            }
                        >
                            ×
                        </button>

                    </div>
                )}

                {/* =================================================
                    Main Statistics
                ================================================= */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-card-top">

                            <span className="stat-icon">
                                👥
                            </span>

                            <span className="stat-title">
                                المستخدمين
                            </span>

                        </div>

                        <strong>
                            {stats.users}
                        </strong>

                        <small>
                            إجمالي الحسابات
                        </small>

                    </div>

                    <div className="stat-card">

                        <div className="stat-card-top">

                            <span className="stat-icon">
                                📁
                            </span>

                            <span className="stat-title">
                                المشاريع
                            </span>

                        </div>

                        <strong>
                            {stats.projects}
                        </strong>

                        <small>
                            إجمالي المشاريع
                        </small>

                    </div>

                    <div className="stat-card">

                        <div className="stat-card-top">

                            <span className="stat-icon">
                                ✓
                            </span>

                            <span className="stat-title">
                                المشاريع المكتملة
                            </span>

                        </div>

                        <strong>
                            {stats.completedProjects}
                        </strong>

                        <small>
                            مشاريع مكتملة
                        </small>

                    </div>

                    <div className="stat-card">

                        <div className="stat-card-top">

                            <span className="stat-icon">
                                📋
                            </span>

                            <span className="stat-title">
                                المهام
                            </span>

                        </div>

                        <strong>
                            {stats.tasks}
                        </strong>

                        <small>
                            إجمالي المهام
                        </small>

                    </div>

                </section>

                {/* =================================================
                    Pending Alert
                ================================================= */}

                {stats.pendingUsers > 0 && (
                    <section className="pending-alert">

                        <div className="pending-alert-icon">
                            ⏳
                        </div>

                        <div className="pending-alert-content">

                            <strong>
                                يوجد {stats.pendingUsers}
                                {' '}
                                طلب اكونت معلق
                            </strong>

                            <span>
                                يوجد مستخدمون في انتظار
                                مراجعة الأدمن والموافقة عليهم.
                            </span>

                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/admin/users'
                                )
                            }
                        >
                            مراجعة الطلبات
                            <span>
                                ←
                            </span>
                        </button>

                    </section>
                )}

                {/* =================================================
                    Quick Actions
                ================================================= */}

                <section className="section">

                    <div className="section-heading">

                        <div>
                            <span className="section-label">
                                CONTROL
                            </span>

                            <h2>
                                الإدارة السريعة
                            </h2>
                        </div>

                    </div>

                    <div className="quick-actions">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/admin/users'
                                )
                            }
                        >
                            <span>
                                👥
                            </span>

                            <div>
                                <strong>
                                    إدارة المستخدمين
                                </strong>

                                <small>
                                    الحسابات والأدوار والحالات
                                </small>
                            </div>

                            <b>
                                ←
                            </b>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/admin/projects'
                                )
                            }
                        >
                            <span>
                                📁
                            </span>

                            <div>
                                <strong>
                                    إدارة المشاريع
                                </strong>

                                <small>
                                    عرض وتعديل المشاريع
                                </small>
                            </div>

                            <b>
                                ←
                            </b>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/admin/tasks'
                                )
                            }
                        >
                            <span>
                                ✓
                            </span>

                            <div>
                                <strong>
                                    إدارة المهام
                                </strong>

                                <small>
                                    متابعة وتعديل المهام
                                </small>
                            </div>

                            <b>
                                ←
                            </b>
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Recent Content
                ================================================= */}

                <section className="content-grid">

                    {/* =================================================
                        Recent Users
                    ================================================= */}

                    <div className="panel">

                        <div className="panel-header">

                            <div>
                                <span className="section-label">
                                    USERS
                                </span>

                                <h2>
                                    أحدث المستخدمين
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        '/admin/users'
                                    )
                                }
                            >
                                عرض الكل
                            </button>

                        </div>

                        {recentUsers.length === 0 ? (

                            <div className="panel-empty">
                                لا يوجد مستخدمون.
                            </div>

                        ) : (

                            <div className="list">

                                {recentUsers.map(
                                    (item) => {

                                        const id =
                                            item?._id ||
                                            item?.id ||
                                            item?.firebaseUid ||
                                            item?.email;

                                        return (
                                            <div
                                                className="list-item"
                                                key={id}
                                            >

                                                <div className="avatar">
                                                    {getUserName(
                                                        item
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <div className="list-main">

                                                    <strong>
                                                        {getUserName(
                                                            item
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {item?.email ||
                                                            'بدون بريد'}
                                                    </span>

                                                </div>

                                                <div className="list-meta">

                                                    <span className="role-badge">
                                                        {getRoleLabel(
                                                            item?.role
                                                        )}
                                                    </span>

                                                    <small>
                                                        {formatDate(
                                                            item?.createdAt
                                                        )}
                                                    </small>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>
                        )}

                    </div>

                    {/* =================================================
                        Recent Projects
                    ================================================= */}

                    <div className="panel">

                        <div className="panel-header">

                            <div>
                                <span className="section-label">
                                    PROJECTS
                                </span>

                                <h2>
                                    أحدث المشاريع
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        '/admin/projects'
                                    )
                                }
                            >
                                عرض الكل
                            </button>

                        </div>

                        {recentProjects.length === 0 ? (

                            <div className="panel-empty">
                                لا توجد مشاريع.
                            </div>

                        ) : (

                            <div className="list">

                                {recentProjects.map(
                                    (project) => {

                                        const id =
                                            project?._id ||
                                            project?.id;

                                        return (
                                            <button
                                                type="button"
                                                className="list-item project-list-item"
                                                key={id}
                                                onClick={() =>
                                                    navigate(
                                                        `/admin/projects/${id}`
                                                    )
                                                }
                                            >

                                                <div className="item-icon">
                                                    📁
                                                </div>

                                                <div className="list-main">

                                                    <strong>
                                                        {project?.projectName ||
                                                            'مشروع بدون اسم'}
                                                    </strong>

                                                    <span>
                                                        {formatDate(
                                                            project?.createdAt
                                                        )}
                                                    </span>

                                                </div>

                                                <div className="list-meta">

                                                    <span
                                                        className={`status-badge ${getStatusClass(
                                                            project?.status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(
                                                            project?.status
                                                        )}
                                                    </span>

                                                    <b>
                                                        ←
                                                    </b>

                                                </div>

                                            </button>
                                        );
                                    }
                                )}

                            </div>
                        )}

                    </div>

                </section>

                {/* =================================================
                    Tasks
                ================================================= */}

                <section className="panel tasks-panel">

                    <div className="panel-header">

                        <div>
                            <span className="section-label">
                                TASKS
                            </span>

                            <h2>
                                أحدث المهام
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/admin/tasks'
                                )
                            }
                        >
                            عرض كل المهام
                        </button>

                    </div>

                    {recentTasks.length === 0 ? (

                        <div className="panel-empty">
                            لا توجد مهام.
                        </div>

                    ) : (

                        <div className="tasks-table">

                            <div className="table-row table-head">

                                <span>
                                    المهمة
                                </span>

                                <span>
                                    المشروع
                                </span>

                                <span>
                                    الحالة
                                </span>

                                <span>
                                    الموعد
                                </span>

                            </div>

                            {recentTasks.map(
                                (task) => {

                                    const id =
                                        task?._id ||
                                        task?.id;

                                    return (
                                        <button
                                            type="button"
                                            className="table-row"
                                            key={id}
                                            onClick={() =>
                                                navigate(
                                                    `/admin/tasks/${id}`
                                                )
                                            }
                                        >

                                            <span className="task-title">
                                                {task?.title ||
                                                    'مهمة بدون عنوان'}
                                            </span>

                                            <span>
                                                {task?.projectName ||
                                                    task?.project?.projectName ||
                                                    'غير محدد'}
                                            </span>

                                            <span>
                                                <span
                                                    className={`status-badge ${getStatusClass(
                                                        task?.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        task?.status
                                                    )}
                                                </span>
                                            </span>

                                            <span>
                                                {formatDate(
                                                    task?.deadline
                                                )}
                                            </span>

                                        </button>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

                {/* =================================================
                    Footer Stats
                ================================================= */}

                <section className="footer-stats">

                    <div>
                        <span>
                            مشاريع قيد التنفيذ
                        </span>

                        <strong>
                            {stats.activeProjects}
                        </strong>
                    </div>

                    <div>
                        <span>
                            مهام قيد التنفيذ
                        </span>

                        <strong>
                            {stats.activeTasks}
                        </strong>
                    </div>

                    <div>
                        <span>
                            مهام مكتملة
                        </span>

                        <strong>
                            {stats.completedTasks}
                        </strong>
                    </div>

                    <div>
                        <span>
                            طلبات اكونت معلقة
                        </span>

                        <strong>
                            {stats.pendingUsers}
                        </strong>
                    </div>

                </section>

            </main>

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .admin-dashboard {
                    min-height: 100vh;

                    background: #f7f7f8;

                    color: #111827;

                    direction: rtl;
                }

                .dashboard-content {
                    width: min(
                        1450px,
                        calc(100% - 48px)
                    );

                    margin: 0 auto;

                    padding: 40px 0 70px;
                }

                .dashboard-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;

                    gap: 25px;

                    margin-bottom: 30px;
                }

                .eyebrow {
                    display: inline-block;

                    margin-bottom: 8px;

                    color: #9ca3af;

                    font-size: 10px;
                    font-weight: 800;

                    letter-spacing: 1.8px;

                    direction: ltr;
                }

                .dashboard-header h1 {
                    margin: 0;

                    color: #111827;

                    font-size: clamp(
                        28px,
                        4vw,
                        40px
                    );

                    font-weight: 800;

                    letter-spacing: -1px;
                }

                .dashboard-header p {
                    margin: 9px 0 0;

                    color: #6b7280;

                    font-size: 13px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;

                    gap: 10px;
                }

                .refresh-button {
                    min-height: 42px;

                    padding: 0 16px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .refresh-button:hover {
                    background: #f9fafb;
                }

                .refresh-button:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                .error-box {
                    margin-bottom: 22px;

                    padding: 13px 16px;

                    display: flex;
                    align-items: center;

                    gap: 9px;

                    border: 1px solid #fecaca;
                    border-radius: 9px;

                    background: #fef2f2;
                    color: #991b1b;

                    font-size: 12px;
                }

                .error-box button {
                    margin-right: auto;

                    border: none;

                    background: transparent;

                    color: #991b1b;

                    font-size: 20px;

                    cursor: pointer;
                }

                .stats-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap: 15px;

                    margin-bottom: 20px;
                }

                .stat-card {
                    min-height: 145px;

                    padding: 19px;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .stat-card-top {
                    display: flex;
                    align-items: center;

                    gap: 9px;

                    margin-bottom: 18px;
                }

                .stat-icon {
                    width: 36px;
                    height: 36px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    font-size: 17px;
                }

                .stat-title {
                    color: #6b7280;

                    font-size: 11px;
                    font-weight: 600;
                }

                .stat-card strong {
                    display: block;

                    margin-bottom: 5px;

                    color: #111827;

                    font-size: 29px;

                    line-height: 1;
                }

                .stat-card small {
                    color: #9ca3af;

                    font-size: 10px;
                }

                .pending-alert {
                    min-height: 78px;

                    margin-bottom: 30px;

                    padding: 14px 17px;

                    display: flex;
                    align-items: center;

                    gap: 13px;

                    border: 1px solid #fde68a;
                    border-radius: 11px;

                    background: #fffbeb;
                }

                .pending-alert-icon {
                    width: 42px;
                    height: 42px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 10px;

                    background: #fef3c7;

                    font-size: 19px;
                }

                .pending-alert-content {
                    flex: 1;
                }

                .pending-alert-content strong {
                    display: block;

                    margin-bottom: 4px;

                    color: #92400e;

                    font-size: 12px;
                }

                .pending-alert-content span {
                    color: #a16207;

                    font-size: 10px;
                }

                .pending-alert > button {
                    min-height: 36px;

                    padding: 0 13px;

                    display: flex;
                    align-items: center;

                    gap: 7px;

                    border: 1px solid #fcd34d;
                    border-radius: 7px;

                    background: #ffffff;

                    color: #92400e;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .section {
                    margin-bottom: 30px;
                }

                .section-heading {
                    margin-bottom: 14px;
                }

                .section-label {
                    display: block;

                    margin-bottom: 4px;

                    color: #9ca3af;

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 1.4px;

                    direction: ltr;
                }

                .section-heading h2,
                .panel-header h2 {
                    margin: 0;

                    color: #111827;

                    font-size: 18px;
                    font-weight: 800;
                }

                .quick-actions {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 13px;
                }

                .quick-actions button {
                    min-height: 82px;

                    padding: 14px;

                    display: flex;
                    align-items: center;

                    gap: 12px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;

                    color: #111827;

                    text-align: right;

                    font-family: inherit;

                    cursor: pointer;

                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease;
                }

                .quick-actions button:hover {
                    transform: translateY(-2px);

                    box-shadow:
                        0 8px 22px
                        rgba(0, 0, 0, 0.06);
                }

                .quick-actions button > span {
                    width: 40px;
                    height: 40px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    font-size: 18px;
                }

                .quick-actions button div {
                    flex: 1;
                }

                .quick-actions button strong {
                    display: block;

                    margin-bottom: 4px;

                    font-size: 12px;
                }

                .quick-actions button small {
                    display: block;

                    color: #9ca3af;

                    font-size: 9px;
                }

                .quick-actions button b {
                    color: #9ca3af;

                    font-size: 17px;
                }

                .content-grid {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 17px;

                    margin-bottom: 17px;
                }

                .panel {
                    min-width: 0;

                    padding: 20px;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .tasks-panel {
                    margin-bottom: 17px;
                }

                .panel-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;

                    gap: 15px;

                    margin-bottom: 18px;
                }

                .panel-header button {
                    border: none;

                    background: transparent;

                    color: #6b7280;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .panel-header button:hover {
                    color: #111827;
                }

                .list {
                    display: flex;

                    flex-direction: column;

                    gap: 2px;
                }

                .list-item {
                    min-width: 0;

                    min-height: 65px;

                    padding: 9px 0;

                    display: flex;
                    align-items: center;

                    gap: 10px;

                    border-bottom:
                        1px solid #f3f4f6;
                }

                .list-item:last-child {
                    border-bottom: none;
                }

                .avatar,
                .item-icon {
                    width: 38px;
                    height: 38px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    color: #374151;

                    font-size: 12px;
                    font-weight: 800;
                }

                .item-icon {
                    font-size: 17px;
                }

                .list-main {
                    min-width: 0;

                    flex: 1;
                }

                .list-main strong {
                    display: block;

                    overflow: hidden;

                    color: #111827;

                    font-size: 11px;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .list-main span {
                    display: block;

                    margin-top: 4px;

                    overflow: hidden;

                    color: #9ca3af;

                    font-size: 9px;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .list-meta {
                    display: flex;
                    align-items: flex-end;

                    flex-direction: column;

                    gap: 5px;

                    flex-shrink: 0;
                }

                .list-meta small {
                    color: #9ca3af;

                    font-size: 8px;
                }

                .role-badge {
                    padding: 4px 7px;

                    border-radius: 999px;

                    background: #f3f4f6;

                    color: #4b5563;

                    font-size: 8px;
                    font-weight: 700;

                    direction: ltr;
                }

                .project-list-item {
                    width: 100%;

                    border: none;

                    background: transparent;

                    text-align: right;

                    font-family: inherit;

                    cursor: pointer;
                }

                .project-list-item:hover {
                    background: #fafafa;
                }

                .project-list-item .list-meta {
                    flex-direction: row;

                    align-items: center;
                }

                .project-list-item .list-meta b {
                    color: #9ca3af;

                    font-size: 15px;
                }

                .status-badge {
                    display: inline-block;

                    padding: 4px 7px;

                    border-radius: 999px;

                    font-size: 8px;
                    font-weight: 700;
                }

                .status-badge.success {
                    background: #ecfdf5;
                    color: #047857;
                }

                .status-badge.warning {
                    background: #fffbeb;
                    color: #b45309;
                }

                .status-badge.neutral {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .panel-empty {
                    min-height: 180px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    color: #9ca3af;

                    font-size: 11px;
                }

                .tasks-table {
                    overflow-x: auto;
                }

                .table-row {
                    min-width: 650px;

                    display: grid;

                    grid-template-columns:
                        1.5fr
                        1fr
                        0.8fr
                        0.8fr;

                    align-items: center;

                    gap: 15px;

                    padding: 12px 10px;

                    border: none;
                    border-bottom:
                        1px solid #f3f4f6;

                    background: transparent;

                    color: #374151;

                    text-align: right;

                    font-family: inherit;

                    font-size: 10px;

                    cursor: pointer;
                }

                .table-row:last-child {
                    border-bottom: none;
                }

                .table-row:not(.table-head):hover {
                    background: #fafafa;
                }

                .table-head {
                    color: #9ca3af;

                    font-size: 9px;
                    font-weight: 700;

                    cursor: default;
                }

                .task-title {
                    overflow: hidden;

                    color: #111827;

                    font-weight: 700;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .footer-stats {
                    display: grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap: 12px;
                }

                .footer-stats > div {
                    padding: 15px;

                    border: 1px solid #e5e7eb;
                    border-radius: 10px;

                    background: #ffffff;
                }

                .footer-stats span {
                    display: block;

                    margin-bottom: 7px;

                    color: #9ca3af;

                    font-size: 9px;
                }

                .footer-stats strong {
                    color: #111827;

                    font-size: 20px;
                }

                @media (max-width: 1100px) {

                    .stats-grid {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .quick-actions {
                        grid-template-columns:
                            1fr;
                    }

                    .footer-stats {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                }

                @media (max-width: 800px) {

                    .dashboard-content {
                        width: calc(100% - 28px);

                        padding-top: 28px;
                    }

                    .dashboard-header {
                        align-items: flex-start;

                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                    }

                    .refresh-button {
                        flex: 1;
                    }

                    .content-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .pending-alert {
                        align-items: flex-start;

                        flex-wrap: wrap;
                    }

                    .pending-alert > button {
                        width: 100%;

                        justify-content: center;
                    }

                }

                @media (max-width: 550px) {

                    .stats-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .footer-stats {
                        grid-template-columns:
                            1fr;
                    }

                    .dashboard-header h1 {
                        font-size: 28px;
                    }

                }

            `}</style>

        </div>
    );
};

export default AdminDashboard;