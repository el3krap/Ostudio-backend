// frontend/src/pages/Designer/DesignerTasks.jsx

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
    getMyTasks,
    updateMyTask,
    updateTaskStatus
} from '../../services/designerService';


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

function getTaskTitle(task) {
    return (
        task?.title ||
        task?.taskName ||
        task?.name ||
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

function getStatusLabel(status) {
    switch (status) {
        case 'completed':
        case 'complete':
        case 'done':
            return 'مكتملة';

        case 'in-progress':
        case 'in_progress':
        case 'progress':
            return 'قيد التنفيذ';

        case 'pending':
            return 'معلقة';

        default:
            return status || 'غير محددة';
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

function normalizeStatus(status) {
    if (
        status === 'complete' ||
        status === 'done'
    ) {
        return 'completed';
    }

    if (
        status === 'in_progress' ||
        status === 'progress'
    ) {
        return 'in-progress';
    }

    return status || 'pending';
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
            month: 'long',
            day: 'numeric'
        }
    );
}

function isOverdue(task) {
    if (
        !task?.deadline ||
        normalizeStatus(task?.status) ===
            'completed'
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

    return deadline < new Date();
}


/* =========================================================
   Component
========================================================= */

export default function DesignerTasks() {
    const navigate =
        useNavigate();

    const [user, setUser] =
        useState(null);

    const [tasks, setTasks] =
        useState([]);

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

    const [sortBy, setSortBy] =
        useState('newest');

    const [editingTask, setEditingTask] =
        useState(null);

    const [editForm, setEditForm] =
        useState({
            title: '',
            description: '',
            status: 'pending',
            fileLink: '',
            fileName: '',
            notes: '',
            deadline: ''
        });

    const [saving, setSaving] =
        useState(false);

    const [statusUpdating, setStatusUpdating] =
        useState('');


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
                'designer'
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
       Load Tasks
    ===================================================== */

    const loadTasks =
        useCallback(async () => {
            try {
                setLoading(true);
                setError('');

                const currentUser =
                    verifyUser();

                if (!currentUser) {
                    return;
                }

                const data =
                    await getMyTasks();

                setTasks(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (err) {
                console.error(
                    'Designer Tasks Error:',
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
                    'حدث خطأ أثناء تحميل المهام.'
                );
            } finally {
                setLoading(false);
            }
        }, [
            navigate,
            verifyUser
        ]);


    useEffect(() => {
        loadTasks();
    }, [loadTasks]);


    /* =====================================================
       Statistics
    ===================================================== */

    const statistics =
        useMemo(() => {
            const total =
                tasks.length;

            const completed =
                tasks.filter(
                    (task) =>
                        normalizeStatus(
                            task?.status
                        ) ===
                        'completed'
                ).length;

            const inProgress =
                tasks.filter(
                    (task) =>
                        normalizeStatus(
                            task?.status
                        ) ===
                        'in-progress'
                ).length;

            const pending =
                tasks.filter(
                    (task) =>
                        normalizeStatus(
                            task?.status
                        ) ===
                        'pending'
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
                completed,
                inProgress,
                pending,
                overdue
            };
        }, [tasks]);


    /* =====================================================
       Filter + Sort
    ===================================================== */

    const filteredTasks =
        useMemo(() => {
            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            const filtered =
                tasks.filter(
                    (task) => {
                        const title =
                            getTaskTitle(
                                task
                            ).toLowerCase();

                        const description =
                            getTaskDescription(
                                task
                            ).toLowerCase();

                        const matchesSearch =
                            !normalizedSearch ||
                            title.includes(
                                normalizedSearch
                            ) ||
                            description.includes(
                                normalizedSearch
                            );

                        const normalizedTaskStatus =
                            normalizeStatus(
                                task?.status
                            );

                        const matchesStatus =
                            statusFilter ===
                                'all' ||
                            (
                                statusFilter ===
                                    'pending' &&
                                normalizedTaskStatus ===
                                    'pending'
                            ) ||
                            (
                                statusFilter ===
                                    'in-progress' &&
                                normalizedTaskStatus ===
                                    'in-progress'
                            ) ||
                            (
                                statusFilter ===
                                    'completed' &&
                                normalizedTaskStatus ===
                                    'completed'
                            ) ||
                            (
                                statusFilter ===
                                    'overdue' &&
                                isOverdue(
                                    task
                                )
                            );

                        return (
                            matchesSearch &&
                            matchesStatus
                        );
                    }
                );

            return [
                ...filtered
            ].sort(
                (a, b) => {
                    if (
                        sortBy ===
                        'deadline'
                    ) {
                        const dateA =
                            a?.deadline
                                ? new Date(
                                    a.deadline
                                ).getTime()
                                : Infinity;

                        const dateB =
                            b?.deadline
                                ? new Date(
                                    b.deadline
                                ).getTime()
                                : Infinity;

                        return (
                            dateA -
                            dateB
                        );
                    }

                    if (
                        sortBy ===
                        'status'
                    ) {
                        const order = {
                            pending: 1,
                            'in-progress': 2,
                            completed: 3
                        };

                        return (
                            (
                                order[
                                    normalizeStatus(
                                        a?.status
                                    )
                                ] ||
                                99
                            ) -
                            (
                                order[
                                    normalizeStatus(
                                        b?.status
                                    )
                                ] ||
                                99
                            )
                        );
                    }

                    const dateA =
                        a?.createdAt
                            ? new Date(
                                a.createdAt
                            ).getTime()
                            : 0;

                    const dateB =
                        b?.createdAt
                            ? new Date(
                                b.createdAt
                            ).getTime()
                            : 0;

                    return (
                        dateB -
                        dateA
                    );
                }
            );
        }, [
            tasks,
            search,
            statusFilter,
            sortBy
        ]);


    /* =====================================================
       Open Edit
    ===================================================== */

    const openEdit =
        (task) => {
            setEditingTask(
                task
            );

            setEditForm({
                title:
                    task?.title ||
                    task?.taskName ||
                    '',
                description:
                    task?.description ||
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
                        ).slice(
                            0,
                            10
                        )
                        : ''
            });

            setError('');
            setSuccess('');
        };


    const closeEdit =
        () => {
            if (saving) {
                return;
            }

            setEditingTask(
                null
            );
        };


    /* =====================================================
       Save Task
    ===================================================== */

    const saveTask =
        async (event) => {
            event.preventDefault();

            if (!editingTask) {
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
                setSaving(true);
                setError('');
                setSuccess('');

                const response =
                    await updateMyTask(
                        taskId,
                        {
                            title:
                                editForm.title,

                            description:
                                editForm.description,

                            status:
                                editForm.status,

                            fileLink:
                                editForm.fileLink,

                            fileName:
                                editForm.fileName,

                            notes:
                                editForm.notes,

                            deadline:
                                editForm.deadline ||
                                null
                        }
                    );

                const updatedTask =
                    response?.task ||
                    response;

                setTasks(
                    (previous) =>
                        previous.map(
                            (task) =>
                                String(
                                    getId(
                                        task
                                    )
                                ) ===
                                String(
                                    taskId
                                )
                                    ? {
                                        ...task,
                                        ...updatedTask,
                                        ...editForm
                                    }
                                    : task
                        )
                );

                setEditingTask(
                    null
                );

                setSuccess(
                    'تم تحديث المهمة بنجاح.'
                );
            } catch (err) {
                console.error(
                    'Task update error:',
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
       Status
    ===================================================== */

    const changeTaskStatus =
        async (
            task,
            status
        ) => {
            const taskId =
                getId(task);

            if (!taskId) {
                return;
            }

            try {
                setStatusUpdating(
                    String(taskId)
                );

                setError('');
                setSuccess('');

                const response =
                    await updateTaskStatus(
                        taskId,
                        status
                    );

                const updatedTask =
                    response?.task ||
                    response;

                setTasks(
                    (previous) =>
                        previous.map(
                            (item) =>
                                String(
                                    getId(
                                        item
                                    )
                                ) ===
                                String(
                                    taskId
                                )
                                    ? {
                                        ...item,
                                        ...updatedTask,
                                        status
                                    }
                                    : item
                        )
                );

                setSuccess(
                    'تم تحديث حالة المهمة.'
                );
            } catch (err) {
                console.error(
                    'Task status error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث حالة المهمة.'
                );
            } finally {
                setStatusUpdating('');
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
                `/designer/projects/${projectId}`
            );
        };


    const openTask =
        (taskId) => {
            if (!taskId) {
                return;
            }

            navigate(
                `/designer/tasks/${taskId}`
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
                message="جاري تحميل المهام..."
            />
        );
    }


    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="designer-tasks-page">

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
                            DESIGNER WORKSPACE
                        </div>

                        <h1>
                            مهامي
                        </h1>

                        <p>
                            المهام التي تم تعيينها لك
                            فقط.
                        </p>

                    </div>


                    <div className="header-actions">

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={
                                loadTasks
                            }
                        >
                            ↻ تحديث
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
                            🔄
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
                            ✅
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
                    Filters
                ================================================= */}

                <section className="filters-panel">

                    <div className="search-box">

                        <span>
                            🔎
                        </span>

                        <input
                            type="text"
                            placeholder="ابحث عن مهمة..."
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


                    <div className="filter-group">

                        <label>
                            الحالة
                        </label>

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

                            <option value="overdue">
                                متأخرة
                            </option>

                        </select>

                    </div>


                    <div className="filter-group">

                        <label>
                            ترتيب
                        </label>

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
                                الأحدث
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
                            مهمة
                        </span>
                    </div>


                    {(search ||
                        statusFilter !== 'all' ||
                        sortBy !== 'newest') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter(
                                    'all'
                                );
                                setSortBy(
                                    'newest'
                                );
                            }}
                        >
                            إعادة ضبط الفلاتر
                        </button>
                    )}

                </div>


                {/* =================================================
                    Task List
                ================================================= */}

                {filteredTasks.length === 0 ? (
                    <section className="empty-state">

                        <div className="empty-icon">
                            📋
                        </div>

                        {tasks.length === 0 ? (
                            <>
                                <h2>
                                    لا توجد مهام
                                </h2>

                                <p>
                                    لا توجد أي مهام متعيّنة
                                    عليك حاليًا.
                                </p>

                                <small>
                                    عندما يتم تعيين مهمة
                                    لك ستظهر هنا تلقائيًا.
                                </small>
                            </>
                        ) : (
                            <>
                                <h2>
                                    لا توجد نتائج
                                </h2>

                                <p>
                                    لم نجد مهام تطابق
                                    الفلاتر الحالية.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setStatusFilter(
                                            'all'
                                        );
                                        setSortBy(
                                            'newest'
                                        );
                                    }}
                                >
                                    عرض كل المهام
                                </button>
                            </>
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

                                const status =
                                    normalizeStatus(
                                        task?.status
                                    );

                                const busy =
                                    statusUpdating ===
                                    String(
                                        taskId
                                    );

                                return (
                                    <article
                                        key={
                                            taskId
                                        }
                                        className={
                                            isOverdue(
                                                task
                                            )
                                                ? 'task-card overdue'
                                                : 'task-card'
                                        }
                                    >

                                        {/* Main */}
                                        <div className="task-main">

                                            <div className="task-icon">
                                                {status ===
                                                'completed'
                                                    ? '✓'
                                                    : '📋'}
                                            </div>


                                            <div className="task-content">

                                                <div className="task-title-row">

                                                    <h2>
                                                        {getTaskTitle(
                                                            task
                                                        )}
                                                    </h2>

                                                    <span
                                                        className={`status-badge ${getStatusClass(
                                                            status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(
                                                            status
                                                        )}
                                                    </span>

                                                    {isOverdue(
                                                        task
                                                    ) && (
                                                        <span className="overdue-badge">
                                                            متأخرة
                                                        </span>
                                                    )}

                                                </div>


                                                <p>
                                                    {getTaskDescription(
                                                        task
                                                    )}
                                                </p>


                                                <div className="task-meta">

                                                    {task?.projectId && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openProject(
                                                                    getId(
                                                                        task.projectId
                                                                    ) ||
                                                                    task.projectId
                                                                )
                                                            }
                                                        >
                                                            📁 المشروع
                                                        </button>
                                                    )}

                                                    {task?.deadline && (
                                                        <span>
                                                            📅{' '}
                                                            {formatDate(
                                                                task.deadline
                                                            )}
                                                        </span>
                                                    )}

                                                    {task?.fileName && (
                                                        <span>
                                                            📎{' '}
                                                            {
                                                                task.fileName
                                                            }
                                                        </span>
                                                    )}

                                                </div>

                                            </div>

                                        </div>


                                        {/* Actions */}
                                        <div className="task-actions">

                                            <button
                                                type="button"
                                                className="details-button"
                                                onClick={() =>
                                                    openTask(
                                                        taskId
                                                    )
                                                }
                                            >
                                                التفاصيل
                                            </button>


                                            {status !==
                                                'completed' && (
                                                <button
                                                    type="button"
                                                    className="complete-button"
                                                    disabled={
                                                        busy
                                                    }
                                                    onClick={() =>
                                                        changeTaskStatus(
                                                            task,
                                                            'completed'
                                                        )
                                                    }
                                                >
                                                    {busy
                                                        ? '...'
                                                        : '✓ إكمال'}
                                                </button>
                                            )}


                                            {status ===
                                                'pending' && (
                                                <button
                                                    type="button"
                                                    className="progress-button"
                                                    disabled={
                                                        busy
                                                    }
                                                    onClick={() =>
                                                        changeTaskStatus(
                                                            task,
                                                            'in-progress'
                                                        )
                                                    }
                                                >
                                                    بدء التنفيذ
                                                </button>
                                            )}


                                            {status ===
                                                'completed' && (
                                                <button
                                                    type="button"
                                                    className="reopen-button"
                                                    disabled={
                                                        busy
                                                    }
                                                    onClick={() =>
                                                        changeTaskStatus(
                                                            task,
                                                            'in-progress'
                                                        )
                                                    }
                                                >
                                                    إعادة فتح
                                                </button>
                                            )}


                                            <button
                                                type="button"
                                                className="edit-button"
                                                onClick={() =>
                                                    openEdit(
                                                        task
                                                    )
                                                }
                                            >
                                                تعديل
                                            </button>

                                        </div>

                                    </article>
                                );
                            }
                        )}

                    </section>
                )}


                {/* =================================================
                    Permission Notice
                ================================================= */}

                <section className="permission-notice">

                    <div className="notice-icon">
                        🔐
                    </div>

                    <div>

                        <h3>
                            المهام الخاصة بك فقط
                        </h3>

                        <p>
                            يتم عرض المهام التي قام النظام
                            بتعيينها للمستخدم الحالي فقط.
                            لا يمكنك تعديل أو الوصول إلى
                            مهام مصممين آخرين.
                        </p>

                    </div>

                </section>

            </main>


            {/* =====================================================
                Edit Modal
            ===================================================== */}

            {editingTask && (
                <div
                    className="modal-overlay"
                    onMouseDown={
                        closeEdit
                    }
                >

                    <div
                        className="modal"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>

                                <h2>
                                    تعديل المهمة
                                </h2>

                                <p>
                                    {getTaskTitle(
                                        editingTask
                                    )}
                                </p>

                            </div>


                            <button
                                type="button"
                                onClick={
                                    closeEdit
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={
                                saveTask
                            }
                        >

                            <div className="form-group">

                                <label>
                                    عنوان المهمة
                                </label>

                                <input
                                    type="text"
                                    value={
                                        editForm.title
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                title:
                                                    event
                                                        .target
                                                        .value
                                            })
                                        )
                                    }
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    الوصف
                                </label>

                                <textarea
                                    rows={4}
                                    value={
                                        editForm.description
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                description:
                                                    event
                                                        .target
                                                        .value
                                            })
                                        )
                                    }
                                />

                            </div>


                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        الحالة
                                    </label>

                                    <select
                                        value={
                                            editForm.status
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setEditForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,
                                                    status:
                                                        event
                                                            .target
                                                            .value
                                                })
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
                                            editForm.deadline
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setEditForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,
                                                    deadline:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />

                                </div>

                            </div>


                            <div className="form-group">

                                <label>
                                    رابط الملف
                                </label>

                                <input
                                    type="url"
                                    value={
                                        editForm.fileLink
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileLink:
                                                    event
                                                        .target
                                                        .value
                                            })
                                        )
                                    }
                                    placeholder="https://..."
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    اسم الملف
                                </label>

                                <input
                                    type="text"
                                    value={
                                        editForm.fileName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileName:
                                                    event
                                                        .target
                                                        .value
                                            })
                                        )
                                    }
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    الملاحظات
                                </label>

                                <textarea
                                    rows={4}
                                    value={
                                        editForm.notes
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEditForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                notes:
                                                    event
                                                        .target
                                                        .value
                                            })
                                        )
                                    }
                                />

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        saving
                                    }
                                    onClick={
                                        closeEdit
                                    }
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


            <style>{`

                * {
                    box-sizing: border-box;
                }

                .designer-tasks-page {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .tasks-container {
                    width: min(
                        1400px,
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
                    margin: 8px 0 0;
                    color: #64748b;
                    font-size: 14px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    direction: ltr;
                }

                .refresh-button {
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    color: #334155;
                    border-radius: 10px;
                    padding: 10px 15px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 800;
                }

                .refresh-button:hover {
                    background: #f8fafc;
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
                   Statistics
                ========================================= */

                .stats-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            5,
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
                    padding: 17px;
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

                .stat-card span {
                    display: block;
                    color: #64748b;
                    font-size: 10px;
                    margin-bottom: 5px;
                }

                .stat-card strong {
                    display: block;
                    color: #111827;
                    font-size: 22px;
                    font-weight: 900;
                }


                /* =========================================
                   Filters
                ========================================= */

                .filters-panel {
                    display: flex;
                    align-items: flex-end;
                    gap: 12px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 16px;
                    padding: 15px;
                    margin-bottom: 15px;
                }

                .search-box {
                    flex: 1;
                    min-width: 220px;
                    height: 43px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                    padding: 0 12px;
                }

                .search-box input {
                    width: 100%;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    font-family: inherit;
                    font-size: 12px;
                    color: #334155;
                }

                .search-box button {
                    border: 0;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 18px;
                }

                .filter-group {
                    width: 180px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .filter-group label {
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 800;
                }

                .filter-group select {
                    width: 100%;
                    height: 43px;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                    background: #ffffff;
                    color: #334155;
                    padding: 0 10px;
                    outline: 0;
                    font-family: inherit;
                    font-size: 11px;
                }


                /* =========================================
                   Results
                ========================================= */

                .results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    min-height: 35px;
                    margin-bottom: 12px;
                }

                .results-header div {
                    display: flex;
                    align-items: baseline;
                    gap: 5px;
                }

                .results-header strong {
                    color: #111827;
                    font-size: 17px;
                    font-weight: 900;
                }

                .results-header span {
                    color: #94a3b8;
                    font-size: 11px;
                }

                .results-header button {
                    border: 0;
                    background: transparent;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 11px;
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
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
                    padding: 17px;
                    transition:
                        transform 0.2s ease,
                        box-shadow 0.2s ease,
                        border-color 0.2s ease;
                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.03
                        );
                }

                .task-card:hover {
                    transform: translateY(-2px);
                    border-color: #cbd5e1;
                    box-shadow:
                        0 12px 28px
                        rgba(
                            15,
                            23,
                            42,
                            0.07
                        );
                }

                .task-card.overdue {
                    border-right: 3px solid #dc2626;
                }

                .task-main {
                    min-width: 0;
                    flex: 1;
                    display: flex;
                    align-items: flex-start;
                    gap: 13px;
                }

                .task-icon {
                    width: 45px;
                    height: 45px;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 19px;
                    font-weight: 900;
                }

                .task-content {
                    min-width: 0;
                }

                .task-title-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .task-title-row h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 15px;
                    font-weight: 900;
                }

                .task-content > p {
                    margin: 7px 0 9px;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.7;
                    max-width: 800px;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    padding: 5px 9px;
                    font-size: 9px;
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

                .overdue-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 8px;
                    border-radius: 999px;
                    background: #fee2e2;
                    color: #991b1b;
                    font-size: 8px;
                    font-weight: 900;
                }

                .task-meta {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    flex-wrap: wrap;
                }

                .task-meta span,
                .task-meta button {
                    color: #94a3b8;
                    font-size: 9px;
                }

                .task-meta button {
                    border: 0;
                    background: transparent;
                    cursor: pointer;
                    padding: 0;
                    font-family: inherit;
                    font-weight: 800;
                }

                .task-meta button:hover {
                    color: #334155;
                }


                /* =========================================
                   Actions
                ========================================= */

                .task-actions {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    flex-shrink: 0;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .task-actions button {
                    border-radius: 8px;
                    padding: 8px 10px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 9px;
                    font-weight: 800;
                }

                .details-button,
                .edit-button {
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    color: #475569;
                }

                .details-button:hover,
                .edit-button:hover {
                    background: #f8fafc;
                }

                .complete-button {
                    border: 1px solid #166534;
                    background: #166534;
                    color: #ffffff;
                }

                .progress-button {
                    border: 1px solid #2563eb;
                    background: #2563eb;
                    color: #ffffff;
                }

                .reopen-button {
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    color: #475569;
                }

                .task-actions button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }


                /* =========================================
                   Empty
                ========================================= */

                .empty-state {
                    background: #ffffff;
                    border: 1px dashed #dbe3ed;
                    border-radius: 18px;
                    text-align: center;
                    padding: 65px 25px;
                }

                .empty-icon {
                    width: 66px;
                    height: 66px;
                    margin: 0 auto 15px;
                    border-radius: 20px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 29px;
                }

                .empty-state h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 20px;
                    font-weight: 900;
                }

                .empty-state p {
                    margin: 8px 0;
                    color: #64748b;
                    font-size: 13px;
                }

                .empty-state small {
                    display: block;
                    max-width: 500px;
                    margin: 0 auto 18px;
                    color: #94a3b8;
                    font-size: 11px;
                    line-height: 1.8;
                }

                .empty-state button {
                    border: 0;
                    background: #111827;
                    color: #ffffff;
                    border-radius: 9px;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 11px;
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
                    margin-top: 22px;
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
                        620px,
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

                .modal-header h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 19px;
                    font-weight: 900;
                }

                .modal-header p {
                    margin: 5px 0 0;
                    color: #64748b;
                    font-size: 11px;
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

                .form-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 14px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    margin-bottom: 14px;
                }

                .form-group label {
                    color: #475569;
                    font-size: 11px;
                    font-weight: 800;
                }

                .form-group input,
                .form-group select,
                .form-group textarea {
                    width: 100%;
                    border: 1px solid #dfe6ef;
                    border-radius: 9px;
                    padding: 11px 12px;
                    outline: 0;
                    background: #ffffff;
                    color: #334155;
                    font-family: inherit;
                    font-size: 12px;
                }

                .form-group input:focus,
                .form-group select:focus,
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

                .modal-actions {
                    display: flex;
                    justify-content: flex-start;
                    gap: 8px;
                    margin-top: 18px;
                }

                .cancel-button,
                .save-button {
                    border: 0;
                    border-radius: 9px;
                    padding: 10px 17px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 11px;
                    font-weight: 800;
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
                    opacity: 0.6;
                    cursor: not-allowed;
                }


                /* =========================================
                   Responsive
                ========================================= */

                @media (
                    max-width: 1100px
                ) {
                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(0, 1fr)
                            );
                    }

                    .task-card {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .task-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }
                }

                @media (
                    max-width: 800px
                ) {
                    .tasks-container {
                        width:
                            calc(
                                100% - 24px
                            );

                        padding-top: 95px;
                    }

                    .page-header {
                        flex-direction: column;
                    }

                    .filters-panel {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .filter-group {
                        width: 100%;
                    }

                    .search-box {
                        width: 100%;
                    }
                }

                @media (
                    max-width: 600px
                ) {
                    .page-header h1 {
                        font-size: 28px;
                    }

                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .task-main {
                        width: 100%;
                    }

                    .task-meta {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 6px;
                    }

                    .task-actions button {
                        flex: 1;
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