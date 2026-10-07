// frontend/src/pages/Designer/DesignerDashboard.jsx

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
    getDesignerDashboardData
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

function getTaskName(task) {
    return (
        task?.title ||
        task?.taskName ||
        task?.name ||
        'مهمة بدون اسم'
    );
}

function getStatusLabel(status) {
    switch (status) {
        case 'completed':
        case 'complete':
        case 'done':
            return 'مكتملة';

        case 'in-progress':
        case 'in_progress':
        case 'progress':
            return 'قيد التنفيذ';

        case 'pending':
            return 'معلقة';

        default:
            return status || 'غير محددة';
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
    const assignedDesignerId =
        project?.assignedDesignerId ||
        getId(project?.assignedDesigner);

    const assignedPresenterId =
        project?.assignedPresenterId ||
        getId(project?.assignedPresenter);

    /*
     * The backend returns only projects that
     * belong to the current Designer.
     *
     * We use the available assignment fields
     * only to display the assignment type.
     */

    if (
        assignedDesignerId &&
        assignedPresenterId &&
        assignedDesignerId ===
            assignedPresenterId
    ) {
        return 'main-and-presentation';
    }

    if (assignedDesignerId) {
        return 'main';
    }

    if (assignedPresenterId) {
        return 'presentation';
    }

    return 'assigned';
}

function getAssignmentLabel(project) {
    const type =
        getAssignmentType(project);

    switch (type) {
        case 'main':
            return 'مصمم المشروع';

        case 'presentation':
            return 'مصمم العرض';

        case 'main-and-presentation':
            return 'مصمم المشروع والعرض';

        default:
            return 'مشروع متعيّن';
    }
}

function formatDate(dateValue) {
    if (!dateValue) {
        return 'غير محدد';
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(dateValue);
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

function isCompletedStatus(status) {
    return [
        'completed',
        'complete',
        'done'
    ].includes(status);
}

function isInProgressStatus(status) {
    return [
        'in-progress',
        'in_progress',
        'progress'
    ].includes(status);
}


/* =========================================================
   Component
========================================================= */

export default function DesignerDashboard() {
    const navigate =
        useNavigate();

    const [user, setUser] =
        useState(null);

    const [projects, setProjects] =
        useState([]);

    const [tasks, setTasks] =
        useState([]);

    const [stats, setStats] =
        useState({
            totalProjects: 0,
            completedProjects: 0,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            pendingTasks: 0,
            assignedMainProjects: 0,
            assignedPresentationProjects: 0
        });

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [searchTerm, setSearchTerm] =
        useState('');

    const [projectFilter, setProjectFilter] =
        useState('all');

    const [taskFilter, setTaskFilter] =
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
       Load Dashboard
    ===================================================== */

    const loadDashboard =
        useCallback(async () => {
            try {
                setLoading(true);
                setError('');

                const currentUser =
                    verifyUser();

                if (!currentUser) {
                    return;
                }

                const dashboardData =
                    await getDesignerDashboardData();

                setProjects(
                    Array.isArray(
                        dashboardData?.projects
                    )
                        ? dashboardData.projects
                        : []
                );

                setTasks(
                    Array.isArray(
                        dashboardData?.tasks
                    )
                        ? dashboardData.tasks
                        : []
                );

                setStats({
                    totalProjects:
                        dashboardData?.stats
                            ?.totalProjects || 0,

                    completedProjects:
                        dashboardData?.stats
                            ?.completedProjects || 0,

                    totalTasks:
                        dashboardData?.stats
                            ?.totalTasks || 0,

                    completedTasks:
                        dashboardData?.stats
                            ?.completedTasks || 0,

                    inProgressTasks:
                        dashboardData?.stats
                            ?.inProgressTasks || 0,

                    pendingTasks:
                        dashboardData?.stats
                            ?.pendingTasks || 0,

                    assignedMainProjects:
                        dashboardData?.stats
                            ?.assignedMainProjects || 0,

                    assignedPresentationProjects:
                        dashboardData?.stats
                            ?.assignedPresentationProjects || 0
                });
            } catch (err) {
                console.error(
                    'Designer Dashboard Error:',
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
                    'حدث خطأ أثناء تحميل لوحة التحكم.'
                );
            } finally {
                setLoading(false);
            }
        }, [
            navigate,
            verifyUser
        ]);


    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);


    /* =====================================================
       Search / Filtering
    ===================================================== */

    const filteredProjects =
        useMemo(() => {
            const search =
                searchTerm
                    .trim()
                    .toLowerCase();

            return projects.filter(
                (project) => {
                    const projectName =
                        getProjectName(
                            project
                        ).toLowerCase();

                    const brief =
                        (
                            project?.brief ||
                            project?.description ||
                            ''
                        ).toLowerCase();

                    const matchesSearch =
                        !search ||
                        projectName.includes(
                            search
                        ) ||
                        brief.includes(
                            search
                        );

                    const assignmentType =
                        getAssignmentType(
                            project
                        );

                    const matchesFilter =
                        projectFilter ===
                            'all' ||
                        (
                            projectFilter ===
                                'main' &&
                            assignmentType ===
                                'main'
                        ) ||
                        (
                            projectFilter ===
                                'presentation' &&
                            assignmentType ===
                                'presentation'
                        ) ||
                        (
                            projectFilter ===
                                'both' &&
                            assignmentType ===
                                'main-and-presentation'
                        ) ||
                        (
                            projectFilter ===
                                'completed' &&
                            isCompletedStatus(
                                project?.status
                            )
                        ) ||
                        (
                            projectFilter ===
                                'active' &&
                            !isCompletedStatus(
                                project?.status
                            )
                        );

                    return (
                        matchesSearch &&
                        matchesFilter
                    );
                }
            );
        }, [
            projects,
            searchTerm,
            projectFilter
        ]);


    const filteredTasks =
        useMemo(() => {
            return tasks.filter(
                (task) => {
                    const status =
                        task?.status;

                    if (
                        taskFilter ===
                        'all'
                    ) {
                        return true;
                    }

                    if (
                        taskFilter ===
                        'completed'
                    ) {
                        return isCompletedStatus(
                            status
                        );
                    }

                    if (
                        taskFilter ===
                        'in-progress'
                    ) {
                        return isInProgressStatus(
                            status
                        );
                    }

                    if (
                        taskFilter ===
                        'pending'
                    ) {
                        return (
                            status ===
                            'pending'
                        );
                    }

                    return true;
                }
            );
        }, [
            tasks,
            taskFilter
        ]);


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


    const openTasks =
        () => {
            navigate(
                '/designer/tasks'
            );
        };


    const openTask =
        (taskId) => {
            if (!taskId) {
                return;
            }

            navigate(
                `/designer/tasks/${taskId}`
            );
        };


    const handleLogout =
        async () => {
            try {
                await logoutUser();
            } catch (err) {
                console.error(
                    'Logout Error:',
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
                message="جاري تحميل لوحة المصمم..."
            />
        );
    }


    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className="designer-dashboard">

            <Navbar
                user={user}
                onLogout={handleLogout}
                title="OSTUDIO"
            />


            <main className="dashboard-container">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="dashboard-header">

                    <div>
                        <div className="page-kicker">
                            DESIGNER WORKSPACE
                        </div>

                        <h1>
                            لوحة تحكم المصمم
                        </h1>

                        <p>
                            أهلاً بيك{' '}
                            <strong>
                                {user?.name ||
                                    user?.email ||
                                    'Designer'}
                            </strong>
                            ، من هنا تقدر تتابع المشاريع
                            والمهام المتعيّن عليك تنفيذها.
                        </p>
                    </div>


                    <div className="header-actions">

                        <button
                            type="button"
                            className="refresh-btn"
                            onClick={
                                loadDashboard
                            }
                        >
                            ↻ تحديث البيانات
                        </button>

                        <button
                            type="button"
                            className="tasks-btn"
                            onClick={
                                openTasks
                            }
                        >
                            المهام
                        </button>

                        <NotificationBell
                            user={user}
                        />

                    </div>

                </section>


                {/* =================================================
                    Error
                ================================================= */}

                {error && (
                    <div className="error-box">
                        <div>
                            <strong>
                                حدث خطأ
                            </strong>

                            <p>
                                {error}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                loadDashboard
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
                        <div className="stat-icon">
                            📁
                        </div>

                        <div>
                            <span>
                                المشاريع
                            </span>

                            <strong>
                                {
                                    stats.totalProjects
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
                                مشاريع التصميم
                            </span>

                            <strong>
                                {
                                    stats.assignedMainProjects
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
                                مشاريع العروض
                            </span>

                            <strong>
                                {
                                    stats.assignedPresentationProjects
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
                                    stats.completedProjects
                                }
                            </strong>
                        </div>
                    </div>


                    <div className="stat-card">
                        <div className="stat-icon">
                            📋
                        </div>

                        <div>
                            <span>
                                إجمالي المهام
                            </span>

                            <strong>
                                {
                                    stats.totalTasks
                                }
                            </strong>
                        </div>
                    </div>


                    <div className="stat-card">
                        <div className="stat-icon">
                            ⏳
                        </div>

                        <div>
                            <span>
                                قيد التنفيذ
                            </span>

                            <strong>
                                {
                                    stats.inProgressTasks
                                }
                            </strong>
                        </div>
                    </div>

                </section>


                {/* =================================================
                    Projects Section
                ================================================= */}

                <section className="content-section">

                    <div className="section-header">

                        <div>
                            <h2>
                                مشاريعي
                            </h2>

                            <p>
                                المشاريع التي تم تعيينك
                                عليها من الـ Coordinator.
                            </p>
                        </div>

                        <span className="section-count">
                            {
                                filteredProjects.length
                            }
                        </span>

                    </div>


                    <div className="toolbar">

                        <div className="search-box">
                            <span>
                                🔎
                            </span>

                            <input
                                type="text"
                                placeholder="ابحث عن مشروع..."
                                value={
                                    searchTerm
                                }
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target.value
                                    )
                                }
                            />
                        </div>


                        <select
                            value={
                                projectFilter
                            }
                            onChange={(event) =>
                                setProjectFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                كل المشاريع
                            </option>

                            <option value="main">
                                مشاريع التصميم
                            </option>

                            <option value="presentation">
                                مشاريع العروض
                            </option>

                            <option value="both">
                                تصميم + عرض
                            </option>

                            <option value="active">
                                المشاريع النشطة
                            </option>

                            <option value="completed">
                                المشاريع المكتملة
                            </option>
                        </select>

                    </div>


                    {filteredProjects.length === 0 ? (
                        <div className="empty-state">

                            <div className="empty-icon">
                                🎨
                            </div>

                            <h3>
                                لا توجد مشاريع متاحة
                            </h3>

                            <p>
                                لا يوجد حاليًا أي مشروع
                                متعيّن عليك.
                            </p>

                            <small>
                                عندما يقوم الـ Coordinator
                                بتعيينك على مشروع،
                                سيظهر هنا تلقائيًا.
                            </small>

                        </div>
                    ) : (
                        <div className="projects-grid">

                            {filteredProjects.map(
                                (project) => {
                                    const projectId =
                                        getId(
                                            project
                                        );

                                    return (
                                        <article
                                            className="project-card"
                                            key={
                                                projectId
                                            }
                                            onClick={() =>
                                                openProject(
                                                    projectId
                                                )
                                            }
                                        >

                                            <div className="project-card-top">

                                                <div className="project-folder">
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


                                            <h3>
                                                {getProjectName(
                                                    project
                                                )}
                                            </h3>


                                            <div className="assignment-badge">
                                                🎨{' '}
                                                {getAssignmentLabel(
                                                    project
                                                )}
                                            </div>


                                            <p className="project-brief">
                                                {project?.brief ||
                                                    project?.description ||
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
                                                        الموعد النهائي
                                                    </span>

                                                    <strong>
                                                        {formatDate(
                                                            project?.deadline
                                                        )}
                                                    </strong>
                                                </div>

                                            </div>


                                            <div className="project-card-footer">

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

                        </div>
                    )}

                </section>


                {/* =================================================
                    Tasks Section
                ================================================= */}

                <section className="content-section">

                    <div className="section-header">

                        <div>
                            <h2>
                                مهامي
                            </h2>

                            <p>
                                المهام التي تم تعيينها لك.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="view-all-btn"
                            onClick={
                                openTasks
                            }
                        >
                            عرض كل المهام
                        </button>

                    </div>


                    <div className="task-filters">

                        <button
                            type="button"
                            className={
                                taskFilter ===
                                'all'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setTaskFilter(
                                    'all'
                                )
                            }
                        >
                            الكل
                        </button>

                        <button
                            type="button"
                            className={
                                taskFilter ===
                                'pending'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setTaskFilter(
                                    'pending'
                                )
                            }
                        >
                            معلقة
                        </button>

                        <button
                            type="button"
                            className={
                                taskFilter ===
                                'in-progress'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setTaskFilter(
                                    'in-progress'
                                )
                            }
                        >
                            قيد التنفيذ
                        </button>

                        <button
                            type="button"
                            className={
                                taskFilter ===
                                'completed'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setTaskFilter(
                                    'completed'
                                )
                            }
                        >
                            مكتملة
                        </button>

                    </div>


                    {filteredTasks.length === 0 ? (
                        <div className="empty-state compact">

                            <div className="empty-icon">
                                📋
                            </div>

                            <h3>
                                لا توجد مهام
                            </h3>

                            <p>
                                لا توجد مهام متعيّنة
                                عليك حاليًا.
                            </p>

                        </div>
                    ) : (
                        <div className="tasks-list">

                            {filteredTasks
                                .slice(0, 8)
                                .map((task) => {

                                    const taskId =
                                        getId(
                                            task
                                        );

                                    return (
                                        <div
                                            className="task-row"
                                            key={
                                                taskId
                                            }
                                            onClick={() =>
                                                openTask(
                                                    taskId
                                                )
                                            }
                                        >

                                            <div className="task-main">

                                                <div className="task-icon">
                                                    {isCompletedStatus(
                                                        task?.status
                                                    )
                                                        ? '✓'
                                                        : '📋'}
                                                </div>

                                                <div>

                                                    <h3>
                                                        {getTaskName(
                                                            task
                                                        )}
                                                    </h3>

                                                    <p>
                                                        {task?.description ||
                                                            task?.notes ||
                                                            'لا يوجد وصف للمهمة.'}
                                                    </p>

                                                </div>

                                            </div>


                                            <div className="task-info">

                                                <span
                                                    className={`status-badge ${getStatusClass(
                                                        task?.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        task?.status
                                                    )}
                                                </span>

                                                {task?.deadline && (
                                                    <span className="task-deadline">
                                                        📅{' '}
                                                        {formatDate(
                                                            task.deadline
                                                        )}
                                                    </span>
                                                )}

                                                <span className="arrow">
                                                    ←
                                                </span>

                                            </div>

                                        </div>
                                    );
                                })}

                        </div>
                    )}

                </section>


                {/* =================================================
                    Information Notice
                ================================================= */}

                <section className="designer-notice">

                    <div className="notice-icon">
                        🔐
                    </div>

                    <div>
                        <h3>
                            نظام الصلاحيات
                        </h3>

                        <p>
                            أنت ترى فقط المشاريع والمهام
                            التي تم تعيينها لك. تعيين
                            المصممين وإدارة المشاريع تتم
                            من خلال الـ Coordinator والـ
                            Manager حسب الصلاحيات المحددة.
                        </p>
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

                .designer-dashboard {
                    min-height: 100vh;
                    background: #f5f7fb;
                    color: #172033;
                    direction: rtl;
                }

                .dashboard-container {
                    width: min(
                        1440px,
                        calc(100% - 48px)
                    );
                    margin: 0 auto;
                    padding: 110px 0 50px;
                }


                /* ================================
                   Header
                ================================= */

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 30px;
                    margin-bottom: 30px;
                }

                .page-kicker {
                    color: #64748b;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    margin-bottom: 8px;
                }

                .dashboard-header h1 {
                    margin: 0;
                    font-size: 34px;
                    font-weight: 900;
                    color: #111827;
                }

                .dashboard-header p {
                    margin: 10px 0 0;
                    color: #64748b;
                    font-size: 15px;
                    line-height: 1.8;
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    direction: ltr;
                }

                .refresh-btn,
                .tasks-btn,
                .view-all-btn {
                    border: 0;
                    cursor: pointer;
                    border-radius: 10px;
                    padding: 11px 16px;
                    font-size: 13px;
                    font-weight: 800;
                    transition: 0.2s;
                }

                .refresh-btn {
                    background: #ffffff;
                    color: #334155;
                    border: 1px solid #e2e8f0;
                }

                .refresh-btn:hover {
                    background: #f8fafc;
                }

                .tasks-btn {
                    background: #111827;
                    color: #ffffff;
                }

                .tasks-btn:hover {
                    transform: translateY(-1px);
                    background: #1f2937;
                }


                /* ================================
                   Error
                ================================= */

                .error-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    background: #fff1f2;
                    border: 1px solid #fecdd3;
                    border-radius: 14px;
                    padding: 16px 18px;
                    margin-bottom: 24px;
                    color: #9f1239;
                }

                .error-box strong {
                    font-size: 15px;
                }

                .error-box p {
                    margin: 5px 0 0;
                    font-size: 13px;
                }

                .error-box button {
                    border: 0;
                    background: #9f1239;
                    color: white;
                    border-radius: 8px;
                    padding: 9px 14px;
                    cursor: pointer;
                    font-weight: 700;
                }


                /* ================================
                   Statistics
                ================================= */

                .stats-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            6,
                            minmax(0, 1fr)
                        );
                    gap: 14px;
                    margin-bottom: 30px;
                }

                .stat-card {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 16px;
                    padding: 18px;
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    min-width: 0;
                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .stat-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .stat-card span {
                    display: block;
                    color: #64748b;
                    font-size: 11px;
                    margin-bottom: 5px;
                    white-space: nowrap;
                }

                .stat-card strong {
                    display: block;
                    color: #111827;
                    font-size: 24px;
                    font-weight: 900;
                }


                /* ================================
                   Content
                ================================= */

                .content-section {
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 24px;
                    box-shadow:
                        0 8px 28px
                        rgba(
                            15,
                            23,
                            42,
                            0.035
                        );
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .section-header h2 {
                    margin: 0;
                    font-size: 21px;
                    font-weight: 900;
                }

                .section-header p {
                    margin: 6px 0 0;
                    color: #64748b;
                    font-size: 13px;
                }

                .section-count {
                    min-width: 34px;
                    height: 34px;
                    padding: 0 10px;
                    border-radius: 10px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 900;
                }

                .view-all-btn {
                    background: #f1f5f9;
                    color: #334155;
                }

                .view-all-btn:hover {
                    background: #e2e8f0;
                }


                /* ================================
                   Toolbar
                ================================= */

                .toolbar {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .search-box {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    height: 44px;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 0 13px;
                    background: #ffffff;
                }

                .search-box span {
                    font-size: 15px;
                }

                .search-box input {
                    width: 100%;
                    border: 0;
                    outline: 0;
                    font-size: 13px;
                    background: transparent;
                    direction: rtl;
                }

                .toolbar select {
                    width: 190px;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: #ffffff;
                    padding: 0 12px;
                    font-size: 13px;
                    outline: 0;
                    color: #334155;
                }


                /* ================================
                   Projects
                ================================= */

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
                    border: 1px solid #e8edf4;
                    border-radius: 16px;
                    padding: 18px;
                    cursor: pointer;
                    transition:
                        transform 0.2s,
                        box-shadow 0.2s,
                        border-color 0.2s;
                    background: #ffffff;
                }

                .project-card:hover {
                    transform: translateY(-3px);
                    border-color: #cbd5e1;
                    box-shadow:
                        0 14px 30px
                        rgba(
                            15,
                            23,
                            42,
                            0.08
                        );
                }

                .project-card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .project-folder {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .project-card h3 {
                    margin: 0 0 10px;
                    font-size: 17px;
                    font-weight: 900;
                    color: #111827;
                }

                .assignment-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: #f1f5f9;
                    color: #475569;
                    border-radius: 8px;
                    padding: 5px 8px;
                    font-size: 11px;
                    font-weight: 800;
                    margin-bottom: 12px;
                }

                .project-brief {
                    color: #64748b;
                    font-size: 13px;
                    line-height: 1.8;
                    min-height: 46px;
                    margin: 0 0 15px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .project-meta {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );
                    gap: 10px;
                    border-top: 1px solid #eef2f7;
                    padding-top: 14px;
                }

                .project-meta span {
                    display: block;
                    font-size: 10px;
                    color: #94a3b8;
                    margin-bottom: 4px;
                }

                .project-meta strong {
                    display: block;
                    font-size: 11px;
                    color: #334155;
                }

                .project-card-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 15px;
                    padding-top: 13px;
                    border-top: 1px solid #eef2f7;
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 800;
                }

                .arrow {
                    font-size: 17px;
                    color: #475569;
                }


                /* ================================
                   Status
                ================================= */

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    padding: 5px 9px;
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


                /* ================================
                   Task Filters
                ================================= */

                .task-filters {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                }

                .task-filters button {
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    color: #64748b;
                    padding: 8px 13px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 800;
                }

                .task-filters button.active {
                    background: #111827;
                    border-color: #111827;
                    color: #ffffff;
                }


                /* ================================
                   Tasks
                ================================= */

                .tasks-list {
                    border: 1px solid #e8edf4;
                    border-radius: 14px;
                    overflow: hidden;
                }

                .task-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                    padding: 15px 16px;
                    border-bottom: 1px solid #eef2f7;
                    cursor: pointer;
                    transition: 0.2s;
                }

                .task-row:last-child {
                    border-bottom: 0;
                }

                .task-row:hover {
                    background: #f8fafc;
                }

                .task-main {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .task-icon {
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                    border-radius: 11px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .task-main h3 {
                    margin: 0 0 4px;
                    font-size: 14px;
                    font-weight: 900;
                    color: #1e293b;
                }

                .task-main p {
                    margin: 0;
                    color: #64748b;
                    font-size: 11px;
                    max-width: 650px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .task-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }

                .task-deadline {
                    color: #64748b;
                    font-size: 10px;
                    white-space: nowrap;
                }


                /* ================================
                   Empty
                ================================= */

                .empty-state {
                    text-align: center;
                    padding: 55px 20px;
                    border: 1px dashed #dbe3ed;
                    border-radius: 14px;
                    background: #fafbfd;
                }

                .empty-state.compact {
                    padding: 40px 20px;
                }

                .empty-icon {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 14px;
                    border-radius: 18px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 27px;
                }

                .empty-state h3 {
                    margin: 0;
                    font-size: 17px;
                    font-weight: 900;
                }

                .empty-state p {
                    margin: 8px 0;
                    color: #64748b;
                    font-size: 13px;
                }

                .empty-state small {
                    color: #94a3b8;
                    font-size: 11px;
                }


                /* ================================
                   Notice
                ================================= */

                .designer-notice {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    background: #ffffff;
                    border: 1px solid #e8edf4;
                    border-radius: 16px;
                    padding: 18px;
                }

                .notice-icon {
                    width: 42px;
                    height: 42px;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .designer-notice h3 {
                    margin: 0 0 5px;
                    font-size: 14px;
                    font-weight: 900;
                }

                .designer-notice p {
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.8;
                }


                /* ================================
                   Responsive
                ================================= */

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
                    .dashboard-container {
                        width:
                            calc(
                                100% - 24px
                            );

                        padding-top: 95px;
                    }

                    .dashboard-header {
                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;
                        justify-content: flex-start;
                        flex-wrap: wrap;
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

                    .toolbar {
                        flex-direction: column;
                    }

                    .toolbar select {
                        width: 100%;
                        height: 44px;
                    }
                }


                @media (
                    max-width: 520px
                ) {
                    .dashboard-header h1 {
                        font-size: 27px;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .content-section {
                        padding: 16px;
                    }

                    .section-header {
                        align-items: flex-start;
                    }

                    .task-row {
                        align-items: flex-start;
                    }

                    .task-info {
                        flex-direction: column;
                        align-items: flex-end;
                    }

                    .task-deadline {
                        display: none;
                    }

                    .project-meta {
                        grid-template-columns: 1fr;
                    }

                    .designer-notice {
                        padding: 15px;
                    }
                }

            `}</style>

        </div>
    );
}