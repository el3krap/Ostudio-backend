// frontend/src/pages/Manager/ManagerTasks.jsx

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
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    removeTaskAssignment,
    updateTaskStatus,
    getDesigners
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

function getTaskProjectId(task) {
    if (!task) return '';

    return (
        task.projectId?._id ||
        task.projectId?.id ||
        task.projectId ||
        task.project?._id ||
        task.project?.id ||
        ''
    );
}

function getTaskProjectName(task) {
    if (!task) return 'بدون مشروع';

    if (
        typeof task.projectId === 'object' &&
        task.projectId !== null
    ) {
        return (
            task.projectId.projectName ||
            task.projectId.name ||
            'مشروع'
        );
    }

    return (
        task.project?.projectName ||
        task.project?.name ||
        task.projectName ||
        'بدون مشروع'
    );
}

function getAssignedDesignerId(task) {
    if (!task) return '';

    return (
        task.assignedTo?._id ||
        task.assignedTo?.id ||
        task.assignedTo?.mongoId ||
        task.assignedTo ||
        ''
    );
}

function getAssignedDesignerName(task) {
    if (!task) return 'غير معين';

    if (
        typeof task.assignedTo === 'object' &&
        task.assignedTo !== null
    ) {
        return (
            task.assignedTo.name ||
            task.assignedTo.displayName ||
            task.assignedTo.email ||
            'غير معين'
        );
    }

    return (
        task.assignedToName ||
        'غير معين'
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
        default:
            return 'معلق';
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
        default:
            return 'status-pending';
    }
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

function isOverdue(task) {
    if (
        !task?.deadline ||
        task?.status === 'completed' ||
        task?.status === 'complete' ||
        task?.status === 'done'
    ) {
        return false;
    }

    const deadline =
        new Date(
            task.deadline
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

export default function ManagerTasks() {
    const navigate =
        useNavigate();

    const [user, setUser] =
        useState(null);

    const [tasks, setTasks] =
        useState([]);

    const [designers, setDesigners] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [assigning, setAssigning] =
        useState(false);

    const [deleting, setDeleting] =
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

    const [showEditModal, setShowEditModal] =
        useState(false);

    const [showAssignModal, setShowAssignModal] =
        useState(false);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [selectedTask, setSelectedTask] =
        useState(null);

    const [selectedDesigner, setSelectedDesigner] =
        useState('');

    const [form, setForm] =
        useState({
            title: '',
            description: '',
            projectId: '',
            assignedTo: '',
            status: 'pending',
            fileLink: '',
            fileName: '',
            notes: '',
            deadline: ''
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
       Load Tasks
    ===================================================== */

    const loadTasks =
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
                        await getTasks();

                    setTasks(
                        Array.isArray(result)
                            ? result
                            : []
                    );
                } catch (err) {
                    console.error(
                        'Load manager tasks error:',
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
                        'تعذر تحميل المهام.'
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


    /* =====================================================
       Load Designers
    ===================================================== */

    const loadDesigners =
        useCallback(
            async () => {
                try {
                    const result =
                        await getDesigners();

                    setDesigners(
                        Array.isArray(result)
                            ? result
                            : []
                    );
                } catch (err) {
                    console.error(
                        'Load designers error:',
                        err
                    );
                }
            },
            []
        );


    useEffect(() => {
        loadTasks();
        loadDesigners();
    }, [
        loadTasks,
        loadDesigners
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
                title: '',
                description: '',
                projectId: '',
                assignedTo: '',
                status: 'pending',
                fileLink: '',
                fileName: '',
                notes: '',
                deadline: ''
            });
        };


    const openCreateModal =
        () => {
            resetForm();
            setError('');
            setSuccess('');
            setShowCreateModal(
                true
            );
        };


    const openEditModal =
        (task) => {
            setSelectedTask(
                task
            );

            setForm({
                title:
                    task?.title ||
                    '',

                description:
                    task?.description ||
                    '',

                projectId:
                    getTaskProjectId(
                        task
                    ),

                assignedTo:
                    getAssignedDesignerId(
                        task
                    ),

                status:
                    task?.status ||
                    'pending',

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

            setError('');
            setSuccess('');

            setShowEditModal(
                true
            );
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

            if (
                !form.projectId.trim()
            ) {
                setError(
                    'Project ID مطلوب.'
                );

                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                await createTask({
                    title:
                        form.title.trim(),

                    description:
                        form.description.trim(),

                    projectId:
                        form.projectId.trim(),

                    assignedTo:
                        form.assignedTo ||
                        null,

                    status:
                        form.status,

                    fileLink:
                        form.fileLink.trim(),

                    fileName:
                        form.fileName.trim(),

                    notes:
                        form.notes.trim(),

                    deadline:
                        form.deadline ||
                        null
                });

                setShowCreateModal(
                    false
                );

                resetForm();

                setSuccess(
                    'تم إنشاء المهمة بنجاح.'
                );

                await loadTasks(
                    false
                );
            } catch (err) {
                console.error(
                    'Create task error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر إنشاء المهمة.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Update Task
    ===================================================== */

    const handleUpdateTask =
        async (event) => {
            event.preventDefault();

            if (
                !selectedTask
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

            if (
                !form.projectId.trim()
            ) {
                setError(
                    'Project ID مطلوب.'
                );

                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                const taskId =
                    getId(
                        selectedTask
                    );

                await updateTask(
                    taskId,
                    {
                        title:
                            form.title.trim(),

                        description:
                            form.description.trim(),

                        projectId:
                            form.projectId.trim(),

                        assignedTo:
                            form.assignedTo ||
                            null,

                        status:
                            form.status,

                        fileLink:
                            form.fileLink.trim(),

                        fileName:
                            form.fileName.trim(),

                        notes:
                            form.notes.trim(),

                        deadline:
                            form.deadline ||
                            null
                    }
                );

                setShowEditModal(
                    false
                );

                setSelectedTask(
                    null
                );

                setSuccess(
                    'تم تحديث المهمة بنجاح.'
                );

                await loadTasks(
                    false
                );
            } catch (err) {
                console.error(
                    'Update task error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث المهمة.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Assign Task
    ===================================================== */

    const openAssignModal =
        (task) => {
            setSelectedTask(
                task
            );

            setSelectedDesigner(
                getAssignedDesignerId(
                    task
                )
            );

            setError('');
            setSuccess('');

            setShowAssignModal(
                true
            );
        };


    const handleAssignTask =
        async () => {
            if (
                !selectedTask
            ) {
                return;
            }

            if (
                !selectedDesigner
            ) {
                setError(
                    'اختر Designer أولاً.'
                );

                return;
            }

            try {
                setAssigning(true);
                setError('');
                setSuccess('');

                await assignTask(
                    getId(
                        selectedTask
                    ),
                    selectedDesigner
                );

                setShowAssignModal(
                    false
                );

                setSelectedTask(
                    null
                );

                setSelectedDesigner(
                    ''
                );

                setSuccess(
                    'تم تعيين المهمة وإرسال إشعار للـ Designer.'
                );

                await loadTasks(
                    false
                );
            } catch (err) {
                console.error(
                    'Assign task error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تعيين المهمة.'
                );
            } finally {
                setAssigning(false);
            }
        };


    /* =====================================================
       Remove Assignment
    ===================================================== */

    const handleRemoveAssignment =
        async (task) => {
            const taskId =
                getId(
                    task
                );

            if (!taskId) {
                return;
            }

            try {
                setAssigning(true);
                setError('');
                setSuccess('');

                await removeTaskAssignment(
                    taskId
                );

                setSuccess(
                    'تم إزالة تعيين الـ Designer من المهمة.'
                );

                await loadTasks(
                    false
                );
            } catch (err) {
                console.error(
                    'Remove task assignment error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر إزالة التعيين.'
                );
            } finally {
                setAssigning(false);
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
                getId(
                    task
                );

            if (!taskId) {
                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                await updateTaskStatus(
                    taskId,
                    status
                );

                setSuccess(
                    'تم تحديث حالة المهمة.'
                );

                await loadTasks(
                    false
                );
            } catch (err) {
                console.error(
                    'Update task status error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث حالة المهمة.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Delete
    ===================================================== */

    const openDeleteModal =
        (task) => {
            setSelectedTask(
                task
            );

            setShowDeleteModal(
                true
            );

            setError('');
        };


    const handleDeleteTask =
        async () => {
            if (
                !selectedTask
            ) {
                return;
            }

            const taskId =
                getId(
                    selectedTask
                );

            if (!taskId) {
                setError(
                    'معرف المهمة غير موجود.'
                );

                return;
            }

            try {
                setDeleting(true);
                setError('');
                setSuccess('');

                await deleteTask(
                    taskId
                );

                setTasks(
                    (previous) =>
                        previous.filter(
                            (task) =>
                                getId(
                                    task
                                ) !==
                                taskId
                        )
                );

                setShowDeleteModal(
                    false
                );

                setSelectedTask(
                    null
                );

                setSuccess(
                    'تم حذف المهمة بنجاح.'
                );
            } catch (err) {
                console.error(
                    'Delete task error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر حذف المهمة.'
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

    const filteredTasks =
        useMemo(() => {
            let result =
                [...tasks];

            const query =
                search
                    .trim()
                    .toLowerCase();

            if (query) {
                result =
                    result.filter(
                        (task) => {
                            const searchable =
                                [
                                    task?.title,
                                    task?.description,
                                    task?.notes,
                                    task?.fileName,
                                    task?.projectName,
                                    getTaskProjectName(
                                        task
                                    ),
                                    getAssignedDesignerName(
                                        task
                                    )
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
                        (task) =>
                            task?.status ===
                            statusFilter
                    );
            }

            if (
                assignmentFilter !==
                'all'
            ) {
                result =
                    result.filter(
                        (task) => {
                            const assigned =
                                Boolean(
                                    getAssignedDesignerId(
                                        task
                                    )
                                );

                            if (
                                assignmentFilter ===
                                'assigned'
                            ) {
                                return assigned;
                            }

                            if (
                                assignmentFilter ===
                                'unassigned'
                            ) {
                                return !assigned;
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
                        (task) => {
                            const hasDeadline =
                                Boolean(
                                    task?.deadline
                                );

                            const overdue =
                                isOverdue(
                                    task
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
                        'status'
                    ) {
                        return String(
                            a?.status ||
                            ''
                        ).localeCompare(
                            String(
                                b?.status ||
                                ''
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
            tasks,
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
                tasks.length;

            const pending =
                tasks.filter(
                    (task) =>
                        task?.status ===
                        'pending'
                ).length;

            const inProgress =
                tasks.filter(
                    (task) =>
                        task?.status ===
                            'in-progress' ||
                        task?.status ===
                            'in_progress' ||
                        task?.status ===
                            'progress'
                ).length;

            const completed =
                tasks.filter(
                    (task) =>
                        task?.status ===
                            'completed' ||
                        task?.status ===
                            'complete' ||
                        task?.status ===
                            'done'
                ).length;

            const assigned =
                tasks.filter(
                    (task) =>
                        Boolean(
                            getAssignedDesignerId(
                                task
                            )
                        )
                ).length;

            const overdue =
                tasks.filter(
                    (task) =>
                        isOverdue(
                            task
                        )
                ).length;

            return {
                total,
                pending,
                inProgress,
                completed,
                assigned,
                overdue
            };
        }, [
            tasks
        ]);


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
        <div className="manager-tasks-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="tasks-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <div className="page-kicker">
                            MANAGER / TASKS
                        </div>

                        <h1>
                            إدارة المهام
                        </h1>

                        <p>
                            إنشاء وتعديل وتوزيع ومتابعة
                            مهام جميع المشاريع.
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
                                loadTasks(
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
                            onClick={
                                openCreateModal
                            }
                        >
                            ＋ مهمة جديدة
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
                    Stats
                ================================================= */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📋
                        </div>

                        <div>
                            <span>
                                إجمالي المهام
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
                            ⏳
                        </div>

                        <div>
                            <span>
                                معلقة
                            </span>

                            <strong>
                                {
                                    statistics.pending
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
                                معينة
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
                            placeholder="ابحث باسم المهمة أو المشروع أو الـ Designer..."
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
                                معينة
                            </option>

                            <option value="unassigned">
                                غير معينة
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

                            <option value="status">
                                حسب الحالة
                            </option>

                        </select>

                    </div>

                </section>


                {/* =================================================
                    Results
                ================================================= */}

                <div className="results-header">

                    <div>

                        <strong>
                            {
                                filteredTasks.length
                            }
                        </strong>

                        <span>
                            مهمة ظاهرة
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
                    Tasks
                ================================================= */}

                {filteredTasks.length === 0 ? (
                    <section className="empty-state">

                        <div className="empty-icon">
                            📋
                        </div>

                        <h2>
                            لا توجد مهام
                        </h2>

                        <p>
                            {tasks.length === 0
                                ? 'لم يتم إنشاء أي مهمة حتى الآن.'
                                : 'لا توجد مهمة تطابق الفلاتر الحالية.'}
                        </p>

                        {tasks.length === 0 ? (
                            <button
                                type="button"
                                className="create-button"
                                onClick={
                                    openCreateModal
                                }
                            >
                                ＋ إنشاء أول مهمة
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
                    <section className="tasks-list">

                        {filteredTasks.map(
                            (task) => {
                                const taskId =
                                    getId(
                                        task
                                    );

                                const projectId =
                                    getTaskProjectId(
                                        task
                                    );

                                const overdue =
                                    isOverdue(
                                        task
                                    );

                                const assigned =
                                    Boolean(
                                        getAssignedDesignerId(
                                            task
                                        )
                                    );

                                return (
                                    <article
                                        key={
                                            taskId
                                        }
                                        className="task-card"
                                    >

                                        <div className="task-main">

                                            <div className="task-icon">
                                                {task?.status ===
                                                    'completed'
                                                    ? '✓'
                                                    : '📋'}
                                            </div>


                                            <div className="task-content">

                                                <div className="task-title-row">

                                                    <h2>
                                                        {
                                                            task?.title ||
                                                            'مهمة بدون عنوان'
                                                        }
                                                    </h2>

                                                    <span
                                                        className={`status-badge ${getStatusClass(
                                                            task?.status
                                                        )}`}
                                                    >
                                                        {
                                                            getStatusLabel(
                                                                task?.status
                                                            )
                                                        }
                                                    </span>

                                                </div>


                                                <p className="task-description">
                                                    {
                                                        task?.description ||
                                                        'لا يوجد وصف للمهمة.'
                                                    }
                                                </p>


                                                <div className="task-meta">

                                                    <span>
                                                        📁
                                                        {' '}
                                                        {
                                                            getTaskProjectName(
                                                                task
                                                            )
                                                        }
                                                    </span>

                                                    <span>
                                                        🎨
                                                        {' '}
                                                        {
                                                            getAssignedDesignerName(
                                                                task
                                                            )
                                                        }
                                                    </span>

                                                    <span
                                                        className={
                                                            overdue
                                                                ? 'overdue-meta'
                                                                : ''
                                                        }
                                                    >
                                                        ⏰
                                                        {' '}
                                                        {
                                                            formatDate(
                                                                task?.deadline
                                                            )
                                                        }
                                                    </span>

                                                </div>


                                                {task?.notes && (
                                                    <div className="task-notes">
                                                        <span>
                                                            📝
                                                        </span>

                                                        <p>
                                                            {
                                                                task.notes
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                            </div>

                                        </div>


                                        <div className="task-actions">

                                            <div className="quick-status">

                                                <button
                                                    type="button"
                                                    className={
                                                        task?.status ===
                                                        'pending'
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            task,
                                                            'pending'
                                                        )
                                                    }
                                                >
                                                    معلقة
                                                </button>

                                                <button
                                                    type="button"
                                                    className={
                                                        task?.status ===
                                                        'in-progress'
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            task,
                                                            'in-progress'
                                                        )
                                                    }
                                                >
                                                    تنفيذ
                                                </button>

                                                <button
                                                    type="button"
                                                    className={
                                                        task?.status ===
                                                        'completed'
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            task,
                                                            'completed'
                                                        )
                                                    }
                                                >
                                                    مكتملة
                                                </button>

                                            </div>


                                            <div className="task-buttons">

                                                <button
                                                    type="button"
                                                    className="assignment-button"
                                                    onClick={() =>
                                                        openAssignModal(
                                                            task
                                                        )
                                                    }
                                                >
                                                    {assigned
                                                        ? 'تغيير Designer'
                                                        : 'تعيين Designer'}
                                                </button>


                                                {assigned && (
                                                    <button
                                                        type="button"
                                                        className="remove-button"
                                                        disabled={
                                                            assigning
                                                        }
                                                        onClick={() =>
                                                            handleRemoveAssignment(
                                                                task
                                                            )
                                                        }
                                                    >
                                                        إزالة
                                                    </button>
                                                )}


                                                <button
                                                    type="button"
                                                    className="edit-button"
                                                    onClick={() =>
                                                        openEditModal(
                                                            task
                                                        )
                                                    }
                                                >
                                                    ✎ تعديل
                                                </button>


                                                {projectId && (
                                                    <button
                                                        type="button"
                                                        className="project-button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/manager/projects/${projectId}`
                                                            )
                                                        }
                                                    >
                                                        📁 المشروع
                                                    </button>
                                                )}


                                                <button
                                                    type="button"
                                                    className="delete-button"
                                                    onClick={() =>
                                                        openDeleteModal(
                                                            task
                                                        )
                                                    }
                                                >
                                                    🗑
                                                </button>

                                            </div>

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
                                    NEW TASK
                                </div>

                                <h2>
                                    إنشاء مهمة جديدة
                                </h2>

                                <p>
                                    يمكنك تعيين Designer
                                    أثناء إنشاء المهمة.
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
                                handleCreateTask
                            }
                        >

                            <div className="form-grid">

                                <div className="form-group full">

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
                                            updateForm(
                                                'title',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="مثال: تصميم Homepage"
                                        required
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        Project ID *
                                    </label>

                                    <input
                                        value={
                                            form.projectId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'projectId',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="MongoDB Project ID"
                                        required
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
                                        placeholder="وصف المهمة..."
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Designer
                                    </label>

                                    <select
                                        value={
                                            form.assignedTo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'assignedTo',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >

                                        <option value="">
                                            بدون تعيين
                                        </option>

                                        {designers.map(
                                            (
                                                designer
                                            ) => {
                                                const id =
                                                    getId(
                                                        designer
                                                    );

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
                                                            designer?.name ||
                                                            designer?.displayName ||
                                                            designer?.email ||
                                                            'Designer'
                                                        }
                                                    </option>
                                                );
                                            }
                                        )}

                                    </select>

                                </div>


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
                                            updateForm(
                                                'status',
                                                event
                                                    .target
                                                    .value
                                            )
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
                                            updateForm(
                                                'deadline',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        File Name
                                    </label>

                                    <input
                                        value={
                                            form.fileName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'fileName',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        File Link
                                    </label>

                                    <input
                                        value={
                                            form.fileLink
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'fileLink',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        Notes
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={
                                            form.notes
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'notes',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
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

            {showEditModal &&
                selectedTask && (
                    <div
                        className="modal-overlay"
                        onMouseDown={() => {
                            if (!saving) {
                                setShowEditModal(
                                    false
                                );

                                setSelectedTask(
                                    null
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
                                        EDIT TASK
                                    </div>

                                    <h2>
                                        تعديل المهمة
                                    </h2>

                                </div>


                                <button
                                    type="button"
                                    disabled={
                                        saving
                                    }
                                    onClick={() => {
                                        setShowEditModal(
                                            false
                                        );

                                        setSelectedTask(
                                            null
                                        );
                                    }}
                                >
                                    ×
                                </button>

                            </div>


                            <form
                                onSubmit={
                                    handleUpdateTask
                                }
                            >

                                <div className="form-grid">

                                    <div className="form-group full">

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
                                                updateForm(
                                                    'title',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            required
                                        />

                                    </div>


                                    <div className="form-group full">

                                        <label>
                                            Project ID *
                                        </label>

                                        <input
                                            value={
                                                form.projectId
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'projectId',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            required
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
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            Designer
                                        </label>

                                        <select
                                            value={
                                                form.assignedTo
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'assignedTo',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >

                                            <option value="">
                                                بدون تعيين
                                            </option>

                                            {designers.map(
                                                (
                                                    designer
                                                ) => {
                                                    const id =
                                                        getId(
                                                            designer
                                                        );

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
                                                                designer?.name ||
                                                                designer?.displayName ||
                                                                designer?.email ||
                                                                'Designer'
                                                            }
                                                        </option>
                                                    );
                                                }
                                            )}

                                        </select>

                                    </div>


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
                                                updateForm(
                                                    'status',
                                                    event
                                                        .target
                                                        .value
                                                )
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
                                                updateForm(
                                                    'deadline',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            File Name
                                        </label>

                                        <input
                                            value={
                                                form.fileName
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'fileName',
                                                    event
                                                        .target
                                                        .value
                                            )
                                        }
                                    />

                                    </div>


                                    <div className="form-group full">

                                        <label>
                                            File Link
                                        </label>

                                        <input
                                            value={
                                                form.fileLink
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'fileLink',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />

                                    </div>


                                    <div className="form-group full">

                                        <label>
                                            Notes
                                        </label>

                                        <textarea
                                            rows={4}
                                            value={
                                                form.notes
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateForm(
                                                    'notes',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
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
                                            setShowEditModal(
                                                false
                                            );

                                            setSelectedTask(
                                                null
                                            );
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
                                            ? 'جاري الحفظ...'
                                            : 'حفظ التعديلات'}
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>
                )}


            {/* =====================================================
                Assign Modal
            ===================================================== */}

            {showAssignModal &&
                selectedTask && (
                    <div
                        className="modal-overlay"
                        onMouseDown={() => {
                            if (!assigning) {
                                setShowAssignModal(
                                    false
                                );

                                setSelectedTask(
                                    null
                                );
                            }
                        }}
                    >

                        <div
                            className="modal small-modal"
                            onMouseDown={(event) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="modal-header">

                                <div>

                                    <div className="modal-kicker">
                                        TASK ASSIGNMENT
                                    </div>

                                    <h2>
                                        تعيين Designer
                                    </h2>

                                    <p>
                                        {
                                            selectedTask.title ||
                                            'المهمة'
                                        }
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    disabled={
                                        assigning
                                    }
                                    onClick={() => {
                                        setShowAssignModal(
                                            false
                                        );

                                        setSelectedTask(
                                            null
                                        );
                                    }}
                                >
                                    ×
                                </button>

                            </div>


                            <div className="form-group">

                                <label>
                                    Designer
                                </label>

                                <select
                                    value={
                                        selectedDesigner
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSelectedDesigner(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >

                                    <option value="">
                                        اختر Designer
                                    </option>

                                    {designers.map(
                                        (
                                            designer
                                        ) => {
                                            const id =
                                                getId(
                                                    designer
                                                );

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
                                                        designer?.name ||
                                                        designer?.displayName ||
                                                        designer?.email ||
                                                        'Designer'
                                                    }
                                                </option>
                                            );
                                        }
                                    )}

                                </select>

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        assigning
                                    }
                                    onClick={() => {
                                        setShowAssignModal(
                                            false
                                        );

                                        setSelectedTask(
                                            null
                                        );
                                    }}
                                >
                                    إلغاء
                                </button>


                                <button
                                    type="button"
                                    className="save-button"
                                    disabled={
                                        assigning ||
                                        !selectedDesigner
                                    }
                                    onClick={
                                        handleAssignTask
                                    }
                                >
                                    {assigning
                                        ? 'جاري التعيين...'
                                        : 'تعيين المهمة'}
                                </button>

                            </div>

                        </div>

                    </div>
                )}


            {/* =====================================================
                Delete Modal
            ===================================================== */}

            {showDeleteModal &&
                selectedTask && (
                    <div
                        className="modal-overlay"
                        onMouseDown={() => {
                            if (!deleting) {
                                setShowDeleteModal(
                                    false
                                );

                                setSelectedTask(
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
                                حذف المهمة؟
                            </h2>

                            <p>
                                سيتم حذف المهمة
                                <strong>
                                    {' '}
                                    {
                                        selectedTask.title ||
                                        'بدون عنوان'
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

                                        setSelectedTask(
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
                                        handleDeleteTask
                                    }
                                >
                                    {deleting
                                        ? 'جاري الحذف...'
                                        : 'نعم، حذف المهمة'}
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

                .manager-tasks-page {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .tasks-container {
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
                            6,
                            minmax(0, 1fr)
                        );
                    gap: 10px;
                    margin-bottom: 17px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 13px;
                    padding: 12px;
                }

                .stat-icon {
                    width: 36px;
                    height: 36px;
                    flex-shrink: 0;
                    border-radius: 9px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                }

                .stat-card span {
                    display: block;
                    color: #94a3b8;
                    font-size: 7px;
                    margin-bottom: 3px;
                }

                .stat-card strong {
                    display: block;
                    color: #334155;
                    font-size: 17px;
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
                   Tasks
                ========================================= */

                .tasks-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .task-card {
                    display: flex;
                    align-items: stretch;
                    gap: 15px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
                    padding: 14px;
                }

                .task-main {
                    min-width: 0;
                    flex: 1;
                    display: flex;
                    gap: 12px;
                }

                .task-icon {
                    width: 43px;
                    height: 43px;
                    flex-shrink: 0;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }

                .task-content {
                    min-width: 0;
                    flex: 1;
                }

                .task-title-row {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }

                .task-title-row h2 {
                    min-width: 0;
                    margin: 0;
                    color: #1e293b;
                    font-size: 12px;
                    font-weight: 900;
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

                .task-description {
                    margin: 7px 0;
                    color: #64748b;
                    font-size: 9px;
                    line-height: 1.7;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .task-meta {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .task-meta span {
                    color: #94a3b8;
                    font-size: 8px;
                }

                .overdue-meta {
                    color: #be123c !important;
                    font-weight: 800;
                }

                .task-notes {
                    display: flex;
                    gap: 7px;
                    align-items: flex-start;
                    margin-top: 8px;
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 7px 9px;
                }

                .task-notes p {
                    margin: 0;
                    color: #64748b;
                    font-size: 8px;
                    line-height: 1.6;
                }


                /* =========================================
                   Task Actions
                ========================================= */

                .task-actions {
                    width: 410px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 8px;
                    border-right: 1px solid #eef2f7;
                    padding-right: 14px;
                }

                .quick-status {
                    display: flex;
                    gap: 5px;
                }

                .quick-status button {
                    flex: 1;
                    border: 1px solid #e2e8f0;
                    border-radius: 7px;
                    background: #ffffff;
                    color: #64748b;
                    padding: 7px 5px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 7px;
                    font-weight: 800;
                }

                .quick-status button.active {
                    border-color: #334155;
                    background: #334155;
                    color: #ffffff;
                }

                .quick-status button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .task-buttons {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    flex-wrap: wrap;
                }

                .task-buttons button {
                    border-radius: 7px;
                    padding: 7px 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 7px;
                    font-weight: 800;
                }

                .assignment-button {
                    border: 1px solid #dbeafe;
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .remove-button {
                    border: 1px solid #fecdd3;
                    background: #fff1f2;
                    color: #be123c;
                }

                .edit-button {
                    border: 1px solid #dbe3ed;
                    background: #ffffff;
                    color: #475569;
                }

                .project-button {
                    border: 1px solid #dbe3ed;
                    background: #f8fafc;
                    color: #475569;
                }

                .delete-button {
                    border: 1px solid #fecdd3;
                    background: #fff1f2;
                    color: #be123c;
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
                        720px,
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

                .small-modal {
                    width: min(
                        500px,
                        100%
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
                .form-group textarea,
                .form-group select {
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
                .form-group textarea:focus,
                .form-group select:focus {
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
                    max-width: 1250px
                ) {
                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(0, 1fr)
                            );
                    }

                    .task-card {
                        flex-direction: column;
                    }

                    .task-actions {
                        width: 100%;
                        border-right: 0;
                        border-top: 1px solid #eef2f7;
                        padding-right: 0;
                        padding-top: 12px;
                    }
                }

                @media (
                    max-width: 850px
                ) {
                    .tasks-container {
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
                }

                @media (
                    max-width: 600px
                ) {
                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .filter-row {
                        grid-template-columns: 1fr;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-group.full {
                        grid-column: auto;
                    }

                    .task-title-row {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .task-buttons {
                        width: 100%;
                    }

                    .task-buttons button {
                        flex: 1;
                    }

                    .modal {
                        padding: 17px;
                    }
                }

            `}</style>

        </div>
    );
}