// frontend/src/pages/Manager/ManagerDashboard.jsx

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    useNavigate
} from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

import {
    getDashboardData,
    getProjects,
    createProject
} from '../../services/managerService';


/* =========================================================
   Helpers
========================================================= */

function getId(item) {
    if (!item) return '';

    return (
        item._id ||
        item.id ||
        item.mongoId ||
        ''
    );
}

function getProjectName(project) {
    return (
        project?.projectName ||
        project?.name ||
        project?.title ||
        'مشروع بدون اسم'
    );
}

function getProjectDescription(project) {
    return (
        project?.brief ||
        project?.description ||
        project?.briefName ||
        'لا يوجد وصف للمشروع.'
    );
}

function getStatusLabel(status) {
    switch (status) {
        case 'completed':
        case 'complete':
        case 'done':
            return 'مكتمل';

        case 'in-progress':
        case 'in_progress':
        case 'progress':
            return 'قيد التنفيذ';

        case 'pending':
            return 'معلق';

        default:
            return status || 'غير محدد';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'completed':
        case 'complete':
        case 'done':
            return 'status-completed';

        case 'in-progress':
        case 'in_progress':
        case 'progress':
            return 'status-progress';

        case 'pending':
            return 'status-pending';

        default:
            return 'status-default';
    }
}

function isCompleted(status) {
    return [
        'completed',
        'complete',
        'done'
    ].includes(status);
}

function formatDate(value) {
    if (!value) {
        return 'غير محدد';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
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

function getCheckpointProgress(project) {
    if (
        !Array.isArray(
            project?.checkpoints
        ) ||
        project.checkpoints.length === 0
    ) {
        return 0;
    }

    const completed =
        project.checkpoints.filter(
            (checkpoint) =>
                Boolean(
                    checkpoint?.isCompleted
                )
        ).length;

    return Math.round(
        (
            completed /
            project.checkpoints.length
        ) *
        100
    );
}


/* =========================================================
   Component
========================================================= */

export default function ManagerDashboard() {
    const navigate =
        useNavigate();

    const [user, setUser] =
        useState(null);

    const [projects, setProjects] =
        useState([]);

    const [dashboard, setDashboard] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');

    const [search, setSearch] =
        useState('');

    const [statusFilter, setStatusFilter] =
        useState('all');

    const [showCreateModal, setShowCreateModal] =
        useState(false);

    const [creating, setCreating] =
        useState(false);

    const [form, setForm] =
        useState({
            projectName: '',
            brief: '',
            description: '',
            startDate: '',
            deadline: '',
            managerNotes: ''
        });


    /* =====================================================
       Authentication
    ===================================================== */

    const verifyUser =
        useCallback(() => {
            const currentUser =
                getCurrentUser();

            if (!currentUser) {
                navigate(
                    '/login',
                    {
                        replace: true
                    }
                );

                return null;
            }

            if (
                currentUser.role !==
                'manager'
            ) {
                navigate(
                    '/login',
                    {
                        replace: true
                    }
                );

                return null;
            }

            setUser(currentUser);

            return currentUser;
        }, [navigate]);


    /* =====================================================
       Load Dashboard
    ===================================================== */

    const loadData =
        useCallback(async () => {
            try {
                setLoading(true);
                setError('');

                const currentUser =
                    verifyUser();

                if (!currentUser) {
                    return;
                }

                const [
                    dashboardResult,
                    projectsResult
                ] = await Promise.all([
                    getDashboardData()
                        .catch(
                            () => null
                        ),

                    getProjects()
                ]);

                setDashboard(
                    dashboardResult
                );

                setProjects(
                    Array.isArray(
                        projectsResult
                    )
                        ? projectsResult
                        : []
                );
            } catch (err) {
                console.error(
                    'Manager Dashboard Error:',
                    err
                );

                if (
                    err?.status === 401 ||
                    err?.status === 403
                ) {
                    navigate(
                        '/login',
                        {
                            replace: true
                        }
                    );

                    return;
                }

                setError(
                    err?.message ||
                    'حدث خطأ أثناء تحميل لوحة التحكم.'
                );
            } finally {
                setLoading(false);
            }
        }, [
            navigate,
            verifyUser
        ]);


    useEffect(() => {
        loadData();
    }, [loadData]);


    /* =====================================================
       Statistics
    ===================================================== */

    const statistics =
        useMemo(() => {
            const total =
                projects.length;

            const completed =
                projects.filter(
                    (project) =>
                        isCompleted(
                            project?.status
                        )
                ).length;

            const inProgress =
                projects.filter(
                    (project) =>
                        [
                            'in-progress',
                            'in_progress',
                            'progress'
                        ].includes(
                            project?.status
                        )
                ).length;

            const pending =
                projects.filter(
                    (project) =>
                        project?.status ===
                        'pending'
                ).length;

            const withDeadline =
                projects.filter(
                    (project) =>
                        Boolean(
                            project?.deadline
                        )
                ).length;

            const overdue =
                projects.filter(
                    (project) => {
                        if (
                            !project?.deadline ||
                            isCompleted(
                                project?.status
                            )
                        ) {
                            return false;
                        }

                        const deadline =
                            new Date(
                                project.deadline
                            );

                        return (
                            !Number.isNaN(
                                deadline.getTime()
                            ) &&
                            deadline <
                                new Date()
                        );
                    }
                ).length;

            return {
                total,
                completed,
                inProgress,
                pending,
                withDeadline,
                overdue
            };
        }, [projects]);


    /* =====================================================
       Filter Projects
    ===================================================== */

    const filteredProjects =
        useMemo(() => {
            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            return projects.filter(
                (project) => {
                    const name =
                        getProjectName(
                            project
                        ).toLowerCase();

                    const description =
                        getProjectDescription(
                            project
                        ).toLowerCase();

                    const matchesSearch =
                        !normalizedSearch ||
                        name.includes(
                            normalizedSearch
                        ) ||
                        description.includes(
                            normalizedSearch
                        );

                    const status =
                        project?.status;

                    const matchesStatus =
                        statusFilter ===
                            'all' ||
                        (
                            statusFilter ===
                                'completed' &&
                            isCompleted(
                                status
                            )
                        ) ||
                        (
                            statusFilter ===
                                'in-progress' &&
                            [
                                'in-progress',
                                'in_progress',
                                'progress'
                            ].includes(
                                status
                            )
                        ) ||
                        (
                            statusFilter ===
                                'pending' &&
                            status ===
                                'pending'
                        );

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );
        }, [
            projects,
            search,
            statusFilter
        ]);


    /* =====================================================
       Form
    ===================================================== */

    const updateForm =
        (field, value) => {
            setForm(
                (previous) => ({
                    ...previous,
                    [field]: value
                })
            );
        };


    const resetForm =
        () => {
            setForm({
                projectName: '',
                brief: '',
                description: '',
                startDate: '',
                deadline: '',
                managerNotes: ''
            });
        };


    /* =====================================================
       Create Project
    ===================================================== */

    const handleCreateProject =
        async (event) => {
            event.preventDefault();

            if (
                !form.projectName.trim()
            ) {
                setError(
                    'اسم المشروع مطلوب.'
                );

                return;
            }

            try {
                setCreating(true);
                setError('');
                setSuccess('');

                await createProject({
                    projectName:
                        form.projectName.trim(),

                    brief:
                        form.brief.trim(),

                    description:
                        form.description.trim(),

                    startDate:
                        form.startDate ||
                        null,

                    deadline:
                        form.deadline ||
                        null,

                    managerNotes:
                        form.managerNotes.trim(),

                    status:
                        'in-progress'
                });

                resetForm();

                setShowCreateModal(
                    false
                );

                setSuccess(
                    'تم إنشاء المشروع بنجاح وتم إرسال إشعار للـ Coordinators.'
                );

                await loadData();
            } catch (err) {
                console.error(
                    'Create project error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر إنشاء المشروع.'
                );
            } finally {
                setCreating(false);
            }
        };


    /* =====================================================
       Navigation
    ===================================================== */

    const openProject =
        (projectId) => {
            if (!projectId) {
                return;
            }

            navigate(
                `/manager/projects/${projectId}`
            );
        };


    const handleLogout =
        async () => {
            try {
                await logoutUser();
            } catch (err) {
                console.error(
                    'Logout error:',
                    err
                );
            } finally {
                navigate(
                    '/login',
                    {
                        replace: true
                    }
                );
            }
        };


    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل لوحة تحكم الـ Manager..."
            />
        );
    }


    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="manager-dashboard-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="dashboard-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <div className="page-kicker">
                            MANAGEMENT WORKSPACE
                        </div>

                        <h1>
                            لوحة تحكم الـ Manager
                        </h1>

                        <p>
                            مرحبًا{' '}
                            <strong>
                                {
                                    user?.name ||
                                    user?.email ||
                                    'Manager'
                                }
                            </strong>
                            ، من هنا تقدر تتحكم في
                            المشاريع والمهام بالكامل.
                        </p>

                    </div>


                    <div className="header-actions">

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={
                                loadData
                            }
                        >
                            ↻ تحديث
                        </button>

                        <button
                            type="button"
                            className="create-button"
                            onClick={() => {
                                setError('');
                                setSuccess('');
                                setShowCreateModal(
                                    true
                                );
                            }}
                        >
                            + مشروع جديد
                        </button>

                        <NotificationBell
                            user={user}
                        />

                    </div>

                </section>


                {/* =================================================
                    Alerts
                ================================================= */}

                {error && (
                    <div className="alert error-alert">

                        <span>
                            ⚠️
                        </span>

                        <div>
                            {error}
                        </div>

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


                {success && (
                    <div className="alert success-alert">

                        <span>
                            ✓
                        </span>

                        <div>
                            {success}
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setSuccess('')
                            }
                        >
                            ×
                        </button>

                    </div>
                )}


                {/* =================================================
                    Statistics
                ================================================= */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📁
                        </div>

                        <div>
                            <span>
                                إجمالي المشاريع
                            </span>

                            <strong>
                                {
                                    dashboard?.totalProjects ??
                                    statistics.total
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            🔄
                        </div>

                        <div>
                            <span>
                                قيد التنفيذ
                            </span>

                            <strong>
                                {
                                    dashboard?.inProgress ??
                                    dashboard?.activeProjects ??
                                    statistics.inProgress
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ✅
                        </div>

                        <div>
                            <span>
                                مكتملة
                            </span>

                            <strong>
                                {
                                    dashboard?.completed ??
                                    dashboard?.completedProjects ??
                                    statistics.completed
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ⏳
                        </div>

                        <div>
                            <span>
                                معلقة
                            </span>

                            <strong>
                                {
                                    dashboard?.pending ??
                                    statistics.pending
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            📅
                        </div>

                        <div>
                            <span>
                                لها Deadline
                            </span>

                            <strong>
                                {
                                    statistics.withDeadline
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ⚠️
                        </div>

                        <div>
                            <span>
                                متأخرة
                            </span>

                            <strong>
                                {
                                    statistics.overdue
                                }
                            </strong>
                        </div>

                    </div>

                </section>


                {/* =================================================
                    Quick Actions
                ================================================= */}

                <section className="quick-actions">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                '/manager/projects'
                            )
                        }
                    >
                        <span>
                            📁
                        </span>

                        <div>
                            <strong>
                                كل المشاريع
                            </strong>

                            <small>
                                عرض وإدارة جميع المشاريع
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
                                '/manager/tasks'
                            )
                        }
                    >
                        <span>
                            📋
                        </span>

                        <div>
                            <strong>
                                إدارة المهام
                            </strong>

                            <small>
                                إنشاء ومتابعة وتعيين المهام
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
                                '/manager/projects'
                            )
                        }
                    >
                        <span>
                            🎨
                        </span>

                        <div>
                            <strong>
                                التعيينات
                            </strong>

                            <small>
                                تعيين Designer للمشاريع والعروض
                            </small>
                        </div>

                        <b>
                            ←
                        </b>
                    </button>

                </section>


                {/* =================================================
                    Projects Section
                ================================================= */}

                <section className="projects-section">

                    <div className="section-header">

                        <div>
                            <h2>
                                أحدث المشاريع
                            </h2>

                            <p>
                                جميع المشاريع التي يمكنك
                                إدارتها.
                            </p>
                        </div>


                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/manager/projects'
                                )
                            }
                        >
                            عرض الكل ←
                        </button>

                    </div>


                    {/* Filters */}

                    <div className="filters-panel">

                        <div className="search-box">

                            <span>
                                🔎
                            </span>

                            <input
                                type="text"
                                placeholder="ابحث عن مشروع..."
                                value={
                                    search
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch('')
                                    }
                                >
                                    ×
                                </button>
                            )}

                        </div>


                        <select
                            value={
                                statusFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setStatusFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="all">
                                كل الحالات
                            </option>

                            <option value="in-progress">
                                قيد التنفيذ
                            </option>

                            <option value="pending">
                                معلقة
                            </option>

                            <option value="completed">
                                مكتملة
                            </option>
                        </select>

                    </div>


                    {/* Project Cards */}

                    {filteredProjects.length === 0 ? (
                        <div className="empty-state">

                            <div className="empty-icon">
                                📁
                            </div>

                            <h3>
                                لا توجد مشاريع
                            </h3>

                            <p>
                                لا توجد مشاريع تطابق
                                البحث أو الفلتر الحالي.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter(
                                        'all'
                                    );
                                }}
                            >
                                عرض كل المشاريع
                            </button>

                        </div>
                    ) : (
                        <div className="projects-grid">

                            {filteredProjects
                                .slice(0, 6)
                                .map(
                                    (
                                        project
                                    ) => {

                                        const projectId =
                                            getId(
                                                project
                                            );

                                        const progress =
                                            getCheckpointProgress(
                                                project
                                            );

                                        return (
                                            <article
                                                key={
                                                    projectId
                                                }
                                                className="project-card"
                                                onClick={() =>
                                                    openProject(
                                                        projectId
                                                    )
                                                }
                                            >

                                                <div className="card-top">

                                                    <div className="project-icon">
                                                        📁
                                                    </div>

                                                    <span
                                                        className={`status-badge ${getStatusClass(
                                                            project?.status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(
                                                            project?.status
                                                        )}
                                                    </span>

                                                </div>


                                                <h3>
                                                    {getProjectName(
                                                        project
                                                    )}
                                                </h3>


                                                <p className="project-description">
                                                    {getProjectDescription(
                                                        project
                                                    )}
                                                </p>


                                                <div className="project-info">

                                                    <div>
                                                        <span>
                                                            البداية
                                                        </span>

                                                        <strong>
                                                            {formatDate(
                                                                project?.startDate
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Deadline
                                                        </span>

                                                        <strong>
                                                            {formatDate(
                                                                project?.deadline
                                                            )}
                                                        </strong>
                                                    </div>

                                                </div>


                                                <div className="progress-section">

                                                    <div className="progress-label">

                                                        <span>
                                                            Checkpoints
                                                        </span>

                                                        <strong>
                                                            {progress}%
                                                        </strong>

                                                    </div>

                                                    <div className="progress-track">

                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width:
                                                                    `${progress}%`
                                                            }}
                                                        />

                                                    </div>

                                                </div>


                                                <div className="card-footer">

                                                    <span>
                                                        فتح التفاصيل
                                                    </span>

                                                    <b>
                                                        ←
                                                    </b>

                                                </div>

                                            </article>
                                        );
                                    }
                                )}

                        </div>
                    )}

                </section>


                {/* =================================================
                    Manager Permission
                ================================================= */}

                <section className="permission-notice">

                    <div className="notice-icon">
                        👑
                    </div>

                    <div>

                        <h3>
                            صلاحيات Manager
                        </h3>

                        <p>
                            لديك صلاحية إدارة جميع المشاريع
                            والمهام، بالإضافة إلى تعيين
                            Designers للمشروع وللعرض
                            التقديمي بشكل مستقل.
                        </p>

                    </div>

                </section>

            </main>


            {/* =====================================================
                Create Project Modal
            ===================================================== */}

            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={() => {
                        if (!creating) {
                            setShowCreateModal(
                                false
                            );
                        }
                    }}
                >

                    <div
                        className="modal"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>

                                <div className="modal-kicker">
                                    NEW PROJECT
                                </div>

                                <h2>
                                    إنشاء مشروع جديد
                                </h2>

                                <p>
                                    سيتم حفظ المشروع باسم
                                    الـ Manager الحالي.
                                </p>

                            </div>


                            <button
                                type="button"
                                disabled={
                                    creating
                                }
                                onClick={() =>
                                    setShowCreateModal(
                                        false
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleCreateProject
                            }
                        >

                            <div className="form-group">

                                <label>
                                    اسم المشروع *
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.projectName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            'projectName',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="اكتب اسم المشروع"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Brief
                                </label>

                                <textarea
                                    rows={3}
                                    value={
                                        form.brief
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            'brief',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="وصف مختصر للمشروع"
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    الوصف
                                </label>

                                <textarea
                                    rows={4}
                                    value={
                                        form.description
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            'description',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="تفاصيل المشروع"
                                />

                            </div>


                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        تاريخ البداية
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.startDate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'startDate',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Deadline
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.deadline
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'deadline',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                </div>

                            </div>


                            <div className="form-group">

                                <label>
                                    ملاحظات الـ Manager
                                </label>

                                <textarea
                                    rows={4}
                                    value={
                                        form.managerNotes
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateForm(
                                            'managerNotes',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="أي ملاحظات خاصة بالمشروع"
                                />

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        creating
                                    }
                                    onClick={() =>
                                        setShowCreateModal(
                                            false
                                        )
                                    }
                                >
                                    إلغاء
                                </button>


                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={
                                        creating
                                    }
                                >
                                    {creating
                                        ? 'جاري الإنشاء...'
                                        : 'إنشاء المشروع'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}


            <style>{`

                * {
                    box-sizing: border-box;
                }

                .manager-dashboard-page {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .dashboard-container {
                    width: min(
                        1440px,
                        calc(100% - 48px)
                    );
                    margin: 0 auto;
                    padding: 110px 0 60px;
                }


                /* =========================================
                   Header
                ========================================= */

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 25px;
                    margin-bottom: 25px;
                }

                .page-kicker {
                    color: #94a3b8;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    margin-bottom: 7px;
                }

                .page-header h1 {
                    margin: 0;
                    color: #111827;
                    font-size: 34px;
                    font-weight: 900;
                }

                .page-header p {
                    margin: 9px 0 0;
                    color: #64748b;
                    font-size: 14px;
                    line-height: 1.8;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    direction: ltr;
                }

                .refresh-button,
                .create-button {
                    border-radius: 10px;
                    padding: 10px 15px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 11px;
                    font-weight: 900;
                }

                .refresh-button {
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    color: #334155;
                }

                .create-button {
                    border: 1px solid #111827;
                    background: #111827;
                    color: #ffffff;
                }

                .refresh-button:hover {
                    background: #f8fafc;
                }

                .create-button:hover {
                    background: #1f2937;
                }


                /* =========================================
                   Alerts
                ========================================= */

                .alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 13px 15px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    font-size: 12px;
                }

                .alert > div {
                    flex: 1;
                }

                .alert button {
                    border: 0;
                    background: transparent;
                    cursor: pointer;
                    font-size: 19px;
                }

                .error-alert {
                    background: #fff1f2;
                    border: 1px solid #fecdd3;
                    color: #9f1239;
                }

                .success-alert {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #166534;
                }


                /* =========================================
                   Stats
                ========================================= */

                .stats-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            6,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                    margin-bottom: 20px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
                    padding: 16px;
                    box-shadow:
                        0 6px 22px
                        rgba(
                            15,
                            23,
                            42,
                            0.035
                        );
                }

                .stat-icon {
                    width: 42px;
                    height: 42px;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }

                .stat-card span {
                    display: block;
                    color: #64748b;
                    font-size: 9px;
                    margin-bottom: 5px;
                    white-space: nowrap;
                }

                .stat-card strong {
                    display: block;
                    color: #111827;
                    font-size: 21px;
                    font-weight: 900;
                }


                /* =========================================
                   Quick Actions
                ========================================= */

                .quick-actions {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            3,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                    margin-bottom: 25px;
                }

                .quick-actions button {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    border: 1px solid #e8edf4;
                    background: #ffffff;
                    border-radius: 15px;
                    padding: 15px;
                    cursor: pointer;
                    text-align: right;
                    font-family: inherit;
                    transition:
                        transform 0.2s ease,
                        box-shadow 0.2s ease;
                }

                .quick-actions button:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 12px 28px
                        rgba(
                            15,
                            23,
                            42,
                            0.07
                        );
                }

                .quick-actions button > span {
                    width: 43px;
                    height: 43px;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 19px;
                }

                .quick-actions button div {
                    flex: 1;
                }

                .quick-actions strong {
                    display: block;
                    color: #1e293b;
                    font-size: 12px;
                    margin-bottom: 4px;
                }

                .quick-actions small {
                    color: #94a3b8;
                    font-size: 9px;
                }

                .quick-actions b {
                    color: #94a3b8;
                    font-size: 17px;
                }


                /* =========================================
                   Projects Section
                ========================================= */

                .projects-section {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 18px;
                    padding: 20px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 15px;
                }

                .section-header h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 18px;
                    font-weight: 900;
                }

                .section-header p {
                    margin: 5px 0 0;
                    color: #94a3b8;
                    font-size: 10px;
                }

                .section-header > button {
                    border: 0;
                    background: transparent;
                    color: #475569;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 900;
                }


                /* =========================================
                   Filters
                ========================================= */

                .filters-panel {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .search-box {
                    flex: 1;
                    height: 41px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                    padding: 0 11px;
                }

                .search-box input {
                    width: 100%;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: #334155;
                    font-family: inherit;
                    font-size: 11px;
                }

                .search-box button {
                    border: 0;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 17px;
                }

                .filters-panel > select {
                    width: 180px;
                    height: 41px;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                    background: #ffffff;
                    color: #475569;
                    padding: 0 10px;
                    outline: 0;
                    font-family: inherit;
                    font-size: 10px;
                }


                /* =========================================
                   Projects
                ========================================= */

                .projects-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            3,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                }

                .project-card {
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
                    padding: 16px;
                    cursor: pointer;
                    transition:
                        transform 0.2s ease,
                        box-shadow 0.2s ease,
                        border-color 0.2s ease;
                }

                .project-card:hover {
                    transform: translateY(-3px);
                    border-color: #cbd5e1;
                    box-shadow:
                        0 14px 30px
                        rgba(
                            15,
                            23,
                            42,
                            0.07
                        );
                }

                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 14px;
                }

                .project-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 11px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 19px;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    padding: 5px 9px;
                    font-size: 8px;
                    font-weight: 900;
                }

                .status-completed {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-progress {
                    background: #dbeafe;
                    color: #1d4ed8;
                }

                .status-pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                .status-default {
                    background: #f1f5f9;
                    color: #475569;
                }

                .project-card h3 {
                    margin: 0 0 7px;
                    color: #111827;
                    font-size: 15px;
                    font-weight: 900;
                }

                .project-description {
                    height: 38px;
                    margin: 0 0 13px;
                    color: #64748b;
                    font-size: 10px;
                    line-height: 1.8;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 2;
                    overflow: hidden;
                }

                .project-info {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 8px;
                    border-top: 1px solid #eef2f7;
                    padding-top: 12px;
                }

                .project-info span {
                    display: block;
                    color: #94a3b8;
                    font-size: 8px;
                    margin-bottom: 4px;
                }

                .project-info strong {
                    display: block;
                    color: #475569;
                    font-size: 9px;
                }

                .progress-section {
                    margin-top: 13px;
                }

                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }

                .progress-label span {
                    color: #94a3b8;
                    font-size: 8px;
                }

                .progress-label strong {
                    color: #475569;
                    font-size: 8px;
                }

                .progress-track {
                    height: 5px;
                    overflow: hidden;
                    border-radius: 999px;
                    background: #e2e8f0;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: inherit;
                    background: #334155;
                    transition: width 0.25s ease;
                }

                .card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #eef2f7;
                    padding-top: 12px;
                    margin-top: 13px;
                    color: #64748b;
                    font-size: 9px;
                    font-weight: 800;
                }

                .card-footer b {
                    font-size: 16px;
                }


                /* =========================================
                   Empty
                ========================================= */

                .empty-state {
                    text-align: center;
                    border: 1px dashed #dbe3ed;
                    border-radius: 15px;
                    padding: 55px 20px;
                }

                .empty-icon {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 13px;
                    border-radius: 18px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 27px;
                }

                .empty-state h3 {
                    margin: 0;
                    color: #111827;
                    font-size: 18px;
                    font-weight: 900;
                }

                .empty-state p {
                    margin: 7px 0 15px;
                    color: #94a3b8;
                    font-size: 11px;
                }

                .empty-state button {
                    border: 0;
                    border-radius: 8px;
                    background: #111827;
                    color: #ffffff;
                    padding: 9px 14px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 800;
                }


                /* =========================================
                   Permission
                ========================================= */

                .permission-notice {
                    display: flex;
                    align-items: flex-start;
                    gap: 13px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
                    padding: 17px;
                    margin-top: 20px;
                }

                .notice-icon {
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }

                .permission-notice h3 {
                    margin: 0 0 4px;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 900;
                }

                .permission-notice p {
                    margin: 0;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.8;
                }


                /* =========================================
                   Modal
                ========================================= */

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background: rgba(
                        15,
                        23,
                        42,
                        0.48
                    );
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .modal {
                    width: min(
                        650px,
                        100%
                    );
                    max-height: calc(
                        100vh - 40px
                    );
                    overflow-y: auto;
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 22px;
                    box-shadow:
                        0 25px 70px
                        rgba(
                            15,
                            23,
                            42,
                            0.25
                        );
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .modal-kicker {
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 1.5px;
                    margin-bottom: 5px;
                }

                .modal-header h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 19px;
                    font-weight: 900;
                }

                .modal-header p {
                    margin: 5px 0 0;
                    color: #64748b;
                    font-size: 10px;
                }

                .modal-header > button {
                    width: 32px;
                    height: 32px;
                    border: 0;
                    border-radius: 8px;
                    background: #f1f5f9;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 20px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    margin-bottom: 14px;
                }

                .form-group label {
                    color: #475569;
                    font-size: 10px;
                    font-weight: 900;
                }

                .form-group input,
                .form-group textarea {
                    width: 100%;
                    border: 1px solid #dfe6ef;
                    border-radius: 9px;
                    padding: 11px 12px;
                    outline: 0;
                    background: #ffffff;
                    color: #334155;
                    font-family: inherit;
                    font-size: 11px;
                }

                .form-group input:focus,
                .form-group textarea:focus {
                    border-color: #94a3b8;
                    box-shadow:
                        0 0 0 3px
                        rgba(
                            148,
                            163,
                            184,
                            0.15
                        );
                }

                .form-group textarea {
                    resize: vertical;
                    line-height: 1.7;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-start;
                    gap: 8px;
                    margin-top: 20px;
                }

                .cancel-button,
                .save-button {
                    border: 0;
                    border-radius: 9px;
                    padding: 10px 17px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 900;
                }

                .cancel-button {
                    background: #f1f5f9;
                    color: #475569;
                }

                .save-button {
                    background: #111827;
                    color: #ffffff;
                }

                .cancel-button:disabled,
                .save-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }


                /* =========================================
                   Responsive
                ========================================= */

                @media (
                    max-width: 1200px
                ) {
                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(0, 1fr)
                            );
                    }

                    .projects-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }
                }

                @media (
                    max-width: 850px
                ) {
                    .dashboard-container {
                        width:
                            calc(
                                100% - 24px
                            );

                        padding-top: 95px;
                    }

                    .page-header {
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                        flex-wrap: wrap;
                    }

                    .quick-actions {
                        grid-template-columns: 1fr;
                    }

                    .filters-panel {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .filters-panel > select {
                        width: 100%;
                    }
                }

                @media (
                    max-width: 600px
                ) {
                    .page-header h1 {
                        font-size: 27px;
                    }

                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .projects-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (
                    max-width: 400px
                ) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                }

            `}</style>

        </div>
    );
}