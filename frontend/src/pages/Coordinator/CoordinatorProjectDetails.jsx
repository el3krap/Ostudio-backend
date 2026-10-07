// frontend/src/pages/Coordinator/CoordinatorProjectDetails.jsx

import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    useNavigate,
    useParams
} from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

import {
    getProject,
    updateProject,
    updateProjectStatus
} from '../../services/coordinatorService';

/* =========================================================
   Helpers
========================================================= */

function getProjectId(project) {
    if (!project) {
        return null;
    }

    return (
        project._id ||
        project.mongoId ||
        project.id ||
        null
    );
}

function getAssignedName(value, fallback) {
    if (!value) {
        return fallback;
    }

    if (typeof value === 'object') {
        return (
            value.name ||
            value.displayName ||
            value.email ||
            fallback
        );
    }

    return value;
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
                month: 'long',
                day: 'numeric'
            }
        );
    } catch {
        return 'غير محدد';
    }
}

function normalizeStatus(status) {
    if (
        status === 'completed' ||
        status === 'complete' ||
        status === 'done'
    ) {
        return 'completed';
    }

    return 'in-progress';
}

function getStatusLabel(status) {
    return normalizeStatus(status) ===
        'completed'
        ? 'مكتمل'
        : 'قيد التنفيذ';
}

/* =========================================================
   Component
========================================================= */

export default function CoordinatorProjectDetails() {
    const navigate =
        useNavigate();

    const {
        projectId
    } = useParams();

    const [
        user,
        setUser
    ] = useState(null);

    const [
        project,
        setProject
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        statusLoading,
        setStatusLoading
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
        isEditing,
        setIsEditing
    ] = useState(false);

    const [
        form,
        setForm
    ] = useState({
        projectName: '',
        brief: '',
        description: '',
        startDate: '',
        deadline: '',
        managerNotes: '',
        coordinatorNotes: ''
    });

    /* =====================================================
       Load Current User
    ===================================================== */

    const loadCurrentUser =
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
       Fill Form
    ===================================================== */

    const fillForm =
        useCallback(
            (data) => {
                if (!data) {
                    return;
                }

                setForm({
                    projectName:
                        data.projectName ||
                        data.name ||
                        '',

                    brief:
                        data.brief ||
                        data.briefName ||
                        '',

                    description:
                        data.description ||
                        '',

                    startDate:
                        data.startDate
                            ? String(
                                  data.startDate
                              ).slice(0, 10)
                            : '',

                    deadline:
                        data.deadline
                            ? String(
                                  data.deadline
                              ).slice(0, 10)
                            : '',

                    managerNotes:
                        data.managerNotes ||
                        '',

                    coordinatorNotes:
                        data.coordinatorNotes ||
                        ''
                });
            },
            []
        );

    /* =====================================================
       Load Project
    ===================================================== */

    const loadProject =
        useCallback(
            async () => {
                if (!projectId) {
                    throw new Error(
                        'معرف المشروع غير موجود.'
                    );
                }

                const result =
                    await getProject(
                        projectId
                    );

                const data =
                    result?.project ||
                    result?.data ||
                    result;

                if (!data) {
                    throw new Error(
                        'لم يتم العثور على المشروع.'
                    );
                }

                setProject(
                    data
                );

                fillForm(
                    data
                );

                return data;
            },
            [
                projectId,
                fillForm
            ]
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
                        await loadCurrentUser();

                    if (
                        !mounted ||
                        !currentUser
                    ) {
                        return;
                    }

                    await loadProject();
                } catch (err) {
                    if (mounted) {
                        setError(
                            err?.message ||
                            'حدث خطأ أثناء تحميل المشروع.'
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
            loadCurrentUser,
            loadProject
        ]
    );

    /* =====================================================
       Form Change
    ===================================================== */

    const handleChange =
        (event) => {
            const {
                name,
                value
            } = event.target;

            setForm(
                (previous) => ({
                    ...previous,
                    [name]: value
                })
            );
        };

    /* =====================================================
       Save Project
    ===================================================== */

    const handleSave =
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
                setSaving(
                    true
                );

                setError('');
                setSuccess('');

                const updated =
                    await updateProject(
                        projectId,
                        {
                            projectName:
                                form.projectName.trim(),

                            brief:
                                form.brief,

                            briefName:
                                form.brief,

                            description:
                                form.description,

                            startDate:
                                form.startDate ||
                                null,

                            deadline:
                                form.deadline ||
                                null,

                            managerNotes:
                                form.managerNotes,

                            coordinatorNotes:
                                form.coordinatorNotes
                        }
                    );

                const updatedProject =
                    updated?.project ||
                    updated?.data ||
                    updated;

                if (
                    updatedProject &&
                    typeof updatedProject ===
                        'object'
                ) {
                    setProject(
                        updatedProject
                    );

                    fillForm(
                        updatedProject
                    );
                } else {
                    await loadProject();
                }

                setIsEditing(
                    false
                );

                setSuccess(
                    'تم تحديث بيانات المشروع بنجاح.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تحديث بيانات المشروع.'
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    /* =====================================================
       Change Status
    ===================================================== */

    const handleStatusChange =
        async (status) => {
            try {
                setStatusLoading(
                    true
                );

                setError('');
                setSuccess('');

                const result =
                    await updateProjectStatus(
                        projectId,
                        status
                    );

                const updated =
                    result?.project ||
                    result?.data ||
                    result;

                if (
                    updated &&
                    typeof updated ===
                        'object' &&
                    (
                        updated.status ||
                        updated.projectName
                    )
                ) {
                    setProject(
                        updated
                    );

                    fillForm(
                        updated
                    );
                } else {
                    await loadProject();
                }

                setSuccess(
                    status ===
                        'completed'
                        ? 'تم تحديد المشروع كمكتمل.'
                        : 'تم إعادة المشروع إلى حالة قيد التنفيذ.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تحديث حالة المشروع.'
                );
            } finally {
                setStatusLoading(
                    false
                );
            }
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
       Navigation
    ===================================================== */

    const handleBack =
        () => {
            navigate(
                '/coordinator/dashboard'
            );
        };

    const openAssignments =
        () => {
            navigate(
                `/coordinator/projects/${projectId}/assignments`
            );
        };

    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل تفاصيل المشروع..."
            />
        );
    }

    /* =====================================================
       No Project
    ===================================================== */

    if (!project) {
        return (
            <div className="project-details-page">

                <Navbar
                    user={user}
                    onLogout={
                        handleLogout
                    }
                    title="OSTUDIO"
                />

                <main className="empty-project">

                    <div className="empty-icon">
                        📂
                    </div>

                    <h1>
                        المشروع غير موجود
                    </h1>

                    <p>
                        تعذر العثور على بيانات
                        المشروع المطلوب.
                    </p>

                    <button
                        type="button"
                        onClick={
                            handleBack
                        }
                    >
                        العودة للمشاريع
                    </button>

                </main>

                <style>{`
                    .empty-project {
                        min-height: 100vh;
                        padding-top: 150px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: #f8fafc;
                        direction: rtl;
                        text-align: center;
                    }

                    .empty-icon {
                        width: 70px;
                        height: 70px;
                        border-radius: 18px;
                        background: #ffffff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 30px;
                        margin-bottom: 15px;
                    }

                    .empty-project h1 {
                        margin: 0 0 8px;
                        font-size: 24px;
                    }

                    .empty-project p {
                        margin: 0 0 20px;
                        color: #64748b;
                    }

                    .empty-project button {
                        border: none;
                        background: #111827;
                        color: #ffffff;
                        border-radius: 10px;
                        padding: 12px 18px;
                        cursor: pointer;
                        font-weight: 800;
                    }
                `}</style>
            </div>
        );
    }

    const currentStatus =
        normalizeStatus(
            project.status
        );

    const assignedDesigner =
        getAssignedName(
            project.assignedDesigner,
            project.assignedDesignerName ||
                'غير معيّن'
        );

    const assignedPresenter =
        getAssignedName(
            project.assignedPresenter,
            project.assignedPresenterName ||
                'غير معيّن'
        );

    const checkpoints =
        Array.isArray(
            project.checkpoints
        )
            ? project.checkpoints
            : [];

    const completedCheckpoints =
        checkpoints.filter(
            (checkpoint) =>
                checkpoint.isCompleted ===
                    true ||
                checkpoint.completed ===
                    true
        ).length;

    const checkpointProgress =
        checkpoints.length > 0
            ? Math.round(
                  (completedCheckpoints /
                      checkpoints.length) *
                      100
              )
            : 0;

    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="project-details-page">

            <Navbar
                user={user}
                onLogout={
                    handleLogout
                }
                title="OSTUDIO"
            />

            <main className="details-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="details-header">

                    <div>

                        <button
                            type="button"
                            className="back-button"
                            onClick={
                                handleBack
                            }
                        >
                            ← العودة للمشاريع
                        </button>

                        <div className="title-row">

                            <div className="project-title-icon">
                                📁
                            </div>

                            <div>

                                <span className="eyebrow">
                                    PROJECT DETAILS
                                </span>

                                <h1>
                                    {
                                        project.projectName ||
                                        project.name ||
                                        'مشروع بدون اسم'
                                    }
                                </h1>

                                <span className="project-id">
                                    ID:{' '}
                                    {getProjectId(
                                        project
                                    ) || '—'}
                                </span>

                            </div>

                        </div>

                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="assignment-button"
                            onClick={
                                openAssignments
                            }
                        >
                            👥 إدارة التعيينات
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
                    Main Grid
                ================================================= */}

                <div className="details-grid">

                    {/* =============================================
                        Main Details
                    ============================================= */}

                    <section className="main-card">

                        <div className="card-header">

                            <div>
                                <h2>
                                    بيانات المشروع
                                </h2>

                                <p>
                                    تفاصيل المشروع
                                    الأساسية وملاحظات
                                    فريق الإدارة والتنسيق.
                                </p>
                            </div>

                            {!isEditing && (
                                <button
                                    type="button"
                                    className="edit-button"
                                    onClick={() =>
                                        setIsEditing(
                                            true
                                        )
                                    }
                                >
                                    ✏️ تعديل
                                </button>
                            )}

                        </div>

                        {isEditing ? (
                            <form
                                onSubmit={
                                    handleSave
                                }
                                className="project-form"
                            >

                                <div className="form-group">

                                    <label>
                                        اسم المشروع
                                    </label>

                                    <input
                                        name="projectName"
                                        value={
                                            form.projectName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="اسم المشروع"
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Brief
                                    </label>

                                    <input
                                        name="brief"
                                        value={
                                            form.brief
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Brief"
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <div className="form-group full-width">

                                    <label>
                                        وصف المشروع
                                    </label>

                                    <textarea
                                        name="description"
                                        value={
                                            form.description
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows="5"
                                        placeholder="وصف المشروع..."
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            تاريخ البداية
                                        </label>

                                        <input
                                            type="date"
                                            name="startDate"
                                            value={
                                                form.startDate
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                saving
                                            }
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label>
                                            الموعد النهائي
                                        </label>

                                        <input
                                            type="date"
                                            name="deadline"
                                            value={
                                                form.deadline
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                saving
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="form-group full-width">

                                    <label>
                                        ملاحظات الـ Manager
                                    </label>

                                    <textarea
                                        name="managerNotes"
                                        value={
                                            form.managerNotes
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows="4"
                                        placeholder="ملاحظات الـ Manager..."
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <div className="form-group full-width">

                                    <label>
                                        ملاحظات الـ Coordinator
                                    </label>

                                    <textarea
                                        name="coordinatorNotes"
                                        value={
                                            form.coordinatorNotes
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows="4"
                                        placeholder="ملاحظات التنسيق..."
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <div className="form-actions">

                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={() => {
                                            fillForm(
                                                project
                                            );

                                            setIsEditing(
                                                false
                                            );

                                            setError('');
                                        }}
                                        disabled={
                                            saving
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
                        ) : (
                            <div className="details-content">

                                <div className="info-item">

                                    <span>
                                        اسم المشروع
                                    </span>

                                    <strong>
                                        {
                                            project.projectName ||
                                            project.name ||
                                            'غير محدد'
                                        }
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        Brief
                                    </span>

                                    <strong>
                                        {
                                            project.brief ||
                                            project.briefName ||
                                            'غير محدد'
                                        }
                                    </strong>

                                </div>

                                <div className="info-item full">

                                    <span>
                                        الوصف
                                    </span>

                                    <p>
                                        {
                                            project.description ||
                                            'لا يوجد وصف.'
                                        }
                                    </p>

                                </div>

                                <div className="info-item">

                                    <span>
                                        تاريخ البداية
                                    </span>

                                    <strong>
                                        {formatDate(
                                            project.startDate
                                        )}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        الموعد النهائي
                                    </span>

                                    <strong>
                                        {formatDate(
                                            project.deadline
                                        )}
                                    </strong>

                                </div>

                                <div className="info-item full">

                                    <span>
                                        ملاحظات الـ Manager
                                    </span>

                                    <p>
                                        {
                                            project.managerNotes ||
                                            'لا توجد ملاحظات.'
                                        }
                                    </p>

                                </div>

                                <div className="info-item full">

                                    <span>
                                        ملاحظات الـ Coordinator
                                    </span>

                                    <p>
                                        {
                                            project.coordinatorNotes ||
                                            'لا توجد ملاحظات.'
                                        }
                                    </p>

                                </div>

                            </div>
                        )}

                    </section>

                    {/* =============================================
                        Side Panel
                    ============================================= */}

                    <aside className="side-column">

                        {/* Status */}

                        <section className="side-card">

                            <div className="side-card-header">

                                <h2>
                                    حالة المشروع
                                </h2>

                            </div>

                            <div className="status-display">

                                <span
                                    className={
                                        currentStatus ===
                                        'completed'
                                            ? 'big-status completed'
                                            : 'big-status progress'
                                    }
                                >
                                    {currentStatus ===
                                    'completed'
                                        ? '✓ مكتمل'
                                        : '↻ قيد التنفيذ'}
                                </span>

                            </div>

                            <div className="status-actions">

                                {currentStatus !==
                                    'completed' && (
                                    <button
                                        type="button"
                                        className="complete-button"
                                        onClick={() =>
                                            handleStatusChange(
                                                'completed'
                                            )
                                        }
                                        disabled={
                                            statusLoading
                                        }
                                    >
                                        {statusLoading
                                            ? 'جاري التحديث...'
                                            : '✓ تحديد كمكتمل'}
                                    </button>
                                )}

                                {currentStatus ===
                                    'completed' && (
                                    <button
                                        type="button"
                                        className="reopen-button"
                                        onClick={() =>
                                            handleStatusChange(
                                                'in-progress'
                                            )
                                        }
                                        disabled={
                                            statusLoading
                                        }
                                    >
                                        {statusLoading
                                            ? 'جاري التحديث...'
                                            : '↻ إعادة فتح المشروع'}
                                    </button>
                                )}

                            </div>

                        </section>

                        {/* Assignments */}

                        <section className="side-card">

                            <div className="side-card-header">

                                <h2>
                                    التعيينات
                                </h2>

                                <button
                                    type="button"
                                    onClick={
                                        openAssignments
                                    }
                                >
                                    إدارة
                                </button>

                            </div>

                            <div className="person-row">

                                <div className="person-icon designer">
                                    🎨
                                </div>

                                <div>
                                    <span>
                                        مصمم المشروع
                                    </span>

                                    <strong>
                                        {
                                            assignedDesigner
                                        }
                                    </strong>
                                </div>

                            </div>

                            <div className="person-row">

                                <div className="person-icon presenter">
                                    🖥️
                                </div>

                                <div>
                                    <span>
                                        مصمم العرض
                                    </span>

                                    <strong>
                                        {
                                            assignedPresenter
                                        }
                                    </strong>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="full-assignment-button"
                                onClick={
                                    openAssignments
                                }
                            >
                                فتح صفحة التعيينات
                            </button>

                        </section>

                        {/* Checkpoints */}

                        <section className="side-card">

                            <div className="side-card-header">

                                <h2>
                                    Checkpoints
                                </h2>

                                <span>
                                    {
                                        completedCheckpoints
                                    }
                                    /
                                    {
                                        checkpoints.length
                                    }
                                </span>

                            </div>

                            <div className="progress-wrapper">

                                <div className="progress-track">

                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${checkpointProgress}%`
                                        }}
                                    />

                                </div>

                                <span>
                                    {
                                        checkpointProgress
                                    }
                                    %
                                </span>

                            </div>

                            {checkpoints.length ===
                            0 ? (
                                <div className="no-checkpoints">
                                    لا توجد Checkpoints.
                                </div>
                            ) : (
                                <div className="checkpoint-list">

                                    {checkpoints.map(
                                        (
                                            checkpoint,
                                            index
                                        ) => {
                                            const completed =
                                                checkpoint.isCompleted ===
                                                    true ||
                                                checkpoint.completed ===
                                                    true;

                                            return (
                                                <div
                                                    className="checkpoint-item"
                                                    key={
                                                        checkpoint.id ||
                                                        checkpoint._id ||
                                                        index
                                                    }
                                                >

                                                    <div
                                                        className={
                                                            completed
                                                                ? 'checkpoint-check completed'
                                                                : 'checkpoint-check'
                                                        }
                                                    >
                                                        {completed
                                                            ? '✓'
                                                            : index +
                                                              1}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                checkpoint.title ||
                                                                `Checkpoint ${
                                                                    index +
                                                                    1
                                                                }`
                                                            }
                                                        </strong>

                                                        {checkpoint.note && (
                                                            <span>
                                                                {
                                                                    checkpoint.note
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                </div>
                                            );
                                        }
                                    )}

                                </div>
                            )}

                        </section>

                    </aside>

                </div>

                {/* =================================================
                    Files
                ================================================= */}

                <section className="files-card">

                    <div className="section-title-block">

                        <h2>
                            ملفات المشروع
                        </h2>

                        <p>
                            ملفات الـ Render والعرض
                            التقديمي المرتبطة بالمشروع.
                        </p>

                    </div>

                    <div className="files-grid">

                        <div className="file-box">

                            <div className="file-icon">
                                🎬
                            </div>

                            <div className="file-info">

                                <span>
                                    Render File
                                </span>

                                <strong>
                                    {
                                        project.renderFileName ||
                                        'لم يتم رفع ملف'
                                    }
                                </strong>

                            </div>

                            {project.renderFileLink && (
                                <a
                                    href={
                                        project.renderFileLink
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="file-button"
                                >
                                    فتح
                                </a>
                            )}

                        </div>

                        <div className="file-box">

                            <div className="file-icon presentation-file">
                                🖥️
                            </div>

                            <div className="file-info">

                                <span>
                                    Presentation File
                                </span>

                                <strong>
                                    {
                                        project.presentationFileName ||
                                        'لم يتم رفع ملف'
                                    }
                                </strong>

                            </div>

                            {project.presentationFileLink && (
                                <a
                                    href={
                                        project.presentationFileLink
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="file-button"
                                >
                                    فتح
                                </a>
                            )}

                        </div>

                    </div>

                </section>

            </main>

            {/* =====================================================
                Styles
            ===================================================== */}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .project-details-page {
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

                .details-container {
                    width: min(
                        1250px,
                        calc(100% - 40px)
                    );
                    margin: 0 auto;
                    padding:
                        105px 0 55px;
                }

                .details-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    margin-bottom: 25px;
                }

                .back-button {
                    border: none;
                    background: transparent;
                    color: #64748b;
                    padding: 0;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 800;
                }

                .back-button:hover {
                    color: #111827;
                }

                .title-row {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-top: 15px;
                }

                .project-title-icon {
                    width: 57px;
                    height: 57px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #eef2ff;
                    font-size: 26px;
                    flex-shrink: 0;
                }

                .eyebrow {
                    display: block;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 1.8px;
                    direction: ltr;
                    margin-bottom: 4px;
                }

                .title-row h1 {
                    margin:
                        0 0 4px;
                    font-size: 29px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                }

                .project-id {
                    direction: ltr;
                    display: block;
                    color: #94a3b8;
                    font-family: monospace;
                    font-size: 10px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .assignment-button {
                    min-height: 43px;
                    padding:
                        0 15px;
                    border: none;
                    border-radius: 11px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    transition:
                        all 0.2s ease;
                }

                .assignment-button:hover {
                    background: #000000;
                    transform:
                        translateY(-1px);
                }

                .alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 16px;
                    margin-bottom: 20px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 700;
                }

                .alert button {
                    margin-right: auto;
                    border: none;
                    background: transparent;
                    font-size: 20px;
                    cursor: pointer;
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

                .details-grid {
                    display: grid;
                    grid-template-columns:
                        minmax(0, 1.55fr)
                        minmax(310px, 0.75fr);
                    gap: 22px;
                    align-items: start;
                }

                .main-card,
                .side-card,
                .files-card {
                    background: #ffffff;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 18px;
                    box-shadow:
                        0 10px 30px
                        rgba(
                            15,
                            23,
                            42,
                            0.045
                        );
                }

                .main-card {
                    padding: 24px;
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 15px;
                    margin-bottom: 24px;
                }

                .card-header h2 {
                    margin:
                        0 0 5px;
                    font-size: 20px;
                    font-weight: 900;
                }

                .card-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.7;
                }

                .edit-button {
                    min-height: 39px;
                    padding:
                        0 13px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #ffffff;
                    color: #334155;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .edit-button:hover {
                    background: #f8fafc;
                }

                .details-content {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                }

                .info-item {
                    padding:
                        13px;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 12px;
                    background: #f8fafc;
                }

                .info-item.full {
                    grid-column:
                        1 / -1;
                }

                .info-item span {
                    display: block;
                    margin-bottom: 6px;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 800;
                }

                .info-item strong {
                    display: block;
                    color: #334155;
                    font-size: 13px;
                    line-height: 1.7;
                }

                .info-item p {
                    margin: 0;
                    color: #475569;
                    font-size: 13px;
                    line-height: 1.8;
                    white-space: pre-wrap;
                }

                .project-form {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 15px;
                }

                .form-group {
                    min-width: 0;
                }

                .form-group.full-width {
                    grid-column:
                        1 / -1;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 7px;
                    color: #334155;
                    font-size: 12px;
                    font-weight: 800;
                }

                .form-group input,
                .form-group textarea {
                    width: 100%;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #ffffff;
                    color: #1e293b;
                    font-family: inherit;
                    font-size: 13px;
                    outline: none;
                    transition:
                        border-color 0.2s ease,
                        box-shadow 0.2s ease;
                }

                .form-group input {
                    min-height: 44px;
                    padding:
                        0 12px;
                }

                .form-group textarea {
                    padding:
                        11px 12px;
                    resize: vertical;
                    line-height: 1.7;
                }

                .form-group input:focus,
                .form-group textarea:focus {
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
                .form-group textarea:disabled {
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
                    gap: 15px;
                }

                .form-actions {
                    grid-column:
                        1 / -1;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 5px;
                }

                .cancel-button,
                .save-button {
                    min-height: 42px;
                    padding:
                        0 16px;
                    border-radius: 10px;
                    font-size: 12px;
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

                .cancel-button:disabled,
                .save-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .side-column {
                    display: flex;
                    flex-direction: column;
                    gap: 17px;
                }

                .side-card {
                    padding: 19px;
                }

                .side-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .side-card-header h2 {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 900;
                }

                .side-card-header span {
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 800;
                }

                .side-card-header button {
                    border: none;
                    background: transparent;
                    color: #475569;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 800;
                }

                .status-display {
                    margin-bottom: 13px;
                }

                .big-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 53px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 900;
                }

                .big-status.completed {
                    background: #dcfce7;
                    color: #166534;
                }

                .big-status.progress {
                    background: #fef3c7;
                    color: #92400e;
                }

                .status-actions button {
                    width: 100%;
                    min-height: 40px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .complete-button {
                    border: none;
                    background: #166534;
                    color: #ffffff;
                }

                .reopen-button {
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                }

                .status-actions button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .person-row {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding:
                        11px 0;
                }

                .person-row + .person-row {
                    border-top:
                        1px solid #e2e8f0;
                }

                .person-icon {
                    width: 39px;
                    height: 39px;
                    border-radius: 11px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                    flex-shrink: 0;
                }

                .person-icon.designer {
                    background: #ede9fe;
                }

                .person-icon.presenter {
                    background: #dbeafe;
                }

                .person-row span {
                    display: block;
                    margin-bottom: 3px;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 700;
                }

                .person-row strong {
                    display: block;
                    color: #334155;
                    font-size: 12px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 210px;
                }

                .full-assignment-button {
                    width: 100%;
                    min-height: 39px;
                    margin-top: 10px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #ffffff;
                    color: #334155;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .full-assignment-button:hover {
                    background: #f8fafc;
                }

                .progress-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .progress-track {
                    flex: 1;
                    height: 7px;
                    overflow: hidden;
                    border-radius: 999px;
                    background: #e2e8f0;
                }

                .progress-bar {
                    height: 100%;
                    border-radius: inherit;
                    background: #334155;
                    transition:
                        width 0.3s ease;
                }

                .progress-wrapper > span {
                    min-width: 30px;
                    color: #475569;
                    font-size: 10px;
                    font-weight: 900;
                    text-align: left;
                }

                .no-checkpoints {
                    padding:
                        15px;
                    border-radius: 10px;
                    background: #f8fafc;
                    color: #94a3b8;
                    font-size: 11px;
                    text-align: center;
                }

                .checkpoint-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .checkpoint-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                }

                .checkpoint-check {
                    width: 25px;
                    height: 25px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    font-size: 9px;
                    font-weight: 900;
                    flex-shrink: 0;
                }

                .checkpoint-check.completed {
                    border-color: #86efac;
                    background: #dcfce7;
                    color: #166534;
                }

                .checkpoint-item strong {
                    display: block;
                    color: #334155;
                    font-size: 11px;
                    line-height: 1.5;
                }

                .checkpoint-item span {
                    display: block;
                    margin-top: 2px;
                    color: #94a3b8;
                    font-size: 9px;
                    line-height: 1.5;
                }

                .files-card {
                    margin-top: 22px;
                    padding: 23px;
                }

                .section-title-block {
                    margin-bottom: 17px;
                }

                .section-title-block h2 {
                    margin:
                        0 0 5px;
                    font-size: 19px;
                    font-weight: 900;
                }

                .section-title-block p {
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                }

                .files-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                }

                .file-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                    padding: 14px;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 13px;
                    background: #f8fafc;
                }

                .file-icon {
                    width: 43px;
                    height: 43px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 11px;
                    background: #ede9fe;
                    font-size: 19px;
                    flex-shrink: 0;
                }

                .file-icon.presentation-file {
                    background: #dbeafe;
                }

                .file-info {
                    min-width: 0;
                    flex: 1;
                }

                .file-info span {
                    display: block;
                    margin-bottom: 4px;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 800;
                }

                .file-info strong {
                    display: block;
                    color: #334155;
                    font-size: 11px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .file-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 50px;
                    min-height: 34px;
                    padding:
                        0 10px;
                    border-radius: 9px;
                    background: #111827;
                    color: #ffffff;
                    text-decoration: none;
                    font-size: 10px;
                    font-weight: 800;
                    flex-shrink: 0;
                }

                .file-button:hover {
                    background: #000000;
                }

                @media (
                    max-width: 950px
                ) {
                    .details-grid {
                        grid-template-columns: 1fr;
                    }

                    .side-column {
                        display: grid;
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }
                }

                @media (
                    max-width: 700px
                ) {
                    .details-container {
                        width:
                            min(
                                calc(100% - 24px),
                                1250px
                            );
                        padding-top: 95px;
                    }

                    .details-header {
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                    }

                    .title-row h1 {
                        font-size: 24px;
                    }

                    .details-content,
                    .project-form,
                    .files-grid,
                    .form-row,
                    .side-column {
                        grid-template-columns: 1fr;
                    }

                    .form-group.full-width,
                    .info-item.full,
                    .form-actions {
                        grid-column: auto;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .cancel-button,
                    .save-button {
                        width: 100%;
                    }
                }

                @media (
                    max-width: 450px
                ) {
                    .main-card,
                    .files-card,
                    .side-card {
                        padding: 17px;
                    }

                    .header-actions {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .assignment-button {
                        width: 100%;
                    }
                }

            `}</style>

        </div>
    );
}