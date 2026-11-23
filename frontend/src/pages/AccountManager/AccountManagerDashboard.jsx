
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
    uploadBriefFile,
    deleteUploadedBriefFile,
    getAccountManagerDashboardData,
    getActiveCoordinators,
    createProject
} from '../../services/accountManagerService';

import Navbar from '../../components/shared/Navbar';
import Loading from '../../components/shared/Loading';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AccountManagerDashboard = () => {
    const navigate = useNavigate();

    // =========================================
    // STATE
    // =========================================

    const [user, setUser] = useState(null);

    const [projects, setProjects] = useState([]);
    const [coordinators, setCoordinators] = useState([]);

    const [coordinatorsLoading, setCoordinatorsLoading] =
        useState(false);

    const [loading, setLoading] = useState(true);
    const [creatingProject, setCreatingProject] = useState(false);

    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] =
        useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        brief: '',
        description: '',
        startDate: '',
        deadline: '',
        managerNotes: '',
        assignedCoordinator: ''
    });

    const [briefFile, setBriefFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // =========================================
    // LOAD CURRENT USER
    // =========================================

    useEffect(() => {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            navigate('/login', { replace: true });
            return;
        }

        if (currentUser.role !== 'account_manager') {
            navigate('/login', { replace: true });
            return;
        }

        setUser(currentUser);
    }, [navigate]);

    // =========================================
    // LOAD DASHBOARD
    // =========================================

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const result =
                await getAccountManagerDashboardData();

            setProjects(
                Array.isArray(result?.projects)
                    ? result.projects
                    : []
            );

            try {
                setCoordinatorsLoading(true);

                const availableCoordinators =
                    await getActiveCoordinators();

                setCoordinators(
                    Array.isArray(availableCoordinators)
                        ? availableCoordinators
                        : []
                );

            } catch (coordinatorError) {
                console.error(
                    'Failed to load Coordinators:',
                    coordinatorError
                );

                setCoordinators([]);

            } finally {
                setCoordinatorsLoading(false);
            }

        } catch (err) {
            console.error(
                'Account Manager Dashboard Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تحميل المشاريع.'
            );

        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            return;
        }

        loadDashboard();
    }, [user, loadDashboard]);

    // =========================================
    // STATISTICS
    // =========================================

    const statistics = useMemo(() => {
        const total = projects.length;

        const completed = projects.filter(
            (project) =>
                project?.status === 'completed'
        ).length;

        const inProgress = projects.filter(
            (project) =>
                project?.status !== 'completed'
        ).length;

        const withDeadline = projects.filter(
            (project) =>
                Boolean(project?.deadline)
        ).length;

        return {
            total,
            completed,
            inProgress,
            withDeadline
        };
    }, [projects]);

    // =========================================
    // FORM HANDLING
    // =========================================

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            projectName: '',
            brief: '',
            description: '',
            startDate: '',
            deadline: '',
            managerNotes: '',
            assignedCoordinator: ''
        });

        setBriefFile(null);
        setUploadProgress(0);

        const fileInput = document.getElementById('briefFile');

        if (fileInput) {
            fileInput.value = '';
        }
    };

    // =========================================
    // CREATE PROJECT
    // =========================================

    const handleCreateProject = async (event) => {
        event.preventDefault();

        if (!formData.projectName.trim()) {
            setError('من فضلك اكتب اسم المشروع.');
            return;
        }

        if (!formData.assignedCoordinator) {
            setError(
                'من فضلك اختار الـ Coordinator المسؤول عن المشروع.'
            );
            return;
        }

        try {
            setCreatingProject(true);
            setError('');

            let uploadedBrief = null;

            // Upload Brief File
            if (briefFile) {
                uploadedBrief = await uploadBriefFile(
                    briefFile,
                    setUploadProgress
                );
            }

            // Create Project
            try {
                await createProject({
                    projectName: formData.projectName.trim(),

                    assignedCoordinator:
                        formData.assignedCoordinator,

                    brief: formData.brief.trim(),

                    briefName:
                        uploadedBrief?.fileName || '',

                    briefFileUrl:
                        uploadedBrief?.url || '',

                    briefFileName:
                        uploadedBrief?.fileName || '',

                    briefFileMimeType:
                        uploadedBrief?.mimeType || '',

                    briefFileSize:
                        uploadedBrief?.size || 0,

                    briefStoragePath:
                        uploadedBrief?.storagePath || '',

                    description:
                        formData.description.trim(),

                    startDate:
                        formData.startDate || null,

                    deadline:
                        formData.deadline || null,

                    managerNotes:
                        formData.managerNotes.trim()
                });

            } catch (createError) {

                // Remove uploaded file if project creation fails
                if (uploadedBrief?.storagePath) {
                    await deleteUploadedBriefFile(
                        uploadedBrief.storagePath
                    ).catch((cleanupError) => {
                        console.warn(
                            'Brief cleanup failed:',
                            cleanupError
                        );
                    });
                }

                throw createError;
            }

            resetForm();
            setShowCreateModal(false);

            await loadDashboard();

        } catch (err) {
            console.error(
                'Create Project Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء إنشاء المشروع.'
            );

        } finally {
            setCreatingProject(false);
        }
    };

    // =========================================
    // OPEN PROJECT
    // =========================================

    const handleOpenProject = (project) => {
        const projectId =
            project?._id ||
            project?.id;

        if (!projectId) {
            return;
        }

        navigate(
            `/account-manager/projects/${projectId}`
        );
    };

    // =========================================
    // LOGOUT
    // =========================================

    const handleLogout = async () => {
        try {
            await logoutUser();

            navigate('/login', {
                replace: true
            });

        } catch (err) {
            console.error(
                'Logout Error:',
                err
            );

            navigate('/login', {
                replace: true
            });
        }
    };

    // =========================================
    // HELPERS
    // =========================================

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return 'غير محدد';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return 'غير محدد';
        }

        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusLabel = (status) => {
        if (status === 'completed') {
            return 'مكتمل';
        }

        return 'قيد التنفيذ';
    };

    const getStatusClass = (status) => {
        if (status === 'completed') {
            return 'status-completed';
        }

        return 'status-progress';
    };

    // =========================================
    // LOADING
    // =========================================

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل لوحة Account Manager..."
            />
        );
    }

    // =========================================
    // RENDER
    // =========================================

    return (
        <div className="account-manager-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="account-manager-content">

                {/* =====================================
                    HEADER
                ===================================== */}

                <section className="dashboard-header">

                    <div className="header-actions">

                        <button
                            type="button"
                            className="create-project-button"
                            onClick={() => {
                                setError('');
                                resetForm();
                                setShowCreateModal(true);
                            }}
                        >
                            <span>＋</span>
                            مشروع جديد
                        </button>

                        <button
                            type="button"
                            className="refresh-button header-refresh-button"
                            onClick={loadDashboard}
                            disabled={loading}
                        >
                            <span className="refresh-icon">↻</span>
                            تحديث
                        </button>

                    </div>

                </section>

                {/* =====================================
                    ERROR
                ===================================== */}

                {error && (
                    <div className="error-message">

                        <span>⚠️</span>

                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError('')}
                        >
                            ×
                        </button>

                    </div>
                )}

                {/* =====================================
                    STATISTICS
                ===================================== */}

                <section className="statistics-grid">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📁
                        </div>

                        <div>
                            <span>إجمالي المشاريع</span>
                            <strong>{statistics.total}</strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            🔄
                        </div>

                        <div>
                            <span>قيد التنفيذ</span>
                            <strong>{statistics.inProgress}</strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            ✅
                        </div>

                        <div>
                            <span>مكتملة</span>
                            <strong>{statistics.completed}</strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            📅
                        </div>

                        <div>
                            <span>لها موعد تسليم</span>
                            <strong>{statistics.withDeadline}</strong>
                        </div>

                    </div>

                </section>

                {/* =====================================
                    PROJECTS
                ===================================== */}

                <section className="projects-section">

                    <div className="section-header">

                        <div>
                            <h2>My Projects</h2>
                        </div>

                    </div>

                    {projects.length === 0 ? (

                        <div className="empty-state">

                            <div className="empty-icon">
                                📁
                            </div>

                            <h3>
                                لا توجد مشاريع حتى الآن
                            </h3>

                            <p>
                                ابدأ بإنشاء أول مشروع لك.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    resetForm();
                                    setShowCreateModal(true);
                                }}
                            >
                                إنشاء مشروع
                            </button>

                        </div>

                    ) : (

                        <div className="projects-grid">

                            {projects.map((project) => {

                                const projectId =
                                    project?._id ||
                                    project?.id;

                                return (
                                    <article
                                        key={projectId}
                                        className="project-card"
                                    >

                                        <div className="project-card-top">

                                            <div className="project-folder-icon">
                                                📁
                                            </div>

                                            <span
                                                className={`project-status ${getStatusClass(
                                                    project?.status
                                                )}`}
                                            >
                                                {getStatusLabel(
                                                    project?.status
                                                )}
                                            </span>

                                        </div>

                                        <h3>
                                            {project?.projectName ||
                                                'مشروع بدون اسم'}
                                        </h3>

                                        <p className="project-description">
                                            {project?.description ||
                                                project?.brief ||
                                                'لا يوجد وصف للمشروع.'}
                                        </p>

                                        <p className="project-coordinator">
                                            <strong>
                                                Coordinator المسؤول:
                                            </strong>

                                            {project?.assignedCoordinator?.name ||
                                                'غير محدد'}
                                        </p>

                                        <div className="project-meta">

                                            <div>
                                                <span>البداية</span>

                                                <strong>
                                                    {formatDate(
                                                        project?.startDate
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>التسليم</span>

                                                <strong>
                                                    {formatDate(
                                                        project?.deadline
                                                    )}
                                                </strong>
                                            </div>

                                        </div>

                                        <button
                                            type="button"
                                            className="details-button"
                                            onClick={() =>
                                                handleOpenProject(project)
                                            }
                                        >
                                            عرض تفاصيل المشروع
                                            <span>←</span>
                                        </button>

                                    </article>
                                );
                            })}

                        </div>
                    )}

                </section>

            </main>

            {/* =============================================
                CREATE PROJECT MODAL
            ============================================= */}

            {showCreateModal && (

                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !creatingProject
                        ) {
                            resetForm();
                            setShowCreateModal(false);
                        }
                    }}
                >

                    <div
                        className="modal"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* Modal Header */}

                        <div className="modal-header">

                            <button
                                type="button"
                                className="modal-close-button"
                                disabled={creatingProject}
                                onClick={() => {
                                    if (!creatingProject) {
                                        resetForm();
                                        setShowCreateModal(false);
                                    }
                                }}
                                aria-label="إغلاق"
                            >
                                ×
                            </button>

                        </div>


                        {/* Project Form */}

                        <form onSubmit={handleCreateProject}>

                            {/* Project Name */}

                            <div className="form-group">

                                <label htmlFor="projectName">
                                    <strong>اسم المشروع</strong>
                                </label>

                                <input
                                    id="projectName"
                                    type="text"
                                    name="projectName"
                                    value={formData.projectName}
                                    onChange={handleInputChange}
                                    placeholder="اكتب اسم المشروع"
                                    required
                                    disabled={creatingProject}
                                />

                            </div>


                            {/* Brief Upload */}

                            <div className="form-group">

                                <label htmlFor="briefFile">
                                    <strong>Brief</strong>
                                </label>

                                <input
                                    id="briefFile"
                                    type="file"
                                    onChange={(event) => {
                                        setBriefFile(
                                            event.target.files?.[0] || null
                                        );

                                        setUploadProgress(0);
                                    }}
                                    disabled={creatingProject}
                                />

                                {briefFile && (
                                    <small className="selected-file">
                                        الملف المختار: {briefFile.name}
                                        {' — '}
                                        {(
                                            briefFile.size /
                                            (1024 * 1024)
                                        ).toFixed(2)} MB
                                    </small>
                                )}

                                {creatingProject && briefFile && (

                                    <div className="brief-upload-progress">

                                        <div>
                                            <span>
                                                جاري رفع ملف الـ Brief
                                            </span>

                                            <strong>
                                                {uploadProgress}%
                                            </strong>
                                        </div>

                                        <progress
                                            value={uploadProgress}
                                            max="100"
                                        />

                                    </div>

                                )}

                                <input
                                    type="text"
                                    name="brief"
                                    value={formData.brief}
                                    onChange={handleInputChange}
                                    placeholder="اسم / وصف الـ Brief (اختياري)"
                                    disabled={creatingProject}
                                />

                            </div>


                            {/* Project Description */}

                            <div className="form-group">

                                <label htmlFor="description">
                                    <strong>وصف المشروع</strong>
                                </label>

                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="اكتب وصف المشروع..."
                                    disabled={creatingProject}
                                />

                            </div>


                            {/* Dates */}

                            <div className="date-grid">

                                <div className="form-group">

                                    <label htmlFor="startDate">
                                        <strong>تاريخ البداية</strong>
                                    </label>

                                    <input
                                        id="startDate"
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        disabled={creatingProject}
                                    />

                                </div>

                                <div className="form-group">

                                    <label htmlFor="deadline">
                                        <strong>موعد التسليم</strong>
                                    </label>

                                    <input
                                        id="deadline"
                                        type="date"
                                        name="deadline"
                                        value={formData.deadline}
                                        onChange={handleInputChange}
                                        disabled={creatingProject}
                                    />

                                </div>

                            </div>


                            {/* Manager Notes */}

                            <div className="form-group">

                                <label htmlFor="managerNotes">
                                    <strong>ملاحظات</strong>
                                </label>

                                <textarea
                                    id="managerNotes"
                                    name="managerNotes"
                                    rows={4}
                                    value={formData.managerNotes}
                                    onChange={handleInputChange}
                                    placeholder="أي ملاحظات خاصة بالمشروع"
                                    disabled={creatingProject}
                                />

                            </div>


                            {/* Coordinator Selection */}

                            <div className="form-group">

                                <label htmlFor="assignedCoordinator">
                                    <strong>Coordinator</strong>
                                </label>

                                <select
                                    id="assignedCoordinator"
                                    name="assignedCoordinator"
                                    value={formData.assignedCoordinator}
                                    onChange={handleInputChange}
                                    required
                                    disabled={
                                        creatingProject ||
                                        coordinatorsLoading ||
                                        coordinators.length === 0
                                    }
                                >

                                    <option value="">
                                        {coordinatorsLoading
                                            ? 'جاري تحميل Coordinators...'
                                            : coordinators.length === 0
                                                ? 'لا توجد حسابات Coordinator نشطة'
                                                : 'Choose Coordinator'}
                                    </option>

                                    {coordinators.map((coordinator) => (

                                        <option
                                            key={coordinator._id}
                                            value={coordinator._id}
                                        >
                                            {coordinator.name ||
                                                coordinator.email ||
                                                coordinator._id}

                                            {coordinator.email
                                                ? ` — ${coordinator.email}`
                                                : ''}
                                        </option>

                                    ))}

                                </select>

                            </div>


                            {/* Form Buttons */}

                            <div className="modal-actions">

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={
                                        creatingProject ||
                                        coordinatorsLoading ||
                                        coordinators.length === 0
                                    }
                                >
                                    {creatingProject
                                        ? 'جاري الإنشاء...'
                                        : 'إنشاء المشروع'}
                                </button>

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={creatingProject}
                                    onClick={() => {
                                        resetForm();
                                        setShowCreateModal(false);
                                    }}
                                >
                                    إلغاء
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {/* =============================================
                STYLES
            ============================================= */}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                /* =====================================
                   MAIN PAGE
                ===================================== */

                .account-manager-page {
                    min-height: 100vh;
                    background: #f7f7f8;
                    color: #111827;
                    direction: rtl;
                }

                .account-manager-content {
                    width: min(1400px, calc(100% - 48px));
                    margin: 0 auto;
                    padding: 42px 0 70px;
                }

                /* =====================================
                   DASHBOARD HEADER
                ===================================== */

                .dashboard-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 30px;
                    margin-bottom: 34px;
                }

                .dashboard-label {
                    display: inline-block;
                    margin-bottom: 9px;
                    color: #6b7280;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.8px;
                    direction: ltr;
                }

                .dashboard-header h1 {
                    margin: 0;
                    font-size: clamp(28px, 4vw, 42px);
                    line-height: 1.15;
                    font-weight: 800;
                    letter-spacing: -1px;
                }

                .dashboard-header p {
                    margin: 10px 0 0;
                    color: #6b7280;
                    font-size: 14px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .create-project-button {
                    min-height: 42px;
                    padding: 0 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    border: none;
                    border-radius: 9px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s ease,
                                background 0.2s ease;
                }

                .create-project-button:hover {
                    background: #000000;
                    transform: translateY(-1px);
                }

                .create-project-button span {
                    font-size: 19px;
                    line-height: 1;
                }

                .header-refresh-button {
                    min-height: 42px;
                    padding: 0 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    border: 1px solid #e5e7eb;
                    border-radius: 9px;
                    background: #ffffff;
                    color: #374151;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s ease,
                                border-color 0.2s ease;
                }

                .header-refresh-button:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }

                .header-refresh-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .refresh-icon {
                    display: inline-block;
                    font-size: 18px;
                    line-height: 1;
                }

                /* =====================================
                   ERROR
                ===================================== */

                .error-message {
                    margin-bottom: 24px;
                    padding: 13px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border: 1px solid #fecaca;
                    border-radius: 9px;
                    background: #fef2f2;
                    color: #991b1b;
                    font-size: 13px;
                }

                .error-message button {
                    margin-right: auto;
                    border: none;
                    background: transparent;
                    color: #991b1b;
                    font-size: 20px;
                    cursor: pointer;
                }

                /* =====================================
                   STATISTICS
                ===================================== */

                .statistics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 40px;
                }

                .stat-card {
                    min-height: 120px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 13px;
                    background: #ffffff;
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 11px;
                    background: #f3f4f6;
                    font-size: 22px;
                }

                .stat-card span {
                    display: block;
                    margin-bottom: 6px;
                    color: #6b7280;
                    font-size: 12px;
                }

                .stat-card strong {
                    display: block;
                    color: #111827;
                    font-size: 27px;
                    line-height: 1;
                }

                /* =====================================
                   PROJECTS
                ===================================== */

                .projects-section {
                    margin-top: 10px;
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 18px;
                }

                .section-header h2 {
                    margin: 0;
                    font-size: 22px;
                    font-weight: 800;
                }

                .section-header p {
                    margin: 5px 0 0;
                    color: #6b7280;
                    font-size: 13px;
                }

                .projects-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 18px;
                }

                .project-card {
                    min-width: 0;
                    padding: 21px;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    background: #ffffff;
                    transition: transform 0.2s ease,
                                box-shadow 0.2s ease;
                }

                .project-card:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 12px 28px rgba(0, 0, 0, 0.07);
                }

                .project-card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 17px;
                }

                .project-folder-icon {
                    width: 42px;
                    height: 42px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    background: #f3f4f6;
                    font-size: 20px;
                }

                .project-status {
                    padding: 6px 9px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 700;
                }

                .status-progress {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .status-completed {
                    background: #ecfdf5;
                    color: #047857;
                }

                .project-card h3 {
                    margin: 0 0 9px;
                    color: #111827;
                    font-size: 17px;
                    font-weight: 800;
                }

                .project-description {
                    min-height: 42px;
                    margin: 0 0 20px;
                    color: #6b7280;
                    font-size: 12px;
                    line-height: 1.7;

                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .project-coordinator {
                    margin: 0 0 14px;
                    color: #6b7280;
                    font-size: 11px;
                }

                .project-coordinator strong {
                    color: #374151;
                }

                .project-meta {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 19px;
                    padding-top: 14px;
                    border-top: 1px solid #f3f4f6;
                }

                .project-meta span {
                    display: block;
                    margin-bottom: 5px;
                    color: #9ca3af;
                    font-size: 10px;
                }

                .project-meta strong {
                    display: block;
                    color: #374151;
                    font-size: 11px;
                }

                .details-button {
                    width: 100%;
                    min-height: 39px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #111827;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s ease,
                                border-color 0.2s ease;
                }

                .details-button:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }

                .details-button span {
                    font-size: 16px;
                }

                /* =====================================
                   EMPTY STATE
                ===================================== */

                .empty-state {
                    min-height: 330px;
                    padding: 40px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    text-align: center;
                    border: 1px dashed #d1d5db;
                    border-radius: 14px;
                    background: #ffffff;
                }

                .empty-icon {
                    width: 62px;
                    height: 62px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                    border-radius: 15px;
                    background: #f3f4f6;
                    font-size: 28px;
                }

                .empty-state h3 {
                    margin: 0 0 8px;
                    font-size: 17px;
                }

                .empty-state p {
                    margin: 0 0 20px;
                    color: #6b7280;
                    font-size: 13px;
                }

                .empty-state button {
                    border: none;
                    border-radius: 8px;
                    padding: 10px 17px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                /* =====================================
                   MODAL OVERLAY
                ===================================== */

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;

                    background: rgba(15, 23, 42, 0.48);

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 20px;
                }

                /* =====================================
                   MODAL CONTAINER
                ===================================== */

                .modal {
                    width: min(650px, 100%);
                    max-height: calc(100vh - 40px);
                    overflow-y: auto;
                    overflow-x: hidden;

                    background: #ffffff;
                    border-radius: 18px;
                    padding: 22px;

                    box-shadow:
                        0 25px 70px rgba(15, 23, 42, 0.25);

                    direction: rtl;
                }

                .modal::-webkit-scrollbar {
                    width: 7px;
                }

                .modal::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }

                /* =====================================
                   MODAL HEADER
                ===================================== */

                .modal-header {
                    display: flex;
                    justify-content: flex-start;
                    align-items: flex-start;
                    gap: 15px;

                    margin-bottom: 20px;
                }

                .modal-close-button {
                    width: 35px;
                    height: 35px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 0;
                    border-radius: 8px;

                    background: #f1f5f9;
                    color: #475569;

                    font-size: 23px;
                    cursor: pointer;
                }

                .modal-close-button:hover {
                    background: #e2e8f0;
                }

                .modal-close-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* =====================================
                   FORM GROUPS
                ===================================== */

                .modal .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;

                    margin-bottom: 14px;
                }

                .modal .form-group label {
                    color: #475569;
                    font-size: 10px;
                    font-weight: 900;
                }

                .modal .form-group label strong {
                    font-weight: 900;
                }

                /* =====================================
                   INPUTS / TEXTAREA / SELECT
                ===================================== */

                .modal .form-group input,
                .modal .form-group textarea,
                .modal .form-group select {
                    width: 100%;
                    min-height: 40px;

                    border: 1px solid #dfe6ef;
                    border-radius: 9px;

                    padding: 11px 12px;

                    outline: 0;

                    background: #ffffff;
                    color: #334155;

                    font-family: inherit;
                    font-size: 11px;

                    text-align: right;
                }

                .modal .form-group textarea {
                    min-height: 90px;
                    resize: vertical;
                    line-height: 1.7;
                }

                .modal .form-group input:focus,
                .modal .form-group textarea:focus,
                .modal .form-group select:focus {
                    border-color: #94a3b8;

                    box-shadow:
                        0 0 0 3px rgba(148, 163, 184, 0.15);
                }

                .modal .form-group input:disabled,
                .modal .form-group textarea:disabled,
                .modal .form-group select:disabled {
                    background: #f8fafc;
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                /* =====================================
                   BRIEF FILE
                ===================================== */

                .modal .form-group input[type="file"] {
                    cursor: pointer;
                    direction: rtl;
                }

                .selected-file {
                    display: block;
                    color: #64748b;
                    font-size: 10px;
                    overflow-wrap: anywhere;
                }

                .brief-upload-progress {
                    margin: 5px 0 10px;
                }

                .brief-upload-progress > div {
                    display: flex;
                    justify-content: space-between;

                    margin-bottom: 6px;

                    color: #475569;
                    font-size: 10px;
                }

                .brief-upload-progress progress {
                    width: 100%;
                    height: 7px;
                    accent-color: #2563eb;
                }

                /* =====================================
                   DATE GRID
                ===================================== */

                .date-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .date-grid .form-group {
                    min-width: 0;
                }

                .date-grid input[type="date"] {
                    direction: ltr;
                    text-align: left;
                }

                /* =====================================
                   MODAL ACTIONS
                ===================================== */

                .modal .modal-actions {
                    display: flex;
                    flex-direction: row;
                    direction: rtl;

                    justify-content: space-between;
                    align-items: center;

                    gap: 8px;
                    margin-top: 20px;
                    padding-top: 0;

                    border-top: 0;
                }

                .modal .cancel-button,
                .modal .save-button {
                    border: 0;
                    border-radius: 9px;

                    padding: 10px 17px;

                    cursor: pointer;

                    font-family: inherit;
                    font-size: 10px;
                    font-weight: 900;
                }

                .modal .cancel-button {
                    background: #f1f5f9;
                    color: #475569;
                }

                .modal .save-button {
                    background: #111827;
                    color: #ffffff;
                }

                .modal .cancel-button:hover {
                    background: #e2e8f0;
                }

                .modal .save-button:hover {
                    background: #000000;
                }

                .modal .cancel-button:disabled,
                .modal .save-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                /* =====================================
                   RESPONSIVE
                ===================================== */

                @media (max-width: 1100px) {

                    .statistics-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .projects-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                }

                @media (max-width: 700px) {

                    .account-manager-content {
                        width: min(100% - 28px, 600px);
                        padding-top: 28px;
                    }

                    .dashboard-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }

                    .statistics-grid {
                        grid-template-columns: 1fr 1fr;
                    }

                    .projects-grid {
                        grid-template-columns: 1fr;
                    }

                    .create-project-button {
                        flex: 1;
                    }

                    .header-refresh-button {
                        flex-shrink: 0;
                    }

                    .modal-overlay {
                        padding: 12px;
                    }

                    .modal {
                        width: 100%;
                        max-height: calc(100vh - 24px);
                        padding: 18px;
                        border-radius: 14px;
                    }

                    .date-grid {
                        grid-template-columns: 1fr;
                        gap: 0;
                    }

                }

                @media (max-width: 460px) {

                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }

                    .stat-card {
                        min-height: 95px;
                    }

                    .modal .modal-actions {
                        gap: 10px;
                    }

                    .modal .cancel-button,
                    .modal .save-button {
                        flex: 1;
                    }

                }

            `}</style>

        </div>
    );
};

export default AccountManagerDashboard;
