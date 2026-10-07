// frontend/src/pages/Manager/ManagerProjectDetails.jsx

import React, {
    useCallback,
    useEffect,
    useMemo,
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
    deleteProject,
    updateProjectStatus,
    getDesigners,
    assignDesigner,
    removeDesigner,
    assignPresenter,
    removePresenter
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

function getUserName(user) {
    if (!user) return 'غير معين';

    return (
        user.name ||
        user.displayName ||
        user.email ||
        'مستخدم'
    );
}

function getProjectStatusLabel(status) {
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

function getDesignerId(project) {
    return (
        project?.assignedDesigner?._id ||
        project?.assignedDesigner?.id ||
        project?.assignedDesignerId ||
        ''
    );
}

function getPresenterId(project) {
    return (
        project?.assignedPresenter?._id ||
        project?.assignedPresenter?.id ||
        project?.assignedPresenterId ||
        ''
    );
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


/* =========================================================
   Component
========================================================= */

export default function ManagerProjectDetails() {
    const navigate =
        useNavigate();

    const { projectId } =
        useParams();

    const [user, setUser] =
        useState(null);

    const [project, setProject] =
        useState(null);

    const [designers, setDesigners] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

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

    const [editMode, setEditMode] =
        useState(false);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [showDesignerModal, setShowDesignerModal] =
        useState(false);

    const [showPresenterModal, setShowPresenterModal] =
        useState(false);

    const [selectedDesigner, setSelectedDesigner] =
        useState('');

    const [selectedPresenter, setSelectedPresenter] =
        useState('');

    const [form, setForm] =
        useState({
            projectName: '',
            brief: '',
            briefName: '',
            description: '',
            startDate: '',
            deadline: '',
            managerNotes: '',
            coordinatorNotes: '',
            renderFileLink: '',
            renderFileName: '',
            renderStatus: '',
            presentationFileLink: '',
            presentationFileName: '',
            presenterNote: '',
            status: 'in-progress'
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
       Form Builder
    ===================================================== */

    const buildFormFromProject =
        useCallback(
            (data) => {
                setForm({
                    projectName:
                        data?.projectName ||
                        '',

                    brief:
                        data?.brief ||
                        '',

                    briefName:
                        data?.briefName ||
                        '',

                    description:
                        data?.description ||
                        '',

                    startDate:
                        data?.startDate
                            ? String(
                                data.startDate
                            ).slice(0, 10)
                            : '',

                    deadline:
                        data?.deadline
                            ? String(
                                data.deadline
                            ).slice(0, 10)
                            : '',

                    managerNotes:
                        data?.managerNotes ||
                        '',

                    coordinatorNotes:
                        data?.coordinatorNotes ||
                        '',

                    renderFileLink:
                        data?.renderFileLink ||
                        '',

                    renderFileName:
                        data?.renderFileName ||
                        '',

                    renderStatus:
                        data?.renderStatus ||
                        '',

                    presentationFileLink:
                        data?.presentationFileLink ||
                        '',

                    presentationFileName:
                        data?.presentationFileName ||
                        '',

                    presenterNote:
                        data?.presenterNote ||
                        '',

                    status:
                        data?.status ||
                        'in-progress'
                });
            },
            []
        );


    /* =====================================================
       Load Project
    ===================================================== */

    const loadProject =
        useCallback(
            async (
                showLoader = true
            ) => {
                try {
                    if (showLoader) {
                        setLoading(true);
                    }

                    setError('');

                    const currentUser =
                        verifyUser();

                    if (!currentUser) {
                        return;
                    }

                    if (!projectId) {
                        throw new Error(
                            'معرف المشروع غير موجود.'
                        );
                    }

                    const data =
                        await getProject(
                            projectId
                        );

                    if (!data) {
                        throw new Error(
                            'لم يتم العثور على المشروع.'
                        );
                    }

                    setProject(data);

                    buildFormFromProject(
                        data
                    );

                    setSelectedDesigner(
                        getDesignerId(
                            data
                        )
                    );

                    setSelectedPresenter(
                        getPresenterId(
                            data
                        )
                    );
                } catch (err) {
                    console.error(
                        'Load manager project error:',
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
                        'تعذر تحميل المشروع.'
                    );
                } finally {
                    if (showLoader) {
                        setLoading(false);
                    }
                }
            },
            [
                projectId,
                navigate,
                verifyUser,
                buildFormFromProject
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
        loadProject();
        loadDesigners();
    }, [
        loadProject,
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
                setSaving(true);
                setError('');
                setSuccess('');

                const updated =
                    await updateProject(
                        projectId,
                        {
                            projectName:
                                form.projectName.trim(),

                            brief:
                                form.brief.trim(),

                            briefName:
                                form.briefName.trim(),

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

                            coordinatorNotes:
                                form.coordinatorNotes.trim(),

                            renderFileLink:
                                form.renderFileLink.trim(),

                            renderFileName:
                                form.renderFileName.trim(),

                            renderStatus:
                                form.renderStatus,

                            presentationFileLink:
                                form.presentationFileLink.trim(),

                            presentationFileName:
                                form.presentationFileName.trim(),

                            presenterNote:
                                form.presenterNote.trim(),

                            status:
                                form.status
                        }
                    );

                if (updated) {
                    setProject(
                        updated
                    );

                    buildFormFromProject(
                        updated
                    );
                }

                setEditMode(false);

                setSuccess(
                    'تم حفظ تعديلات المشروع بنجاح.'
                );

                await loadProject(
                    false
                );
            } catch (err) {
                console.error(
                    'Update project error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر حفظ تعديلات المشروع.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Status
    ===================================================== */

    const handleStatusChange =
        async (status) => {
            if (
                !projectId ||
                !status
            ) {
                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                const updated =
                    await updateProjectStatus(
                        projectId,
                        status
                    );

                if (updated) {
                    setProject(
                        updated
                    );

                    buildFormFromProject(
                        updated
                    );
                }

                setSuccess(
                    'تم تحديث حالة المشروع.'
                );

                await loadProject(
                    false
                );
            } catch (err) {
                console.error(
                    'Status update error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث حالة المشروع.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Designer Assignment
    ===================================================== */

    const handleAssignDesigner =
        async () => {
            if (!selectedDesigner) {
                setError(
                    'اختر Designer أولاً.'
                );

                return;
            }

            try {
                setAssigning(true);
                setError('');
                setSuccess('');

                await assignDesigner(
                    projectId,
                    selectedDesigner
                );

                setShowDesignerModal(
                    false
                );

                setSuccess(
                    'تم تعيين الـ Designer للمشروع وإرسال الإشعار.'
                );

                await loadProject(
                    false
                );
            } catch (err) {
                console.error(
                    'Assign designer error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تعيين الـ Designer.'
                );
            } finally {
                setAssigning(false);
            }
        };


    const handleRemoveDesigner =
        async () => {
            try {
                setAssigning(true);
                setError('');
                setSuccess('');

                await removeDesigner(
                    projectId
                );

                setSelectedDesigner('');

                setSuccess(
                    'تم إزالة Designer من المشروع.'
                );

                await loadProject(
                    false
                );
            } catch (err) {
                console.error(
                    'Remove designer error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر إزالة الـ Designer.'
                );
            } finally {
                setAssigning(false);
            }
        };


    /* =====================================================
       Presenter Assignment
    ===================================================== */

    const handleAssignPresenter =
        async () => {
            if (!selectedPresenter) {
                setError(
                    'اختر Presentation Designer أولاً.'
                );

                return;
            }

            try {
                setAssigning(true);
                setError('');
                setSuccess('');

                await assignPresenter(
                    projectId,
                    selectedPresenter
                );

                setShowPresenterModal(
                    false
                );

                setSuccess(
                    'تم تعيين Presentation Designer وإرسال الإشعار.'
                );

                await loadProject(
                    false
                );
            } catch (err) {
                console.error(
                    'Assign presenter error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تعيين Presentation Designer.'
                );
            } finally {
                setAssigning(false);
            }
        };


    const handleRemovePresenter =
        async () => {
            try {
                setAssigning(true);
                setError('');
                setSuccess('');

                await removePresenter(
                    projectId
                );

                setSelectedPresenter('');

                setSuccess(
                    'تم إزالة Presentation Designer.'
                );

                await loadProject(
                    false
                );
            } catch (err) {
                console.error(
                    'Remove presenter error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر إزالة Presentation Designer.'
                );
            } finally {
                setAssigning(false);
            }
        };


    /* =====================================================
       Delete
    ===================================================== */

    const handleDelete =
        async () => {
            try {
                setDeleting(true);
                setError('');

                await deleteProject(
                    projectId
                );

                navigate(
                    '/manager/dashboard',
                    {
                        replace: true,
                        state: {
                            message:
                                'تم حذف المشروع بنجاح.'
                        }
                    }
                );
            } catch (err) {
                console.error(
                    'Delete project error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر حذف المشروع.'
                );

                setDeleting(false);
                setShowDeleteModal(
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
       Derived Data
    ===================================================== */

    const checkpointProgress =
        useMemo(
            () =>
                getCheckpointProgress(
                    project
                ),
            [project]
        );

    const completedCheckpoints =
        Array.isArray(
            project?.checkpoints
        )
            ? project.checkpoints.filter(
                (item) =>
                    item?.isCompleted
            ).length
            : 0;

    const totalCheckpoints =
        Array.isArray(
            project?.checkpoints
        )
            ? project.checkpoints.length
            : 0;


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
            <div className="manager-details-page">

                <Navbar
                    user={user}
                    onLogout={handleLogout}
                    title="OSTUDIO"
                />

                <main className="not-found-container">

                    <div className="not-found-card">

                        <div className="not-found-icon">
                            📁
                        </div>

                        <h1>
                            المشروع غير موجود
                        </h1>

                        <p>
                            لم يتم العثور على المشروع
                            المطلوب.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/manager/dashboard'
                                )
                            }
                        >
                            العودة للوحة التحكم
                        </button>

                    </div>

                </main>

                <style>{`
                    .manager-details-page {
                        min-height: 100vh;
                        background: #f5f7fb;
                        direction: rtl;
                    }

                    .not-found-container {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 100px 20px 40px;
                    }

                    .not-found-card {
                        width: min(500px, 100%);
                        background: #fff;
                        border: 1px solid #e8edf4;
                        border-radius: 20px;
                        padding: 45px 25px;
                        text-align: center;
                    }

                    .not-found-icon {
                        font-size: 45px;
                        margin-bottom: 15px;
                    }

                    .not-found-card h1 {
                        margin: 0;
                        color: #111827;
                        font-size: 23px;
                    }

                    .not-found-card p {
                        color: #64748b;
                        font-size: 12px;
                        margin: 9px 0 20px;
                    }

                    .not-found-card button {
                        border: 0;
                        border-radius: 9px;
                        background: #111827;
                        color: #fff;
                        padding: 11px 18px;
                        cursor: pointer;
                        font-family: inherit;
                        font-weight: 800;
                    }
                `}</style>

            </div>
        );
    }


    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="manager-details-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="details-container">

                {/* =================================================
                    Top Navigation
                ================================================= */}

                <div className="top-navigation">

                    <button
                        type="button"
                        className="back-button"
                        onClick={() =>
                            navigate(
                                '/manager/dashboard'
                            )
                        }
                    >
                        → العودة للوحة التحكم
                    </button>

                    <div className="top-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="edit-button"
                            onClick={() => {
                                setError('');
                                setSuccess('');
                                setEditMode(
                                    true
                                );
                            }}
                        >
                            ✎ تعديل المشروع
                        </button>

                        <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                                setShowDeleteModal(
                                    true
                                )
                            }
                        >
                            🗑 حذف
                        </button>

                    </div>

                </div>


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
                    Project Header
                ================================================= */}

                <section className="project-header">

                    <div className="project-heading">

                        <div className="project-folder-icon">
                            📁
                        </div>

                        <div>

                            <div className="project-kicker">
                                PROJECT DETAILS
                            </div>

                            <h1>
                                {
                                    project.projectName ||
                                    'مشروع بدون اسم'
                                }
                            </h1>

                            <p>
                                {project.brief ||
                                    project.description ||
                                    'لا يوجد وصف للمشروع.'}
                            </p>

                        </div>

                    </div>


                    <div className="header-status">

                        <span
                            className={`status-badge large ${getStatusClass(
                                project.status
                            )}`}
                        >
                            {
                                getProjectStatusLabel(
                                    project.status
                                )
                            }
                        </span>

                    </div>

                </section>


                {/* =================================================
                    Main Layout
                ================================================= */}

                <div className="content-grid">

                    <div className="main-column">

                        {/* =========================================
                           Basic Information
                        ========================================= */}

                        <section className="content-card">

                            <div className="card-heading">

                                <div>
                                    <h2>
                                        بيانات المشروع
                                    </h2>

                                    <p>
                                        المعلومات الأساسية
                                        للمشروع.
                                    </p>
                                </div>

                            </div>


                            <div className="info-grid">

                                <div className="info-item">

                                    <span>
                                        اسم المشروع
                                    </span>

                                    <strong>
                                        {
                                            project.projectName ||
                                            'غير محدد'
                                        }
                                    </strong>

                                </div>


                                <div className="info-item">

                                    <span>
                                        Brief Name
                                    </span>

                                    <strong>
                                        {
                                            project.briefName ||
                                            'غير محدد'
                                        }
                                    </strong>

                                </div>


                                <div className="info-item">

                                    <span>
                                        تاريخ البداية
                                    </span>

                                    <strong>
                                        {
                                            formatDate(
                                                project.startDate
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="info-item">

                                    <span>
                                        Deadline
                                    </span>

                                    <strong>
                                        {
                                            formatDate(
                                                project.deadline
                                            )
                                        }
                                    </strong>

                                </div>

                            </div>


                            <div className="long-info">

                                <span>
                                    Brief
                                </span>

                                <p>
                                    {
                                        project.brief ||
                                        'لا يوجد Brief.'
                                    }
                                </p>

                            </div>


                            <div className="long-info">

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


                            <div className="long-info">

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


                            <div className="long-info">

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

                        </section>


                        {/* =========================================
                           Assignments
                        ========================================= */}

                        <section className="content-card">

                            <div className="card-heading">

                                <div>
                                    <h2>
                                        التعيينات
                                    </h2>

                                    <p>
                                        تعيين فريق المشروع
                                        بشكل مستقل.
                                    </p>
                                </div>

                            </div>


                            <div className="assignment-grid">

                                {/* Main Designer */}

                                <div className="assignment-card">

                                    <div className="assignment-icon">
                                        🎨
                                    </div>

                                    <div className="assignment-content">

                                        <span className="assignment-label">
                                            Project Designer
                                        </span>

                                        <strong>
                                            {
                                                getDesignerName(
                                                    project
                                                )
                                            }
                                        </strong>

                                        <div className="assignment-actions">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowDesignerModal(
                                                        true
                                                    )
                                                }
                                            >
                                                {getDesignerId(
                                                    project
                                                )
                                                    ? 'تغيير'
                                                    : 'تعيين'}
                                            </button>

                                            {getDesignerId(
                                                project
                                            ) && (
                                                <button
                                                    type="button"
                                                    className="remove-assignment"
                                                    disabled={
                                                        assigning
                                                    }
                                                    onClick={
                                                        handleRemoveDesigner
                                                    }
                                                >
                                                    إزالة
                                                </button>
                                            )}

                                        </div>

                                    </div>

                                </div>


                                {/* Presentation Designer */}

                                <div className="assignment-card">

                                    <div className="assignment-icon">
                                        🖥️
                                    </div>

                                    <div className="assignment-content">

                                        <span className="assignment-label">
                                            Presentation Designer
                                        </span>

                                        <strong>
                                            {
                                                getPresenterName(
                                                    project
                                                )
                                            }
                                        </strong>

                                        <div className="assignment-actions">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPresenterModal(
                                                        true
                                                    )
                                                }
                                            >
                                                {getPresenterId(
                                                    project
                                                )
                                                    ? 'تغيير'
                                                    : 'تعيين'}
                                            </button>

                                            {getPresenterId(
                                                project
                                            ) && (
                                                <button
                                                    type="button"
                                                    className="remove-assignment"
                                                    disabled={
                                                        assigning
                                                    }
                                                    onClick={
                                                        handleRemovePresenter
                                                    }
                                                >
                                                    إزالة
                                                </button>
                                            )}

                                        </div>

                                    </div>

                                </div>

                            </div>


                            <div className="assignment-note">

                                <span>
                                    ℹ️
                                </span>

                                <p>
                                    الـ Project Designer والـ
                                    Presentation Designer
                                    مستقلين عن بعض. يمكن تعيين
                                    شخصين مختلفين لنفس المشروع.
                                </p>

                            </div>

                        </section>


                        {/* =========================================
                           Checkpoints
                        ========================================= */}

                        <section className="content-card">

                            <div className="card-heading">

                                <div>
                                    <h2>
                                        Checkpoints
                                    </h2>

                                    <p>
                                        متابعة تقدم مراحل
                                        المشروع.
                                    </p>
                                </div>


                                <div className="checkpoint-counter">
                                    {completedCheckpoints}
                                    /
                                    {totalCheckpoints}
                                </div>

                            </div>


                            {totalCheckpoints === 0 ? (
                                <div className="empty-small">
                                    لا توجد Checkpoints
                                    مضافة لهذا المشروع.
                                </div>
                            ) : (
                                <div className="checkpoint-list">

                                    {project.checkpoints.map(
                                        (
                                            checkpoint,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    checkpoint?._id ||
                                                    checkpoint?.id ||
                                                    index
                                                }
                                                className={`checkpoint-item ${
                                                    checkpoint?.isCompleted
                                                        ? 'checkpoint-completed'
                                                        : ''
                                                }`}
                                            >

                                                <div className="checkpoint-number">
                                                    {
                                                        checkpoint?.isCompleted
                                                            ? '✓'
                                                            : index + 1
                                                    }
                                                </div>


                                                <div className="checkpoint-body">

                                                    <div className="checkpoint-title-row">

                                                        <strong>
                                                            {
                                                                checkpoint?.title ||
                                                                `Checkpoint ${
                                                                    index + 1
                                                                }`
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                checkpoint?.isCompleted
                                                                    ? 'مكتمل'
                                                                    : 'قيد التنفيذ'
                                                            }
                                                        </span>

                                                    </div>


                                                    {checkpoint?.note && (
                                                        <p>
                                                            {
                                                                checkpoint.note
                                                            }
                                                        </p>
                                                    )}


                                                    {(
                                                        checkpoint?.fileUrl ||
                                                        checkpoint?.imageLink
                                                    ) && (
                                                        <a
                                                            href={
                                                                checkpoint.fileUrl ||
                                                                checkpoint.imageLink
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            فتح الملف
                                                        </a>
                                                    )}

                                                </div>

                                            </div>
                                        )
                                    )}

                                </div>
                            )}


                            {totalCheckpoints > 0 && (
                                <div className="overall-progress">

                                    <div className="progress-header">

                                        <span>
                                            نسبة الإنجاز
                                        </span>

                                        <strong>
                                            {
                                                checkpointProgress
                                            }%
                                        </strong>

                                    </div>

                                    <div className="progress-track">

                                        <div
                                            className="progress-fill"
                                            style={{
                                                width:
                                                    `${checkpointProgress}%`
                                            }}
                                        />

                                    </div>

                                </div>
                            )}

                        </section>


                        {/* =========================================
                           Render
                        ========================================= */}

                        <section className="content-card">

                            <div className="card-heading">

                                <div>
                                    <h2>
                                        Render
                                    </h2>

                                    <p>
                                        ملفات وحالة الـ Render.
                                    </p>
                                </div>

                                {project.renderStatus && (
                                    <span className="small-status">
                                        {
                                            project.renderStatus
                                        }
                                    </span>
                                )}

                            </div>


                            <div className="file-section">

                                {project.renderFileLink ? (
                                    <a
                                        href={
                                            project.renderFileLink
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="file-link"
                                    >
                                        <span>
                                            📄
                                        </span>

                                        <div>
                                            <strong>
                                                {
                                                    project.renderFileName ||
                                                    'Render File'
                                                }
                                            </strong>

                                            <small>
                                                فتح ملف الـ Render
                                            </small>
                                        </div>

                                        <b>
                                            ↗
                                        </b>
                                    </a>
                                ) : (
                                    <div className="empty-file">
                                        لا يوجد Render File
                                        مرفوع.
                                    </div>
                                )}

                            </div>

                        </section>


                        {/* =========================================
                           Presentation
                        ========================================= */}

                        <section className="content-card">

                            <div className="card-heading">

                                <div>
                                    <h2>
                                        Presentation
                                    </h2>

                                    <p>
                                        ملف العرض التقديمي
                                        وملاحظاته.
                                    </p>
                                </div>

                            </div>


                            <div className="file-section">

                                {project.presentationFileLink ? (
                                    <a
                                        href={
                                            project.presentationFileLink
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="file-link"
                                    >
                                        <span>
                                            📊
                                        </span>

                                        <div>
                                            <strong>
                                                {
                                                    project.presentationFileName ||
                                                    'Presentation File'
                                                }
                                            </strong>

                                            <small>
                                                فتح العرض التقديمي
                                            </small>
                                        </div>

                                        <b>
                                            ↗
                                        </b>
                                    </a>
                                ) : (
                                    <div className="empty-file">
                                        لا يوجد Presentation
                                        File مرفوع.
                                    </div>
                                )}

                            </div>


                            <div className="long-info">

                                <span>
                                    Presenter Note
                                </span>

                                <p>
                                    {
                                        project.presenterNote ||
                                        'لا توجد ملاحظات.'
                                    }
                                </p>

                            </div>


                            <div className="approval-row">

                                <span>
                                    حالة اعتماد الـ Presentation
                                </span>

                                <strong
                                    className={
                                        project.isPresentationApproved
                                            ? 'approved'
                                            : 'not-approved'
                                    }
                                >
                                    {
                                        project.isPresentationApproved
                                            ? '✓ معتمد'
                                            : 'غير معتمد'
                                    }
                                </strong>

                            </div>

                        </section>

                    </div>


                    {/* =================================================
                       Sidebar
                    ================================================= */}

                    <aside className="sidebar">

                        {/* Status */}

                        <section className="side-card">

                            <div className="side-card-title">
                                حالة المشروع
                            </div>


                            <div className="current-status">

                                <span
                                    className={`status-badge large ${getStatusClass(
                                        project.status
                                    )}`}
                                >
                                    {
                                        getProjectStatusLabel(
                                            project.status
                                        )
                                    }
                                </span>

                            </div>


                            <div className="status-buttons">

                                <button
                                    type="button"
                                    className={
                                        project.status ===
                                        'in-progress'
                                            ? 'active'
                                            : ''
                                    }
                                    disabled={
                                        saving
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            'in-progress'
                                        )
                                    }
                                >
                                    قيد التنفيذ
                                </button>

                                <button
                                    type="button"
                                    className={
                                        project.status ===
                                        'completed'
                                            ? 'active'
                                            : ''
                                    }
                                    disabled={
                                        saving
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            'completed'
                                        )
                                    }
                                >
                                    مكتمل
                                </button>

                            </div>

                        </section>


                        {/* Dates */}

                        <section className="side-card">

                            <div className="side-card-title">
                                المواعيد
                            </div>


                            <div className="side-info">

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

                                    <strong>
                                        {
                                            formatDate(
                                                project.deadline
                                            )
                                        }
                                    </strong>
                                </div>

                            </div>

                        </section>


                        {/* Assignment Summary */}

                        <section className="side-card">

                            <div className="side-card-title">
                                فريق المشروع
                            </div>


                            <div className="team-summary">

                                <div className="team-person">

                                    <div className="avatar">
                                        🎨
                                    </div>

                                    <div>
                                        <span>
                                            Project Designer
                                        </span>

                                        <strong>
                                            {
                                                getDesignerName(
                                                    project
                                                )
                                            }
                                        </strong>
                                    </div>

                                </div>


                                <div className="team-person">

                                    <div className="avatar">
                                        🖥️
                                    </div>

                                    <div>
                                        <span>
                                            Presentation Designer
                                        </span>

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

                        </section>


                        {/* Project ID */}

                        <section className="side-card">

                            <div className="side-card-title">
                                Project ID
                            </div>

                            <div className="project-id">
                                {getId(project)}
                            </div>

                        </section>

                    </aside>

                </div>

            </main>


            {/* =====================================================
                Edit Modal
            ===================================================== */}

            {editMode && (
                <div
                    className="modal-overlay"
                    onMouseDown={() => {
                        if (!saving) {
                            setEditMode(
                                false
                            );

                            if (project) {
                                buildFormFromProject(
                                    project
                                );
                            }
                        }
                    }}
                >

                    <div
                        className="modal edit-modal"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>
                                <div className="modal-kicker">
                                    EDIT PROJECT
                                </div>

                                <h2>
                                    تعديل المشروع
                                </h2>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    saving
                                }
                                onClick={() => {
                                    setEditMode(
                                        false
                                    );

                                    buildFormFromProject(
                                        project
                                    );
                                }}
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleSave
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
                                        required
                                    />
                                </div>


                                <div className="form-group">
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
                                    />
                                </div>


                                <div className="form-group">
                                    <label>
                                        Brief Name
                                    </label>

                                    <input
                                        value={
                                            form.briefName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'briefName',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group full">
                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        rows={5}
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
                                    />
                                </div>


                                <div className="form-group full">
                                    <label>
                                        Coordinator Notes
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={
                                            form.coordinatorNotes
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'coordinatorNotes',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group">
                                    <label>
                                        Render Status
                                    </label>

                                    <input
                                        value={
                                            form.renderStatus
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'renderStatus',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group">
                                    <label>
                                        Status
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
                                </div>


                                <div className="form-group">
                                    <label>
                                        Render File Name
                                    </label>

                                    <input
                                        value={
                                            form.renderFileName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'renderFileName',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group">
                                    <label>
                                        Render File Link
                                    </label>

                                    <input
                                        value={
                                            form.renderFileLink
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'renderFileLink',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group">
                                    <label>
                                        Presentation File Name
                                    </label>

                                    <input
                                        value={
                                            form.presentationFileName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'presentationFileName',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group">
                                    <label>
                                        Presentation File Link
                                    </label>

                                    <input
                                        value={
                                            form.presentationFileLink
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'presentationFileLink',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>


                                <div className="form-group full">
                                    <label>
                                        Presenter Note
                                    </label>

                                    <textarea
                                        rows={4}
                                        value={
                                            form.presenterNote
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                'presenterNote',
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
                                        setEditMode(
                                            false
                                        );

                                        buildFormFromProject(
                                            project
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
                Designer Modal
            ===================================================== */}

            {showDesignerModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={() => {
                        if (!assigning) {
                            setShowDesignerModal(
                                false
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
                                    PROJECT DESIGNER
                                </div>

                                <h2>
                                    تعيين Designer
                                </h2>

                                <p>
                                    اختر المصمم المسؤول عن
                                    تنفيذ المشروع.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    assigning
                                }
                                onClick={() =>
                                    setShowDesignerModal(
                                        false
                                    )
                                }
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
                                    (designer) => {
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
                                                    getUserName(
                                                        designer
                                                    )
                                                }
                                                {designer.email
                                                    ? ` — ${designer.email}`
                                                    : ''}
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
                                onClick={() =>
                                    setShowDesignerModal(
                                        false
                                    )
                                }
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
                                    handleAssignDesigner
                                }
                            >
                                {assigning
                                    ? 'جاري التعيين...'
                                    : 'تعيين Designer'}
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {/* =====================================================
                Presenter Modal
            ===================================================== */}

            {showPresenterModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={() => {
                        if (!assigning) {
                            setShowPresenterModal(
                                false
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
                                    PRESENTATION DESIGNER
                                </div>

                                <h2>
                                    تعيين Presentation Designer
                                </h2>

                                <p>
                                    يمكن أن يكون مختلفًا عن
                                    Project Designer.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    assigning
                                }
                                onClick={() =>
                                    setShowPresenterModal(
                                        false
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <div className="form-group">

                            <label>
                                Presentation Designer
                            </label>

                            <select
                                value={
                                    selectedPresenter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSelectedPresenter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >

                                <option value="">
                                    اختر Presentation Designer
                                </option>

                                {designers.map(
                                    (designer) => {
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
                                                    getUserName(
                                                        designer
                                                    )
                                                }
                                                {designer.email
                                                    ? ` — ${designer.email}`
                                                    : ''}
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
                                onClick={() =>
                                    setShowPresenterModal(
                                        false
                                    )
                                }
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="save-button"
                                disabled={
                                    assigning ||
                                    !selectedPresenter
                                }
                                onClick={
                                    handleAssignPresenter
                                }
                            >
                                {assigning
                                    ? 'جاري التعيين...'
                                    : 'تعيين Presentation Designer'}
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {/* =====================================================
                Delete Modal
            ===================================================== */}

            {showDeleteModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={() => {
                        if (!deleting) {
                            setShowDeleteModal(
                                false
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
                                {project.projectName}
                                {' '}
                            </strong>
                            نهائيًا. هذا الإجراء لا يمكن
                            التراجع عنه.
                        </p>


                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                disabled={
                                    deleting
                                }
                                onClick={() =>
                                    setShowDeleteModal(
                                        false
                                    )
                                }
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
                                    handleDelete
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

                .manager-details-page {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .details-container {
                    width: min(
                        1440px,
                        calc(100% - 48px)
                    );
                    margin: 0 auto;
                    padding: 105px 0 60px;
                }


                /* =========================================
                   Top
                ========================================= */

                .top-navigation {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 18px;
                }

                .back-button {
                    border: 0;
                    background: transparent;
                    color: #64748b;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 11px;
                    font-weight: 800;
                }

                .top-actions {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    direction: ltr;
                }

                .edit-button,
                .delete-button {
                    border-radius: 9px;
                    padding: 9px 13px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 900;
                }

                .edit-button {
                    border: 1px solid #dbe3ed;
                    background: #ffffff;
                    color: #334155;
                }

                .delete-button {
                    border: 1px solid #fecdd3;
                    background: #fff1f2;
                    color: #be123c;
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
                   Header
                ========================================= */

                .project-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 25px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 18px;
                    padding: 22px;
                    margin-bottom: 18px;
                }

                .project-heading {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                }

                .project-folder-icon {
                    width: 53px;
                    height: 53px;
                    flex-shrink: 0;
                    border-radius: 14px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }

                .project-kicker {
                    color: #94a3b8;
                    font-size: 9px;
                    letter-spacing: 1.5px;
                    font-weight: 900;
                    margin-bottom: 5px;
                }

                .project-heading h1 {
                    margin: 0;
                    color: #111827;
                    font-size: 28px;
                    font-weight: 900;
                }

                .project-heading p {
                    max-width: 850px;
                    margin: 7px 0 0;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.8;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    padding: 5px 10px;
                    font-size: 8px;
                    font-weight: 900;
                    white-space: nowrap;
                }

                .status-badge.large {
                    padding: 8px 13px;
                    font-size: 9px;
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


                /* =========================================
                   Content
                ========================================= */

                .content-grid {
                    display: grid;
                    grid-template-columns:
                        minmax(0, 1fr)
                        315px;
                    gap: 18px;
                    align-items: start;
                }

                .main-column {
                    min-width: 0;
                }

                .content-card {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 17px;
                    padding: 19px;
                    margin-bottom: 18px;
                }

                .card-heading {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 15px;
                    margin-bottom: 17px;
                }

                .card-heading h2 {
                    margin: 0;
                    color: #1e293b;
                    font-size: 15px;
                    font-weight: 900;
                }

                .card-heading p {
                    margin: 4px 0 0;
                    color: #94a3b8;
                    font-size: 9px;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 10px;
                }

                .info-item {
                    background: #f8fafc;
                    border-radius: 10px;
                    padding: 12px;
                }

                .info-item span,
                .long-info > span {
                    display: block;
                    color: #94a3b8;
                    font-size: 8px;
                    margin-bottom: 5px;
                }

                .info-item strong {
                    color: #475569;
                    font-size: 10px;
                    word-break: break-word;
                }

                .long-info {
                    margin-top: 13px;
                    padding-top: 13px;
                    border-top: 1px solid #eef2f7;
                }

                .long-info p {
                    margin: 0;
                    color: #475569;
                    font-size: 10px;
                    line-height: 1.9;
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                }


                /* =========================================
                   Assignments
                ========================================= */

                .assignment-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 12px;
                }

                .assignment-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    border: 1px solid #e8edf4;
                    border-radius: 13px;
                    padding: 14px;
                }

                .assignment-icon {
                    width: 43px;
                    height: 43px;
                    flex-shrink: 0;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 19px;
                }

                .assignment-content {
                    min-width: 0;
                    flex: 1;
                }

                .assignment-label {
                    display: block;
                    color: #94a3b8;
                    font-size: 8px;
                    margin-bottom: 4px;
                }

                .assignment-content strong {
                    display: block;
                    color: #334155;
                    font-size: 11px;
                    word-break: break-word;
                }

                .assignment-actions {
                    display: flex;
                    gap: 6px;
                    margin-top: 10px;
                }

                .assignment-actions button {
                    border: 1px solid #dbe3ed;
                    border-radius: 7px;
                    background: #ffffff;
                    color: #475569;
                    padding: 6px 9px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 8px;
                    font-weight: 800;
                }

                .assignment-actions .remove-assignment {
                    border-color: #fecdd3;
                    background: #fff1f2;
                    color: #be123c;
                }

                .assignment-note {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                    margin-top: 12px;
                    background: #f8fafc;
                    border-radius: 9px;
                    padding: 10px;
                }

                .assignment-note p {
                    margin: 0;
                    color: #64748b;
                    font-size: 9px;
                    line-height: 1.8;
                }


                /* =========================================
                   Checkpoints
                ========================================= */

                .checkpoint-counter {
                    background: #f1f5f9;
                    color: #475569;
                    border-radius: 999px;
                    padding: 6px 10px;
                    font-size: 9px;
                    font-weight: 900;
                }

                .checkpoint-list {
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                }

                .checkpoint-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 11px;
                    border: 1px solid #e8edf4;
                    border-radius: 11px;
                    padding: 12px;
                }

                .checkpoint-completed {
                    background: #f8fafc;
                }

                .checkpoint-number {
                    width: 29px;
                    height: 29px;
                    flex-shrink: 0;
                    border-radius: 50%;
                    background: #f1f5f9;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 9px;
                    font-weight: 900;
                }

                .checkpoint-completed .checkpoint-number {
                    background: #dcfce7;
                    color: #166534;
                }

                .checkpoint-body {
                    min-width: 0;
                    flex: 1;
                }

                .checkpoint-title-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                }

                .checkpoint-title-row strong {
                    color: #334155;
                    font-size: 10px;
                }

                .checkpoint-title-row span {
                    color: #94a3b8;
                    font-size: 8px;
                    white-space: nowrap;
                }

                .checkpoint-body p {
                    margin: 5px 0 7px;
                    color: #64748b;
                    font-size: 9px;
                    line-height: 1.7;
                }

                .checkpoint-body a {
                    color: #475569;
                    font-size: 8px;
                    font-weight: 900;
                }

                .overall-progress {
                    margin-top: 16px;
                    padding-top: 14px;
                    border-top: 1px solid #eef2f7;
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }

                .progress-header span {
                    color: #64748b;
                    font-size: 8px;
                }

                .progress-header strong {
                    color: #334155;
                    font-size: 8px;
                }

                .progress-track {
                    height: 6px;
                    background: #e2e8f0;
                    border-radius: 999px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: #334155;
                    border-radius: inherit;
                }

                .empty-small,
                .empty-file {
                    color: #94a3b8;
                    background: #f8fafc;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                    font-size: 9px;
                }


                /* =========================================
                   Files
                ========================================= */

                .small-status {
                    border-radius: 999px;
                    background: #f1f5f9;
                    color: #475569;
                    padding: 6px 9px;
                    font-size: 8px;
                    font-weight: 900;
                }

                .file-link {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    border: 1px solid #e8edf4;
                    border-radius: 11px;
                    padding: 12px;
                    text-decoration: none;
                    color: inherit;
                }

                .file-link > span {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                }

                .file-link > div {
                    flex: 1;
                    min-width: 0;
                }

                .file-link strong {
                    display: block;
                    color: #334155;
                    font-size: 10px;
                    overflow-wrap: anywhere;
                }

                .file-link small {
                    display: block;
                    color: #94a3b8;
                    font-size: 8px;
                    margin-top: 3px;
                }

                .file-link b {
                    color: #64748b;
                }

                .approval-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-top: 14px;
                    border-top: 1px solid #eef2f7;
                    padding-top: 13px;
                }

                .approval-row span {
                    color: #64748b;
                    font-size: 9px;
                }

                .approval-row strong {
                    font-size: 9px;
                }

                .approved {
                    color: #15803d;
                }

                .not-approved {
                    color: #b45309;
                }


                /* =========================================
                   Sidebar
                ========================================= */

                .sidebar {
                    position: sticky;
                    top: 90px;
                }

                .side-card {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
                    padding: 16px;
                    margin-bottom: 13px;
                }

                .side-card-title {
                    color: #64748b;
                    font-size: 9px;
                    font-weight: 900;
                    margin-bottom: 13px;
                }

                .current-status {
                    margin-bottom: 12px;
                }

                .status-buttons {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 6px;
                }

                .status-buttons button {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #64748b;
                    padding: 8px 5px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 8px;
                    font-weight: 800;
                }

                .status-buttons button.active {
                    border-color: #334155;
                    background: #334155;
                    color: #ffffff;
                }

                .status-buttons button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .side-info {
                    display: flex;
                    flex-direction: column;
                    gap: 11px;
                }

                .side-info > div {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eef2f7;
                }

                .side-info > div:last-child {
                    border-bottom: 0;
                    padding-bottom: 0;
                }

                .side-info span {
                    color: #94a3b8;
                    font-size: 8px;
                }

                .side-info strong {
                    color: #475569;
                    font-size: 9px;
                    text-align: left;
                }

                .team-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .team-person {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }

                .avatar {
                    width: 35px;
                    height: 35px;
                    flex-shrink: 0;
                    border-radius: 10px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .team-person span {
                    display: block;
                    color: #94a3b8;
                    font-size: 7px;
                    margin-bottom: 3px;
                }

                .team-person strong {
                    display: block;
                    color: #475569;
                    font-size: 9px;
                    overflow-wrap: anywhere;
                }

                .project-id {
                    padding: 9px;
                    border-radius: 8px;
                    background: #f8fafc;
                    color: #64748b;
                    font-size: 8px;
                    direction: ltr;
                    text-align: left;
                    word-break: break-all;
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
                        760px,
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

                .delete-modal .modal-actions {
                    justify-content: center;
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
                    max-width: 1050px
                ) {
                    .content-grid {
                        grid-template-columns: 1fr;
                    }

                    .sidebar {
                        position: static;
                        display: grid;
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                        gap: 13px;
                    }

                    .side-card {
                        margin-bottom: 0;
                    }
                }

                @media (
                    max-width: 800px
                ) {
                    .details-container {
                        width:
                            calc(
                                100% - 24px
                            );
                        padding-top: 95px;
                    }

                    .project-header {
                        flex-direction: column;
                    }

                    .assignment-grid,
                    .info-grid {
                        grid-template-columns: 1fr;
                    }

                    .sidebar {
                        grid-template-columns: 1fr;
                    }

                    .top-navigation {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .top-actions {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                }

                @media (
                    max-width: 600px
                ) {
                    .project-heading {
                        flex-direction: column;
                    }

                    .project-heading h1 {
                        font-size: 23px;
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
                }

            `}</style>

        </div>
    );
}