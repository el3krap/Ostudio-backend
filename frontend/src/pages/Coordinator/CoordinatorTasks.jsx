// frontend/src/pages/Coordinator/CoordinatorTasks.jsx

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    removeTaskAssignment,
    updateTaskStatus,
    getDesigners
} from '../../services/coordinatorService';

/* =========================================================
   Helpers
========================================================= */

function getId(item) {
    if (!item) {
        return null;
    }

    return (
        item._id ||
        item.mongoId ||
        item.id ||
        null
    );
}

function getTaskTitle(task) {
    return (
        task?.title ||
        task?.taskName ||
        'مهمة بدون اسم'
    );
}

function getTaskDescription(task) {
    return (
        task?.description ||
        task?.notes ||
        'لا يوجد وصف للمهمة.'
    );
}

function getProjectId(task) {
    if (!task) {
        return null;
    }

    if (
        task.projectId &&
        typeof task.projectId === 'object'
    ) {
        return getId(
            task.projectId
        );
    }

    if (
        task.project &&
        typeof task.project === 'object'
    ) {
        return getId(
            task.project
        );
    }

    return (
        task.projectId ||
        getId(task.project) ||
        null
    );
}

function getProjectName(task) {
    if (
        task?.projectId &&
        typeof task.projectId === 'object'
    ) {
        return (
            task.projectId.projectName ||
            task.projectId.name ||
            task.projectId.title ||
            'مشروع'
        );
    }

    if (
        task?.project &&
        typeof task.project === 'object'
    ) {
        return (
            task.project.projectName ||
            task.project.name ||
            task.project.title ||
            'مشروع'
        );
    }

    return (
        task?.projectName ||
        'مشروع غير محدد'
    );
}

function getAssignedUser(task) {
    if (
        task?.assignedTo &&
        typeof task.assignedTo === 'object'
    ) {
        return task.assignedTo;
    }

    if (
        task?.assignedDesigner &&
        typeof task.assignedDesigner === 'object'
    ) {
        return task.assignedDesigner;
    }

    return null;
}

function getAssignedUserId(task) {
    const assigned =
        getAssignedUser(task);

    if (assigned) {
        return getId(assigned);
    }

    return (
        task?.assignedTo ||
        task?.assignedToId ||
        task?.assignedDesignerId ||
        null
    );
}

function getAssignedUserName(task) {
    const assigned =
        getAssignedUser(task);

    if (assigned) {
        return (
            assigned.name ||
            assigned.displayName ||
            assigned.email ||
            'مصمم'
        );
    }

    return (
        task?.assignedToName ||
        task?.assignedDesignerName ||
        null
    );
}

function normalizeStatus(status) {
    if (
        status === 'completed' ||
        status === 'complete' ||
        status === 'done'
    ) {
        return 'completed';
    }

    if (
        status === 'in-progress' ||
        status === 'in_progress' ||
        status === 'progress'
    ) {
        return 'in-progress';
    }

    return 'pending';
}

function getStatusLabel(status) {
    const normalized =
        normalizeStatus(status);

    if (
        normalized === 'completed'
    ) {
        return 'مكتملة';
    }

    if (
        normalized === 'in-progress'
    ) {
        return 'قيد التنفيذ';
    }

    return 'معلقة';
}

function formatDate(date) {
    if (!date) {
        return 'غير محدد';
    }

    try {
        return new Date(date).toLocaleDateString(
            'ar-EG',
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );
    } catch {
        return 'غير محدد';
    }
}

function getInitials(name) {
    if (!name) {
        return 'D';
    }

    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();
}

/* =========================================================
   Component
========================================================= */

export default function CoordinatorTasks() {
    const navigate =
        useNavigate();

    const [
        user,
        setUser
    ] = useState(null);

    const [
        tasks,
        setTasks
    ] = useState([]);

    const [
        designers,
        setDesigners
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        designersLoading,
        setDesignersLoading
    ] = useState(true);

    const [
        actionLoading,
        setActionLoading
    ] = useState(false);

    const [
        error,
        setError
    ] = useState('');

    const [
        success,
        setSuccess
    ] = useState('');

    const [
        search,
        setSearch
    ] = useState('');

    const [
        statusFilter,
        setStatusFilter
    ] = useState('all');

    const [
        assignedFilter,
        setAssignedFilter
    ] = useState('all');

    const [
        showCreateModal,
        setShowCreateModal
    ] = useState(false);

    const [
        editingTask,
        setEditingTask
    ] = useState(null);

    const [
        deletingTask,
        setDeletingTask
    ] = useState(null);

    const [
        assigningTask,
        setAssigningTask
    ] = useState(null);

    const [
        selectedDesigner,
        setSelectedDesigner
    ] = useState('');

    const [
        form,
        setForm
    ] = useState({
        title: '',
        description: '',
        projectId: '',
        status: 'pending',
        fileLink: '',
        fileName: '',
        notes: '',
        deadline: ''
    });

    /* =====================================================
       Load User
    ===================================================== */

    const loadUser =
        useCallback(
            async () => {
                const currentUser =
                    await getCurrentUser();

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
                    'coordinator'
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
            },
            [navigate]
        );

    /* =====================================================
       Load Tasks
    ===================================================== */

    const loadTasks =
        useCallback(
            async () => {
                const result =
                    await getTasks();

                setTasks(
                    Array.isArray(
                        result
                    )
                        ? result
                        : []
                );
            },
            []
        );

    /* =====================================================
       Load Designers
    ===================================================== */

    const loadDesigners =
        useCallback(
            async () => {
                try {
                    setDesignersLoading(
                        true
                    );

                    const result =
                        await getDesigners();

                    setDesigners(
                        Array.isArray(
                            result
                        )
                            ? result
                            : []
                    );
                } catch (err) {
                    setError(
                        err?.message ||
                        'تعذر تحميل قائمة المصممين.'
                    );
                } finally {
                    setDesignersLoading(
                        false
                    );
                }
            },
            []
        );

    /* =====================================================
       Initial Load
    ===================================================== */

    useEffect(
        () => {
            let mounted = true;

            async function initialize() {
                try {
                    setLoading(
                        true
                    );

                    setError('');

                    const currentUser =
                        await loadUser();

                    if (
                        !mounted ||
                        !currentUser
                    ) {
                        return;
                    }

                    await Promise.all([
                        loadTasks(),
                        loadDesigners()
                    ]);
                } catch (err) {
                    if (mounted) {
                        setError(
                            err?.message ||
                            'حدث خطأ أثناء تحميل المهام.'
                        );
                    }
                } finally {
                    if (mounted) {
                        setLoading(
                            false
                        );
                    }
                }
            }

            initialize();

            return () => {
                mounted = false;
            };
        },
        [
            loadUser,
            loadTasks,
            loadDesigners
        ]
    );

    /* =====================================================
       Refresh
    ===================================================== */

    const refreshTasks =
        async () => {
            try {
                setActionLoading(
                    true
                );

                setError('');

                await loadTasks();

                setSuccess(
                    'تم تحديث قائمة المهام.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تحديث المهام.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Form Helpers
    ===================================================== */

    const resetForm =
        () => {
            setForm({
                title: '',
                description: '',
                projectId: '',
                status: 'pending',
                fileLink: '',
                fileName: '',
                notes: '',
                deadline: ''
            });
        };

    const fillEditForm =
        (task) => {
            setForm({
                title:
                    task?.title ||
                    task?.taskName ||
                    '',

                description:
                    task?.description ||
                    '',

                projectId:
                    getProjectId(task) ||
                    '',

                status:
                    normalizeStatus(
                        task?.status
                    ),

                fileLink:
                    task?.fileLink ||
                    '',

                fileName:
                    task?.fileName ||
                    '',

                notes:
                    task?.notes ||
                    '',

                deadline:
                    task?.deadline
                        ? String(
                              task.deadline
                          ).slice(0, 10)
                        : ''
            });
        };

    /* =====================================================
       Create Task
    ===================================================== */

    const handleCreateTask =
        async (event) => {
            event.preventDefault();

            if (
                !form.title.trim()
            ) {
                setError(
                    'عنوان المهمة مطلوب.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await createTask({
                    title:
                        form.title.trim(),

                    description:
                        form.description,

                    projectId:
                        form.projectId ||
                        null,

                    status:
                        form.status,

                    fileLink:
                        form.fileLink,

                    fileName:
                        form.fileName,

                    notes:
                        form.notes,

                    deadline:
                        form.deadline ||
                        null
                });

                await loadTasks();

                resetForm();

                setShowCreateModal(
                    false
                );

                setSuccess(
                    'تم إنشاء المهمة بنجاح.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر إنشاء المهمة.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Update Task
    ===================================================== */

    const handleUpdateTask =
        async (event) => {
            event.preventDefault();

            if (
                !editingTask
            ) {
                return;
            }

            if (
                !form.title.trim()
            ) {
                setError(
                    'عنوان المهمة مطلوب.'
                );

                return;
            }

            const taskId =
                getId(
                    editingTask
                );

            if (!taskId) {
                setError(
                    'معرف المهمة غير موجود.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await updateTask(
                    taskId,
                    {
                        title:
                            form.title.trim(),

                        description:
                            form.description,

                        projectId:
                            form.projectId ||
                            null,

                        status:
                            form.status,

                        fileLink:
                            form.fileLink,

                        fileName:
                            form.fileName,

                        notes:
                            form.notes,

                        deadline:
                            form.deadline ||
                            null
                    }
                );

                await loadTasks();

                setEditingTask(
                    null
                );

                resetForm();

                setSuccess(
                    'تم تحديث المهمة بنجاح.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تحديث المهمة.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Delete Task
    ===================================================== */

    const handleDeleteTask =
        async () => {
            if (
                !deletingTask
            ) {
                return;
            }

            const taskId =
                getId(
                    deletingTask
                );

            if (!taskId) {
                setError(
                    'معرف المهمة غير موجود.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await deleteTask(
                    taskId
                );

                await loadTasks();

                setDeletingTask(
                    null
                );

                setSuccess(
                    'تم حذف المهمة بنجاح.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر حذف المهمة.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Assign Task
    ===================================================== */

    const openAssignModal =
        (task) => {
            setAssigningTask(
                task
            );

            setSelectedDesigner(
                getAssignedUserId(
                    task
                )
                    ? String(
                          getAssignedUserId(
                              task
                          )
                      )
                    : ''
            );

            setError('');
            setSuccess('');
        };

    const handleAssignTask =
        async () => {
            if (
                !assigningTask
            ) {
                return;
            }

            if (
                !selectedDesigner
            ) {
                setError(
                    'اختار المصمم أولًا.'
                );

                return;
            }

            const taskId =
                getId(
                    assigningTask
                );

            if (!taskId) {
                setError(
                    'معرف المهمة غير موجود.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await assignTask(
                    taskId,
                    selectedDesigner
                );

                await loadTasks();

                setAssigningTask(
                    null
                );

                setSelectedDesigner(
                    ''
                );

                setSuccess(
                    'تم تعيين المهمة للمصمم وسيتم إشعاره.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تعيين المهمة.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Remove Assignment
    ===================================================== */

    const handleRemoveAssignment =
        async (task) => {
            const taskId =
                getId(task);

            if (!taskId) {
                setError(
                    'معرف المهمة غير موجود.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await removeTaskAssignment(
                    taskId
                );

                await loadTasks();

                setSuccess(
                    'تم إزالة تعيين المهمة.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر إزالة التعيين.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Status
    ===================================================== */

    const handleStatusChange =
        async (
            task,
            status
        ) => {
            const taskId =
                getId(task);

            if (!taskId) {
                setError(
                    'معرف المهمة غير موجود.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await updateTaskStatus(
                    taskId,
                    status
                );

                await loadTasks();

                setSuccess(
                    'تم تحديث حالة المهمة.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تحديث حالة المهمة.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Open Edit
    ===================================================== */

    const openEditModal =
        (task) => {
            fillEditForm(
                task
            );

            setEditingTask(
                task
            );

            setError('');
            setSuccess('');
        };

    /* =====================================================
       Filter
    ===================================================== */

    const filteredTasks =
        useMemo(
            () => {
                const normalizedSearch =
                    search
                        .trim()
                        .toLowerCase();

                return tasks.filter(
                    (task) => {
                        const title =
                            getTaskTitle(
                                task
                            ).toLowerCase();

                        const description =
                            getTaskDescription(
                                task
                            ).toLowerCase();

                        const projectName =
                            getProjectName(
                                task
                            ).toLowerCase();

                        const designer =
                            String(
                                getAssignedUserName(
                                    task
                                ) || ''
                            ).toLowerCase();

                        const taskId =
                            String(
                                getId(task) ||
                                ''
                            ).toLowerCase();

                        const matchesSearch =
                            !normalizedSearch ||
                            title.includes(
                                normalizedSearch
                            ) ||
                            description.includes(
                                normalizedSearch
                            ) ||
                            projectName.includes(
                                normalizedSearch
                            ) ||
                            designer.includes(
                                normalizedSearch
                            ) ||
                            taskId.includes(
                                normalizedSearch
                            );

                        const normalizedStatus =
                            normalizeStatus(
                                task.status
                            );

                        const matchesStatus =
                            statusFilter ===
                                'all' ||
                            normalizedStatus ===
                                statusFilter;

                        const assigned =
                            Boolean(
                                getAssignedUserId(
                                    task
                                )
                            );

                        const matchesAssignment =
                            assignedFilter ===
                                'all' ||
                            (
                                assignedFilter ===
                                    'assigned' &&
                                assigned
                            ) ||
                            (
                                assignedFilter ===
                                    'unassigned' &&
                                !assigned
                            );

                        return (
                            matchesSearch &&
                            matchesStatus &&
                            matchesAssignment
                        );
                    }
                );
            },
            [
                tasks,
                search,
                statusFilter,
                assignedFilter
            ]
        );

    /* =====================================================
       Stats
    ===================================================== */

    const stats =
        useMemo(
            () => {
                const total =
                    tasks.length;

                const pending =
                    tasks.filter(
                        (task) =>
                            normalizeStatus(
                                task.status
                            ) ===
                            'pending'
                    ).length;

                const inProgress =
                    tasks.filter(
                        (task) =>
                            normalizeStatus(
                                task.status
                            ) ===
                            'in-progress'
                    ).length;

                const completed =
                    tasks.filter(
                        (task) =>
                            normalizeStatus(
                                task.status
                            ) ===
                            'completed'
                    ).length;

                const assigned =
                    tasks.filter(
                        (task) =>
                            Boolean(
                                getAssignedUserId(
                                    task
                                )
                            )
                    ).length;

                return {
                    total,
                    pending,
                    inProgress,
                    completed,
                    assigned
                };
            },
            [tasks]
        );

    /* =====================================================
       Navigation
    ===================================================== */

    const openProject =
        (projectId) => {
            if (!projectId) {
                return;
            }

            navigate(
                `/coordinator/projects/${projectId}`
            );
        };

    /* =====================================================
       Logout
    ===================================================== */

    const handleLogout =
        async () => {
            try {
                await logoutUser();
            } catch {
                // Ignore logout errors.
            }

            navigate(
                '/login',
                {
                    replace: true
                }
            );
        };

    /* =====================================================
       Close Modals
    ===================================================== */

    const closeCreateModal =
        () => {
            if (actionLoading) {
                return;
            }

            resetForm();

            setShowCreateModal(
                false
            );
        };

    const closeEditModal =
        () => {
            if (actionLoading) {
                return;
            }

            resetForm();

            setEditingTask(
                null
            );
        };

    const closeAssignModal =
        () => {
            if (actionLoading) {
                return;
            }

            setAssigningTask(
                null
            );

            setSelectedDesigner(
                ''
            );
        };

    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل المهام..."
            />
        );
    }

    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="coordinator-tasks-page">

            <Navbar
                user={user}
                onLogout={
                    handleLogout
                }
                title="OSTUDIO"
            />

            <main className="tasks-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <span className="eyebrow">
                            COORDINATOR
                        </span>

                        <h1>
                            إدارة المهام
                        </h1>

                        <p>
                            إنشاء ومتابعة وتوزيع
                            مهام المشاريع على المصممين.
                        </p>

                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={
                                refreshTasks
                            }
                            disabled={
                                actionLoading
                            }
                        >
                            ↻ تحديث
                        </button>

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
                            + إنشاء مهمة
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

                {success && (
                    <div className="alert success-alert">

                        <span>
                            ✓
                        </span>

                        <span>
                            {success}
                        </span>

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

                        <div className="stat-icon total">
                            📋
                        </div>

                        <div>
                            <span>
                                إجمالي المهام
                            </span>

                            <strong>
                                {stats.total}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon pending">
                            ⏳
                        </div>

                        <div>
                            <span>
                                معلقة
                            </span>

                            <strong>
                                {stats.pending}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon progress">
                            🔄
                        </div>

                        <div>
                            <span>
                                قيد التنفيذ
                            </span>

                            <strong>
                                {stats.inProgress}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon completed">
                            ✓
                        </div>

                        <div>
                            <span>
                                مكتملة
                            </span>

                            <strong>
                                {stats.completed}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon assigned">
                            🎨
                        </div>

                        <div>
                            <span>
                                معيّنة لمصممين
                            </span>

                            <strong>
                                {stats.assigned}
                            </strong>
                        </div>

                    </div>

                </section>

                {/* =================================================
                    Tasks Section
                ================================================= */}

                <section className="tasks-section">

                    <div className="section-header">

                        <div>
                            <h2>
                                كل المهام
                            </h2>

                            <p>
                                المهام الخاصة بالمشاريع
                                التي يستطيع الـ Coordinator
                                متابعتها.
                            </p>
                        </div>

                        <span className="count-badge">
                            {
                                filteredTasks.length
                            }
                            {' '}
                            مهمة
                        </span>

                    </div>

                    {/* =============================================
                        Filters
                    ============================================= */}

                    <div className="filters">

                        <div className="search-box">

                            <span>
                                🔍
                            </span>

                            <input
                                type="text"
                                value={
                                    search
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="ابحث عن مهمة أو مشروع أو مصمم..."
                            />

                        </div>

                        <select
                            value={
                                statusFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                كل الحالات
                            </option>

                            <option value="pending">
                                معلقة
                            </option>

                            <option value="in-progress">
                                قيد التنفيذ
                            </option>

                            <option value="completed">
                                مكتملة
                            </option>

                        </select>

                        <select
                            value={
                                assignedFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setAssignedFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                كل التعيينات
                            </option>

                            <option value="assigned">
                                معيّنة
                            </option>

                            <option value="unassigned">
                                غير معيّنة
                            </option>
                        </select>

                    </div>

                    {/* =============================================
                        Empty
                    ============================================= */}

                    {filteredTasks.length ===
                    0 ? (
                        <div className="empty-state">

                            <div className="empty-icon">
                                📋
                            </div>

                            <h3>
                                لا توجد مهام
                            </h3>

                            <p>
                                لا توجد مهام مطابقة
                                للفلاتر الحالية.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter(
                                        'all'
                                    );
                                    setAssignedFilter(
                                        'all'
                                    );
                                }}
                            >
                                مسح الفلاتر
                            </button>

                        </div>
                    ) : (
                        <div className="tasks-list">

                            {filteredTasks.map(
                                (task) => {
                                    const taskId =
                                        getId(
                                            task
                                        );

                                    const status =
                                        normalizeStatus(
                                            task.status
                                        );

                                    const assignedName =
                                        getAssignedUserName(
                                            task
                                        );

                                    const assigned =
                                        Boolean(
                                            getAssignedUserId(
                                                task
                                            )
                                        );

                                    const projectId =
                                        getProjectId(
                                            task
                                        );

                                    return (
                                        <article
                                            className="task-card"
                                            key={
                                                taskId
                                            }
                                        >

                                            {/* =================================
                                                Task Main
                                            ================================= */}

                                            <div className="task-main">

                                                <div className="task-icon">
                                                    📋
                                                </div>

                                                <div className="task-content">

                                                    <div className="task-title-row">

                                                        <h3>
                                                            {getTaskTitle(
                                                                task
                                                            )}
                                                        </h3>

                                                        <span
                                                            className={
                                                                `task-status ${status}`
                                                            }
                                                        >
                                                            {getStatusLabel(
                                                                status
                                                            )}
                                                        </span>

                                                    </div>

                                                    <p>
                                                        {getTaskDescription(
                                                            task
                                                        )}
                                                    </p>

                                                    <div className="task-meta">

                                                        <span>
                                                            📁
                                                            {' '}
                                                            {
                                                                getProjectName(
                                                                    task
                                                                )
                                                            }
                                                        </span>

                                                        <span>
                                                            📅
                                                            {' '}
                                                            {
                                                                formatDate(
                                                                    task.deadline
                                                                )
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                            </div>

                                            {/* =================================
                                                Assignment
                                            ================================= */}

                                            <div className="task-assignment">

                                                <span className="meta-label">
                                                    المصمم
                                                </span>

                                                {assigned ? (
                                                    <div className="assigned-designer">

                                                        <div className="designer-avatar">
                                                            {getInitials(
                                                                assignedName
                                                            )}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {
                                                                    assignedName
                                                                }
                                                            </strong>

                                                            <small>
                                                                مصمم المهمة
                                                            </small>
                                                        </div>

                                                    </div>
                                                ) : (
                                                    <span className="unassigned">
                                                        غير معيّنة
                                                    </span>
                                                )}

                                            </div>

                                            {/* =================================
                                                Actions
                                            ================================= */}

                                            <div className="task-actions">

                                                <select
                                                    value={
                                                        status
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleStatusChange(
                                                            task,
                                                            event.target.value
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading
                                                    }
                                                    className="status-select"
                                                >
                                                    <option value="pending">
                                                        معلقة
                                                    </option>

                                                    <option value="in-progress">
                                                        قيد التنفيذ
                                                    </option>

                                                    <option value="completed">
                                                        مكتملة
                                                    </option>
                                                </select>

                                                {projectId && (
                                                    <button
                                                        type="button"
                                                        className="small-button"
                                                        onClick={() =>
                                                            openProject(
                                                                projectId
                                                            )
                                                        }
                                                    >
                                                        المشروع
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="small-button"
                                                    onClick={() =>
                                                        openAssignModal(
                                                            task
                                                        )
                                                    }
                                                >
                                                    {assigned
                                                        ? 'تغيير المصمم'
                                                        : 'تعيين'}
                                                </button>

                                                {assigned && (
                                                    <button
                                                        type="button"
                                                        className="small-button warning"
                                                        onClick={() =>
                                                            handleRemoveAssignment(
                                                                task
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoading
                                                        }
                                                    >
                                                        إزالة
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="small-button"
                                                    onClick={() =>
                                                        openEditModal(
                                                            task
                                                        )
                                                    }
                                                >
                                                    تعديل
                                                </button>

                                                <button
                                                    type="button"
                                                    className="small-button danger"
                                                    onClick={() =>
                                                        setDeletingTask(
                                                            task
                                                        )
                                                    }
                                                >
                                                    حذف
                                                </button>

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </main>

            {/* =====================================================
                Create Modal
            ===================================================== */}

            {showCreateModal && (
                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-header">

                            <div>
                                <h2>
                                    إنشاء مهمة جديدة
                                </h2>

                                <p>
                                    أضف مهمة جديدة
                                    لمتابعة العمل.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeCreateModal
                                }
                            >
                                ×
                            </button>

                        </div>

                        <form
                            onSubmit={
                                handleCreateTask
                            }
                            className="modal-form"
                        >

                            <div className="form-group">

                                <label>
                                    عنوان المهمة *
                                </label>

                                <input
                                    value={
                                        form.title
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                title:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    placeholder="مثال: تصميم الصفحة الرئيسية"
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Project ID
                                </label>

                                <input
                                    value={
                                        form.projectId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                projectId:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    placeholder="معرف المشروع"
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group full">

                                <label>
                                    الوصف
                                </label>

                                <textarea
                                    value={
                                        form.description
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                description:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    rows="4"
                                    placeholder="وصف المهمة..."
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        الحالة
                                    </label>

                                    <select
                                        value={
                                            form.status
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,
                                                    status:
                                                        event.target.value
                                                })
                                            )
                                        }
                                        disabled={
                                            actionLoading
                                        }
                                    >
                                        <option value="pending">
                                            معلقة
                                        </option>

                                        <option value="in-progress">
                                            قيد التنفيذ
                                        </option>

                                        <option value="completed">
                                            مكتملة
                                        </option>

                                    </select>

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
                                            setForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,
                                                    deadline:
                                                        event.target.value
                                                })
                                            )
                                        }
                                        disabled={
                                            actionLoading
                                        }
                                    />

                                </div>

                            </div>

                            <div className="form-group">

                                <label>
                                    رابط الملف
                                </label>

                                <input
                                    value={
                                        form.fileLink
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileLink:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    placeholder="https://..."
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    اسم الملف
                                </label>

                                <input
                                    value={
                                        form.fileName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileName:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    placeholder="اسم الملف"
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group full">

                                <label>
                                    ملاحظات
                                </label>

                                <textarea
                                    value={
                                        form.notes
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                notes:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    rows="3"
                                    placeholder="ملاحظات المهمة..."
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={
                                        closeCreateModal
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    {actionLoading
                                        ? 'جاري الإنشاء...'
                                        : 'إنشاء المهمة'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =====================================================
                Edit Modal
            ===================================================== */}

            {editingTask && (
                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-header">

                            <div>
                                <h2>
                                    تعديل المهمة
                                </h2>

                                <p>
                                    تعديل بيانات
                                    المهمة الحالية.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeEditModal
                                }
                            >
                                ×
                            </button>

                        </div>

                        <form
                            onSubmit={
                                handleUpdateTask
                            }
                            className="modal-form"
                        >

                            <div className="form-group">

                                <label>
                                    عنوان المهمة *
                                </label>

                                <input
                                    value={
                                        form.title
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                title:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Project ID
                                </label>

                                <input
                                    value={
                                        form.projectId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                projectId:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group full">

                                <label>
                                    الوصف
                                </label>

                                <textarea
                                    value={
                                        form.description
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                description:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    rows="4"
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        الحالة
                                    </label>

                                    <select
                                        value={
                                            form.status
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,
                                                    status:
                                                        event.target.value
                                                })
                                            )
                                        }
                                        disabled={
                                            actionLoading
                                        }
                                    >
                                        <option value="pending">
                                            معلقة
                                        </option>

                                        <option value="in-progress">
                                            قيد التنفيذ
                                        </option>

                                        <option value="completed">
                                            مكتملة
                                        </option>

                                    </select>

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
                                            setForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,
                                                    deadline:
                                                        event.target.value
                                                })
                                            )
                                        }
                                        disabled={
                                            actionLoading
                                        }
                                    />

                                </div>

                            </div>

                            <div className="form-group">

                                <label>
                                    رابط الملف
                                </label>

                                <input
                                    value={
                                        form.fileLink
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileLink:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    اسم الملف
                                </label>

                                <input
                                    value={
                                        form.fileName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileName:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="form-group full">

                                <label>
                                    ملاحظات
                                </label>

                                <textarea
                                    value={
                                        form.notes
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                notes:
                                                    event.target.value
                                            })
                                        )
                                    }
                                    rows="3"
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={
                                        closeEditModal
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    {actionLoading
                                        ? 'جاري الحفظ...'
                                        : 'حفظ التعديلات'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =====================================================
                Assignment Modal
            ===================================================== */}

            {assigningTask && (
                <div className="modal-overlay">

                    <div className="modal small-modal">

                        <div className="modal-header">

                            <div>
                                <h2>
                                    تعيين المهمة
                                </h2>

                                <p>
                                    {
                                        getTaskTitle(
                                            assigningTask
                                        )
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeAssignModal
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="modal-form">

                            <div className="form-group">

                                <label>
                                    اختيار المصمم
                                </label>

                                <select
                                    value={
                                        selectedDesigner
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSelectedDesigner(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        actionLoading ||
                                        designersLoading
                                    }
                                >
                                    <option value="">
                                        اختر مصممًا...
                                    </option>

                                    {designers.map(
                                        (
                                            designer
                                        ) => {
                                            const id =
                                                getId(
                                                    designer
                                                );

                                            if (!id) {
                                                return null;
                                            }

                                            return (
                                                <option
                                                    key={
                                                        id
                                                    }
                                                    value={
                                                        id
                                                    }
                                                >
                                                    {
                                                        designer.name ||
                                                        designer.displayName ||
                                                        designer.email ||
                                                        'مصمم'
                                                    }
                                                </option>
                                            );
                                        }
                                    )}

                                </select>

                            </div>

                            <div className="assignment-note">
                                سيتم إرسال إشعار للمصمم
                                بعد نجاح عملية التعيين.
                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={
                                        closeAssignModal
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={
                                        handleAssignTask
                                    }
                                    disabled={
                                        actionLoading ||
                                        !selectedDesigner
                                    }
                                >
                                    {actionLoading
                                        ? 'جاري التعيين...'
                                        : 'تعيين المهمة'}
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

            {/* =====================================================
                Delete Modal
            ===================================================== */}

            {deletingTask && (
                <div className="modal-overlay">

                    <div className="modal small-modal">

                        <div className="confirm-icon">
                            ⚠️
                        </div>

                        <h2>
                            حذف المهمة؟
                        </h2>

                        <p>
                            هل أنت متأكد من حذف
                            المهمة:
                            <strong>
                                {' '}
                                {getTaskTitle(
                                    deletingTask
                                )}
                            </strong>
                            ؟
                            <br />
                            لا يمكن التراجع عن هذا
                            الإجراء.
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={() =>
                                    setDeletingTask(
                                        null
                                    )
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-button"
                                onClick={
                                    handleDeleteTask
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                {actionLoading
                                    ? 'جاري الحذف...'
                                    : 'نعم، حذف'}
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

                .coordinator-tasks-page {
                    min-height: 100vh;
                    background:
                        linear-gradient(
                            135deg,
                            #f8fafc 0%,
                            #eef2f7 100%
                        );
                    direction: rtl;
                    color: #172033;
                }

                .tasks-container {
                    width: min(
                        1400px,
                        calc(100% - 40px)
                    );
                    margin: 0 auto;
                    padding:
                        105px 0 55px;
                }

                .page-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 27px;
                }

                .eyebrow {
                    display: block;
                    margin-bottom: 7px;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    direction: ltr;
                }

                .page-header h1 {
                    margin:
                        0 0 7px;
                    font-size: 32px;
                    font-weight: 900;
                }

                .page-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 14px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }

                .refresh-button,
                .create-button {
                    min-height: 42px;
                    padding:
                        0 14px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .refresh-button {
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                }

                .create-button {
                    border: none;
                    background: #111827;
                    color: #ffffff;
                }

                .refresh-button:hover,
                .create-button:hover {
                    transform:
                        translateY(-1px);
                }

                .refresh-button:disabled,
                .create-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding:
                        13px 15px;
                    margin-bottom: 18px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 700;
                }

                .alert button {
                    margin-right: auto;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: 19px;
                }

                .error-alert {
                    background: #fef2f2;
                    border:
                        1px solid #fecaca;
                    color: #991b1b;
                }

                .success-alert {
                    background: #f0fdf4;
                    border:
                        1px solid #bbf7d0;
                    color: #166534;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            5,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-height: 95px;
                    padding: 15px;
                    background: #ffffff;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 15px;
                    box-shadow:
                        0 8px 25px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .stat-icon {
                    width: 43px;
                    height: 43px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    font-size: 19px;
                    flex-shrink: 0;
                }

                .stat-icon.total {
                    background: #eef2ff;
                }

                .stat-icon.pending {
                    background: #fef3c7;
                }

                .stat-icon.progress {
                    background: #dbeafe;
                }

                .stat-icon.completed {
                    background: #dcfce7;
                }

                .stat-icon.assigned {
                    background: #ede9fe;
                }

                .stat-card span {
                    display: block;
                    margin-bottom: 3px;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 700;
                }

                .stat-card strong {
                    display: block;
                    font-size: 23px;
                    font-weight: 900;
                }

                .tasks-section {
                    padding: 23px;
                    background: #ffffff;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 19px;
                    box-shadow:
                        0 10px 35px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                    margin-bottom: 19px;
                }

                .section-header h2 {
                    margin:
                        0 0 5px;
                    font-size: 20px;
                    font-weight: 900;
                }

                .section-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                }

                .count-badge {
                    padding:
                        7px 11px;
                    border-radius: 999px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 10px;
                    font-weight: 900;
                    white-space: nowrap;
                }

                .filters {
                    display: grid;
                    grid-template-columns:
                        minmax(250px, 1fr)
                        180px
                        180px;
                    gap: 10px;
                    margin-bottom: 19px;
                }

                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    min-height: 43px;
                    padding:
                        0 12px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #ffffff;
                }

                .search-box input {
                    width: 100%;
                    border: none;
                    outline: none;
                    background: transparent;
                    color: #1e293b;
                    font-size: 12px;
                    font-family: inherit;
                }

                .filters select {
                    min-height: 43px;
                    padding:
                        0 11px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #ffffff;
                    color: #334155;
                    font-size: 11px;
                    font-weight: 700;
                    outline: none;
                    cursor: pointer;
                }

                .tasks-list {
                    display: flex;
                    flex-direction: column;
                    gap: 11px;
                }

                .task-card {
                    display: grid;
                    grid-template-columns:
                        minmax(0, 1.5fr)
                        minmax(180px, 0.55fr)
                        auto;
                    align-items: center;
                    gap: 17px;
                    padding: 16px;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 14px;
                    background: #ffffff;
                    transition:
                        box-shadow 0.2s ease,
                        border-color 0.2s ease;
                }

                .task-card:hover {
                    border-color: #cbd5e1;
                    box-shadow:
                        0 8px 25px
                        rgba(
                            15,
                            23,
                            42,
                            0.05
                        );
                }

                .task-main {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    min-width: 0;
                }

                .task-icon {
                    width: 43px;
                    height: 43px;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 19px;
                    flex-shrink: 0;
                }

                .task-content {
                    min-width: 0;
                }

                .task-title-row {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    margin-bottom: 5px;
                }

                .task-title-row h3 {
                    margin: 0;
                    color: #1e293b;
                    font-size: 14px;
                    font-weight: 900;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .task-status {
                    padding:
                        5px 8px;
                    border-radius: 999px;
                    font-size: 9px;
                    font-weight: 900;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .task-status.pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                .task-status.in-progress {
                    background: #dbeafe;
                    color: #1d4ed8;
                }

                .task-status.completed {
                    background: #dcfce7;
                    color: #166534;
                }

                .task-content > p {
                    margin:
                        0 0 7px;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.6;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .task-meta {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    color: #94a3b8;
                    font-size: 9px;
                }

                .task-meta span {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .task-assignment {
                    min-width: 0;
                    padding:
                        10px 12px;
                    border-radius: 11px;
                    background: #f8fafc;
                }

                .meta-label {
                    display: block;
                    margin-bottom: 7px;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 800;
                }

                .assigned-designer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .designer-avatar {
                    width: 31px;
                    height: 31px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ede9fe;
                    color: #5b21b6;
                    font-size: 11px;
                    font-weight: 900;
                    flex-shrink: 0;
                }

                .assigned-designer strong {
                    display: block;
                    max-width: 130px;
                    color: #334155;
                    font-size: 10px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .assigned-designer small {
                    display: block;
                    margin-top: 2px;
                    color: #94a3b8;
                    font-size: 8px;
                }

                .unassigned {
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 700;
                }

                .task-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .status-select,
                .small-button {
                    min-height: 34px;
                    border-radius: 8px;
                    font-size: 9px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .status-select {
                    max-width: 115px;
                    padding:
                        0 7px;
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                    outline: none;
                }

                .small-button {
                    padding:
                        0 9px;
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                }

                .small-button:hover {
                    background: #f8fafc;
                }

                .small-button.warning {
                    border-color: #fde68a;
                    color: #92400e;
                }

                .small-button.danger {
                    border-color: #fecaca;
                    color: #b91c1c;
                }

                .small-button:disabled,
                .status-select:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .empty-state {
                    min-height: 300px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 30px;
                    text-align: center;
                    border:
                        1px dashed #cbd5e1;
                    border-radius: 14px;
                    background: #f8fafc;
                }

                .empty-icon {
                    width: 62px;
                    height: 62px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 13px;
                    border-radius: 17px;
                    background: #ffffff;
                    font-size: 27px;
                }

                .empty-state h3 {
                    margin:
                        0 0 6px;
                    font-size: 17px;
                    font-weight: 900;
                }

                .empty-state p {
                    margin:
                        0 0 15px;
                    color: #64748b;
                    font-size: 12px;
                }

                .empty-state button {
                    min-height: 38px;
                    padding:
                        0 14px;
                    border: none;
                    border-radius: 9px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background:
                        rgba(
                            15,
                            23,
                            42,
                            0.55
                        );
                    backdrop-filter:
                        blur(4px);
                    overflow-y: auto;
                }

                .modal {
                    width: min(
                        650px,
                        100%
                    );
                    max-height:
                        calc(100vh - 40px);
                    overflow-y: auto;
                    padding: 24px;
                    border-radius: 17px;
                    background: #ffffff;
                    box-shadow:
                        0 25px 70px
                        rgba(
                            15,
                            23,
                            42,
                            0.22
                        );
                }

                .small-modal {
                    width: min(
                        450px,
                        100%
                    );
                }

                .modal-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 15px;
                    margin-bottom: 21px;
                }

                .modal-header h2 {
                    margin:
                        0 0 5px;
                    font-size: 19px;
                    font-weight: 900;
                }

                .modal-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 11px;
                }

                .modal-header > button {
                    width: 31px;
                    height: 31px;
                    border: none;
                    border-radius: 8px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 20px;
                    cursor: pointer;
                }

                .modal-form {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 14px;
                }

                .form-group {
                    min-width: 0;
                }

                .form-group.full {
                    grid-column:
                        1 / -1;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 6px;
                    color: #334155;
                    font-size: 11px;
                    font-weight: 800;
                }

                .form-group input,
                .form-group textarea,
                .form-group select {
                    width: 100%;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 9px;
                    background: #ffffff;
                    color: #1e293b;
                    font-family: inherit;
                    font-size: 12px;
                    outline: none;
                }

                .form-group input,
                .form-group select {
                    min-height: 42px;
                    padding:
                        0 10px;
                }

                .form-group textarea {
                    padding:
                        10px;
                    resize: vertical;
                    line-height: 1.7;
                }

                .form-group input:focus,
                .form-group textarea:focus,
                .form-group select:focus {
                    border-color: #64748b;
                    box-shadow:
                        0 0 0 3px
                        rgba(
                            100,
                            116,
                            139,
                            0.1
                        );
                }

                .form-group input:disabled,
                .form-group textarea:disabled,
                .form-group select:disabled {
                    background: #f8fafc;
                    opacity: 0.7;
                }

                .form-row {
                    grid-column:
                        1 / -1;
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 14px;
                }

                .modal-actions {
                    grid-column:
                        1 / -1;
                    display: flex;
                    justify-content: flex-end;
                    gap: 9px;
                    margin-top: 5px;
                }

                .cancel-button,
                .save-button,
                .delete-confirm-button {
                    min-height: 40px;
                    padding:
                        0 15px;
                    border-radius: 9px;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .cancel-button {
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                }

                .save-button {
                    border: none;
                    background: #111827;
                    color: #ffffff;
                }

                .delete-confirm-button {
                    border: none;
                    background: #dc2626;
                    color: #ffffff;
                }

                .cancel-button:disabled,
                .save-button:disabled,
                .delete-confirm-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .assignment-note {
                    padding:
                        12px;
                    margin-bottom: 15px;
                    border-radius: 10px;
                    background: #fffbeb;
                    border:
                        1px solid #fde68a;
                    color: #92400e;
                    font-size: 10px;
                    line-height: 1.7;
                }

                .confirm-icon {
                    width: 55px;
                    height: 55px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin:
                        0 auto 14px;
                    border-radius: 50%;
                    background: #fee2e2;
                    font-size: 24px;
                }

                .modal > h2 {
                    margin:
                        0 0 9px;
                    text-align: center;
                    font-size: 19px;
                }

                .modal > p {
                    margin:
                        0 0 22px;
                    color: #64748b;
                    text-align: center;
                    font-size: 12px;
                    line-height: 1.8;
                }

                .modal > p strong {
                    color: #334155;
                }

                @media (
                    max-width: 1150px
                ) {
                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(0, 1fr)
                            );
                    }

                    .task-card {
                        grid-template-columns:
                            1fr
                            1fr;
                    }

                    .task-actions {
                        grid-column:
                            1 / -1;
                        justify-content: flex-start;
                    }
                }

                @media (
                    max-width: 750px
                ) {
                    .tasks-container {
                        width:
                            min(
                                calc(100% - 24px),
                                1400px
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

                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .filters {
                        grid-template-columns: 1fr;
                    }

                    .tasks-section {
                        padding: 17px;
                    }

                    .task-card {
                        grid-template-columns: 1fr;
                    }

                    .task-actions {
                        grid-column: auto;
                    }
                }

                @media (
                    max-width: 500px
                ) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .section-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .modal-form {
                        grid-template-columns: 1fr;
                    }

                    .form-group.full,
                    .form-row,
                    .modal-actions {
                        grid-column: auto;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .modal-actions {
                        flex-direction: column;
                    }

                    .cancel-button,
                    .save-button,
                    .delete-confirm-button {
                        width: 100%;
                    }
                }

            `}</style>

        </div>
    );
}