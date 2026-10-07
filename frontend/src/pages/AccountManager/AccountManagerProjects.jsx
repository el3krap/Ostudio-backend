import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getMyProjects
} from '../../services/accountManagerService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AccountManagerProjects = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [projects, setProjects] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    /* =========================================================
       Load Current User
    ========================================================= */

    useEffect(() => {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            navigate('/login', {
                replace: true
            });

            return;
        }

        if (currentUser.role !== 'account_manager') {
            navigate('/login', {
                replace: true
            });

            return;
        }

        setUser(currentUser);
    }, [navigate]);

    /* =========================================================
       Load Projects
    ========================================================= */

    const loadProjects = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await getMyProjects();

            const projectList = Array.isArray(response)
                ? response
                : [];

            setProjects(projectList);
        } catch (err) {
            console.error(
                '❌ Account Manager Projects Error:',
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

        loadProjects();
    }, [user, loadProjects]);

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
       Date Helper
    ========================================================= */

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return 'غير محدد';
        }

        const date = new Date(dateValue);

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

    /* =========================================================
       Status Helpers
    ========================================================= */

    const getStatusLabel = (status) => {
        switch (status) {
            case 'completed':
                return 'مكتمل';

            case 'in-progress':
                return 'قيد التنفيذ';

            default:
                return 'قيد التنفيذ';
        }
    };

    const getStatusClass = (status) => {
        return status === 'completed'
            ? 'completed'
            : 'in-progress';
    };

    /* =========================================================
       Filter Projects
    ========================================================= */

    const filteredProjects = projects.filter(
        (project) => {
            const projectName =
                project?.projectName || '';

            const description =
                project?.description || '';

            const brief =
                project?.brief ||
                project?.briefName ||
                '';

            const searchableText =
                `${projectName} ${description} ${brief}`
                    .toLowerCase();

            const normalizedSearch =
                searchTerm
                    .trim()
                    .toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                searchableText.includes(
                    normalizedSearch
                );

            let matchesStatus = true;

            if (statusFilter === 'completed') {
                matchesStatus =
                    project?.status === 'completed';
            }

            if (statusFilter === 'in-progress') {
                matchesStatus =
                    project?.status !== 'completed';
            }

            return (
                matchesSearch &&
                matchesStatus
            );
        }
    );

    /* =========================================================
       Statistics
    ========================================================= */

    const totalProjects = projects.length;

    const completedProjects =
        projects.filter(
            (project) =>
                project?.status === 'completed'
        ).length;

    const activeProjects =
        projects.filter(
            (project) =>
                project?.status !== 'completed'
        ).length;

    /* =========================================================
       Loading
    ========================================================= */

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل المشاريع..."
            />
        );
    }

    return (
        <div className="account-manager-projects-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="account-manager-projects-content">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>
                        <span className="page-label">
                            ACCOUNT MANAGER
                        </span>

                        <h1>
                            مشاريعي
                        </h1>

                        <p>
                            جميع المشاريع التي قمت بإنشائها.
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
                                    '/account-manager/dashboard'
                                )
                            }
                        >
                            لوحة التحكم
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Error
                ================================================= */}

                {error && (
                    <div className="error-message">

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

                <section className="statistics">

                    <div className="stat-item">

                        <div className="stat-icon">
                            📁
                        </div>

                        <div>
                            <span>
                                إجمالي المشاريع
                            </span>

                            <strong>
                                {totalProjects}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-item">

                        <div className="stat-icon">
                            🔄
                        </div>

                        <div>
                            <span>
                                قيد التنفيذ
                            </span>

                            <strong>
                                {activeProjects}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-item">

                        <div className="stat-icon">
                            ✓
                        </div>

                        <div>
                            <span>
                                مكتملة
                            </span>

                            <strong>
                                {completedProjects}
                            </strong>
                        </div>

                    </div>

                </section>

                {/* =================================================
                    Filters
                ================================================= */}

                <section className="filters-section">

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
                            placeholder="ابحث عن مشروع..."
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

                    <div className="status-filters">

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
                            مكتمل
                        </button>

                    </div>

                    <button
                        type="button"
                        className="refresh-button"
                        onClick={loadProjects}
                    >
                        ↻ تحديث
                    </button>

                </section>

                {/* =================================================
                    Results
                ================================================= */}

                <section className="projects-section">

                    <div className="results-header">

                        <span>
                            {filteredProjects.length}
                            {' '}
                            مشروع
                        </span>

                    </div>

                    {filteredProjects.length === 0 ? (

                        <div className="empty-state">

                            <div className="empty-icon">
                                📁
                            </div>

                            <h2>
                                {projects.length === 0
                                    ? 'لا توجد مشاريع حتى الآن'
                                    : 'لا توجد نتائج'}
                            </h2>

                            <p>
                                {projects.length === 0
                                    ? 'لم تقم بإنشاء أي مشروع بعد.'
                                    : 'جرّب تغيير البحث أو الفلتر.'}
                            </p>

                            {projects.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            '/account-manager/dashboard'
                                        )
                                    }
                                >
                                    العودة إلى لوحة التحكم
                                </button>
                            )}

                        </div>

                    ) : (

                        <div className="projects-grid">

                            {filteredProjects.map(
                                (project) => {

                                    const projectId =
                                        project?._id ||
                                        project?.id;

                                    return (
                                        <article
                                            key={projectId}
                                            className="project-card"
                                        >

                                            <div className="card-top">

                                                <div className="project-icon">
                                                    📁
                                                </div>

                                                <span
                                                    className={`status ${getStatusClass(
                                                        project?.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        project?.status
                                                    )}
                                                </span>

                                            </div>

                                            <h2>
                                                {project?.projectName ||
                                                    'مشروع بدون اسم'}
                                            </h2>

                                            <p className="project-description">

                                                {project?.description ||
                                                    project?.brief ||
                                                    'لا يوجد وصف للمشروع.'}

                                            </p>

                                            <div className="project-info">

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
                                                        موعد التسليم
                                                    </span>

                                                    <strong>
                                                        {formatDate(
                                                            project?.deadline
                                                        )}
                                                    </strong>

                                                </div>

                                            </div>

                                            <div className="project-team">

                                                <div className="team-item">

                                                    <span>
                                                        Designer
                                                    </span>

                                                    <strong>
                                                        {project?.assignedDesignerName ||
                                                            project?.assignedDesigner?.name ||
                                                            'غير معين'}
                                                    </strong>

                                                </div>

                                                <div className="team-item">

                                                    <span>
                                                        Presentation
                                                    </span>

                                                    <strong>
                                                        {project?.assignedPresenterName ||
                                                            project?.assignedPresenter?.name ||
                                                            'غير معين'}
                                                    </strong>

                                                </div>

                                            </div>

                                            <button
                                                type="button"
                                                className="open-project-button"
                                                onClick={() =>
                                                    handleOpenProject(
                                                        project
                                                    )
                                                }
                                            >
                                                عرض التفاصيل
                                                <span>
                                                    ←
                                                </span>
                                            </button>

                                        </article>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </main>

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .account-manager-projects-page {
                    min-height: 100vh;
                    background: #f7f7f8;
                    color: #111827;
                    direction: rtl;
                }

                .account-manager-projects-content {
                    width: min(
                        1400px,
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

                .page-label {
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
                    gap: 10px;
                }

                .dashboard-button {
                    min-height: 42px;

                    padding: 0 16px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #111827;

                    font-size: 12px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .dashboard-button:hover {
                    background: #f9fafb;
                }

                .error-message {
                    margin-bottom: 22px;

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

                .error-message button {
                    margin-right: auto;

                    border: none;
                    background: transparent;

                    color: #991b1b;

                    font-size: 20px;

                    cursor: pointer;
                }

                .statistics {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 15px;

                    margin-bottom: 30px;
                }

                .stat-item {
                    min-height: 105px;

                    padding: 18px;

                    display: flex;
                    align-items: center;

                    gap: 14px;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .stat-icon {
                    width: 45px;
                    height: 45px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 10px;

                    background: #f3f4f6;

                    font-size: 20px;
                }

                .stat-item span {
                    display: block;

                    margin-bottom: 5px;

                    color: #6b7280;

                    font-size: 11px;
                }

                .stat-item strong {
                    display: block;

                    color: #111827;

                    font-size: 25px;

                    line-height: 1;
                }

                .filters-section {
                    padding: 15px;

                    display: flex;
                    align-items: center;

                    gap: 12px;

                    margin-bottom: 20px;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .search-box {
                    min-width: 240px;

                    flex: 1;

                    height: 40px;

                    display: flex;
                    align-items: center;

                    gap: 8px;

                    padding: 0 12px;

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
                    font-size: 12px;
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

                .status-filters {
                    display: flex;
                    align-items: center;

                    gap: 5px;

                    padding: 3px;

                    border-radius: 8px;

                    background: #f3f4f6;
                }

                .status-filters button {
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

                .status-filters button.active {
                    background: #ffffff;

                    color: #111827;

                    box-shadow:
                        0 1px 3px
                        rgba(0, 0, 0, 0.08);
                }

                .refresh-button {
                    min-height: 40px;

                    padding: 0 13px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;

                    color: #374151;

                    font-size: 11px;
                    font-weight: 600;

                    cursor: pointer;
                }

                .refresh-button:hover {
                    background: #f9fafb;
                }

                .results-header {
                    margin-bottom: 13px;

                    color: #6b7280;

                    font-size: 11px;
                }

                .projects-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            3,
                            minmax(0, 1fr)
                        );

                    gap: 17px;
                }

                .project-card {
                    min-width: 0;

                    padding: 20px;

                    border: 1px solid #e5e7eb;
                    border-radius: 13px;

                    background: #ffffff;

                    transition:
                        transform 0.2s ease,
                        box-shadow 0.2s ease;
                }

                .project-card:hover {
                    transform: translateY(-2px);

                    box-shadow:
                        0 12px 28px
                        rgba(0, 0, 0, 0.07);
                }

                .card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    gap: 10px;

                    margin-bottom: 16px;
                }

                .project-icon {
                    width: 43px;
                    height: 43px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 10px;

                    background: #f3f4f6;

                    font-size: 20px;
                }

                .status {
                    padding: 6px 9px;

                    border-radius: 999px;

                    font-size: 9px;
                    font-weight: 700;
                }

                .status.in-progress {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .status.completed {
                    background: #ecfdf5;
                    color: #047857;
                }

                .project-card h2 {
                    margin: 0 0 8px;

                    color: #111827;

                    font-size: 16px;
                    font-weight: 800;
                }

                .project-description {
                    min-height: 39px;

                    margin: 0 0 17px;

                    color: #6b7280;

                    font-size: 11px;

                    line-height: 1.7;

                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;

                    overflow: hidden;
                }

                .project-info {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 10px;

                    padding: 13px 0;

                    border-top:
                        1px solid #f3f4f6;

                    border-bottom:
                        1px solid #f3f4f6;
                }

                .project-info span,
                .team-item span {
                    display: block;

                    margin-bottom: 5px;

                    color: #9ca3af;

                    font-size: 9px;
                }

                .project-info strong,
                .team-item strong {
                    display: block;

                    overflow: hidden;

                    text-overflow: ellipsis;

                    white-space: nowrap;

                    color: #374151;

                    font-size: 10px;
                }

                .project-team {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 10px;

                    padding: 13px 0;
                }

                .team-item {
                    min-width: 0;
                }

                .open-project-button {
                    width: 100%;

                    min-height: 39px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    gap: 8px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .open-project-button:hover {
                    background: #f9fafb;

                    border-color: #d1d5db;
                }

                .open-project-button span {
                    font-size: 15px;
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
                    border-radius: 13px;

                    background: #ffffff;
                }

                .empty-icon {
                    width: 60px;
                    height: 60px;

                    margin-bottom: 15px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 14px;

                    background: #f3f4f6;

                    font-size: 27px;
                }

                .empty-state h2 {
                    margin: 0 0 7px;

                    font-size: 17px;
                }

                .empty-state p {
                    margin: 0 0 18px;

                    color: #6b7280;

                    font-size: 12px;
                }

                .empty-state button {
                    min-height: 39px;

                    padding: 0 16px;

                    border: none;
                    border-radius: 8px;

                    background: #111827;
                    color: #ffffff;

                    font-family: inherit;

                    font-size: 11px;
                    font-weight: 700;

                    cursor: pointer;
                }

                @media (max-width: 1050px) {
                    .projects-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .filters-section {
                        flex-wrap: wrap;
                    }

                    .search-box {
                        min-width: 100%;
                    }
                }

                @media (max-width: 700px) {
                    .account-manager-projects-content {
                        width: calc(100% - 28px);

                        padding-top: 28px;
                    }

                    .page-header {
                        align-items: flex-start;

                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                    }

                    .dashboard-button {
                        flex: 1;
                    }

                    .statistics {
                        grid-template-columns:
                            1fr;
                    }

                    .projects-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .filters-section {
                        align-items: stretch;

                        flex-direction: column;
                    }

                    .search-box {
                        min-width: 0;
                    }

                    .status-filters {
                        width: 100%;
                    }

                    .status-filters button {
                        flex: 1;
                    }

                    .refresh-button {
                        width: 100%;
                    }
                }

            `}</style>

        </div>
    );
};

export default AccountManagerProjects;