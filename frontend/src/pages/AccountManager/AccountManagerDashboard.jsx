import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getAccountManagerDashboardData,
    createProject
} from '../../services/accountManagerService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AccountManagerDashboard = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    const [projects, setProjects] = useState([]);

    const [loading, setLoading] = useState(true);
    const [creatingProject, setCreatingProject] = useState(false);

    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        brief: '',
        description: '',
        startDate: '',
        deadline: '',
        managerNotes: ''
    });

    /* =========================================================
       Load Current User
    ========================================================= */

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

    /* =========================================================
       Load Dashboard
    ========================================================= */

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
        } catch (err) {
            console.error(
                '❌ Account Manager Dashboard Error:',
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

    /* =========================================================
       Statistics
    ========================================================= */

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

    /* =========================================================
       Form Handling
    ========================================================= */

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
            managerNotes: ''
        });
    };

    /* =========================================================
       Create Project
    ========================================================= */

    const handleCreateProject = async (event) => {
        event.preventDefault();

        if (!formData.projectName.trim()) {
            setError('من فضلك اكتب اسم المشروع.');
            return;
        }

        try {
            setCreatingProject(true);
            setError('');

            await createProject({
                projectName: formData.projectName.trim(),
                brief: formData.brief.trim(),
                description: formData.description.trim(),
                startDate: formData.startDate || null,
                deadline: formData.deadline || null,
                managerNotes:
                    formData.managerNotes.trim()
            });

            resetForm();
            setShowCreateModal(false);

            await loadDashboard();
        } catch (err) {
            console.error(
                '❌ Create Project Error:',
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

    /* =========================================================
       Open Project
    ========================================================= */

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

    /* =========================================================
       Logout
    ========================================================= */

    const handleLogout = async () => {
        try {
            await logoutUser();

            navigate('/login', {
                replace: true
            });
        } catch (err) {
            console.error(
                '❌ Logout Error:',
                err
            );

            navigate('/login', {
                replace: true
            });
        }
    };

    /* =========================================================
       Helpers
    ========================================================= */

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

    /* =========================================================
       Loading
    ========================================================= */

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل لوحة Account Manager..."
            />
        );
    }

    /* =========================================================
       Render
    ========================================================= */

    return (
        <div className="account-manager-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="account-manager-content">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="dashboard-header">

                    <div>
                        <span className="dashboard-label">
                            ACCOUNT MANAGER
                        </span>

                        <h1>
                            مرحباً، {user.name || 'User'}
                        </h1>

                        <p>
                            إدارة ومتابعة المشاريع التي قمت بإنشائها.
                        </p>
                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="create-project-button"
                            onClick={() =>
                                setShowCreateModal(true)
                            }
                        >
                            <span>＋</span>
                            مشروع جديد
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Error
                ================================================= */}

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

                {/* =================================================
                    Statistics
                ================================================= */}

                <section className="statistics-grid">

                    <div className="stat-card">
                        <div className="stat-icon">
                            📁
                        </div>

                        <div>
                            <span>
                                إجمالي المشاريع
                            </span>

                            <strong>
                                {statistics.total}
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
                                {statistics.inProgress}
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
                                {statistics.completed}
                            </strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            📅
                        </div>

                        <div>
                            <span>
                                لها موعد تسليم
                            </span>

                            <strong>
                                {statistics.withDeadline}
                            </strong>
                        </div>
                    </div>

                </section>

                {/* =================================================
                    Projects
                ================================================= */}

                <section className="projects-section">

                    <div className="section-header">

                        <div>
                            <h2>
                                مشاريعي
                            </h2>

                            <p>
                                المشاريع التي قمت بإنشائها فقط
                            </p>
                        </div>

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={loadDashboard}
                        >
                            ↻ تحديث
                        </button>

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
                                onClick={() =>
                                    setShowCreateModal(true)
                                }
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

                                        <div className="project-meta">

                                            <div>
                                                <span>
                                                    البداية
                                                </span>

                                                <strong>
                                                    {formatDate(
                                                        project?.startDate
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    التسليم
                                                </span>

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
                                                handleOpenProject(
                                                    project
                                                )
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

            {/* =====================================================
                Create Project Modal
            ===================================================== */}

            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowCreateModal(false);
                        }
                    }}
                >

                    <div className="create-modal">

                        <div className="modal-header">

                            <div>
                                <span>
                                    NEW PROJECT
                                </span>

                                <h2>
                                    إنشاء مشروع جديد
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowCreateModal(false)
                                }
                            >
                                ×
                            </button>

                        </div>

                        <form
                            onSubmit={handleCreateProject}
                        >

                            <div className="form-group">

                                <label>
                                    اسم المشروع *
                                </label>

                                <input
                                    type="text"
                                    name="projectName"
                                    value={
                                        formData.projectName
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="اكتب اسم المشروع"
                                    required
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    اسم الـ Brief
                                </label>

                                <input
                                    type="text"
                                    name="brief"
                                    value={
                                        formData.brief
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="Brief"
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    وصف المشروع
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="اكتب وصف المشروع..."
                                    rows="4"
                                />

                            </div>

                            <div className="date-grid">

                                <div className="form-group">

                                    <label>
                                        تاريخ البداية
                                    </label>

                                    <input
                                        type="date"
                                        name="startDate"
                                        value={
                                            formData.startDate
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        موعد التسليم
                                    </label>

                                    <input
                                        type="date"
                                        name="deadline"
                                        value={
                                            formData.deadline
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                    />

                                </div>

                            </div>

                            <div className="form-group">

                                <label>
                                    ملاحظات
                                </label>

                                <textarea
                                    name="managerNotes"
                                    value={
                                        formData.managerNotes
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="أي ملاحظات إضافية..."
                                    rows="3"
                                />

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => {
                                        resetForm();
                                        setShowCreateModal(
                                            false
                                        );
                                    }}
                                    disabled={
                                        creatingProject
                                    }
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="submit-button"
                                    disabled={
                                        creatingProject
                                    }
                                >
                                    {creatingProject
                                        ? 'جاري الإنشاء...'
                                        : 'إنشاء المشروع'}
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

                .refresh-button {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 9px 14px;
                    background: #ffffff;
                    color: #374151;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .refresh-button:hover {
                    background: #f9fafb;
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

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background: rgba(17, 24, 39, 0.55);
                    backdrop-filter: blur(4px);
                }

                .create-modal {
                    width: min(620px, 100%);
                    max-height: calc(100vh - 40px);
                    overflow-y: auto;
                    padding: 26px;
                    border-radius: 16px;
                    background: #ffffff;
                    box-shadow:
                        0 25px 60px rgba(0, 0, 0, 0.18);
                }

                .modal-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 24px;
                }

                .modal-header span {
                    display: block;
                    margin-bottom: 5px;
                    color: #9ca3af;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 1.4px;
                    direction: ltr;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 22px;
                }

                .modal-header > button {
                    width: 34px;
                    height: 34px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #374151;
                    font-size: 21px;
                    cursor: pointer;
                }

                .form-group {
                    margin-bottom: 17px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 7px;
                    color: #374151;
                    font-size: 12px;
                    font-weight: 700;
                }

                .form-group input,
                .form-group textarea {
                    width: 100%;
                    padding: 11px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    outline: none;
                    background: #ffffff;
                    color: #111827;
                    font-family: inherit;
                    font-size: 13px;
                    transition: border-color 0.2s ease,
                                box-shadow 0.2s ease;
                }

                .form-group input:focus,
                .form-group textarea:focus {
                    border-color: #111827;
                    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.07);
                }

                .form-group textarea {
                    resize: vertical;
                    line-height: 1.6;
                }

                .date-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-start;
                    gap: 10px;
                    margin-top: 24px;
                    padding-top: 19px;
                    border-top: 1px solid #f3f4f6;
                }

                .cancel-button,
                .submit-button {
                    min-height: 41px;
                    padding: 0 18px;
                    border-radius: 8px;
                    font-family: inherit;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .cancel-button {
                    border: 1px solid #e5e7eb;
                    background: #ffffff;
                    color: #374151;
                }

                .submit-button {
                    border: none;
                    background: #111827;
                    color: #ffffff;
                }

                .submit-button:disabled,
                .cancel-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

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

                    .date-grid {
                        grid-template-columns: 1fr;
                    }

                    .create-project-button {
                        flex: 1;
                    }
                }

                @media (max-width: 460px) {
                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }

                    .stat-card {
                        min-height: 95px;
                    }

                    .create-modal {
                        padding: 20px;
                    }

                    .modal-actions {
                        flex-direction: column;
                    }

                    .cancel-button,
                    .submit-button {
                        width: 100%;
                    }
                }

            `}</style>

        </div>
    );
};

export default AccountManagerDashboard;