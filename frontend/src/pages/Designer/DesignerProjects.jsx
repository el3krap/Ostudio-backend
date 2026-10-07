// frontend/src/pages/Designer/DesignerProjects.jsx

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
    getMyProjects
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

function getProjectDescription(project) {
    return (
        project?.brief ||
        project?.description ||
        project?.briefName ||
        'لا يوجد وصف للمشروع.'
    );
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

function getAssignmentType(project) {
    const designerId =
        project?.assignedDesignerId ||
        getId(
            project?.assignedDesigner
        );

    const presenterId =
        project?.assignedPresenterId ||
        getId(
            project?.assignedPresenter
        );

    if (
        designerId &&
        presenterId &&
        String(designerId) ===
            String(presenterId)
    ) {
        return 'both';
    }

    if (designerId) {
        return 'main';
    }

    if (presenterId) {
        return 'presentation';
    }

    return 'assigned';
}

function getAssignmentLabel(project) {
    switch (
        getAssignmentType(project)
    ) {
        case 'main':
            return 'مصمم المشروع';

        case 'presentation':
            return 'مصمم العرض';

        case 'both':
            return 'مصمم المشروع والعرض';

        default:
            return 'مشروع متعيّن';
    }
}

function isCompleted(status) {
    return [
        'completed',
        'complete',
        'done'
    ].includes(status);
}


/* =========================================================
   Component
========================================================= */

export default function DesignerProjects() {
    const navigate =
        useNavigate();

    const [user, setUser] =
        useState(null);

    const [projects, setProjects] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [search, setSearch] =
        useState('');

    const [statusFilter, setStatusFilter] =
        useState('all');

    const [assignmentFilter, setAssignmentFilter] =
        useState('all');


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
       Load Projects
    ===================================================== */

    const loadProjects =
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
                    await getMyProjects();

                setProjects(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (err) {
                console.error(
                    'Designer Projects Error:',
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
                    'حدث خطأ أثناء تحميل المشاريع.'
                );
            } finally {
                setLoading(false);
            }
        }, [
            navigate,
            verifyUser
        ]);


    useEffect(() => {
        loadProjects();
    }, [loadProjects]);


    /* =====================================================
       Filter Projects
    ===================================================== */

    const filteredProjects =
        useMemo(() => {
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

                    const matchesSearch =
                        !normalizedSearch ||
                        name.includes(
                            normalizedSearch
                        ) ||
                        description.includes(
                            normalizedSearch
                        );

                    const status =
                        project?.status;

                    const matchesStatus =
                        statusFilter ===
                            'all' ||
                        (
                            statusFilter ===
                                'active' &&
                            !isCompleted(
                                status
                            )
                        ) ||
                        (
                            statusFilter ===
                                'completed' &&
                            isCompleted(
                                status
                            )
                        ) ||
                        (
                            statusFilter ===
                                'in-progress' &&
                            [
                                'in-progress',
                                'in_progress',
                                'progress'
                            ].includes(
                                status
                            )
                        ) ||
                        (
                            statusFilter ===
                                'pending' &&
                            status ===
                                'pending'
                        );

                    const assignment =
                        getAssignmentType(
                            project
                        );

                    const matchesAssignment =
                        assignmentFilter ===
                            'all' ||
                        (
                            assignmentFilter ===
                                'main' &&
                            assignment ===
                                'main'
                        ) ||
                        (
                            assignmentFilter ===
                                'presentation' &&
                            assignment ===
                                'presentation'
                        ) ||
                        (
                            assignmentFilter ===
                                'both' &&
                            assignment ===
                                'both'
                        );

                    return (
                        matchesSearch &&
                        matchesStatus &&
                        matchesAssignment
                    );
                }
            );
        }, [
            projects,
            search,
            statusFilter,
            assignmentFilter
        ]);


    /* =====================================================
       Statistics
    ===================================================== */

    const statistics =
        useMemo(() => {
            const total =
                projects.length;

            const completed =
                projects.filter(
                    (project) =>
                        isCompleted(
                            project?.status
                        )
                ).length;

            const active =
                total -
                completed;

            const main =
                projects.filter(
                    (project) =>
                        getAssignmentType(
                            project
                        ) === 'main'
                ).length;

            const presentation =
                projects.filter(
                    (project) =>
                        getAssignmentType(
                            project
                        ) === 'presentation'
                ).length;

            const both =
                projects.filter(
                    (project) =>
                        getAssignmentType(
                            project
                        ) === 'both'
                ).length;

            return {
                total,
                completed,
                active,
                main,
                presentation,
                both
            };
        }, [projects]);


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
                message="جاري تحميل المشاريع..."
            />
        );
    }


    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="designer-projects-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="projects-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <div className="page-kicker">
                            DESIGNER WORKSPACE
                        </div>

                        <h1>
                            مشاريعي
                        </h1>

                        <p>
                            جميع المشاريع التي تم تعيينك
                            عليها من خلال نظام OSTUDIO.
                        </p>

                    </div>


                    <div className="header-actions">

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={
                                loadProjects
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
                    Statistics
                ================================================= */}

                <section className="stats-grid">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📁
                        </div>

                        <div>
                            <span>
                                إجمالي المشاريع
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
                            ⚡
                        </div>

                        <div>
                            <span>
                                المشاريع النشطة
                            </span>

                            <strong>
                                {
                                    statistics.active
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
                                المشاريع المكتملة
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
                            🎨
                        </div>

                        <div>
                            <span>
                                تصميم
                            </span>

                            <strong>
                                {
                                    statistics.main
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            🖥️
                        </div>

                        <div>
                            <span>
                                عروض
                            </span>

                            <strong>
                                {
                                    statistics.presentation
                                }
                            </strong>
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            🔥
                        </div>

                        <div>
                            <span>
                                تصميم + عرض
                            </span>

                            <strong>
                                {
                                    statistics.both
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
                            placeholder="ابحث باسم المشروع أو الوصف..."
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

                            <option value="active">
                                النشطة
                            </option>

                            <option value="in-progress">
                                قيد التنفيذ
                            </option>

                            <option value="pending">
                                معلقة
                            </option>

                            <option value="completed">
                                مكتملة
                            </option>
                        </select>

                    </div>


                    <div className="filter-group">

                        <label>
                            نوع التعيين
                        </label>

                        <select
                            value={
                                assignmentFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setAssignmentFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="all">
                                كل المشاريع
                            </option>

                            <option value="main">
                                مصمم المشروع
                            </option>

                            <option value="presentation">
                                مصمم العرض
                            </option>

                            <option value="both">
                                المشروع والعرض
                            </option>
                        </select>

                    </div>

                </section>


                {/* =================================================
                    Result Header
                ================================================= */}

                <div className="results-header">

                    <div>
                        <strong>
                            {filteredProjects.length}
                        </strong>

                        <span>
                            مشروع
                            {filteredProjects.length !== 1
                                ? 'ات'
                                : ''}
                        </span>
                    </div>

                    {(search ||
                        statusFilter !== 'all' ||
                        assignmentFilter !== 'all') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter(
                                    'all'
                                );
                                setAssignmentFilter(
                                    'all'
                                );
                            }}
                        >
                            مسح الفلاتر
                        </button>
                    )}

                </div>


                {/* =================================================
                    Projects
                ================================================= */}

                {filteredProjects.length === 0 ? (
                    <section className="empty-state">

                        <div className="empty-icon">
                            🎨
                        </div>

                        {projects.length === 0 ? (
                            <>
                                <h2>
                                    لا توجد مشاريع متعيّنة
                                </h2>

                                <p>
                                    لا يوجد حاليًا أي مشروع
                                    تم تعيينك عليه.
                                </p>

                                <small>
                                    عند قيام الـ Coordinator
                                    بتعيينك على مشروع،
                                    سيظهر المشروع هنا تلقائيًا.
                                </small>
                            </>
                        ) : (
                            <>
                                <h2>
                                    لا توجد نتائج
                                </h2>

                                <p>
                                    لم نجد مشاريع تطابق
                                    معايير البحث الحالية.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setStatusFilter(
                                            'all'
                                        );
                                        setAssignmentFilter(
                                            'all'
                                        );
                                    }}
                                >
                                    عرض كل المشاريع
                                </button>
                            </>
                        )}

                    </section>
                ) : (
                    <section className="projects-grid">

                        {filteredProjects.map(
                            (project) => {

                                const projectId =
                                    getId(
                                        project
                                    );

                                return (
                                    <article
                                        key={
                                            projectId
                                        }
                                        className="project-card"
                                        onClick={() =>
                                            openProject(
                                                projectId
                                            )
                                        }
                                    >

                                        {/* Card Header */}
                                        <div className="card-header">

                                            <div className="folder-icon">
                                                📁
                                            </div>

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


                                        {/* Title */}
                                        <h2>
                                            {getProjectName(
                                                project
                                            )}
                                        </h2>


                                        {/* Assignment */}
                                        <div className="assignment-badge">
                                            {getAssignmentType(
                                                project
                                            ) === 'presentation'
                                                ? '🖥️'
                                                : '🎨'}

                                            <span>
                                                {getAssignmentLabel(
                                                    project
                                                )}
                                            </span>
                                        </div>


                                        {/* Description */}
                                        <p className="project-description">
                                            {getProjectDescription(
                                                project
                                            )}
                                        </p>


                                        {/* Dates */}
                                        <div className="project-dates">

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
                                                    Deadline
                                                </span>

                                                <strong>
                                                    {formatDate(
                                                        project?.deadline
                                                    )}
                                                </strong>

                                            </div>

                                        </div>


                                        {/* Checkpoints */}
                                        {Array.isArray(
                                            project?.checkpoints
                                        ) && (
                                            <div className="checkpoint-summary">

                                                <div className="checkpoint-label">
                                                    <span>
                                                        Checkpoints
                                                    </span>

                                                    <strong>
                                                        {
                                                            project.checkpoints
                                                                .filter(
                                                                    (
                                                                        checkpoint
                                                                    ) =>
                                                                        Boolean(
                                                                            checkpoint?.isCompleted
                                                                        )
                                                                )
                                                                .length
                                                        }
                                                        /
                                                        {
                                                            project.checkpoints
                                                                .length
                                                        }
                                                    </strong>
                                                </div>


                                                <div className="progress-track">

                                                    <div
                                                        className="progress-fill"
                                                        style={{
                                                            width:
                                                                project
                                                                    .checkpoints
                                                                    .length >
                                                                0
                                                                    ? `${
                                                                        (
                                                                            project.checkpoints.filter(
                                                                                (
                                                                                    checkpoint
                                                                                ) =>
                                                                                    Boolean(
                                                                                        checkpoint?.isCompleted
                                                                                    )
                                                                            ).length /
                                                                            project.checkpoints.length
                                                                        ) *
                                                                        100
                                                                    }%`
                                                                    : '0%'
                                                        }}
                                                    />

                                                </div>

                                            </div>
                                        )}


                                        {/* Footer */}
                                        <div className="card-footer">

                                            <span>
                                                فتح تفاصيل المشروع
                                            </span>

                                            <span className="arrow">
                                                ←
                                            </span>

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
                            المشاريع الخاصة بك فقط
                        </h3>

                        <p>
                            هذه القائمة تعتمد على المشاريع
                            التي تم تعيينك عليها. لا يمكنك
                            الوصول إلى مشاريع المصممين
                            الآخرين من خلال هذه الصفحة.
                        </p>

                    </div>

                </section>

            </main>


            <style>{`

                * {
                    box-sizing: border-box;
                }

                .designer-projects-page {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .projects-container {
                    width: min(
                        1440px,
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
                    margin-bottom: 28px;
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
                    margin: 9px 0 0;
                    color: #64748b;
                    font-size: 14px;
                    line-height: 1.8;
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
                   Statistics
                ========================================= */

                .stats-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            6,
                            minmax(0, 1fr)
                        );
                    gap: 13px;
                    margin-bottom: 22px;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                    padding: 17px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 15px;
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
                    white-space: nowrap;
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
                    height: 43px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 9px;
                    padding: 0 12px;
                    min-width: 200px;
                }

                .search-box span {
                    font-size: 14px;
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
                    line-height: 1;
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
                    height: 43px;
                    width: 100%;
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

                .results-header button:hover {
                    color: #111827;
                }


                /* =========================================
                   Projects Grid
                ========================================= */

                .projects-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            3,
                            minmax(0, 1fr)
                        );
                    gap: 16px;
                }

                .project-card {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 17px;
                    padding: 18px;
                    cursor: pointer;
                    transition:
                        transform 0.2s ease,
                        box-shadow 0.2s ease,
                        border-color 0.2s ease;
                    box-shadow:
                        0 6px 22px
                        rgba(
                            15,
                            23,
                            42,
                            0.035
                        );
                }

                .project-card:hover {
                    transform: translateY(-3px);
                    border-color: #cbd5e1;
                    box-shadow:
                        0 16px 35px
                        rgba(
                            15,
                            23,
                            42,
                            0.08
                        );
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                }

                .folder-icon {
                    width: 43px;
                    height: 43px;
                    border-radius: 12px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
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

                .project-card h2 {
                    margin: 0 0 9px;
                    color: #111827;
                    font-size: 17px;
                    font-weight: 900;
                }

                .assignment-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 5px 8px;
                    border-radius: 8px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 9px;
                    font-weight: 900;
                    margin-bottom: 11px;
                }

                .project-description {
                    min-height: 43px;
                    margin: 0 0 15px;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.8;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 2;
                    overflow: hidden;
                }

                .project-dates {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 9px;
                    border-top: 1px solid #eef2f7;
                    padding-top: 13px;
                }

                .project-dates div {
                    min-width: 0;
                }

                .project-dates span {
                    display: block;
                    color: #94a3b8;
                    font-size: 9px;
                    margin-bottom: 4px;
                }

                .project-dates strong {
                    display: block;
                    color: #475569;
                    font-size: 10px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }


                /* =========================================
                   Checkpoints
                ========================================= */

                .checkpoint-summary {
                    margin-top: 14px;
                }

                .checkpoint-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                }

                .checkpoint-label span {
                    color: #94a3b8;
                    font-size: 9px;
                }

                .checkpoint-label strong {
                    color: #475569;
                    font-size: 9px;
                }

                .progress-track {
                    height: 5px;
                    border-radius: 999px;
                    background: #e2e8f0;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: inherit;
                    background: #334155;
                    transition: width 0.25s ease;
                }


                /* =========================================
                   Footer
                ========================================= */

                .card-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 16px;
                    padding-top: 13px;
                    border-top: 1px solid #eef2f7;
                    color: #64748b;
                    font-size: 10px;
                    font-weight: 800;
                }

                .arrow {
                    color: #475569;
                    font-size: 17px;
                }


                /* =========================================
                   Empty
                ========================================= */

                .empty-state {
                    text-align: center;
                    background: #ffffff;
                    border: 1px dashed #dbe3ed;
                    border-radius: 18px;
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
                    font-size: 11px;
                    font-weight: 800;
                }


                /* =========================================
                   Permission Notice
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
                   Responsive
                ========================================= */

                @media (
                    max-width: 1200px
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
                }


                @media (
                    max-width: 800px
                ) {
                    .projects-container {
                        width:
                            calc(
                                100% - 24px
                            );

                        padding-top: 95px;
                    }

                    .page-header {
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                        justify-content: flex-start;
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

                    .projects-grid {
                        grid-template-columns: 1fr;
                    }

                    .project-dates {
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