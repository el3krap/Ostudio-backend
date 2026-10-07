import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getTasks,
    updateTask,
    deleteTask
} from '../../services/adminService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AdminTasks = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedTask, setSelectedTask] = useState(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        status: 'pending',
        fileLink: '',
        fileName: '',
        notes: '',
        deadline: ''
    });

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

    const getArray = (response) => {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response?.tasks)) {
            return response.tasks;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        return [];
    };

    const getTaskId = (task) => {
        return task?._id || task?.id;
    };

    const getProjectId = (task) => {
        if (!task?.projectId) {
            return null;
        }

        if (typeof task.projectId === 'string') {
            return task.projectId;
        }

        return (
            task.projectId?._id ||
            task.projectId?.id ||
            null
        );
    };

    const getProjectName = (task) => {
        if (task?.projectName) {
            return task.projectName;
        }

        if (
            task?.projectId &&
            typeof task.projectId === 'object'
        ) {
            return (
                task.projectId.projectName ||
                task.projectId.name ||
                'غير محدد'
            );
        }

        if (task?.project?.projectName) {
            return task.project.projectName;
        }

        return 'غير محدد';
    };

    const getUserName = (userData) => {
        if (!userData) {
            return 'غير معين';
        }

        if (typeof userData === 'string') {
            return userData;
        }

        return (
            userData.name ||
            userData.displayName ||
            userData.email ||
            'غير معين'
        );
    };

    const getAssignedUserName = (task) => {
        if (task?.assignedToName) {
            return task.assignedToName;
        }

        return getUserName(task?.assignedTo);
    };

    const getCreatorName = (task) => {
        if (task?.createdByName) {
            return task.createdByName;
        }

        return getUserName(task?.createdBy);
    };

    const normalizeDateForInput = (value) => {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toISOString().slice(0, 10);
    };

    const formatDate = (value) => {
        if (!value) {
            return 'غير محدد';
        }

        const date = new Date(value);

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

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending':
                return 'معلقة';

            case 'in-progress':
                return 'قيد التنفيذ';

            case 'completed':
                return 'مكتملة';

            default:
                return status || 'غير محدد';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'completed':
                return 'completed';

            case 'in-progress':
                return 'in-progress';

            case 'pending':
                return 'pending';

            default:
                return 'neutral';
        }
    };

    /* =========================================================
       Load Tasks
    ========================================================= */

    const loadTasks = useCallback(
        async (showLoader = true) => {
            try {
                if (showLoader) {
                    setLoading(true);
                } else {
                    setRefreshing(true);
                }

                setError('');

                const response = await getTasks();

                setTasks(getArray(response));
            } catch (err) {
                console.error(
                    '❌ Admin Tasks Error:',
                    err
                );

                setError(
                    err?.message ||
                    'حدث خطأ أثناء تحميل المهام.'
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

        loadTasks(true);
    }, [user, loadTasks]);

    /* =========================================================
       Filter
    ========================================================= */

    const filteredTasks = useMemo(() => {
        const normalizedSearch =
            searchTerm
                .trim()
                .toLowerCase();

        return tasks.filter((task) => {
            const title =
                task?.title || '';

            const description =
                task?.description || '';

            const projectName =
                getProjectName(task);

            const assignedTo =
                getAssignedUserName(task);

            const createdBy =
                getCreatorName(task);

            const searchableText =
                `${title} ${description} ${projectName} ${assignedTo} ${createdBy}`
                    .toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                searchableText.includes(
                    normalizedSearch
                );

            const matchesStatus =
                statusFilter === 'all' ||
                task?.status === statusFilter;

            return (
                matchesSearch &&
                matchesStatus
            );
        });
    }, [
        tasks,
        searchTerm,
        statusFilter
    ]);

    /* =========================================================
       Statistics
    ========================================================= */

    const totalTasks = tasks.length;

    const pendingTasks = tasks.filter(
        (task) =>
            task?.status === 'pending'
    ).length;

    const activeTasks = tasks.filter(
        (task) =>
            task?.status === 'in-progress'
    ).length;

    const completedTasks = tasks.filter(
        (task) =>
            task?.status === 'completed'
    ).length;

    /* =========================================================
       Open Task
    ========================================================= */

    const openTask = (task) => {
        const taskId = getTaskId(task);

        if (!taskId) {
            return;
        }

        navigate(
            `/admin/tasks/${taskId}`
        );
    };

    /* =========================================================
       Edit Task
    ========================================================= */

    const openEditModal = (task) => {
        setSelectedTask(task);

        setEditForm({
            title:
                task?.title || '',

            description:
                task?.description || '',

            status:
                task?.status ||
                'pending',

            fileLink:
                task?.fileLink || '',

            fileName:
                task?.fileName || '',

            notes:
                task?.notes || '',

            deadline:
                normalizeDateForInput(
                    task?.deadline
                )
        });

        setShowEditModal(true);
    };

    const closeEditModal = () => {
        if (saving) {
            return;
        }

        setShowEditModal(false);
        setSelectedTask(null);
    };

    const handleEditChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setEditForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const saveTask = async (event) => {
        event.preventDefault();

        if (!selectedTask) {
            return;
        }

        const taskId = getTaskId(
            selectedTask
        );

        if (!taskId) {
            setError(
                'تعذر تحديد المهمة.'
            );

            return;
        }

        try {
            setSaving(true);
            setError('');

            const response =
                await updateTask(
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
                response?.data ||
                response;

            setTasks((previous) =>
                previous.map((task) =>
                    getTaskId(task) === taskId
                        ? {
                            ...task,
                            ...(updatedTask || editForm)
                        }
                        : task
                )
            );

            setShowEditModal(false);
            setSelectedTask(null);
        } catch (err) {
            console.error(
                '❌ Update Task Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تحديث المهمة.'
            );
        } finally {
            setSaving(false);
        }
    };

    /* =========================================================
       Delete Task
    ========================================================= */

    const openDeleteModal = (task) => {
        setSelectedTask(task);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        if (deleting) {
            return;
        }

        setShowDeleteModal(false);
        setSelectedTask(null);
    };

    const confirmDelete = async () => {
        if (!selectedTask) {
            return;
        }

        const taskId = getTaskId(
            selectedTask
        );

        if (!taskId) {
            return;
        }

        try {
            setDeleting(true);
            setError('');

            await deleteTask(taskId);

            setTasks((previous) =>
                previous.filter(
                    (task) =>
                        getTaskId(task) !== taskId
                )
            );

            setShowDeleteModal(false);
            setSelectedTask(null);
        } catch (err) {
            console.error(
                '❌ Delete Task Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء حذف المهمة.'
            );
        } finally {
            setDeleting(false);
        }
    };

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
       Loading
    ========================================================= */

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل المهام..."
            />
        );
    }

    return (
        <div className="admin-tasks-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="admin-tasks-content">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <span className="eyebrow">
                            ADMIN / TASKS
                        </span>

                        <h1>
                            إدارة المهام
                        </h1>

                        <p>
                            عرض ومتابعة وإدارة جميع مهام النظام.
                        </p>

                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="dashboard-button"
                            onClick={() =>
                                navigate(
                                    '/admin/dashboard'
                                )
                            }
                        >
                            لوحة التحكم
                        </button>

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={() =>
                                loadTasks(false)
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
                    Statistics
                ================================================= */}

                <section className="stats">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📋
                        </div>

                        <div>
                            <span>
                                إجمالي المهام
                            </span>

                            <strong>
                                {totalTasks}
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
                                {pendingTasks}
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
                                {activeTasks}
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
                                {completedTasks}
                            </strong>
                        </div>

                    </div>

                </section>

                {/* =================================================
                    Filters
                ================================================= */}

                <section className="filters">

                    <div className="search-box">

                        <span>
                            🔎
                        </span>

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                            placeholder="ابحث باسم المهمة أو المشروع أو المصمم..."
                        />

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearchTerm('')
                                }
                            >
                                ×
                            </button>
                        )}

                    </div>

                    <div className="filter-buttons">

                        <button
                            type="button"
                            className={
                                statusFilter === 'all'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setStatusFilter('all')
                            }
                        >
                            الكل
                        </button>

                        <button
                            type="button"
                            className={
                                statusFilter === 'pending'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setStatusFilter(
                                    'pending'
                                )
                            }
                        >
                            معلقة
                        </button>

                        <button
                            type="button"
                            className={
                                statusFilter === 'in-progress'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setStatusFilter(
                                    'in-progress'
                                )
                            }
                        >
                            قيد التنفيذ
                        </button>

                        <button
                            type="button"
                            className={
                                statusFilter === 'completed'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setStatusFilter(
                                    'completed'
                                )
                            }
                        >
                            مكتملة
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Results
                ================================================= */}

                <section className="tasks-section">

                    <div className="results-header">

                        <strong>
                            المهام
                        </strong>

                        <span>
                            {filteredTasks.length}
                            {' '}
                            نتيجة
                        </span>

                    </div>

                    {filteredTasks.length === 0 ? (

                        <div className="empty-state">

                            <div className="empty-icon">
                                📋
                            </div>

                            <h2>
                                لا توجد مهام
                            </h2>

                            <p>
                                لا توجد مهام مطابقة
                                للبحث أو الفلتر الحالي.
                            </p>

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
                                    معين إلى
                                </span>

                                <span>
                                    الحالة
                                </span>

                                <span>
                                    الموعد
                                </span>

                                <span>
                                    الإجراءات
                                </span>

                            </div>

                            {filteredTasks.map(
                                (task) => {

                                    const taskId =
                                        getTaskId(
                                            task
                                        );

                                    const projectId =
                                        getProjectId(
                                            task
                                        );

                                    return (
                                        <div
                                            className="table-row"
                                            key={taskId}
                                        >

                                            <button
                                                type="button"
                                                className="task-name"
                                                onClick={() =>
                                                    openTask(
                                                        task
                                                    )
                                                }
                                            >
                                                <span className="task-icon">
                                                    ✓
                                                </span>

                                                <span>
                                                    {task?.title ||
                                                        'مهمة بدون عنوان'}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                className="project-name"
                                                onClick={() => {
                                                    if (
                                                        projectId
                                                    ) {
                                                        navigate(
                                                            `/admin/projects/${projectId}`
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    !projectId
                                                }
                                            >
                                                {getProjectName(
                                                    task
                                                )}
                                            </button>

                                            <div className="assigned-user">

                                                <span className="mini-avatar">
                                                    {getAssignedUserName(
                                                        task
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>

                                                <span>
                                                    {getAssignedUserName(
                                                        task
                                                    )}
                                                </span>

                                            </div>

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

                                            <span className="deadline">
                                                {formatDate(
                                                    task?.deadline
                                                )}
                                            </span>

                                            <div className="row-actions">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openTask(
                                                            task
                                                        )
                                                    }
                                                >
                                                    عرض
                                                </button>

                                                <button
                                                    type="button"
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
                                                    className="danger"
                                                    onClick={() =>
                                                        openDeleteModal(
                                                            task
                                                        )
                                                    }
                                                >
                                                    حذف
                                                </button>

                                            </div>

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </main>

            {/* =====================================================
                Edit Modal
            ===================================================== */}

            {showEditModal && selectedTask && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEditModal();
                        }
                    }}
                >

                    <div className="modal">

                        <div className="modal-header">

                            <div>

                                <span className="eyebrow">
                                    EDIT TASK
                                </span>

                                <h2>
                                    تعديل المهمة
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                            >
                                ×
                            </button>

                        </div>

                        <form onSubmit={saveTask}>

                            <div className="form-grid">

                                <label>

                                    <span>
                                        اسم المهمة
                                    </span>

                                    <input
                                        name="title"
                                        value={
                                            editForm.title
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    />

                                </label>

                                <label>

                                    <span>
                                        الحالة
                                    </span>

                                    <select
                                        name="status"
                                        value={
                                            editForm.status
                                        }
                                        onChange={
                                            handleEditChange
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

                                </label>

                                <label>

                                    <span>
                                        الموعد النهائي
                                    </span>

                                    <input
                                        type="date"
                                        name="deadline"
                                        value={
                                            editForm.deadline
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />

                                </label>

                                <label>

                                    <span>
                                        اسم الملف
                                    </span>

                                    <input
                                        name="fileName"
                                        value={
                                            editForm.fileName
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />

                                </label>

                            </div>

                            <label className="full-field">

                                <span>
                                    الوصف
                                </span>

                                <textarea
                                    name="description"
                                    value={
                                        editForm.description
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    rows={4}
                                />

                            </label>

                            <label className="full-field">

                                <span>
                                    File Link
                                </span>

                                <input
                                    name="fileLink"
                                    value={
                                        editForm.fileLink
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />

                            </label>

                            <label className="full-field">

                                <span>
                                    ملاحظات
                                </span>

                                <textarea
                                    name="notes"
                                    value={
                                        editForm.notes
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    rows={4}
                                />

                            </label>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={
                                        closeEditModal
                                    }
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={saving}
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
                Delete Modal
            ===================================================== */}

            {showDeleteModal && selectedTask && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDeleteModal();
                        }
                    }}
                >

                    <div className="delete-modal">

                        <div className="delete-icon">
                            ⚠️
                        </div>

                        <h2>
                            حذف المهمة؟
                        </h2>

                        <p>
                            أنت على وشك حذف المهمة:
                        </p>

                        <strong>
                            {selectedTask?.title ||
                                'مهمة بدون عنوان'}
                        </strong>

                        <p>
                            المشروع:
                            {' '}
                            {getProjectName(
                                selectedTask
                            )}
                        </p>

                        <p className="delete-warning">
                            هذا الإجراء لا يمكن التراجع عنه.
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={
                                    closeDeleteModal
                                }
                                disabled={deleting}
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="danger-confirm"
                                onClick={
                                    confirmDelete
                                }
                                disabled={deleting}
                            >
                                {deleting
                                    ? 'جاري الحذف...'
                                    : 'حذف المهمة'}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .admin-tasks-page {
                    min-height: 100vh;

                    background: #f7f7f8;

                    color: #111827;

                    direction: rtl;
                }

                .admin-tasks-content {
                    width: min(
                        1450px,
                        calc(100% - 48px)
                    );

                    margin: 0 auto;

                    padding: 40px 0 70px;
                }

                .page-header {
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

                    letter-spacing: 1.7px;

                    direction: ltr;
                }

                .page-header h1 {
                    margin: 0;

                    font-size: clamp(
                        28px,
                        4vw,
                        40px
                    );

                    font-weight: 800;

                    letter-spacing: -1px;
                }

                .page-header p {
                    margin: 8px 0 0;

                    color: #6b7280;

                    font-size: 13px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;

                    gap: 8px;
                }

                .dashboard-button,
                .refresh-button {
                    min-height: 41px;

                    padding: 0 14px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #111827;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .dashboard-button:hover,
                .refresh-button:hover {
                    background: #f9fafb;
                }

                .refresh-button:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                .error-box {
                    margin-bottom: 20px;

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

                .stats {
                    display: grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap: 14px;

                    margin-bottom: 20px;
                }

                .stat-card {
                    min-height: 95px;

                    padding: 17px;

                    display: flex;
                    align-items: center;

                    gap: 13px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;
                }

                .stat-icon {
                    width: 42px;
                    height: 42px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    font-size: 18px;
                }

                .stat-card span {
                    display: block;

                    margin-bottom: 5px;

                    color: #6b7280;

                    font-size: 10px;
                }

                .stat-card strong {
                    display: block;

                    font-size: 25px;

                    line-height: 1;
                }

                .filters {
                    padding: 14px;

                    display: flex;
                    align-items: center;

                    gap: 12px;

                    margin-bottom: 18px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;
                }

                .search-box {
                    min-width: 250px;

                    flex: 1;

                    height: 40px;

                    display: flex;
                    align-items: center;

                    gap: 8px;

                    padding: 0 11px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                }

                .search-box > span {
                    color: #9ca3af;

                    font-size: 14px;
                }

                .search-box input {
                    width: 100%;

                    border: none;
                    outline: none;

                    background: transparent;

                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                }

                .search-box input::placeholder {
                    color: #9ca3af;
                }

                .search-box button {
                    border: none;

                    background: transparent;

                    color: #9ca3af;

                    font-size: 18px;

                    cursor: pointer;
                }

                .filter-buttons {
                    display: flex;

                    gap: 4px;

                    padding: 3px;

                    border-radius: 8px;

                    background: #f3f4f6;
                }

                .filter-buttons button {
                    min-height: 34px;

                    padding: 0 11px;

                    border: none;
                    border-radius: 6px;

                    background: transparent;

                    color: #6b7280;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 600;

                    cursor: pointer;
                }

                .filter-buttons button.active {
                    background: #ffffff;

                    color: #111827;

                    box-shadow:
                        0 1px 3px
                        rgba(0, 0, 0, 0.08);
                }

                .results-header {
                    display: flex;
                    align-items: center;

                    gap: 9px;

                    margin-bottom: 12px;
                }

                .results-header strong {
                    font-size: 15px;
                }

                .results-header span {
                    color: #9ca3af;

                    font-size: 10px;
                }

                .tasks-table {
                    overflow-x: auto;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .table-row {
                    min-width: 900px;

                    display: grid;

                    grid-template-columns:
                        1.5fr
                        1.1fr
                        1fr
                        0.75fr
                        0.8fr
                        1.25fr;

                    align-items: center;

                    gap: 12px;

                    padding: 13px 16px;

                    border: none;

                    border-bottom:
                        1px solid #f3f4f6;

                    background: #ffffff;

                    color: #374151;

                    text-align: right;

                    font-family: inherit;

                    font-size: 10px;
                }

                .table-row:last-child {
                    border-bottom: none;
                }

                .table-head {
                    background: #fafafa;

                    color: #9ca3af;

                    font-size: 9px;
                    font-weight: 700;
                }

                .task-name {
                    min-width: 0;

                    display: flex;
                    align-items: center;

                    gap: 9px;

                    padding: 0;

                    border: none;

                    background: transparent;

                    color: #111827;

                    text-align: right;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .task-name:hover {
                    text-decoration: underline;
                }

                .task-icon {
                    width: 30px;
                    height: 30px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 7px;

                    background: #f3f4f6;

                    color: #374151;

                    font-size: 12px;
                }

                .task-name > span:last-child {
                    overflow: hidden;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .project-name {
                    min-width: 0;

                    padding: 0;

                    overflow: hidden;

                    border: none;

                    background: transparent;

                    color: #6b7280;

                    text-align: right;

                    text-overflow: ellipsis;

                    white-space: nowrap;

                    font-family: inherit;

                    font-size: 10px;

                    cursor: pointer;
                }

                .project-name:hover:not(:disabled) {
                    color: #111827;

                    text-decoration: underline;
                }

                .project-name:disabled {
                    cursor: default;
                }

                .assigned-user {
                    min-width: 0;

                    display: flex;
                    align-items: center;

                    gap: 7px;
                }

                .assigned-user > span:last-child {
                    overflow: hidden;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .mini-avatar {
                    width: 27px;
                    height: 27px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 7px;

                    background: #f3f4f6;

                    color: #374151;

                    font-size: 9px;
                    font-weight: 800;
                }

                .status-badge {
                    display: inline-block;

                    padding: 5px 8px;

                    border-radius: 999px;

                    font-size: 8px;
                    font-weight: 700;
                }

                .status-badge.pending {
                    background: #fffbeb;
                    color: #b45309;
                }

                .status-badge.in-progress {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .status-badge.completed {
                    background: #ecfdf5;
                    color: #047857;
                }

                .status-badge.neutral {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .deadline {
                    color: #6b7280;

                    font-size: 9px;
                }

                .row-actions {
                    display: flex;
                    align-items: center;

                    gap: 5px;
                }

                .row-actions button {
                    min-height: 30px;

                    padding: 0 8px;

                    border: 1px solid #e5e7eb;
                    border-radius: 6px;

                    background: #ffffff;

                    color: #374151;

                    font-family: inherit;

                    font-size: 8px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .row-actions button:hover {
                    background: #f9fafb;
                }

                .row-actions button.danger {
                    border-color: #fee2e2;

                    background: #fef2f2;

                    color: #b91c1c;
                }

                .row-actions button.danger:hover {
                    background: #fee2e2;
                }

                .empty-state {
                    min-height: 300px;

                    padding: 40px 20px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    flex-direction: column;

                    text-align: center;

                    border: 1px dashed #d1d5db;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .empty-icon {
                    width: 58px;
                    height: 58px;

                    margin-bottom: 13px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 13px;

                    background: #f3f4f6;

                    font-size: 25px;
                }

                .empty-state h2 {
                    margin: 0 0 6px;

                    font-size: 17px;
                }

                .empty-state p {
                    margin: 0;

                    color: #9ca3af;

                    font-size: 11px;
                }

                .modal-overlay {
                    position: fixed;

                    inset: 0;

                    z-index: 1000;

                    padding: 25px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background:
                        rgba(
                            0,
                            0,
                            0,
                            0.45
                        );

                    overflow-y: auto;
                }

                .modal {
                    width: min(
                        700px,
                        100%
                    );

                    max-height:
                        calc(100vh - 50px);

                    padding: 24px;

                    overflow-y: auto;

                    border-radius: 14px;

                    background: #ffffff;

                    box-shadow:
                        0 25px 70px
                        rgba(0, 0, 0, 0.18);
                }

                .modal-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;

                    margin-bottom: 22px;
                }

                .modal-header h2 {
                    margin: 0;

                    font-size: 21px;
                }

                .modal-header > button {
                    width: 34px;
                    height: 34px;

                    border: none;
                    border-radius: 7px;

                    background: #f3f4f6;

                    color: #6b7280;

                    font-size: 21px;

                    cursor: pointer;
                }

                .modal-header > button:disabled {
                    opacity: 0.5;

                    cursor: not-allowed;
                }

                .form-grid {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 13px;

                    margin-bottom: 13px;
                }

                .form-grid label,
                .full-field {
                    display: block;
                }

                .form-grid label span,
                .full-field span {
                    display: block;

                    margin-bottom: 6px;

                    color: #374151;

                    font-size: 10px;
                    font-weight: 700;
                }

                .form-grid input,
                .form-grid select,
                .full-field input,
                .full-field textarea {
                    width: 100%;

                    padding: 10px 11px;

                    border: 1px solid #e5e7eb;
                    border-radius: 7px;

                    outline: none;

                    background: #ffffff;

                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                }

                .form-grid input:focus,
                .form-grid select:focus,
                .full-field input:focus,
                .full-field textarea:focus {
                    border-color: #9ca3af;
                }

                .full-field {
                    margin-bottom: 13px;
                }

                .full-field textarea {
                    resize: vertical;

                    line-height: 1.7;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;

                    gap: 8px;

                    margin-top: 22px;
                }

                .modal-actions button {
                    min-height: 39px;

                    padding: 0 17px;

                    border-radius: 7px;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .cancel-button {
                    border: 1px solid #e5e7eb;

                    background: #ffffff;
                    color: #374151;
                }

                .save-button {
                    border: none;

                    background: #111827;
                    color: #ffffff;
                }

                .save-button:disabled,
                .cancel-button:disabled {
                    opacity: 0.55;

                    cursor: not-allowed;
                }

                .delete-modal {
                    width: min(
                        430px,
                        100%
                    );

                    padding: 28px;

                    border-radius: 14px;

                    background: #ffffff;

                    text-align: center;
                }

                .delete-icon {
                    width: 58px;
                    height: 58px;

                    margin: 0 auto 14px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 14px;

                    background: #fef2f2;

                    font-size: 25px;
                }

                .delete-modal h2 {
                    margin: 0 0 9px;

                    font-size: 20px;
                }

                .delete-modal p {
                    margin: 6px 0;

                    color: #6b7280;

                    font-size: 11px;
                }

                .delete-modal > strong {
                    display: block;

                    margin: 10px 0;

                    color: #111827;

                    font-size: 13px;
                }

                .delete-warning {
                    margin-top: 13px !important;

                    color: #b91c1c !important;

                    font-size: 10px !important;
                }

                .danger-confirm {
                    border: none;

                    background: #dc2626;
                    color: #ffffff;
                }

                .danger-confirm:hover {
                    background: #b91c1c;
                }

                .danger-confirm:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                @media (max-width: 1100px) {

                    .stats {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .filters {
                        flex-wrap: wrap;
                    }

                    .search-box {
                        min-width: 100%;
                    }

                }

                @media (max-width: 750px) {

                    .admin-tasks-content {
                        width: calc(100% - 28px);

                        padding-top: 28px;
                    }

                    .page-header {
                        align-items: flex-start;

                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;

                        flex-wrap: wrap;
                    }

                    .dashboard-button,
                    .refresh-button {
                        flex: 1;
                    }

                    .stats {
                        grid-template-columns:
                            1fr;
                    }

                    .filters {
                        align-items: stretch;

                        flex-direction: column;
                    }

                    .search-box {
                        min-width: 0;
                    }

                    .filter-buttons {
                        width: 100%;

                        flex-wrap: wrap;
                    }

                    .filter-buttons button {
                        flex: 1;
                    }

                    .form-grid {
                        grid-template-columns:
                            1fr;
                    }

                }

                @media (max-width: 480px) {

                    .modal-overlay {
                        padding: 12px;
                    }

                    .modal {
                        max-height:
                            calc(100vh - 24px);

                        padding: 18px;
                    }

                }

            `}</style>

        </div>
    );
};

export default AdminTasks;