// frontend/src/pages/Coordinator/CoordinatorAssignments.jsx

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
    getDesigners,
    getPresentationDesigners,
    assignDesigner,
    removeDesigner,
    assignPresentationDesigner,
    removePresentationDesigner
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
        item.userId ||
        item.firebaseUid ||
        null
    );
}

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

function getUserName(user) {
    if (!user) {
        return 'غير محدد';
    }

    return (
        user.name ||
        user.displayName ||
        user.email ||
        'غير محدد'
    );
}

function getUserEmail(user) {
    if (!user) {
        return '';
    }

    return user.email || '';
}

function getAssignedDesignerId(project) {
    if (!project) {
        return null;
    }

    if (
        project.assignedDesigner &&
        typeof project.assignedDesigner === 'object'
    ) {
        return getId(
            project.assignedDesigner
        );
    }

    return (
        project.assignedDesignerId ||
        project.assignedDesigner ||
        null
    );
}

function getAssignedPresenterId(project) {
    if (!project) {
        return null;
    }

    if (
        project.assignedPresenter &&
        typeof project.assignedPresenter === 'object'
    ) {
        return getId(
            project.assignedPresenter
        );
    }

    return (
        project.assignedPresenterId ||
        project.assignedPresenter ||
        null
    );
}

function getAssignedDesignerName(project) {
    if (!project) {
        return null;
    }

    if (
        project.assignedDesigner &&
        typeof project.assignedDesigner === 'object'
    ) {
        return getUserName(
            project.assignedDesigner
        );
    }

    return (
        project.assignedDesignerName ||
        null
    );
}

function getAssignedPresenterName(project) {
    if (!project) {
        return null;
    }

    if (
        project.assignedPresenter &&
        typeof project.assignedPresenter === 'object'
    ) {
        return getUserName(
            project.assignedPresenter
        );
    }

    return (
        project.assignedPresenterName ||
        null
    );
}

/* =========================================================
   Component
========================================================= */

export default function CoordinatorAssignments() {
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
        designers,
        setDesigners
    ] = useState([]);

    const [
        presentationDesigners,
        setPresentationDesigners
    ] = useState([]);

    const [
        selectedDesigner,
        setSelectedDesigner
    ] = useState('');

    const [
        selectedPresenter,
        setSelectedPresenter
    ] = useState('');

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        actionLoading,
        setActionLoading
    ] = useState(false);

    const [
        designersLoading,
        setDesignersLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState('');

    const [
        success,
        setSuccess
    ] = useState('');

    const [
        showRemoveDesignerModal,
        setShowRemoveDesignerModal
    ] = useState(false);

    const [
        showRemovePresenterModal,
        setShowRemovePresenterModal
    ] = useState(false);

    /* =====================================================
       Load User
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

                const normalized =
                    result?.project ||
                    result?.data ||
                    result;

                setProject(
                    normalized
                );

                return normalized;
            },
            [projectId]
        );

    /* =====================================================
       Load Designers
    ===================================================== */

    const loadDesigners =
        useCallback(
            async () => {
                setDesignersLoading(
                    true
                );

                try {
                    const [
                        mainResult,
                        presentationResult
                    ] = await Promise.all([
                        getDesigners(),
                        getPresentationDesigners()
                    ]);

                    const mainList =
                        Array.isArray(
                            mainResult
                        )
                            ? mainResult
                            : [];

                    const presentationList =
                        Array.isArray(
                            presentationResult
                        )
                            ? presentationResult
                            : [];

                    setDesigners(
                        mainList
                    );

                    setPresentationDesigners(
                        presentationList
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
                        await loadCurrentUser();

                    if (!currentUser) {
                        return;
                    }

                    await Promise.all([
                        loadProject(),
                        loadDesigners()
                    ]);
                } catch (err) {
                    if (
                        mounted
                    ) {
                        setError(
                            err?.message ||
                            'حدث خطأ أثناء تحميل بيانات التعيين.'
                        );
                    }
                } finally {
                    if (
                        mounted
                    ) {
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
            loadProject,
            loadDesigners
        ]
    );

    /* =====================================================
       Current Assignments
    ===================================================== */

    const assignedDesignerId =
        useMemo(
            () =>
                getAssignedDesignerId(
                    project
                ),
            [project]
        );

    const assignedPresenterId =
        useMemo(
            () =>
                getAssignedPresenterId(
                    project
                ),
            [project]
        );

    const assignedDesignerName =
        useMemo(
            () =>
                getAssignedDesignerName(
                    project
                ),
            [project]
        );

    const assignedPresenterName =
        useMemo(
            () =>
                getAssignedPresenterName(
                    project
                ),
            [project]
        );

    /* =====================================================
       Sync Select Values
    ===================================================== */

    useEffect(
        () => {
            setSelectedDesigner(
                assignedDesignerId
                    ? String(
                          assignedDesignerId
                      )
                    : ''
            );

            setSelectedPresenter(
                assignedPresenterId
                    ? String(
                          assignedPresenterId
                      )
                    : ''
            );
        },
        [
            assignedDesignerId,
            assignedPresenterId
        ]
    );

    /* =====================================================
       Assign Main Designer
    ===================================================== */

    const handleAssignDesigner =
        async () => {
            if (!selectedDesigner) {
                setError(
                    'اختار المصمم أولًا.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await assignDesigner(
                    projectId,
                    selectedDesigner
                );

                await loadProject();

                setSuccess(
                    'تم تعيين مصمم المشروع بنجاح، وسيتم إشعاره.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تعيين مصمم المشروع.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Remove Main Designer
    ===================================================== */

    const handleRemoveDesigner =
        async () => {
            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await removeDesigner(
                    projectId
                );

                await loadProject();

                setShowRemoveDesignerModal(
                    false
                );

                setSuccess(
                    'تم إزالة مصمم المشروع.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر إزالة مصمم المشروع.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Assign Presentation Designer
    ===================================================== */

    const handleAssignPresenter =
        async () => {
            if (!selectedPresenter) {
                setError(
                    'اختار مصمم العرض التقديمي أولًا.'
                );

                return;
            }

            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await assignPresentationDesigner(
                    projectId,
                    selectedPresenter
                );

                await loadProject();

                setSuccess(
                    'تم تعيين مصمم العرض التقديمي بنجاح، وسيتم إشعاره.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر تعيين مصمم العرض التقديمي.'
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    /* =====================================================
       Remove Presentation Designer
    ===================================================== */

    const handleRemovePresenter =
        async () => {
            try {
                setActionLoading(
                    true
                );

                setError('');
                setSuccess('');

                await removePresentationDesigner(
                    projectId
                );

                await loadProject();

                setShowRemovePresenterModal(
                    false
                );

                setSuccess(
                    'تم إزالة مصمم العرض التقديمي.'
                );
            } catch (err) {
                setError(
                    err?.message ||
                    'تعذر إزالة مصمم العرض التقديمي.'
                );
            } finally {
                setActionLoading(
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
       Back
    ===================================================== */

    const handleBack =
        () => {
            navigate(
                '/coordinator/dashboard'
            );
        };

    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل بيانات التعيينات..."
            />
        );
    }

    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="assignments-page">

            <Navbar
                user={user}
                onLogout={
                    handleLogout
                }
                title="OSTUDIO"
            />

            <main className="assignments-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

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

                        <h1>
                            تعيينات المشروع
                        </h1>

                        <p>
                            تعيين المصمم المسؤول
                            عن المشروع ومصمم
                            العرض التقديمي.
                        </p>
                    </div>

                    <NotificationBell
                        user={user}
                    />

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
                    Project Summary
                ================================================= */}

                <section className="project-summary">

                    <div className="project-icon">
                        📁
                    </div>

                    <div className="project-summary-content">

                        <span className="summary-label">
                            المشروع
                        </span>

                        <h2>
                            {
                                project?.projectName ||
                                project?.name ||
                                'بدون اسم'
                            }
                        </h2>

                        <span className="project-id">
                            ID: {getProjectId(project) || '—'}
                        </span>

                    </div>

                    <div className="project-status">
                        <span
                            className={
                                project?.status ===
                                'completed'
                                    ? 'status completed'
                                    : 'status in-progress'
                            }
                        >
                            {
                                project?.status ===
                                'completed'
                                    ? 'مكتمل'
                                    : 'قيد التنفيذ'
                            }
                        </span>
                    </div>

                </section>

                {/* =================================================
                    Assignments Grid
                ================================================= */}

                <section className="assignments-grid">

                    {/* =============================================
                        Main Project Designer
                    ============================================= */}

                    <div className="assignment-card">

                        <div className="card-header">

                            <div className="card-icon designer-icon">
                                🎨
                            </div>

                            <div>
                                <h2>
                                    مصمم المشروع
                                </h2>

                                <p>
                                    المسؤول عن تنفيذ
                                    أعمال المشروع الأساسية.
                                </p>
                            </div>

                        </div>

                        <div className="current-assignment">

                            <span className="section-title">
                                التعيين الحالي
                            </span>

                            {assignedDesignerId ? (
                                <div className="assigned-user">

                                    <div className="avatar">
                                        {(
                                            assignedDesignerName ||
                                            'D'
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="assigned-user-info">

                                        <strong>
                                            {
                                                assignedDesignerName ||
                                                'مصمم'
                                            }
                                        </strong>

                                        <span>
                                            مصمم المشروع
                                        </span>

                                    </div>

                                    <span className="assigned-badge">
                                        معيّن
                                    </span>

                                </div>
                            ) : (
                                <div className="empty-assignment">
                                    <span>
                                        👤
                                    </span>

                                    <div>
                                        <strong>
                                            لا يوجد مصمم
                                        </strong>

                                        <small>
                                            لم يتم تعيين
                                            مصمم لهذا المشروع بعد.
                                        </small>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="divider" />

                        <div className="form-group">

                            <label>
                                {assignedDesignerId
                                    ? 'تغيير المصمم'
                                    : 'اختيار المصمم'}
                            </label>

                            <select
                                value={
                                    selectedDesigner
                                }
                                onChange={(event) =>
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
                                    (designer) => {
                                        const id =
                                            getId(
                                                designer
                                            );

                                        if (!id) {
                                            return null;
                                        }

                                        return (
                                            <option
                                                key={id}
                                                value={id}
                                            >
                                                {getUserName(
                                                    designer
                                                )}
                                                {getUserEmail(
                                                    designer
                                                )
                                                    ? ` — ${getUserEmail(
                                                          designer
                                                      )}`
                                                    : ''}
                                            </option>
                                        );
                                    }
                                )}
                            </select>

                        </div>

                        <div className="card-actions">

                            <button
                                type="button"
                                className="primary-button"
                                onClick={
                                    handleAssignDesigner
                                }
                                disabled={
                                    actionLoading ||
                                    designersLoading ||
                                    !selectedDesigner
                                }
                            >
                                {actionLoading
                                    ? 'جاري التنفيذ...'
                                    : assignedDesignerId
                                      ? 'تحديث المصمم'
                                      : 'تعيين المصمم'}
                            </button>

                            {assignedDesignerId && (
                                <button
                                    type="button"
                                    className="danger-outline-button"
                                    onClick={() =>
                                        setShowRemoveDesignerModal(
                                            true
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    إزالة التعيين
                                </button>
                            )}

                        </div>

                    </div>

                    {/* =============================================
                        Presentation Designer
                    ============================================= */}

                    <div className="assignment-card">

                        <div className="card-header">

                            <div className="card-icon presentation-icon">
                                🖥️
                            </div>

                            <div>
                                <h2>
                                    مصمم العرض التقديمي
                                </h2>

                                <p>
                                    المسؤول عن تنفيذ
                                    وتجهيز العرض التقديمي.
                                </p>
                            </div>

                        </div>

                        <div className="current-assignment">

                            <span className="section-title">
                                التعيين الحالي
                            </span>

                            {assignedPresenterId ? (
                                <div className="assigned-user">

                                    <div className="avatar presentation-avatar">
                                        {(
                                            assignedPresenterName ||
                                            'P'
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="assigned-user-info">

                                        <strong>
                                            {
                                                assignedPresenterName ||
                                                'مصمم العرض'
                                            }
                                        </strong>

                                        <span>
                                            Presentation Designer
                                        </span>

                                    </div>

                                    <span className="assigned-badge">
                                        معيّن
                                    </span>

                                </div>
                            ) : (
                                <div className="empty-assignment">
                                    <span>
                                        🖥️
                                    </span>

                                    <div>
                                        <strong>
                                            لا يوجد مصمم عرض
                                        </strong>

                                        <small>
                                            لم يتم تعيين
                                            Presentation Designer بعد.
                                        </small>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="divider" />

                        <div className="form-group">

                            <label>
                                {assignedPresenterId
                                    ? 'تغيير مصمم العرض'
                                    : 'اختيار مصمم العرض'}
                            </label>

                            <select
                                value={
                                    selectedPresenter
                                }
                                onChange={(event) =>
                                    setSelectedPresenter(
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

                                {presentationDesigners.map(
                                    (designer) => {
                                        const id =
                                            getId(
                                                designer
                                            );

                                        if (!id) {
                                            return null;
                                        }

                                        return (
                                            <option
                                                key={id}
                                                value={id}
                                            >
                                                {getUserName(
                                                    designer
                                                )}
                                                {getUserEmail(
                                                    designer
                                                )
                                                    ? ` — ${getUserEmail(
                                                          designer
                                                      )}`
                                                    : ''}
                                            </option>
                                        );
                                    }
                                )}
                            </select>

                        </div>

                        <div className="card-actions">

                            <button
                                type="button"
                                className="primary-button"
                                onClick={
                                    handleAssignPresenter
                                }
                                disabled={
                                    actionLoading ||
                                    designersLoading ||
                                    !selectedPresenter
                                }
                            >
                                {actionLoading
                                    ? 'جاري التنفيذ...'
                                    : assignedPresenterId
                                      ? 'تحديث مصمم العرض'
                                      : 'تعيين مصمم العرض'}
                            </button>

                            {assignedPresenterId && (
                                <button
                                    type="button"
                                    className="danger-outline-button"
                                    onClick={() =>
                                        setShowRemovePresenterModal(
                                            true
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    إزالة التعيين
                                </button>
                            )}

                        </div>

                    </div>

                </section>

                {/* =================================================
                    Important Note
                ================================================= */}

                <section className="assignment-note">

                    <div className="note-icon">
                        💡
                    </div>

                    <div>
                        <h3>
                            ملاحظة مهمة
                        </h3>

                        <p>
                            مصمم المشروع ومصمم العرض
                            التقديمي مستقلان عن بعضهما.
                            يمكنك تعيين شخص مختلف لكل مهمة،
                            وسيتم إرسال إشعار للمستخدم عند
                            تعيينه.
                        </p>
                    </div>

                </section>

            </main>

            {/* =====================================================
                Remove Designer Modal
            ===================================================== */}

            {showRemoveDesignerModal && (
                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-icon danger">
                            ⚠️
                        </div>

                        <h2>
                            إزالة مصمم المشروع؟
                        </h2>

                        <p>
                            هل أنت متأكد من إزالة
                            التعيين الحالي للمصمم؟
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() =>
                                    setShowRemoveDesignerModal(
                                        false
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
                                className="danger-button"
                                onClick={
                                    handleRemoveDesigner
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                {actionLoading
                                    ? 'جاري التنفيذ...'
                                    : 'نعم، إزالة'}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =====================================================
                Remove Presenter Modal
            ===================================================== */}

            {showRemovePresenterModal && (
                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-icon danger">
                            ⚠️
                        </div>

                        <h2>
                            إزالة مصمم العرض؟
                        </h2>

                        <p>
                            هل أنت متأكد من إزالة
                            التعيين الحالي لمصمم
                            العرض التقديمي؟
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() =>
                                    setShowRemovePresenterModal(
                                        false
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
                                className="danger-button"
                                onClick={
                                    handleRemovePresenter
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                {actionLoading
                                    ? 'جاري التنفيذ...'
                                    : 'نعم، إزالة'}
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

                .assignments-page {
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

                .assignments-container {
                    width: min(
                        1250px,
                        calc(100% - 40px)
                    );
                    margin: 0 auto;
                    padding:
                        105px 0 50px;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    margin-bottom: 28px;
                }

                .page-header h1 {
                    margin:
                        14px 0 8px;
                    font-size: 32px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                .page-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 15px;
                    line-height: 1.8;
                }

                .back-button {
                    border: none;
                    background: transparent;
                    color: #475569;
                    padding: 0;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 700;
                    transition:
                        color 0.2s ease;
                }

                .back-button:hover {
                    color: #111827;
                }

                .alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 16px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .alert button {
                    margin-right: auto;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: 20px;
                    line-height: 1;
                }

                .error-alert {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                }

                .success-alert {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #166534;
                }

                .project-summary {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 22px;
                    margin-bottom: 24px;
                    box-shadow:
                        0 10px 30px
                        rgba(
                            15,
                            23,
                            42,
                            0.05
                        );
                }

                .project-icon {
                    width: 58px;
                    height: 58px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #eef2ff;
                    font-size: 27px;
                    flex-shrink: 0;
                }

                .project-summary-content {
                    min-width: 0;
                }

                .summary-label {
                    display: block;
                    color: #94a3b8;
                    font-size: 12px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }

                .project-summary h2 {
                    margin: 0 0 5px;
                    font-size: 21px;
                    font-weight: 800;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .project-id {
                    direction: ltr;
                    display: block;
                    color: #94a3b8;
                    font-size: 11px;
                    font-family: monospace;
                }

                .project-status {
                    margin-right: auto;
                }

                .status {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 7px 13px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 800;
                }

                .status.completed {
                    background: #dcfce7;
                    color: #166534;
                }

                .status.in-progress {
                    background: #fef3c7;
                    color: #92400e;
                }

                .assignments-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 22px;
                }

                .assignment-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 24px;
                    box-shadow:
                        0 10px 30px
                        rgba(
                            15,
                            23,
                            42,
                            0.05
                        );
                }

                .card-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    margin-bottom: 24px;
                }

                .card-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 23px;
                    flex-shrink: 0;
                }

                .designer-icon {
                    background: #ede9fe;
                }

                .presentation-icon {
                    background: #dbeafe;
                }

                .card-header h2 {
                    margin: 0 0 5px;
                    font-size: 19px;
                    font-weight: 800;
                }

                .card-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 13px;
                    line-height: 1.7;
                }

                .section-title {
                    display: block;
                    color: #64748b;
                    font-size: 12px;
                    font-weight: 800;
                    margin-bottom: 10px;
                }

                .assigned-user {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 13px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 13px;
                }

                .avatar {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: #ede9fe;
                    color: #5b21b6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 16px;
                    flex-shrink: 0;
                }

                .presentation-avatar {
                    background: #dbeafe;
                    color: #1d4ed8;
                }

                .assigned-user-info {
                    min-width: 0;
                    flex: 1;
                }

                .assigned-user-info strong {
                    display: block;
                    font-size: 14px;
                    margin-bottom: 3px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .assigned-user-info span {
                    display: block;
                    color: #94a3b8;
                    font-size: 11px;
                }

                .assigned-badge {
                    background: #dcfce7;
                    color: #166534;
                    padding: 5px 9px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    flex-shrink: 0;
                }

                .empty-assignment {
                    min-height: 70px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 13px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 13px;
                    color: #64748b;
                }

                .empty-assignment > span {
                    width: 40px;
                    height: 40px;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    flex-shrink: 0;
                }

                .empty-assignment strong {
                    display: block;
                    color: #475569;
                    font-size: 13px;
                    margin-bottom: 3px;
                }

                .empty-assignment small {
                    display: block;
                    color: #94a3b8;
                    font-size: 11px;
                }

                .divider {
                    height: 1px;
                    background: #e2e8f0;
                    margin:
                        22px 0;
                }

                .form-group {
                    margin-bottom: 18px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 800;
                }

                .form-group select {
                    width: 100%;
                    min-height: 46px;
                    padding:
                        0 13px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 11px;
                    background: #ffffff;
                    color: #1e293b;
                    font-size: 13px;
                    outline: none;
                    cursor: pointer;
                    transition:
                        border-color 0.2s ease,
                        box-shadow 0.2s ease;
                }

                .form-group select:focus {
                    border-color: #64748b;
                    box-shadow:
                        0 0 0 3px
                        rgba(
                            100,
                            116,
                            139,
                            0.12
                        );
                }

                .form-group select:disabled {
                    background: #f8fafc;
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .card-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .primary-button,
                .danger-outline-button,
                .secondary-button,
                .danger-button {
                    min-height: 42px;
                    padding:
                        0 15px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition:
                        all 0.2s ease;
                }

                .primary-button {
                    border: none;
                    background: #111827;
                    color: #ffffff;
                }

                .primary-button:hover:not(:disabled) {
                    background: #000000;
                    transform:
                        translateY(-1px);
                }

                .danger-outline-button {
                    border:
                        1px solid #fecaca;
                    background: #fff;
                    color: #b91c1c;
                }

                .danger-outline-button:hover:not(:disabled) {
                    background: #fef2f2;
                }

                .primary-button:disabled,
                .danger-outline-button:disabled,
                .secondary-button:disabled,
                .danger-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                    transform: none;
                }

                .assignment-note {
                    display: flex;
                    gap: 14px;
                    margin-top: 22px;
                    padding: 18px;
                    background: #fffbeb;
                    border:
                        1px solid #fde68a;
                    border-radius: 15px;
                }

                .note-icon {
                    font-size: 22px;
                    flex-shrink: 0;
                }

                .assignment-note h3 {
                    margin:
                        0 0 5px;
                    font-size: 14px;
                    font-weight: 800;
                    color: #92400e;
                }

                .assignment-note p {
                    margin: 0;
                    color: #92400e;
                    font-size: 13px;
                    line-height: 1.8;
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
                }

                .modal {
                    width: min(
                        440px,
                        100%
                    );
                    background: #ffffff;
                    border-radius: 18px;
                    padding: 28px;
                    text-align: center;
                    box-shadow:
                        0 25px 70px
                        rgba(
                            15,
                            23,
                            42,
                            0.22
                        );
                }

                .modal-icon {
                    width: 58px;
                    height: 58px;
                    margin:
                        0 auto 15px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 25px;
                }

                .modal-icon.danger {
                    background: #fee2e2;
                }

                .modal h2 {
                    margin:
                        0 0 10px;
                    font-size: 20px;
                    font-weight: 800;
                }

                .modal p {
                    margin:
                        0 0 24px;
                    color: #64748b;
                    font-size: 14px;
                    line-height: 1.8;
                }

                .modal-actions {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                }

                .secondary-button {
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                }

                .secondary-button:hover:not(:disabled) {
                    background: #f8fafc;
                }

                .danger-button {
                    border: none;
                    background: #dc2626;
                    color: #ffffff;
                }

                .danger-button:hover:not(:disabled) {
                    background: #b91c1c;
                }

                @media (
                    max-width: 850px
                ) {
                    .assignments-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (
                    max-width: 600px
                ) {
                    .assignments-container {
                        width:
                            min(
                                100% - 24px,
                                1250px
                            );
                        padding-top: 95px;
                    }

                    .page-header {
                        align-items: flex-start;
                    }

                    .page-header h1 {
                        font-size: 26px;
                    }

                    .project-summary {
                        align-items: flex-start;
                        flex-wrap: wrap;
                    }

                    .project-status {
                        width: 100%;
                        margin-right: 0;
                    }

                    .assignment-card {
                        padding: 18px;
                    }

                    .card-actions {
                        flex-direction: column;
                    }

                    .primary-button,
                    .danger-outline-button {
                        width: 100%;
                    }

                    .modal-actions {
                        flex-direction: column-reverse;
                    }

                    .secondary-button,
                    .danger-button {
                        width: 100%;
                    }
                }

            `}</style>

        </div>
    );
}