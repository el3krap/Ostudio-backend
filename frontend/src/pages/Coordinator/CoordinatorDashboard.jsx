// frontend/src/pages/Coordinator/CoordinatorDashboard.jsx

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

import {
    getProjects,
    getCoordinatorSummary
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
        null
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

function getProjectDescription(project) {
    return (
        project?.description ||
        project?.brief ||
        project?.briefName ||
        'لا يوجد وصف للمشروع.'
    );
}

function getDesignerName(project) {
    if (
        project?.assignedDesigner &&
        typeof project.assignedDesigner === 'object'
    ) {
        return (
            project.assignedDesigner.name ||
            project.assignedDesigner.displayName ||
            project.assignedDesigner.email ||
            'مصمم'
        );
    }

    return (
        project?.assignedDesignerName ||
        null
    );
}

function getPresenterName(project) {
    if (
        project?.assignedPresenter &&
        typeof project.assignedPresenter === 'object'
    ) {
        return (
            project.assignedPresenter.name ||
            project.assignedPresenter.displayName ||
            project.assignedPresenter.email ||
            'مصمم عرض'
        );
    }

    return (
        project?.assignedPresenterName ||
        null
    );
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

function formatDate(date) {
    if (!date) {
        return 'غير محدد';
    }

    try {
        return new Date(date).toLocaleDateString(
            'ar-EG',
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );
    } catch {
        return 'غير محدد';
    }
}

/* =========================================================
   Component
========================================================= */

export default function CoordinatorDashboard() {
    const navigate =
        useNavigate();

    const [
        user,
        setUser
    ] = useState(null);

    const [
        projects,
        setProjects
    ] = useState([]);

    const [
        summary,
        setSummary
    ] = useState({
        total: 0,
        completed: 0,
        inProgress: 0,
        assigned: 0,
        presentationAssigned: 0
    });

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        refreshing,
        setRefreshing
    ] = useState(false);

    const [
        error,
        setError
    ] = useState('');

    const [
        search,
        setSearch
    ] = useState('');

    const [
        statusFilter,
        setStatusFilter
    ] = useState('all');

    const [
        assignmentFilter,
        setAssignmentFilter
    ] = useState('all');

    /* =====================================================
       Load User
    ===================================================== */

    const loadUser =
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
       Load Dashboard Data
    ===================================================== */

    const loadDashboard =
        useCallback(
            async (
                showRefresh = false
            ) => {
                try {
                    if (
                        showRefresh
                    ) {
                        setRefreshing(
                            true
                        );
                    } else {
                        setLoading(
                            true
                        );
                    }

                    setError('');

                    const [
                        projectsResult,
                        summaryResult
                    ] =
                        await Promise.all([
                            getProjects(),
                            getCoordinatorSummary()
                        ]);

                    setProjects(
                        Array.isArray(
                            projectsResult
                        )
                            ? projectsResult
                            : []
                    );

                    setSummary({
                        total:
                            Number(
                                summaryResult?.total
                            ) || 0,

                        completed:
                            Number(
                                summaryResult?.completed
                            ) || 0,

                        inProgress:
                            Number(
                                summaryResult?.inProgress
                            ) || 0,

                        assigned:
                            Number(
                                summaryResult?.assigned
                            ) || 0,

                        presentationAssigned:
                            Number(
                                summaryResult?.presentationAssigned
                            ) || 0
                    });
                } catch (err) {
                    setError(
                        err?.message ||
                        'حدث خطأ أثناء تحميل بيانات الـ Coordinator.'
                    );
                } finally {
                    setLoading(
                        false
                    );

                    setRefreshing(
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
                    const currentUser =
                        await loadUser();

                    if (
                        !mounted ||
                        !currentUser
                    ) {
                        return;
                    }

                    await loadDashboard();
                } catch (err) {
                    if (mounted) {
                        setError(
                            err?.message ||
                            'حدث خطأ أثناء تحميل الصفحة.'
                        );

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
            loadUser,
            loadDashboard
        ]
    );

    /* =====================================================
       Filter Projects
    ===================================================== */

    const filteredProjects =
        useMemo(
            () => {
                const normalizedSearch =
                    search
                        .trim()
                        .toLowerCase();

                return projects.filter(
                    (project) => {
                        const name =
                            getProjectName(
                                project
                            ).toLowerCase();

                        const description =
                            getProjectDescription(
                                project
                            ).toLowerCase();

                        const projectId =
                            String(
                                getId(
                                    project
                                ) || ''
                            ).toLowerCase();

                        const designer =
                            String(
                                getDesignerName(
                                    project
                                ) || ''
                            ).toLowerCase();

                        const presenter =
                            String(
                                getPresenterName(
                                    project
                                ) || ''
                            ).toLowerCase();

                        const matchesSearch =
                            !normalizedSearch ||
                            name.includes(
                                normalizedSearch
                            ) ||
                            description.includes(
                                normalizedSearch
                            ) ||
                            projectId.includes(
                                normalizedSearch
                            ) ||
                            designer.includes(
                                normalizedSearch
                            ) ||
                            presenter.includes(
                                normalizedSearch
                            );

                        const projectStatus =
                            normalizeStatus(
                                project.status
                            );

                        const matchesStatus =
                            statusFilter ===
                                'all' ||
                            projectStatus ===
                                statusFilter;

                        const hasDesigner =
                            Boolean(
                                project.assignedDesigner ||
                                project.assignedDesignerId
                            );

                        const hasPresenter =
                            Boolean(
                                project.assignedPresenter ||
                                project.assignedPresenterId
                            );

                        let matchesAssignment =
                            true;

                        if (
                            assignmentFilter ===
                            'designer'
                        ) {
                            matchesAssignment =
                                hasDesigner;
                        }

                        if (
                            assignmentFilter ===
                            'presentation'
                        ) {
                            matchesAssignment =
                                hasPresenter;
                        }

                        if (
                            assignmentFilter ===
                            'unassigned'
                        ) {
                            matchesAssignment =
                                !hasDesigner;
                        }

                        return (
                            matchesSearch &&
                            matchesStatus &&
                            matchesAssignment
                        );
                    }
                );
            },
            [
                projects,
                search,
                statusFilter,
                assignmentFilter
            ]
        );

    /* =====================================================
       Stats
    ===================================================== */

    const calculatedStats =
        useMemo(
            () => {
                const total =
                    projects.length;

                const completed =
                    projects.filter(
                        (project) =>
                            normalizeStatus(
                                project.status
                            ) ===
                            'completed'
                    ).length;

                const inProgress =
                    total -
                    completed;

                const assigned =
                    projects.filter(
                        (project) =>
                            project.assignedDesigner ||
                            project.assignedDesignerId
                    ).length;

                const presentationAssigned =
                    projects.filter(
                        (project) =>
                            project.assignedPresenter ||
                            project.assignedPresenterId
                    ).length;

                return {
                    total,
                    completed,
                    inProgress,
                    assigned,
                    presentationAssigned
                };
            },
            [projects]
        );

    const stats =
        projects.length > 0
            ? calculatedStats
            : summary;

    /* =====================================================
       Navigation
    ===================================================== */

    const openProject =
        (projectId) => {
            if (!projectId) {
                return;
            }

            navigate(
                `/coordinator/projects/${projectId}`
            );
        };

    const openAssignments =
        (projectId) => {
            if (!projectId) {
                return;
            }

            navigate(
                `/coordinator/projects/${projectId}/assignments`
            );
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
       Clear Filters
    ===================================================== */

    const clearFilters =
        () => {
            setSearch('');
            setStatusFilter('all');
            setAssignmentFilter('all');
        };

    const hasFilters =
        Boolean(
            search.trim()
        ) ||
        statusFilter !==
            'all' ||
        assignmentFilter !==
            'all';

    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل لوحة الـ Coordinator..."
            />
        );
    }

    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="coordinator-dashboard">

            <Navbar
                user={user}
                onLogout={
                    handleLogout
                }
                title="OSTUDIO"
            />

            <main className="dashboard-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="dashboard-header">

                    <div className="header-content">

                        <span className="eyebrow">
                            COORDINATOR
                        </span>

                        <h1>
                            لوحة التحكم
                        </h1>

                        <p>
                            متابعة جميع المشاريع،
                            تنظيم سير العمل،
                            وتعيين المصممين.
                        </p>

                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={() =>
                                loadDashboard(
                                    true
                                )
                            }
                            disabled={
                                refreshing
                            }
                        >
                            {refreshing
                                ? '⟳ جاري التحديث'
                                : '↻ تحديث'}
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Error
                ================================================= */}

                {error && (
                    <div className="error-banner">

                        <div>
                            <strong>
                                حدث خطأ
                            </strong>

                            <span>
                                {error}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                loadDashboard(
                                    true
                                )
                            }
                        >
                            إعادة المحاولة
                        </button>

                    </div>
                )}

                {/* =================================================
                    Statistics
                ================================================= */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon total">
                            📁
                        </div>

                        <div>
                            <span>
                                إجمالي المشاريع
                            </span>

                            <strong>
                                {stats.total}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon progress">
                            🔄
                        </div>

                        <div>
                            <span>
                                قيد التنفيذ
                            </span>

                            <strong>
                                {stats.inProgress}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon completed">
                            ✓
                        </div>

                        <div>
                            <span>
                                مشاريع مكتملة
                            </span>

                            <strong>
                                {stats.completed}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon designer">
                            🎨
                        </div>

                        <div>
                            <span>
                                مشاريع لها مصمم
                            </span>

                            <strong>
                                {stats.assigned}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon presentation">
                            🖥️
                        </div>

                        <div>
                            <span>
                                لها مصمم عرض
                            </span>

                            <strong>
                                {
                                    stats.presentationAssigned
                                }
                            </strong>
                        </div>

                    </div>

                </section>

                {/* =================================================
                    Projects Section
                ================================================= */}

                <section className="projects-section">

                    <div className="section-header">

                        <div>
                            <h2>
                                جميع المشاريع
                            </h2>

                            <p>
                                يمكنك متابعة المشروع
                                وفتح تفاصيله وإدارة
                                التعيينات.
                            </p>
                        </div>

                        <span className="projects-count">
                            {filteredProjects.length}
                            {' '}
                            مشروع
                        </span>

                    </div>

                    {/* =============================================
                        Filters
                    ============================================= */}

                    <div className="filters">

                        <div className="search-wrapper">

                            <span>
                                🔍
                            </span>

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="ابحث باسم المشروع أو المصمم..."
                            />

                        </div>

                        <select
                            value={
                                statusFilter
                            }
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                كل الحالات
                            </option>

                            <option value="in-progress">
                                قيد التنفيذ
                            </option>

                            <option value="completed">
                                مكتمل
                            </option>
                        </select>

                        <select
                            value={
                                assignmentFilter
                            }
                            onChange={(event) =>
                                setAssignmentFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                كل التعيينات
                            </option>

                            <option value="designer">
                                له مصمم
                            </option>

                            <option value="presentation">
                                له مصمم عرض
                            </option>

                            <option value="unassigned">
                                بدون مصمم
                            </option>
                        </select>

                        {hasFilters && (
                            <button
                                type="button"
                                className="clear-filter-button"
                                onClick={
                                    clearFilters
                                }
                            >
                                مسح الفلاتر
                            </button>
                        )}

                    </div>

                    {/* =============================================
                        Projects
                    ============================================= */}

                    {filteredProjects.length ===
                    0 ? (
                        <div className="empty-state">

                            <div className="empty-icon">
                                📂
                            </div>

                            <h3>
                                لا توجد مشاريع
                            </h3>

                            <p>
                                {hasFilters
                                    ? 'لا توجد مشاريع مطابقة للفلاتر الحالية.'
                                    : 'لا توجد مشاريع متاحة حاليًا.'}
                            </p>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                >
                                    مسح الفلاتر
                                </button>
                            )}

                        </div>
                    ) : (
                        <div className="projects-grid">

                            {filteredProjects.map(
                                (project) => {
                                    const projectId =
                                        getId(
                                            project
                                        );

                                    const designer =
                                        getDesignerName(
                                            project
                                        );

                                    const presenter =
                                        getPresenterName(
                                            project
                                        );

                                    const status =
                                        normalizeStatus(
                                            project.status
                                        );

                                    return (
                                        <article
                                            className="project-card"
                                            key={
                                                projectId ||
                                                `${getProjectName(
                                                    project
                                                )}-${Math.random()}`
                                            }
                                        >

                                            {/* Card Header */}

                                            <div className="project-card-header">

                                                <div className="folder-icon">
                                                    📁
                                                </div>

                                                <span
                                                    className={
                                                        status ===
                                                        'completed'
                                                            ? 'project-status completed'
                                                            : 'project-status progress'
                                                    }
                                                >
                                                    {getStatusLabel(
                                                        status
                                                    )}
                                                </span>

                                            </div>

                                            {/* Project Info */}

                                            <div className="project-info">

                                                <h3>
                                                    {getProjectName(
                                                        project
                                                    )}
                                                </h3>

                                                <p>
                                                    {getProjectDescription(
                                                        project
                                                    )}
                                                </p>

                                            </div>

                                            {/* Assignment Info */}

                                            <div className="assignment-summary">

                                                <div className="assignment-row">

                                                    <span>
                                                        🎨
                                                        {' '}
                                                        مصمم المشروع
                                                    </span>

                                                    <strong
                                                        className={
                                                            designer
                                                                ? 'assigned'
                                                                : 'not-assigned'
                                                        }
                                                    >
                                                        {
                                                            designer ||
                                                            'غير معيّن'
                                                        }
                                                    </strong>

                                                </div>

                                                <div className="assignment-row">

                                                    <span>
                                                        🖥️
                                                        {' '}
                                                        مصمم العرض
                                                    </span>

                                                    <strong
                                                        className={
                                                            presenter
                                                                ? 'assigned'
                                                                : 'not-assigned'
                                                        }
                                                    >
                                                        {
                                                            presenter ||
                                                            'غير معيّن'
                                                        }
                                                    </strong>

                                                </div>

                                            </div>

                                            {/* Dates */}

                                            <div className="project-dates">

                                                <div>
                                                    <span>
                                                        البداية
                                                    </span>

                                                    <strong>
                                                        {formatDate(
                                                            project.startDate
                                                        )}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        الموعد النهائي
                                                    </span>

                                                    <strong>
                                                        {formatDate(
                                                            project.deadline
                                                        )}
                                                    </strong>
                                                </div>

                                            </div>

                                            {/* Actions */}

                                            <div className="project-actions">

                                                <button
                                                    type="button"
                                                    className="details-button"
                                                    onClick={() =>
                                                        openProject(
                                                            projectId
                                                        )
                                                    }
                                                >
                                                    فتح التفاصيل
                                                </button>

                                                <button
                                                    type="button"
                                                    className="assignment-button"
                                                    onClick={() =>
                                                        openAssignments(
                                                            projectId
                                                        )
                                                    }
                                                >
                                                    التعيينات
                                                </button>

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </main>

            {/* =====================================================
                Styles
            ===================================================== */}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .coordinator-dashboard {
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

                .dashboard-container {
                    width: min(
                        1400px,
                        calc(100% - 40px)
                    );
                    margin: 0 auto;
                    padding:
                        105px 0 55px;
                }

                .dashboard-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 25px;
                    margin-bottom: 30px;
                }

                .eyebrow {
                    display: inline-block;
                    margin-bottom: 8px;
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    direction: ltr;
                }

                .header-content h1 {
                    margin:
                        0 0 8px;
                    font-size: 34px;
                    font-weight: 900;
                    letter-spacing: -0.8px;
                }

                .header-content p {
                    margin: 0;
                    color: #64748b;
                    font-size: 15px;
                    line-height: 1.8;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .refresh-button {
                    min-height: 42px;
                    padding:
                        0 15px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 11px;
                    background: #ffffff;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition:
                        all 0.2s ease;
                }

                .refresh-button:hover:not(:disabled) {
                    background: #f8fafc;
                    transform:
                        translateY(-1px);
                }

                .refresh-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .error-banner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                    padding: 15px 17px;
                    margin-bottom: 22px;
                    border:
                        1px solid #fecaca;
                    border-radius: 13px;
                    background: #fef2f2;
                    color: #991b1b;
                }

                .error-banner > div {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .error-banner strong {
                    font-size: 13px;
                }

                .error-banner span {
                    font-size: 12px;
                }

                .error-banner button {
                    border: none;
                    border-radius: 9px;
                    padding:
                        8px 12px;
                    background: #991b1b;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            5,
                            minmax(0, 1fr)
                        );
                    gap: 15px;
                    margin-bottom: 28px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    min-height: 105px;
                    padding: 17px;
                    background: #ffffff;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 16px;
                    box-shadow:
                        0 8px 25px
                        rgba(
                            15,
                            23,
                            42,
                            0.045
                        );
                }

                .stat-icon {
                    width: 47px;
                    height: 47px;
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 21px;
                    flex-shrink: 0;
                }

                .stat-icon.total {
                    background: #eef2ff;
                }

                .stat-icon.progress {
                    background: #fef3c7;
                }

                .stat-icon.completed {
                    background: #dcfce7;
                }

                .stat-icon.designer {
                    background: #ede9fe;
                }

                .stat-icon.presentation {
                    background: #dbeafe;
                }

                .stat-card span {
                    display: block;
                    margin-bottom: 4px;
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 700;
                }

                .stat-card strong {
                    display: block;
                    font-size: 25px;
                    font-weight: 900;
                }

                .projects-section {
                    background: #ffffff;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 24px;
                    box-shadow:
                        0 10px 35px
                        rgba(
                            15,
                            23,
                            42,
                            0.045
                        );
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .section-header h2 {
                    margin:
                        0 0 5px;
                    font-size: 22px;
                    font-weight: 900;
                }

                .section-header p {
                    margin: 0;
                    color: #64748b;
                    font-size: 13px;
                }

                .projects-count {
                    padding:
                        7px 11px;
                    border-radius: 999px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 11px;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .filters {
                    display: grid;
                    grid-template-columns:
                        minmax(
                            240px,
                            1fr
                        )
                        180px
                        180px
                        auto;
                    gap: 10px;
                    margin-bottom: 22px;
                }

                .search-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    min-height: 44px;
                    padding:
                        0 12px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 11px;
                    background: #ffffff;
                }

                .search-wrapper span {
                    font-size: 14px;
                }

                .search-wrapper input {
                    width: 100%;
                    border: none;
                    outline: none;
                    background: transparent;
                    color: #1e293b;
                    font-size: 13px;
                    direction: rtl;
                }

                .filters select {
                    min-height: 44px;
                    padding:
                        0 11px;
                    border:
                        1px solid #cbd5e1;
                    border-radius: 11px;
                    background: #ffffff;
                    color: #334155;
                    font-size: 12px;
                    font-weight: 700;
                    outline: none;
                    cursor: pointer;
                }

                .clear-filter-button {
                    min-height: 44px;
                    padding:
                        0 13px;
                    border:
                        1px solid #fecaca;
                    border-radius: 11px;
                    background: #ffffff;
                    color: #b91c1c;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .clear-filter-button:hover {
                    background: #fef2f2;
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
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    padding: 18px;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 16px;
                    background: #ffffff;
                    transition:
                        transform 0.2s ease,
                        box-shadow 0.2s ease,
                        border-color 0.2s ease;
                }

                .project-card:hover {
                    transform:
                        translateY(-3px);
                    border-color: #cbd5e1;
                    box-shadow:
                        0 15px 35px
                        rgba(
                            15,
                            23,
                            42,
                            0.08
                        );
                }

                .project-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 16px;
                }

                .folder-icon {
                    width: 43px;
                    height: 43px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f1f5f9;
                    font-size: 20px;
                }

                .project-status {
                    padding:
                        6px 9px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 900;
                }

                .project-status.completed {
                    background: #dcfce7;
                    color: #166534;
                }

                .project-status.progress {
                    background: #fef3c7;
                    color: #92400e;
                }

                .project-info {
                    margin-bottom: 17px;
                }

                .project-info h3 {
                    margin:
                        0 0 7px;
                    font-size: 17px;
                    font-weight: 900;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .project-info p {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    min-height: 39px;
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.65;
                }

                .assignment-summary {
                    padding:
                        11px 12px;
                    border-radius: 12px;
                    background: #f8fafc;
                    margin-bottom: 14px;
                }

                .assignment-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 5px 0;
                }

                .assignment-row + .assignment-row {
                    border-top:
                        1px solid #e2e8f0;
                }

                .assignment-row span {
                    color: #64748b;
                    font-size: 11px;
                    white-space: nowrap;
                }

                .assignment-row strong {
                    max-width: 52%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 11px;
                }

                .assignment-row strong.assigned {
                    color: #334155;
                }

                .assignment-row strong.not-assigned {
                    color: #94a3b8;
                }

                .project-dates {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 10px;
                    margin-bottom: 17px;
                }

                .project-dates div {
                    padding:
                        9px 10px;
                    border:
                        1px solid #e2e8f0;
                    border-radius: 10px;
                }

                .project-dates span {
                    display: block;
                    margin-bottom: 4px;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 700;
                }

                .project-dates strong {
                    display: block;
                    color: #475569;
                    font-size: 10px;
                }

                .project-actions {
                    display: grid;
                    grid-template-columns:
                        1fr 1fr;
                    gap: 8px;
                    margin-top: auto;
                }

                .details-button,
                .assignment-button {
                    min-height: 40px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 800;
                    cursor: pointer;
                    transition:
                        all 0.2s ease;
                }

                .details-button {
                    border: none;
                    background: #111827;
                    color: #ffffff;
                }

                .details-button:hover {
                    background: #000000;
                }

                .assignment-button {
                    border:
                        1px solid #cbd5e1;
                    background: #ffffff;
                    color: #334155;
                }

                .assignment-button:hover {
                    background: #f8fafc;
                    border-color: #94a3b8;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 330px;
                    padding: 30px;
                    text-align: center;
                    border:
                        1px dashed #cbd5e1;
                    border-radius: 15px;
                    background: #f8fafc;
                }

                .empty-icon {
                    width: 65px;
                    height: 65px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                    border-radius: 18px;
                    background: #ffffff;
                    font-size: 28px;
                }

                .empty-state h3 {
                    margin:
                        0 0 7px;
                    font-size: 18px;
                    font-weight: 900;
                }

                .empty-state p {
                    margin:
                        0 0 17px;
                    color: #64748b;
                    font-size: 13px;
                }

                .empty-state button {
                    min-height: 40px;
                    padding:
                        0 15px;
                    border: none;
                    border-radius: 10px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                @media (
                    max-width: 1150px
                ) {
                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(0, 1fr)
                            );
                    }

                    .projects-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .filters {
                        grid-template-columns:
                            minmax(
                                200px,
                                1fr
                            )
                            1fr
                            1fr;
                    }

                    .clear-filter-button {
                        grid-column:
                            1 / -1;
                        width: fit-content;
                    }
                }

                @media (
                    max-width: 750px
                ) {
                    .dashboard-container {
                        width:
                            min(
                                calc(100% - 24px),
                                1400px
                            );
                        padding-top: 95px;
                    }

                    .dashboard-header {
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }

                    .stats-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .projects-grid {
                        grid-template-columns: 1fr;
                    }

                    .filters {
                        grid-template-columns: 1fr;
                    }

                    .clear-filter-button {
                        grid-column: auto;
                        width: 100%;
                    }

                    .projects-section {
                        padding: 17px;
                    }
                }

                @media (
                    max-width: 450px
                ) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .section-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .project-actions {
                        grid-template-columns: 1fr;
                    }

                    .error-banner {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }

            `}</style>

        </div>
    );
}