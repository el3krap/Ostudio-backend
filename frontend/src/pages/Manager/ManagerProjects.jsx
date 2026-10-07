// frontend/src/pages/Manager/ManagerProjects.jsx

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
    getProjects,
    createProject,
    deleteProject
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

function getDesignerName(project) {
    return (
        project?.assignedDesigner?.name ||
        project?.assignedDesigner?.displayName ||
        project?.assignedDesignerName ||
        project?.assignedDesigner?.email ||
        'غير معين'
    );
}

function getPresenterName(project) {
    return (
        project?.assignedPresenter?.name ||
        project?.assignedPresenter?.displayName ||
        project?.assignedPresenterName ||
        project?.assignedPresenter?.email ||
        'غير معين'
    );
}

function getCheckpointProgress(project) {
    const checkpoints =
        Array.isArray(
            project?.checkpoints
        )
            ? project.checkpoints
            : [];

    if (
        checkpoints.length === 0
    ) {
        return 0;
    }

    const completed =
        checkpoints.filter(
            (checkpoint) =>
                Boolean(
                    checkpoint?.isCompleted
                )
        ).length;

    return Math.round(
        (
            completed /
            checkpoints.length
        ) *
        100
    );
}

function isOverdue(project) {
    if (
        !project?.deadline ||
        project?.status === 'completed'
    ) {
        return false;
    }

    const deadline =
        new Date(
            project.deadline
        );

    if (
        Number.isNaN(
            deadline.getTime()
        )
    ) {
        return false;
    }

    return (
        deadline.getTime() <
        Date.now()
    );
}


/* =========================================================
   Component
========================================================= */

export default function ManagerProjects() {
    const navigate =
        useNavigate();

    const [user, setUser] =
        useState(null);

    const [projects, setProjects] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');

    const [search, setSearch] =
        useState('');

    const [statusFilter, setStatusFilter] =
        useState('all');

    const [assignmentFilter, setAssignmentFilter] =
        useState('all');

    const [deadlineFilter, setDeadlineFilter] =
        useState('all');

    const [sortBy, setSortBy] =
        useState('newest');

    const [showCreateModal, setShowCreateModal] =
        useState(false);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [projectToDelete, setProjectToDelete] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
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
       Verify User
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

            setUser(
                currentUser
            );

            return currentUser;
        }, [navigate]);


    /* =====================================================
       Load Projects
    ===================================================== */

    const loadProjects =
        useCallback(
            async (
                showLoader = true
            ) => {
                try {
                    if (showLoader) {
                        setLoading(true);
                    } else {
                        setRefreshing(true);
                    }

                    setError('');

                    const currentUser =
                        verifyUser();

                    if (!currentUser) {
                        return;
                    }

                    const result =
                        await getProjects();

                    setProjects(
                        Array.isArray(result)
                            ? result
                            : []
                    );
                } catch (err) {
                    console.error(
                        'Load manager projects error:',
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
                        'تعذر تحميل المشاريع.'
                    );
                } finally {
                    if (showLoader) {
                        setLoading(false);
                    } else {
                        setRefreshing(false);
                    }
                }
            },
            [
                navigate,
                verifyUser
            ]
        );


    useEffect(() => {
        loadProjects();
    }, [
        loadProjects
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
                setSaving(true);
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

                await loadProjects(
                    false
                );
            } catch (err) {
                console.error(
                    'Create manager project error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر إنشاء المشروع.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Delete Project
    ===================================================== */

    const openDeleteModal =
        (project) => {
            setProjectToDelete(
                project
            );

            setShowDeleteModal(
                true
            );

            setError('');
        };


    const handleDeleteProject =
        async () => {
            if (
                !projectToDelete
            ) {
                return;
            }

            const projectId =
                getId(
                    projectToDelete
                );

            if (!projectId) {
                setError(
                    'معرف المشروع غير موجود.'
                );

                return;
            }

            try {
                setDeleting(true);
                setError('');
                setSuccess('');

                await deleteProject(
                    projectId
                );

                setProjects(
                    (previous) =>
                        previous.filter(
                            (project) =>
                                getId(
                                    project
                                ) !==
                                projectId
                        )
                );

                setShowDeleteModal(
                    false
                );

                setProjectToDelete(
                    null
                );

                setSuccess(
                    'تم حذف المشروع بنجاح.'
                );
            } catch (err) {
                console.error(
                    'Delete manager project error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر حذف المشروع.'
                );
            } finally {
                setDeleting(false);
            }
        };


    /* =====================================================
       Logout
    ===================================================== */

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
       Filtering
    ===================================================== */

    const filteredProjects =
        useMemo(() => {
            let result =
                [...projects];

            const query =
                search
                    .trim()
                    .toLowerCase();

            if (query) {
                result =
                    result.filter(
                        (project) => {
                            const searchable =
                                [
                                    project?.projectName,
                                    project?.brief,
                                    project?.briefName,
                                    project?.description,
                                    project?.managerNotes,
                                    project?.coordinatorNotes,
                                    project?.assignedDesignerName,
                                    project?.assignedPresenterName,
                                    project?.assignedDesigner?.name,
                                    project?.assignedPresenter?.name
                                ]
                                    .filter(Boolean)
                                    .join(' ')
                                    .toLowerCase();

                            return searchable.includes(
                                query
                            );
                        }
                    );
            }

            if (
                statusFilter !==
                'all'
            ) {
                result =
                    result.filter(
                        (project) =>
                            project?.status ===
                            statusFilter
                    );
            }

            if (
                assignmentFilter !==
                'all'
            ) {
                result =
                    result.filter(
                        (project) => {
                            const hasDesigner =
                                Boolean(
                                    project?.assignedDesigner ||
                                    project?.assignedDesignerId ||
                                    project?.assignedDesignerName
                                );

                            const hasPresenter =
                                Boolean(
                                    project?.assignedPresenter ||
                                    project?.assignedPresenterId ||
                                    project?.assignedPresenterName
                                );

                            if (
                                assignmentFilter ===
                                'assigned'
                            ) {
                                return (
                                    hasDesigner ||
                                    hasPresenter
                                );
                            }

                            if (
                                assignmentFilter ===
                                'fully-assigned'
                            ) {
                                return (
                                    hasDesigner &&
                                    hasPresenter
                                );
                            }

                            if (
                                assignmentFilter ===
                                'unassigned'
                            ) {
                                return (
                                    !hasDesigner &&
                                    !hasPresenter
                                );
                            }

                            return true;
                        }
                    );
            }

            if (
                deadlineFilter !==
                'all'
            ) {
                result =
                    result.filter(
                        (project) => {
                            const overdue =
                                isOverdue(
                                    project
                                );

                            const hasDeadline =
                                Boolean(
                                    project?.deadline
                                );

                            if (
                                deadlineFilter ===
                                'overdue'
                            ) {
                                return overdue;
                            }

                            if (
                                deadlineFilter ===
                                'with-deadline'
                            ) {
                                return (
                                    hasDeadline &&
                                    !overdue
                                );
                            }

                            if (
                                deadlineFilter ===
                                'no-deadline'
                            ) {
                                return !hasDeadline;
                            }

                            return true;
                        }
                    );
            }

            result.sort(
                (
                    a,
                    b
                ) => {
                    if (
                        sortBy ===
                        'oldest'
                    ) {
                        return (
                            new Date(
                                a?.createdAt ||
                                0
                            ).getTime() -
                            new Date(
                                b?.createdAt ||
                                0
                            ).getTime()
                        );
                    }

                    if (
                        sortBy ===
                        'deadline'
                    ) {
                        return (
                            new Date(
                                a?.deadline ||
                                '9999-12-31'
                            ).getTime() -
                            new Date(
                                b?.deadline ||
                                '9999-12-31'
                            ).getTime()
                        );
                    }

                    if (
                        sortBy ===
                        'name'
                    ) {
                        return (
                            String(
                                a?.projectName ||
                                ''
                            )
                                .localeCompare(
                                    String(
                                        b?.projectName ||
                                        ''
                                    ),
                                    'ar'
                                )
                        );
                    }

                    return (
                        new Date(
                            b?.createdAt ||
                            0
                        ).getTime() -
                        new Date(
                            a?.createdAt ||
                            0
                        ).getTime()
                    );
                }
            );

            return result;
        }, [
            projects,
            search,
            statusFilter,
            assignmentFilter,
            deadlineFilter,
            sortBy
        ]);


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
                        project?.status ===
                            'completed' ||
                        project?.status ===
                            'complete' ||
                        project?.status ===
                            'done'
                ).length;

            const inProgress =
                projects.filter(
                    (project) =>
                        project?.status ===
                            'in-progress' ||
                        project?.status ===
                            'in_progress' ||
                        project?.status ===
                            'progress'
                ).length;

            const pending =
                projects.filter(
                    (project) =>
                        project?.status ===
                        'pending'
                ).length;

            const assigned =
                projects.filter(
                    (project) =>
                        Boolean(
                            project?.assignedDesigner ||
                            project?.assignedDesignerId ||
                            project?.assignedPresenter ||
                            project?.assignedPresenterId
                        )
                ).length;

            const fullyAssigned =
                projects.filter(
                    (project) =>
                        Boolean(
                            project?.assignedDesigner ||
                            project?.assignedDesignerId
                        ) &&
                        Boolean(
                            project?.assignedPresenter ||
                            project?.assignedPresenterId
                        )
                ).length;

            const overdue =
                projects.filter(
                    (project) =>
                        isOverdue(
                            project
                        )
                ).length;

            return {
                total,
                completed,
                inProgress,
                pending,
                assigned,
                fullyAssigned,
                overdue
            };
        }, [
            projects
        ]);


    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل المشاريع..."
            />
        );
    }


    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="manager-projects-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="projects-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <div className="page-kicker">
                            MANAGER / PROJECTS
                        </div>

                        <h1>
                            كل المشاريع
                        </h1>

                        <p>
                            إدارة ومتابعة جميع مشاريع
                            Ostudio من مكان واحد.
                        </p>

                    </div>


                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="refresh-button"
                            disabled={
                                refreshing
                            }
                            onClick={() =>
                                loadProjects(
                                    false
                                )
                            }
                        >
                            {refreshing
                                ? 'جاري التحديث...'
                                : '↻ تحديث'}
                        </button>

                        <button
                            type="button"
                            className="create-button"
                            onClick={() => {
                                setError('');
                                setSuccess('');
                                resetForm();
                                setShowCreateModal(
                                    true
                                );
                            }}
                        >
                            ＋ مشروع جديد
                        </button>

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
                                    statistics.total
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ⚙️
                        </div>

                        <div>
                            <span>
                                قيد التنفيذ
                            </span>

                            <strong>
                                {
                                    statistics.inProgress
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ✓
                        </div>

                        <div>
                            <span>
                                مكتملة
                            </span>

                            <strong>
                                {
                                    statistics.completed
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            🎨
                        </div>

                        <div>
                            <span>
                                بها Assignments
                            </span>

                            <strong>
                                {
                                    statistics.assigned
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card warning-stat">

                        <div className="stat-icon">
                            ⏰
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
                    Filters
                ================================================= */}

                <section className="filters-card">

                    <div className="search-box">

                        <span>
                            🔎
                        </span>

                        <input
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
                            placeholder="ابحث باسم المشروع أو الـ Brief أو المصمم..."
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


                    <div className="filter-row">

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

                            <option value="completed">
                                مكتمل
                            </option>

                            <option value="pending">
                                معلق
                            </option>
                        </select>


                        <select
                            value={
                                assignmentFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setAssignmentFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="all">
                                كل التعيينات
                            </option>

                            <option value="assigned">
                                به Assignment
                            </option>

                            <option value="fully-assigned">
                                Designer + Presentation
                            </option>

                            <option value="unassigned">
                                بدون Assignment
                            </option>
                        </select>


                        <select
                            value={
                                deadlineFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setDeadlineFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="all">
                                كل المواعيد
                            </option>

                            <option value="with-deadline">
                                بها Deadline
                            </option>

                            <option value="overdue">
                                متأخرة
                            </option>

                            <option value="no-deadline">
                                بدون Deadline
                            </option>
                        </select>


                        <select
                            value={
                                sortBy
                            }
                            onChange={(
                                event
                            ) =>
                                setSortBy(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="newest">
                                الأحدث أولاً
                            </option>

                            <option value="oldest">
                                الأقدم أولاً
                            </option>

                            <option value="deadline">
                                أقرب Deadline
                            </option>

                            <option value="name">
                                الاسم
                            </option>
                        </select>

                    </div>

                </section>


                {/* =================================================
                    Results Header
                ================================================= */}

                <div className="results-header">

                    <div>

                        <strong>
                            {
                                filteredProjects.length
                            }
                        </strong>

                        <span>
                            مشروع ظاهر
                        </span>

                    </div>


                    {(
                        search ||
                        statusFilter !== 'all' ||
                        assignmentFilter !== 'all' ||
                        deadlineFilter !== 'all'
                    ) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter(
                                    'all'
                                );
                                setAssignmentFilter(
                                    'all'
                                );
                                setDeadlineFilter(
                                    'all'
                                );
                            }}
                        >
                            مسح الفلاتر
                        </button>
                    )}

                </div>


                {/* =================================================
                    Projects
                ================================================= */}

                {filteredProjects.length === 0 ? (
                    <section className="empty-state">

                        <div className="empty-icon">
                            📂
                        </div>

                        <h2>
                            لا توجد مشاريع
                        </h2>

                        <p>
                            {projects.length === 0
                                ? 'لم يتم إنشاء أي مشروع حتى الآن.'
                                : 'لا يوجد مشروع يطابق الفلاتر الحالية.'}
                        </p>

                        {projects.length === 0 ? (
                            <button
                                type="button"
                                className="create-button"
                                onClick={() => {
                                    resetForm();
                                    setShowCreateModal(
                                        true
                                    );
                                }}
                            >
                                ＋ إنشاء أول مشروع
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="clear-filter-button"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter(
                                        'all'
                                    );
                                    setAssignmentFilter(
                                        'all'
                                    );
                                    setDeadlineFilter(
                                        'all'
                                    );
                                }}
                            >
                                مسح الفلاتر
                            </button>
                        )}

                    </section>
                ) : (
                    <section className="projects-grid">

                        {filteredProjects.map(
                            (project) => {
                                const id =
                                    getId(
                                        project
                                    );

                                const progress =
                                    getCheckpointProgress(
                                        project
                                    );

                                const overdue =
                                    isOverdue(
                                        project
                                    );

                                return (
                                    <article
                                        key={
                                            id
                                        }
                                        className="project-card"
                                    >

                                        <div className="project-card-top">

                                            <div className="project-icon">
                                                📁
                                            </div>

                                            <div className="project-card-title">

                                                <h2>
                                                    {
                                                        project.projectName ||
                                                        'مشروع بدون اسم'
                                                    }
                                                </h2>

                                                <span>
                                                    {
                                                        project.briefName ||
                                                        'OSTUDIO Project'
                                                    }
                                                </span>

                                            </div>

                                            <span
                                                className={`status-badge ${getStatusClass(
                                                    project.status
                                                )}`}
                                            >
                                                {
                                                    getStatusLabel(
                                                        project.status
                                                    )
                                                }
                                            </span>

                                        </div>


                                        <p className="project-description">
                                            {
                                                project.brief ||
                                                project.description ||
                                                'لا يوجد وصف للمشروع.'
                                            }
                                        </p>


                                        <div className="project-meta">

                                            <div>
                                                <span>
                                                    البداية
                                                </span>

                                                <strong>
                                                    {
                                                        formatDate(
                                                            project.startDate
                                                        )
                                                    }
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    Deadline
                                                </span>

                                                <strong
                                                    className={
                                                        overdue
                                                            ? 'overdue-text'
                                                            : ''
                                                    }
                                                >
                                                    {
                                                        formatDate(
                                                            project.deadline
                                                        )
                                                    }
                                                </strong>
                                            </div>

                                        </div>


                                        <div className="progress-section">

                                            <div className="progress-header">

                                                <span>
                                                    Checkpoints
                                                </span>

                                                <strong>
                                                    {
                                                        progress
                                                    }%
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


                                        <div className="team-section">

                                            <div className="team-item">

                                                <span className="team-icon">
                                                    🎨
                                                </span>

                                                <div>
                                                    <small>
                                                        Project Designer
                                                    </small>

                                                    <strong>
                                                        {
                                                            getDesignerName(
                                                                project
                                                            )
                                                        }
                                                    </strong>
                                                </div>

                                            </div>


                                            <div className="team-item">

                                                <span className="team-icon">
                                                    🖥️
                                                </span>

                                                <div>
                                                    <small>
                                                        Presentation Designer
                                                    </small>

                                                    <strong>
                                                        {
                                                            getPresenterName(
                                                                project
                                                            )
                                                        }
                                                    </strong>
                                                </div>

                                            </div>

                                        </div>


                                        <div className="project-card-actions">

                                            <button
                                                type="button"
                                                className="open-button"
                                                onClick={() =>
                                                    navigate(
                                                        `/manager/projects/${id}`
                                                    )
                                                }
                                            >
                                                فتح التفاصيل
                                                <span>
                                                    ←
                                                </span>
                                            </button>


                                            <button
                                                type="button"
                                                className="card-delete-button"
                                                onClick={() =>
                                                    openDeleteModal(
                                                        project
                                                    )
                                                }
                                            >
                                                🗑
                                            </button>

                                        </div>

                                    </article>
                                );
                            }
                        )}

                    </section>
                )}

            </main>


            {/* =====================================================
                Create Modal
            ===================================================== */}

            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={() => {
                        if (!saving) {
                            setShowCreateModal(
                                false
                            );
                            resetForm();
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
                                    بعد الإنشاء سيتم إشعار
                                    الـ Coordinators.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    saving
                                }
                                onClick={() => {
                                    setShowCreateModal(
                                        false
                                    );
                                    resetForm();
                                }}
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleCreateProject
                            }
                        >

                            <div className="form-grid">

                                <div className="form-group full">

                                    <label>
                                        اسم المشروع *
                                    </label>

                                    <input
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
                                        placeholder="مثال: Branding Project"
                                        required
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        Brief
                                    </label>

                                    <textarea
                                        rows={4}
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
                                        placeholder="اكتب الـ Brief الخاص بالمشروع..."
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        Description
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
                                        placeholder="وصف المشروع..."
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Start Date
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


                                <div className="form-group full">

                                    <label>
                                        Manager Notes
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
                                        placeholder="ملاحظات خاصة بالمشروع..."
                                    />

                                </div>

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        saving
                                    }
                                    onClick={() => {
                                        setShowCreateModal(
                                            false
                                        );
                                        resetForm();
                                    }}
                                >
                                    إلغاء
                                </button>


                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving
                                        ? 'جاري الإنشاء...'
                                        : 'إنشاء المشروع'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}


            {/* =====================================================
                Delete Modal
            ===================================================== */}

            {showDeleteModal &&
                projectToDelete && (
                    <div
                        className="modal-overlay"
                        onMouseDown={() => {
                            if (!deleting) {
                                setShowDeleteModal(
                                    false
                                );
                                setProjectToDelete(
                                    null
                                );
                            }
                        }}
                    >

                        <div
                            className="modal delete-modal"
                            onMouseDown={(event) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="delete-icon">
                                🗑
                            </div>

                            <h2>
                                حذف المشروع؟
                            </h2>

                            <p>
                                سيتم حذف مشروع
                                <strong>
                                    {' '}
                                    {
                                        projectToDelete.projectName ||
                                        'بدون اسم'
                                    }
                                    {' '}
                                </strong>
                                نهائيًا.
                                <br />
                                هذا الإجراء لا يمكن
                                التراجع عنه.
                            </p>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        deleting
                                    }
                                    onClick={() => {
                                        setShowDeleteModal(
                                            false
                                        );
                                        setProjectToDelete(
                                            null
                                        );
                                    }}
                                >
                                    إلغاء
                                </button>


                                <button
                                    type="button"
                                    className="danger-button"
                                    disabled={
                                        deleting
                                    }
                                    onClick={
                                        handleDeleteProject
                                    }
                                >
                                    {deleting
                                        ? 'جاري الحذف...'
                                        : 'نعم، حذف المشروع'}
                                </button>

                            </div>

                        </div>

                    </div>
                )}


            {/* =====================================================
                Styles
            ===================================================== */}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .manager-projects-page {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .projects-container {
                    width: min(
                        1440px,
                        calc(100% - 48px)
                    );
                    margin: 0 auto;
                    padding: 105px 0 60px;
                }


                /* =========================================
                   Header
                ========================================= */

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .page-kicker {
                    color: #94a3b8;
                    font-size: 9px;
                    letter-spacing: 1.5px;
                    font-weight: 900;
                    margin-bottom: 5px;
                }

                .page-header h1 {
                    margin: 0;
                    color: #111827;
                    font-size: 30px;
                    font-weight: 900;
                }

                .page-header p {
                    margin: 7px 0 0;
                    color: #64748b;
                    font-size: 11px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    direction: ltr;
                }

                .refresh-button,
                .create-button {
                    border-radius: 9px;
                    padding: 10px 14px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 9px;
                    font-weight: 900;
                }

                .refresh-button {
                    border: 1px solid #dbe3ed;
                    background: #ffffff;
                    color: #475569;
                }

                .create-button {
                    border: 0;
                    background: #111827;
                    color: #ffffff;
                }

                .refresh-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }


                /* =========================================
                   Alerts
                ========================================= */

                .alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 14px;
                    border-radius: 11px;
                    margin-bottom: 15px;
                    font-size: 11px;
                }

                .alert > div {
                    flex: 1;
                }

                .alert button {
                    border: 0;
                    background: transparent;
                    cursor: pointer;
                    font-size: 18px;
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
                            5,
                            minmax(0, 1fr)
                        );
                    gap: 11px;
                    margin-bottom: 17px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 13px;
                    padding: 13px;
                }

                .stat-icon {
                    width: 38px;
                    height: 38px;
                    flex-shrink: 0;
                    border-radius: 10px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                }

                .stat-card span {
                    display: block;
                    color: #94a3b8;
                    font-size: 8px;
                    margin-bottom: 3px;
                }

                .stat-card strong {
                    display: block;
                    color: #334155;
                    font-size: 18px;
                    font-weight: 900;
                }

                .warning-stat .stat-icon {
                    background: #fff7ed;
                }


                /* =========================================
                   Filters
                ========================================= */

                .filters-card {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 14px;
                    padding: 13px;
                    margin-bottom: 17px;
                }

                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid #dfe6ef;
                    border-radius: 9px;
                    padding: 0 10px;
                    margin-bottom: 10px;
                }

                .search-box span {
                    font-size: 13px;
                }

                .search-box input {
                    flex: 1;
                    min-width: 0;
                    border: 0;
                    outline: 0;
                    padding: 10px 0;
                    color: #334155;
                    font-family: inherit;
                    font-size: 10px;
                    background: transparent;
                }

                .search-box button {
                    border: 0;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 16px;
                }

                .filter-row {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            4,
                            minmax(0, 1fr)
                        );
                    gap: 8px;
                }

                .filter-row select {
                    width: 100%;
                    border: 1px solid #dfe6ef;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #475569;
                    padding: 9px;
                    outline: 0;
                    font-family: inherit;
                    font-size: 9px;
                }


                /* =========================================
                   Results
                ========================================= */

                .results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .results-header > div {
                    display: flex;
                    align-items: baseline;
                    gap: 5px;
                }

                .results-header strong {
                    color: #334155;
                    font-size: 15px;
                }

                .results-header span {
                    color: #94a3b8;
                    font-size: 9px;
                }

                .results-header button {
                    border: 0;
                    background: transparent;
                    color: #64748b;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 9px;
                    font-weight: 800;
                }


                /* =========================================
                   Cards
                ========================================= */

                .projects-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            3,
                            minmax(0, 1fr)
                        );
                    gap: 14px;
                }

                .project-card {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 16px;
                    padding: 15px;
                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease;
                }

                .project-card:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 12px 30px
                        rgba(
                            15,
                            23,
                            42,
                            0.07
                        );
                }

                .project-card-top {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                }

                .project-icon {
                    width: 42px;
                    height: 42px;
                    flex-shrink: 0;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }

                .project-card-title {
                    min-width: 0;
                    flex: 1;
                }

                .project-card-title h2 {
                    margin: 0;
                    color: #1e293b;
                    font-size: 12px;
                    font-weight: 900;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .project-card-title span {
                    display: block;
                    color: #94a3b8;
                    font-size: 8px;
                    margin-top: 4px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    padding: 5px 8px;
                    font-size: 7px;
                    font-weight: 900;
                    white-space: nowrap;
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

                .project-description {
                    min-height: 40px;
                    margin: 13px 0;
                    color: #64748b;
                    font-size: 9px;
                    line-height: 1.8;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .project-meta {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 7px;
                }

                .project-meta > div {
                    background: #f8fafc;
                    border-radius: 9px;
                    padding: 8px;
                }

                .project-meta span {
                    display: block;
                    color: #94a3b8;
                    font-size: 7px;
                    margin-bottom: 3px;
                }

                .project-meta strong {
                    color: #475569;
                    font-size: 8px;
                }

                .overdue-text {
                    color: #be123c !important;
                }


                /* =========================================
                   Progress
                ========================================= */

                .progress-section {
                    margin-top: 12px;
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }

                .progress-header span {
                    color: #94a3b8;
                    font-size: 7px;
                }

                .progress-header strong {
                    color: #475569;
                    font-size: 7px;
                }

                .progress-track {
                    height: 5px;
                    background: #e2e8f0;
                    border-radius: 999px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: #334155;
                    border-radius: inherit;
                }


                /* =========================================
                   Team
                ========================================= */

                .team-section {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 6px;
                    margin-top: 12px;
                }

                .team-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    min-width: 0;
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 7px;
                }

                .team-icon {
                    width: 27px;
                    height: 27px;
                    flex-shrink: 0;
                    border-radius: 7px;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }

                .team-item div {
                    min-width: 0;
                }

                .team-item small {
                    display: block;
                    color: #94a3b8;
                    font-size: 6px;
                    margin-bottom: 2px;
                }

                .team-item strong {
                    display: block;
                    color: #475569;
                    font-size: 7px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }


                /* =========================================
                   Card Actions
                ========================================= */

                .project-card-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 13px;
                    padding-top: 11px;
                    border-top: 1px solid #eef2f7;
                }

                .open-button {
                    flex: 1;
                    border: 0;
                    border-radius: 8px;
                    background: #111827;
                    color: #ffffff;
                    padding: 9px 10px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 8px;
                    font-weight: 900;
                }

                .open-button span {
                    margin-right: 5px;
                }

                .card-delete-button {
                    width: 34px;
                    height: 34px;
                    border: 1px solid #fecdd3;
                    border-radius: 8px;
                    background: #fff1f2;
                    color: #be123c;
                    cursor: pointer;
                }


                /* =========================================
                   Empty
                ========================================= */

                .empty-state {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 17px;
                    padding: 55px 20px;
                    text-align: center;
                }

                .empty-icon {
                    font-size: 42px;
                    margin-bottom: 12px;
                }

                .empty-state h2 {
                    margin: 0;
                    color: #334155;
                    font-size: 18px;
                }

                .empty-state p {
                    margin: 7px 0 18px;
                    color: #94a3b8;
                    font-size: 10px;
                }

                .clear-filter-button {
                    border: 1px solid #dbe3ed;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #475569;
                    padding: 9px 13px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 9px;
                    font-weight: 800;
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
                        0.5
                    );
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .modal {
                    width: min(
                        680px,
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

                .delete-modal {
                    width: min(
                        440px,
                        100%
                    );
                    text-align: center;
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
                    font-size: 8px;
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
                    width: 31px;
                    height: 31px;
                    border: 0;
                    border-radius: 8px;
                    background: #f1f5f9;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 19px;
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

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }

                .form-group.full {
                    grid-column: 1 / -1;
                }

                .form-group label {
                    color: #475569;
                    font-size: 9px;
                    font-weight: 900;
                }

                .form-group input,
                .form-group textarea {
                    width: 100%;
                    border: 1px solid #dfe6ef;
                    border-radius: 9px;
                    padding: 10px 11px;
                    outline: 0;
                    background: #ffffff;
                    color: #334155;
                    font-family: inherit;
                    font-size: 10px;
                }

                .form-group textarea {
                    resize: vertical;
                    line-height: 1.7;
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
                            0.13
                        );
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-start;
                    gap: 8px;
                    margin-top: 20px;
                }

                .cancel-button,
                .save-button,
                .danger-button {
                    border: 0;
                    border-radius: 9px;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 9px;
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

                .danger-button {
                    background: #be123c;
                    color: #ffffff;
                }

                .delete-icon {
                    width: 58px;
                    height: 58px;
                    margin: 0 auto 13px;
                    border-radius: 17px;
                    background: #fff1f2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 25px;
                }

                .delete-modal h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 19px;
                }

                .delete-modal p {
                    margin: 9px 0 0;
                    color: #64748b;
                    font-size: 10px;
                    line-height: 1.8;
                }

                .cancel-button:disabled,
                .save-button:disabled,
                .danger-button:disabled {
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
                    .projects-container {
                        width:
                            calc(
                                100% - 24px
                            );
                        padding-top: 95px;
                    }

                    .page-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                        flex-wrap: wrap;
                    }

                    .filter-row {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }
                }

                @media (
                    max-width: 600px
                ) {
                    .projects-grid {
                        grid-template-columns: 1fr;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .filter-row {
                        grid-template-columns: 1fr;
                    }

                    .team-section {
                        grid-template-columns: 1fr;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-group.full {
                        grid-column: auto;
                    }

                    .modal {
                        padding: 17px;
                    }

                    .page-header h1 {
                        font-size: 25px;
                    }
                }

            `}</style>

        </div>
    );
}