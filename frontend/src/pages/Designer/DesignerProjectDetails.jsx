// frontend/src/pages/Designer/DesignerProjectDetails.jsx

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
    getMyProject,
    getProjectCheckpoints,
    updateCheckpoint,
    completeCheckpoint,
    reopenCheckpoint,
    updateRender,
    updateRenderStatus,
    getPresentation,
    updatePresentation,
    getMyProjectStatus
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

function getProjectName(project) {
    return (
        project?.projectName ||
        project?.name ||
        project?.title ||
        'مشروع بدون اسم'
    );
}

function formatDate(value) {
    if (!value) {
        return 'غير محدد';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

function getCheckpointId(checkpoint) {
    return (
        checkpoint?.id ||
        checkpoint?._id ||
        checkpoint?.checkpointId ||
        ''
    );
}

function getCheckpointTitle(checkpoint) {
    return (
        checkpoint?.title ||
        checkpoint?.name ||
        `Checkpoint ${getCheckpointId(checkpoint)}`
    );
}

function isCheckpointCompleted(checkpoint) {
    return Boolean(
        checkpoint?.isCompleted ||
        checkpoint?.completed ||
        checkpoint?.completion
    );
}

function getAssignmentType(project, user) {
    if (!project || !user) {
        return 'assigned';
    }

    const userId =
        getId(user) ||
        user?.firebaseUid;

    const mainDesigner =
        project?.assignedDesigner;

    const presenter =
        project?.assignedPresenter;

    const mainDesignerId =
        project?.assignedDesignerId ||
        getId(mainDesigner) ||
        mainDesigner?.firebaseUid;

    const presenterId =
        project?.assignedPresenterId ||
        getId(presenter) ||
        presenter?.firebaseUid;

    const isMain =
        Boolean(
            userId &&
            mainDesignerId &&
            String(userId) ===
                String(mainDesignerId)
        );

    const isPresenter =
        Boolean(
            userId &&
            presenterId &&
            String(userId) ===
                String(presenterId)
        );

    if (isMain && isPresenter) {
        return 'both';
    }

    if (isMain) {
        return 'main';
    }

    if (isPresenter) {
        return 'presentation';
    }

    return 'assigned';
}


/* =========================================================
   Component
========================================================= */

export default function DesignerProjectDetails() {
    const navigate =
        useNavigate();

    const {
        projectId
    } = useParams();

    const [user, setUser] =
        useState(null);

    const [project, setProject] =
        useState(null);

    const [checkpoints, setCheckpoints] =
        useState([]);

    const [presentation, setPresentation] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [checkpointSaving, setCheckpointSaving] =
        useState('');

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState('');

    const [activeTab, setActiveTab] =
        useState('overview');

    const [renderForm, setRenderForm] =
        useState({
            renderFileLink: '',
            renderFileName: '',
            renderStatus: ''
        });

    const [presentationForm, setPresentationForm] =
        useState({
            presentationFileLink: '',
            presentationFileName: '',
            presenterNote: ''
        });

    const [checkpointModal, setCheckpointModal] =
        useState(null);

    const [checkpointForm, setCheckpointForm] =
        useState({
            title: '',
            note: '',
            fileUrl: '',
            fileName: ''
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
       Load Project
    ===================================================== */

    const loadProject =
        useCallback(async () => {
            try {
                setLoading(true);
                setError('');
                setSuccess('');

                const currentUser =
                    verifyUser();

                if (!currentUser) {
                    return;
                }

                if (!projectId) {
                    setError(
                        'معرف المشروع غير موجود.'
                    );

                    return;
                }

                const [
                    projectResponse,
                    checkpointsResponse
                ] = await Promise.all([
                    getMyProject(
                        projectId
                    ),
                    getProjectCheckpoints(
                        projectId
                    )
                ]);

                const projectData =
                    projectResponse;

                if (!projectData) {
                    setError(
                        'لم يتم العثور على المشروع.'
                    );

                    return;
                }

                setProject(
                    projectData
                );

                setCheckpoints(
                    Array.isArray(
                        checkpointsResponse
                    )
                        ? checkpointsResponse
                        : []
                );

                setRenderForm({
                    renderFileLink:
                        projectData?.renderFileLink ||
                        '',
                    renderFileName:
                        projectData?.renderFileName ||
                        '',
                    renderStatus:
                        projectData?.renderStatus ||
                        ''
                });

                setPresentationForm({
                    presentationFileLink:
                        projectData?.presentationFileLink ||
                        '',
                    presentationFileName:
                        projectData?.presentationFileName ||
                        '',
                    presenterNote:
                        projectData?.presenterNote ||
                        ''
                });

                /*
                 * Presentation is optional.
                 * If the endpoint is not available
                 * or the Designer is not the presenter,
                 * the main project data remains usable.
                 */
                try {
                    const presentationResponse =
                        await getPresentation(
                            projectId
                        );

                    setPresentation(
                        presentationResponse
                    );

                    if (
                        presentationResponse
                    ) {
                        setPresentationForm(
                            (previous) => ({
                                presentationFileLink:
                                    presentationResponse?.presentationFileLink ??
                                    previous.presentationFileLink,

                                presentationFileName:
                                    presentationResponse?.presentationFileName ??
                                    previous.presentationFileName,

                                presenterNote:
                                    presentationResponse?.presenterNote ??
                                    previous.presenterNote
                            })
                        );
                    }
                } catch (presentationError) {
                    console.warn(
                        'Presentation data could not be loaded:',
                        presentationError
                    );

                    setPresentation(null);
                }
            } catch (err) {
                console.error(
                    'Designer Project Details Error:',
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
                    'حدث خطأ أثناء تحميل المشروع.'
                );
            } finally {
                setLoading(false);
            }
        }, [
            navigate,
            projectId,
            verifyUser
        ]);


    useEffect(() => {
        loadProject();
    }, [loadProject]);


    /* =====================================================
       Assignment Type
    ===================================================== */

    const assignmentType =
        useMemo(
            () =>
                getAssignmentType(
                    project,
                    user
                ),
            [
                project,
                user
            ]
        );


    const canEditProject =
        assignmentType === 'main' ||
        assignmentType === 'both';

    const canEditPresentation =
        assignmentType === 'presentation' ||
        assignmentType === 'both';


    /* =====================================================
       Project Status
    ===================================================== */

    const handleProjectStatus =
        async (status) => {
            try {
                setSaving(true);
                setError('');
                setSuccess('');

                /*
                 * We use the existing project update
                 * endpoint rather than allowing the
                 * Designer to change ownership.
                 */
                await getMyProjectStatus(
                    projectId
                );

                /*
                 * Status changes are intentionally
                 * handled through updateMyProject
                 * only if the backend allows the
                 * authenticated Designer to do so.
                 *
                 * We import the operation lazily
                 * to keep the rest of the page clean.
                 */
                const designerModule =
                    await import(
                        '../../services/designerService'
                    );

                await designerModule.updateMyProject(
                    projectId,
                    {
                        status
                    }
                );

                setProject(
                    (previous) =>
                        previous
                            ? {
                                ...previous,
                                status
                            }
                            : previous
                );

                setSuccess(
                    'تم تحديث حالة المشروع بنجاح.'
                );
            } catch (err) {
                console.error(
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
       Checkpoint Modal
    ===================================================== */

    const openCheckpointEditor =
        (checkpoint) => {
            setCheckpointModal(
                checkpoint
            );

            setCheckpointForm({
                title:
                    checkpoint?.title ||
                    '',
                note:
                    checkpoint?.note ||
                    '',
                fileUrl:
                    checkpoint?.fileUrl ||
                    checkpoint?.imageLink ||
                    '',
                fileName:
                    checkpoint?.fileName ||
                    ''
            });

            setError('');
            setSuccess('');
        };


    const closeCheckpointEditor =
        () => {
            if (checkpointSaving) {
                return;
            }

            setCheckpointModal(
                null
            );

            setCheckpointForm({
                title: '',
                note: '',
                fileUrl: '',
                fileName: ''
            });
        };


    const saveCheckpoint =
        async (event) => {
            event.preventDefault();

            if (!checkpointModal) {
                return;
            }

            const checkpointId =
                getCheckpointId(
                    checkpointModal
                );

            if (!checkpointId) {
                setError(
                    'معرف الـ Checkpoint غير موجود.'
                );

                return;
            }

            try {
                setCheckpointSaving(
                    String(checkpointId)
                );

                setError('');
                setSuccess('');

                const response =
                    await updateCheckpoint(
                        projectId,
                        checkpointId,
                        checkpointForm
                    );

                const updatedCheckpoint =
                    response?.checkpoint ||
                    response;

                setCheckpoints(
                    (previous) =>
                        previous.map(
                            (checkpoint) =>
                                String(
                                    getCheckpointId(
                                        checkpoint
                                    )
                                ) ===
                                String(
                                    checkpointId
                                )
                                    ? {
                                        ...checkpoint,
                                        ...updatedCheckpoint,
                                        ...checkpointForm
                                    }
                                    : checkpoint
                        )
                );

                setSuccess(
                    'تم تحديث الـ Checkpoint بنجاح.'
                );

                closeCheckpointEditor();
            } catch (err) {
                console.error(
                    'Checkpoint update error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث الـ Checkpoint.'
                );
            } finally {
                setCheckpointSaving('');
            }
        };


    /* =====================================================
       Checkpoint Completion
    ===================================================== */

    const toggleCheckpoint =
        async (checkpoint) => {
            const checkpointId =
                getCheckpointId(
                    checkpoint
                );

            if (!checkpointId) {
                return;
            }

            try {
                setCheckpointSaving(
                    String(checkpointId)
                );

                setError('');
                setSuccess('');

                const completed =
                    isCheckpointCompleted(
                        checkpoint
                    );

                let response;

                if (completed) {
                    response =
                        await reopenCheckpoint(
                            projectId,
                            checkpointId
                        );
                } else {
                    response =
                        await completeCheckpoint(
                            projectId,
                            checkpointId
                        );
                }

                const updatedCheckpoint =
                    response?.checkpoint ||
                    response;

                setCheckpoints(
                    (previous) =>
                        previous.map(
                            (item) =>
                                String(
                                    getCheckpointId(
                                        item
                                    )
                                ) ===
                                String(
                                    checkpointId
                                )
                                    ? {
                                        ...item,
                                        ...updatedCheckpoint,
                                        isCompleted:
                                            !completed
                                    }
                                    : item
                        )
                );

                setSuccess(
                    completed
                        ? 'تم إعادة فتح الـ Checkpoint.'
                        : 'تم إكمال الـ Checkpoint بنجاح.'
                );
            } catch (err) {
                console.error(
                    'Checkpoint status error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث حالة الـ Checkpoint.'
                );
            } finally {
                setCheckpointSaving('');
            }
        };


    /* =====================================================
       Render
    ===================================================== */

    const saveRender =
        async (event) => {
            event.preventDefault();

            if (!canEditProject) {
                setError(
                    'ليس لديك صلاحية تعديل بيانات الـ Render لهذا المشروع.'
                );

                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                const response =
                    await updateRender(
                        projectId,
                        renderForm
                    );

                const updatedProject =
                    response?.project ||
                    response;

                setProject(
                    (previous) =>
                        previous
                            ? {
                                ...previous,
                                ...updatedProject,
                                ...renderForm
                            }
                            : previous
                );

                setSuccess(
                    'تم حفظ بيانات الـ Render بنجاح.'
                );
            } catch (err) {
                console.error(
                    'Render update error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر حفظ بيانات الـ Render.'
                );
            } finally {
                setSaving(false);
            }
        };


    const changeRenderStatus =
        async (status) => {
            if (!canEditProject) {
                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                await updateRenderStatus(
                    projectId,
                    status
                );

                setRenderForm(
                    (previous) => ({
                        ...previous,
                        renderStatus:
                            status
                    })
                );

                setProject(
                    (previous) =>
                        previous
                            ? {
                                ...previous,
                                renderStatus:
                                    status
                            }
                            : previous
                );

                setSuccess(
                    'تم تحديث حالة الـ Render.'
                );
            } catch (err) {
                console.error(
                    err
                );

                setError(
                    err?.message ||
                    'تعذر تحديث حالة الـ Render.'
                );
            } finally {
                setSaving(false);
            }
        };


    /* =====================================================
       Presentation
    ===================================================== */

    const savePresentation =
        async (event) => {
            event.preventDefault();

            if (!canEditPresentation) {
                setError(
                    'ليس لديك صلاحية تعديل العرض التقديمي لهذا المشروع.'
                );

                return;
            }

            try {
                setSaving(true);
                setError('');
                setSuccess('');

                const response =
                    await updatePresentation(
                        projectId,
                        presentationForm
                    );

                const updatedProject =
                    response?.project ||
                    response;

                setPresentation(
                    response
                );

                setProject(
                    (previous) =>
                        previous
                            ? {
                                ...previous,
                                ...updatedProject,
                                ...presentationForm
                            }
                            : previous
                );

                setSuccess(
                    'تم حفظ بيانات العرض التقديمي بنجاح.'
                );
            } catch (err) {
                console.error(
                    'Presentation update error:',
                    err
                );

                setError(
                    err?.message ||
                    'تعذر حفظ بيانات العرض التقديمي.'
                );
            } finally {
                setSaving(false);
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
            <div className="designer-project-page">

                <Navbar
                    user={user}
                    onLogout={handleLogout}
                    title="OSTUDIO"
                />

                <main className="project-container">

                    <div className="error-page">

                        <div className="error-page-icon">
                            📁
                        </div>

                        <h2>
                            المشروع غير موجود
                        </h2>

                        <p>
                            لم يتم العثور على المشروع
                            أو ليس لديك صلاحية الوصول إليه.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/designer/dashboard'
                                )
                            }
                        >
                            العودة للوحة التحكم
                        </button>

                    </div>

                </main>

                <style>{pageStyles}</style>

            </div>
        );
    }


    /* =====================================================
       Render Page
    ===================================================== */

    return (
        <div className="designer-project-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="project-container">

                {/* =================================================
                    Back
                ================================================= */}

                <button
                    type="button"
                    className="back-button"
                    onClick={() =>
                        navigate(
                            '/designer/dashboard'
                        )
                    }
                >
                    → العودة للمشاريع
                </button>


                {/* =================================================
                    Header
                ================================================= */}

                <section className="project-header">

                    <div className="project-header-main">

                        <div className="project-icon">
                            📁
                        </div>

                        <div>

                            <div className="project-kicker">
                                DESIGNER PROJECT
                            </div>

                            <h1>
                                {getProjectName(
                                    project
                                )}
                            </h1>

                            <div className="header-meta">

                                <span
                                    className={`status-badge ${getStatusClass(
                                        project?.status
                                    )}`}
                                >
                                    {getStatusLabel(
                                        project?.status
                                    )}
                                </span>

                                <span>
                                    📅 البداية:{' '}
                                    {formatDate(
                                        project?.startDate
                                    )}
                                </span>

                                <span>
                                    ⏰ الموعد النهائي:{' '}
                                    {formatDate(
                                        project?.deadline
                                    )}
                                </span>

                            </div>

                        </div>

                    </div>


                    <div className="assignment-card">

                        <span>
                            مهمتك في المشروع
                        </span>

                        <strong>
                            {assignmentType === 'main'
                                ? 'مصمم المشروع'
                                : assignmentType ===
                                  'presentation'
                                    ? 'مصمم العرض'
                                    : assignmentType ===
                                      'both'
                                        ? 'مصمم المشروع والعرض'
                                        : 'مصمم'}
                        </strong>

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
                    Tabs
                ================================================= */}

                <div className="tabs">

                    <button
                        type="button"
                        className={
                            activeTab ===
                            'overview'
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            setActiveTab(
                                'overview'
                            )
                        }
                    >
                        نظرة عامة
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab ===
                            'checkpoints'
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            setActiveTab(
                                'checkpoints'
                            )
                        }
                    >
                        Checkpoints
                        <span>
                            {checkpoints.length}
                        </span>
                    </button>

                    {canEditProject && (
                        <button
                            type="button"
                            className={
                                activeTab ===
                                'render'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setActiveTab(
                                    'render'
                                )
                            }
                        >
                            Render
                        </button>
                    )}

                    {canEditPresentation && (
                        <button
                            type="button"
                            className={
                                activeTab ===
                                'presentation'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setActiveTab(
                                    'presentation'
                                )
                            }
                        >
                            Presentation
                        </button>
                    )}

                </div>


                {/* =================================================
                    Overview
                ================================================= */}

                {activeTab === 'overview' && (
                    <div className="tab-content">

                        <div className="two-column">

                            <section className="panel">

                                <div className="panel-header">

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


                                <div className="details-list">

                                    <div className="detail-item">
                                        <span>
                                            اسم المشروع
                                        </span>

                                        <strong>
                                            {getProjectName(
                                                project
                                            )}
                                        </strong>
                                    </div>


                                    <div className="detail-item">
                                        <span>
                                            Brief
                                        </span>

                                        <strong>
                                            {project?.brief ||
                                                project?.briefName ||
                                                'غير متوفر'}
                                        </strong>
                                    </div>


                                    <div className="detail-item">
                                        <span>
                                            الوصف
                                        </span>

                                        <p>
                                            {project?.description ||
                                                'لا يوجد وصف.'}
                                        </p>
                                    </div>


                                    <div className="detail-item">
                                        <span>
                                            ملاحظات المدير
                                        </span>

                                        <p>
                                            {project?.managerNotes ||
                                                'لا توجد ملاحظات.'}
                                        </p>
                                    </div>


                                    <div className="detail-item">
                                        <span>
                                            ملاحظات الـ Coordinator
                                        </span>

                                        <p>
                                            {project?.coordinatorNotes ||
                                                'لا توجد ملاحظات.'}
                                        </p>
                                    </div>

                                </div>

                            </section>


                            <section className="panel">

                                <div className="panel-header">

                                    <div>
                                        <h2>
                                            حالة المشروع
                                        </h2>

                                        <p>
                                            متابعة حالة تنفيذ
                                            المشروع.
                                        </p>
                                    </div>

                                </div>


                                <div className="large-status">

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


                                {canEditProject && (
                                    <div className="status-actions">

                                        <button
                                            type="button"
                                            disabled={
                                                saving
                                            }
                                            className={
                                                project?.status ===
                                                'in-progress'
                                                    ? 'selected'
                                                    : ''
                                            }
                                            onClick={() =>
                                                handleProjectStatus(
                                                    'in-progress'
                                                )
                                            }
                                        >
                                            قيد التنفيذ
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                saving
                                            }
                                            className={
                                                project?.status ===
                                                'completed'
                                                    ? 'selected'
                                                    : ''
                                            }
                                            onClick={() =>
                                                handleProjectStatus(
                                                    'completed'
                                                )
                                            }
                                        >
                                            مكتمل
                                        </button>

                                    </div>
                                )}


                                <div className="date-grid">

                                    <div>
                                        <span>
                                            تاريخ البداية
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

                            </section>

                        </div>


                        {/* Assignment */}
                        <section className="panel">

                            <div className="panel-header">

                                <div>
                                    <h2>
                                        فريق المشروع
                                    </h2>

                                    <p>
                                        الأشخاص المسؤولون عن
                                        المشروع والعرض.
                                    </p>
                                </div>

                            </div>


                            <div className="people-grid">

                                <div className="person-card">

                                    <div className="person-avatar">
                                        👨‍🎨
                                    </div>

                                    <div>
                                        <span>
                                            مصمم المشروع
                                        </span>

                                        <strong>
                                            {project?.assignedDesignerName ||
                                                project?.assignedDesigner?.name ||
                                                'غير محدد'}
                                        </strong>
                                    </div>

                                </div>


                                <div className="person-card">

                                    <div className="person-avatar">
                                        🖥️
                                    </div>

                                    <div>
                                        <span>
                                            مصمم العرض
                                        </span>

                                        <strong>
                                            {project?.assignedPresenterName ||
                                                project?.assignedPresenter?.name ||
                                                'غير محدد'}
                                        </strong>
                                    </div>

                                </div>

                            </div>

                        </section>

                    </div>
                )}


                {/* =================================================
                    Checkpoints
                ================================================= */}

                {activeTab === 'checkpoints' && (
                    <div className="tab-content">

                        <section className="panel">

                            <div className="panel-header">

                                <div>
                                    <h2>
                                        Checkpoints
                                    </h2>

                                    <p>
                                        تابع مراحل تنفيذ المشروع
                                        وقم بتحديث ما تم إنجازه.
                                    </p>
                                </div>

                                <div className="checkpoint-progress">

                                    <strong>
                                        {
                                            checkpoints.filter(
                                                isCheckpointCompleted
                                            ).length
                                        }
                                        /
                                        {
                                            checkpoints.length
                                        }
                                    </strong>

                                    <span>
                                        مكتمل
                                    </span>

                                </div>

                            </div>


                            {checkpoints.length === 0 ? (
                                <div className="empty-inline">

                                    <div>
                                        📋
                                    </div>

                                    <h3>
                                        لا توجد Checkpoints
                                    </h3>

                                    <p>
                                        لم يتم إضافة مراحل للمشروع
                                        حتى الآن.
                                    </p>

                                </div>
                            ) : (
                                <div className="checkpoints-list">

                                    {checkpoints.map(
                                        (
                                            checkpoint,
                                            index
                                        ) => {

                                            const checkpointId =
                                                getCheckpointId(
                                                    checkpoint
                                                );

                                            const completed =
                                                isCheckpointCompleted(
                                                    checkpoint
                                                );

                                            const busy =
                                                checkpointSaving ===
                                                String(
                                                    checkpointId
                                                );

                                            return (
                                                <div
                                                    className={
                                                        completed
                                                            ? 'checkpoint-item completed'
                                                            : 'checkpoint-item'
                                                    }
                                                    key={
                                                        checkpointId ||
                                                        index
                                                    }
                                                >

                                                    <button
                                                        type="button"
                                                        className="checkpoint-check"
                                                        disabled={
                                                            busy
                                                        }
                                                        onClick={() =>
                                                            toggleCheckpoint(
                                                                checkpoint
                                                            )
                                                        }
                                                    >
                                                        {busy
                                                            ? '...'
                                                            : completed
                                                                ? '✓'
                                                                : ''}
                                                    </button>


                                                    <div className="checkpoint-content">

                                                        <div className="checkpoint-title-row">

                                                            <h3>
                                                                {getCheckpointTitle(
                                                                    checkpoint
                                                                )}
                                                            </h3>

                                                            {completed && (
                                                                <span className="completed-label">
                                                                    مكتمل
                                                                </span>
                                                            )}

                                                        </div>


                                                        <p>
                                                            {checkpoint?.note ||
                                                                'لا توجد ملاحظات.'}
                                                        </p>


                                                        {(checkpoint?.fileUrl ||
                                                            checkpoint?.imageLink ||
                                                            checkpoint?.fileName) && (
                                                            <div className="checkpoint-file">

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
                                                                        onClick={(event) =>
                                                                            event.stopPropagation()
                                                                        }
                                                                    >
                                                                        🔗 فتح الملف
                                                                    </a>
                                                                )}

                                                                {checkpoint?.fileName && (
                                                                    <span>
                                                                        {checkpoint.fileName}
                                                                    </span>
                                                                )}

                                                            </div>
                                                        )}

                                                    </div>


                                                    {canEditProject && (
                                                        <button
                                                            type="button"
                                                            className="edit-checkpoint"
                                                            onClick={() =>
                                                                openCheckpointEditor(
                                                                    checkpoint
                                                                )
                                                            }
                                                        >
                                                            تعديل
                                                        </button>
                                                    )}

                                                </div>
                                            );
                                        }
                                    )}

                                </div>
                            )}

                        </section>

                    </div>
                )}


                {/* =================================================
                    Render
                ================================================= */}

                {activeTab === 'render' &&
                    canEditProject && (
                        <div className="tab-content">

                            <section className="panel">

                                <div className="panel-header">

                                    <div>
                                        <h2>
                                            Render
                                        </h2>

                                        <p>
                                            إدارة ملف الـ Render
                                            وحالته.
                                        </p>
                                    </div>

                                    <span
                                        className={`status-badge ${getStatusClass(
                                            renderForm.renderStatus
                                        )}`}
                                    >
                                        {renderForm.renderStatus
                                            ? getStatusLabel(
                                                renderForm.renderStatus
                                            )
                                            : 'غير محدد'}
                                    </span>

                                </div>


                                <form
                                    onSubmit={
                                        saveRender
                                    }
                                >

                                    <div className="form-grid">

                                        <div className="form-group full">
                                            <label>
                                                رابط ملف الـ Render
                                            </label>

                                            <input
                                                type="url"
                                                value={
                                                    renderForm.renderFileLink
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setRenderForm(
                                                        (
                                                            previous
                                                        ) => ({
                                                            ...previous,
                                                            renderFileLink:
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
                                                    renderForm.renderFileName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setRenderForm(
                                                        (
                                                            previous
                                                        ) => ({
                                                            ...previous,
                                                            renderFileName:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                                }
                                                placeholder="render-file.png"
                                            />
                                        </div>


                                        <div className="form-group">
                                            <label>
                                                الحالة
                                            </label>

                                            <select
                                                value={
                                                    renderForm.renderStatus
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setRenderForm(
                                                        (
                                                            previous
                                                        ) => ({
                                                            ...previous,
                                                            renderStatus:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    اختر الحالة
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
                                        </div>

                                    </div>


                                    <div className="form-actions">

                                        <button
                                            type="submit"
                                            disabled={
                                                saving
                                            }
                                        >
                                            {saving
                                                ? 'جاري الحفظ...'
                                                : 'حفظ بيانات Render'}
                                        </button>

                                    </div>

                                </form>


                                <div className="quick-status">

                                    <span>
                                        تحديث سريع:
                                    </span>

                                    <button
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={() =>
                                            changeRenderStatus(
                                                'pending'
                                            )
                                        }
                                    >
                                        معلقة
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={() =>
                                            changeRenderStatus(
                                                'in-progress'
                                            )
                                        }
                                    >
                                        قيد التنفيذ
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={() =>
                                            changeRenderStatus(
                                                'completed'
                                            )
                                        }
                                    >
                                        مكتملة
                                    </button>

                                </div>

                            </section>

                        </div>
                    )}


                {/* =================================================
                    Presentation
                ================================================= */}

                {activeTab === 'presentation' &&
                    canEditPresentation && (
                        <div className="tab-content">

                            <section className="panel">

                                <div className="panel-header">

                                    <div>
                                        <h2>
                                            Presentation
                                        </h2>

                                        <p>
                                            إدارة ملف العرض
                                            التقديمي والملاحظات.
                                        </p>
                                    </div>

                                    <span className="assignment-label">
                                        مصمم العرض
                                    </span>

                                </div>


                                <form
                                    onSubmit={
                                        savePresentation
                                    }
                                >

                                    <div className="form-grid">

                                        <div className="form-group full">
                                            <label>
                                                رابط ملف العرض
                                            </label>

                                            <input
                                                type="url"
                                                value={
                                                    presentationForm.presentationFileLink
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setPresentationForm(
                                                        (
                                                            previous
                                                        ) => ({
                                                            ...previous,
                                                            presentationFileLink:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                                }
                                                placeholder="https://..."
                                            />
                                        </div>


                                        <div className="form-group full">
                                            <label>
                                                اسم الملف
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    presentationForm.presentationFileName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setPresentationForm(
                                                        (
                                                            previous
                                                        ) => ({
                                                            ...previous,
                                                            presentationFileName:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                                }
                                                placeholder="presentation.pdf"
                                            />
                                        </div>


                                        <div className="form-group full">
                                            <label>
                                                ملاحظات مقدم العرض
                                            </label>

                                            <textarea
                                                value={
                                                    presentationForm.presenterNote
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setPresentationForm(
                                                        (
                                                            previous
                                                        ) => ({
                                                            ...previous,
                                                            presenterNote:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                                }
                                                rows={6}
                                                placeholder="اكتب ملاحظات العرض..."
                                            />
                                        </div>

                                    </div>


                                    <div className="form-actions">

                                        <button
                                            type="submit"
                                            disabled={
                                                saving
                                            }
                                        >
                                            {saving
                                                ? 'جاري الحفظ...'
                                                : 'حفظ بيانات العرض'}
                                        </button>

                                    </div>

                                </form>


                                {presentation && (
                                    <div className="presentation-status">

                                        <span>
                                            حالة العرض:
                                        </span>

                                        <strong>
                                            {project?.isPresentationApproved
                                                ? 'تم اعتماد العرض'
                                                : 'لم يتم اعتماد العرض بعد'}
                                        </strong>

                                    </div>
                                )}

                            </section>

                        </div>
                    )}

            </main>


            {/* =====================================================
                Checkpoint Modal
            ===================================================== */}

            {checkpointModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={
                        closeCheckpointEditor
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
                                    تعديل Checkpoint
                                </h2>

                                <p>
                                    {getCheckpointTitle(
                                        checkpointModal
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeCheckpointEditor
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={
                                saveCheckpoint
                            }
                        >

                            <div className="form-group">
                                <label>
                                    العنوان
                                </label>

                                <input
                                    type="text"
                                    value={
                                        checkpointForm.title
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCheckpointForm(
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
                                />
                            </div>


                            <div className="form-group">
                                <label>
                                    الملاحظات
                                </label>

                                <textarea
                                    rows={5}
                                    value={
                                        checkpointForm.note
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCheckpointForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                note:
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
                                    رابط الملف
                                </label>

                                <input
                                    type="url"
                                    value={
                                        checkpointForm.fileUrl
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCheckpointForm(
                                            (
                                                previous
                                            ) => ({
                                                ...previous,
                                                fileUrl:
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
                                        checkpointForm.fileName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCheckpointForm(
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


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        Boolean(
                                            checkpointSaving
                                        )
                                    }
                                    onClick={
                                        closeCheckpointEditor
                                    }
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={
                                        Boolean(
                                            checkpointSaving
                                        )
                                    }
                                >
                                    {checkpointSaving
                                        ? 'جاري الحفظ...'
                                        : 'حفظ التعديل'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}


            <style>{pageStyles}</style>

        </div>
    );
}


/* =========================================================
   Styles
========================================================= */

const pageStyles = `

    * {
        box-sizing: border-box;
    }

    .designer-project-page {
        min-height: 100vh;
        background: #f5f7fb;
        color: #172033;
        direction: rtl;
    }

    .project-container {
        width: min(
            1400px,
            calc(100% - 48px)
        );
        margin: 0 auto;
        padding: 105px 0 60px;
    }


    /* ==============================================
       Back
    ============================================== */

    .back-button {
        border: 0;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        padding: 8px 0;
        margin-bottom: 18px;
        font-size: 13px;
        font-weight: 800;
    }

    .back-button:hover {
        color: #111827;
    }


    /* ==============================================
       Header
    ============================================== */

    .project-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 25px;
        background: #ffffff;
        border: 1px solid #e8edf4;
        border-radius: 20px;
        padding: 25px;
        margin-bottom: 18px;
        box-shadow:
            0 8px 28px
            rgba(
                15,
                23,
                42,
                0.035
            );
    }

    .project-header-main {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
    }

    .project-icon {
        width: 58px;
        height: 58px;
        border-radius: 16px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 27px;
        flex-shrink: 0;
    }

    .project-kicker {
        color: #94a3b8;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1.5px;
        margin-bottom: 5px;
    }

    .project-header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 900;
        color: #111827;
    }

    .header-meta {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
        margin-top: 10px;
        color: #64748b;
        font-size: 11px;
    }

    .assignment-card {
        min-width: 190px;
        border: 1px solid #e2e8f0;
        border-radius: 13px;
        padding: 13px 16px;
        background: #f8fafc;
    }

    .assignment-card span {
        display: block;
        color: #94a3b8;
        font-size: 10px;
        margin-bottom: 5px;
    }

    .assignment-card strong {
        color: #334155;
        font-size: 13px;
    }


    /* ==============================================
       Status
    ============================================== */

    .status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 10px;
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


    /* ==============================================
       Alerts
    ============================================== */

    .alert {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 15px;
        border-radius: 12px;
        margin-bottom: 16px;
        font-size: 13px;
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


    /* ==============================================
       Tabs
    ============================================== */

    .tabs {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px;
        background: #e9eef5;
        border-radius: 12px;
        margin-bottom: 18px;
        overflow-x: auto;
    }

    .tabs button {
        border: 0;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        padding: 10px 17px;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
    }

    .tabs button:hover {
        color: #334155;
    }

    .tabs button.active {
        background: #ffffff;
        color: #111827;
        box-shadow:
            0 2px 7px
            rgba(
                15,
                23,
                42,
                0.08
            );
    }

    .tabs button span {
        margin-right: 5px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #e2e8f0;
        font-size: 9px;
    }


    /* ==============================================
       Content
    ============================================== */

    .tab-content {
        animation: fadeIn 0.18s ease;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(4px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .two-column {
        display: grid;
        grid-template-columns:
            minmax(0, 1.2fr)
            minmax(320px, 0.8fr);
        gap: 18px;
        margin-bottom: 18px;
    }

    .panel {
        background: #ffffff;
        border: 1px solid #e8edf4;
        border-radius: 18px;
        padding: 23px;
        margin-bottom: 18px;
        box-shadow:
            0 8px 28px
            rgba(
                15,
                23,
                42,
                0.035
            );
    }

    .panel:last-child {
        margin-bottom: 0;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 20px;
    }

    .panel-header h2 {
        margin: 0;
        font-size: 19px;
        font-weight: 900;
        color: #111827;
    }

    .panel-header p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.7;
    }


    /* ==============================================
       Details
    ============================================== */

    .details-list {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .detail-item {
        border-bottom: 1px solid #eef2f7;
        padding-bottom: 15px;
    }

    .detail-item:last-child {
        border-bottom: 0;
        padding-bottom: 0;
    }

    .detail-item > span {
        display: block;
        color: #94a3b8;
        font-size: 10px;
        font-weight: 800;
        margin-bottom: 6px;
    }

    .detail-item strong {
        display: block;
        color: #334155;
        font-size: 13px;
    }

    .detail-item p {
        margin: 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.8;
    }


    /* ==============================================
       Status Panel
    ============================================== */

    .large-status {
        padding: 25px;
        border-radius: 14px;
        background: #f8fafc;
        text-align: center;
        margin-bottom: 15px;
    }

    .large-status .status-badge {
        font-size: 13px;
        padding: 8px 17px;
    }

    .status-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
    }

    .status-actions button {
        flex: 1;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #64748b;
        border-radius: 9px;
        padding: 10px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
    }

    .status-actions button:hover {
        background: #f8fafc;
    }

    .status-actions button.selected {
        background: #111827;
        color: #ffffff;
        border-color: #111827;
    }

    .date-grid {
        display: grid;
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            );
        gap: 10px;
    }

    .date-grid > div {
        padding: 12px;
        background: #f8fafc;
        border-radius: 10px;
    }

    .date-grid span {
        display: block;
        color: #94a3b8;
        font-size: 9px;
        margin-bottom: 5px;
    }

    .date-grid strong {
        color: #334155;
        font-size: 11px;
    }


    /* ==============================================
       People
    ============================================== */

    .people-grid {
        display: grid;
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            );
        gap: 12px;
    }

    .person-card {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid #e8edf4;
        border-radius: 13px;
        padding: 13px;
    }

    .person-avatar {
        width: 42px;
        height: 42px;
        flex-shrink: 0;
        border-radius: 11px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
    }

    .person-card span {
        display: block;
        color: #94a3b8;
        font-size: 10px;
        margin-bottom: 4px;
    }

    .person-card strong {
        display: block;
        color: #334155;
        font-size: 12px;
    }


    /* ==============================================
       Checkpoints
    ============================================== */

    .checkpoint-progress {
        text-align: center;
        padding: 8px 14px;
        border-radius: 10px;
        background: #f8fafc;
    }

    .checkpoint-progress strong {
        display: block;
        font-size: 16px;
        font-weight: 900;
    }

    .checkpoint-progress span {
        color: #94a3b8;
        font-size: 9px;
    }

    .checkpoints-list {
        border: 1px solid #e8edf4;
        border-radius: 14px;
        overflow: hidden;
    }

    .checkpoint-item {
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 15px;
        border-bottom: 1px solid #eef2f7;
        transition: 0.2s;
    }

    .checkpoint-item:last-child {
        border-bottom: 0;
    }

    .checkpoint-item.completed {
        background: #f8fafc;
    }

    .checkpoint-check {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        border-radius: 8px;
        border: 2px solid #cbd5e1;
        background: #ffffff;
        color: #ffffff;
        cursor: pointer;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .checkpoint-item.completed
        .checkpoint-check {
        background: #166534;
        border-color: #166534;
    }

    .checkpoint-content {
        flex: 1;
        min-width: 0;
    }

    .checkpoint-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .checkpoint-title-row h3 {
        margin: 0;
        font-size: 13px;
        font-weight: 900;
        color: #334155;
    }

    .completed-label {
        color: #166534;
        background: #dcfce7;
        padding: 3px 7px;
        border-radius: 999px;
        font-size: 8px;
        font-weight: 900;
    }

    .checkpoint-content p {
        margin: 5px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.7;
    }

    .checkpoint-file {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
        flex-wrap: wrap;
    }

    .checkpoint-file a {
        color: #2563eb;
        text-decoration: none;
        font-size: 10px;
        font-weight: 800;
    }

    .checkpoint-file a:hover {
        text-decoration: underline;
    }

    .checkpoint-file span {
        color: #94a3b8;
        font-size: 9px;
    }

    .edit-checkpoint {
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        border-radius: 8px;
        padding: 7px 10px;
        cursor: pointer;
        font-size: 10px;
        font-weight: 800;
        flex-shrink: 0;
    }

    .edit-checkpoint:hover {
        background: #f8fafc;
    }


    /* ==============================================
       Empty
    ============================================== */

    .empty-inline {
        text-align: center;
        padding: 50px 20px;
        background: #fafbfd;
        border: 1px dashed #dbe3ed;
        border-radius: 13px;
    }

    .empty-inline > div {
        width: 55px;
        height: 55px;
        margin: 0 auto 12px;
        border-radius: 16px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 25px;
    }

    .empty-inline h3 {
        margin: 0;
        font-size: 15px;
    }

    .empty-inline p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 11px;
    }


    /* ==============================================
       Forms
    ============================================== */

    .form-grid {
        display: grid;
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            );
        gap: 15px;
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
        font-size: 12px;
        font-family: inherit;
        transition: 0.2s;
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

    .form-actions {
        display: flex;
        justify-content: flex-start;
        margin-top: 18px;
    }

    .form-actions button {
        border: 0;
        background: #111827;
        color: #ffffff;
        border-radius: 9px;
        padding: 11px 18px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 800;
    }

    .form-actions button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .quick-status {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid #eef2f7;
    }

    .quick-status > span {
        color: #94a3b8;
        font-size: 10px;
        margin-left: 5px;
    }

    .quick-status button {
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        border-radius: 8px;
        padding: 7px 10px;
        cursor: pointer;
        font-size: 10px;
        font-weight: 800;
    }

    .quick-status button:hover {
        background: #f8fafc;
    }

    .assignment-label {
        color: #475569;
        background: #f1f5f9;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 9px;
        font-weight: 900;
    }

    .presentation-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 18px;
        padding: 13px;
        background: #f8fafc;
        border-radius: 10px;
        font-size: 11px;
    }

    .presentation-status span {
        color: #94a3b8;
    }

    .presentation-status strong {
        color: #334155;
    }


    /* ==============================================
       Modal
    ============================================== */

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
            550px,
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
        cursor: pointer;
        font-size: 20px;
        color: #64748b;
    }

    .modal .form-group {
        margin-bottom: 14px;
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


    /* ==============================================
       Error Page
    ============================================== */

    .error-page {
        background: #ffffff;
        border: 1px solid #e8edf4;
        border-radius: 20px;
        padding: 70px 25px;
        text-align: center;
        margin-top: 20px;
    }

    .error-page-icon {
        width: 70px;
        height: 70px;
        margin: 0 auto 18px;
        border-radius: 20px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
    }

    .error-page h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 900;
    }

    .error-page p {
        color: #64748b;
        font-size: 13px;
        margin: 8px auto 20px;
        max-width: 500px;
        line-height: 1.8;
    }

    .error-page button {
        border: 0;
        background: #111827;
        color: #ffffff;
        border-radius: 9px;
        padding: 11px 18px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 800;
    }


    /* ==============================================
       Responsive
    ============================================== */

    @media (
        max-width: 900px
    ) {
        .project-header {
            flex-direction: column;
            align-items: stretch;
        }

        .assignment-card {
            min-width: 0;
        }

        .two-column {
            grid-template-columns: 1fr;
        }

        .people-grid {
            grid-template-columns: 1fr;
        }
    }


    @media (
        max-width: 650px
    ) {
        .project-container {
            width:
                calc(
                    100% - 24px
                );

            padding-top: 95px;
        }

        .project-header {
            padding: 18px;
        }

        .project-header-main {
            align-items: flex-start;
        }

        .project-header h1 {
            font-size: 22px;
        }

        .header-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 7px;
        }

        .panel {
            padding: 17px;
        }

        .form-grid {
            grid-template-columns: 1fr;
        }

        .form-group.full {
            grid-column: auto;
        }

        .checkpoint-item {
            align-items: flex-start;
        }

        .edit-checkpoint {
            align-self: center;
        }

        .date-grid {
            grid-template-columns: 1fr;
        }

        .tabs button {
            padding: 9px 13px;
        }
    }

`;