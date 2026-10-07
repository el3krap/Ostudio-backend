import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getProjects,
    updateProject,
    deleteProject
} from '../../services/adminService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AdminProjects = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [projects, setProjects] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedProject, setSelectedProject] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editForm, setEditForm] = useState({
        projectName: '',
        brief: '',
        description: '',
        startDate: '',
        deadline: '',
        managerNotes: '',
        coordinatorNotes: '',
        status: 'in-progress',
        renderFileLink: '',
        renderFileName: '',
        renderStatus: '',
        presentationFileLink: '',
        presentationFileName: '',
        presenterNote: ''
    });

    /* =========================================================
       Current User
    ========================================================= */

    useEffect(() => {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            navigate('/login', {
                replace: true
            });

            return;
        }

        if (currentUser.role !== 'admin') {
            navigate('/login', {
                replace: true
            });

            return;
        }

        setUser(currentUser);
    }, [navigate]);

    /* =========================================================
       Helpers
    ========================================================= */

    const getArray = (response) => {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response?.projects)) {
            return response.projects;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        return [];
    };

    const normalizeDateForInput = (value) => {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toISOString().slice(0, 10);
    };

    const formatDate = (value) => {
        if (!value) {
            return 'غير محدد';
        }

        const date = new Date(value);

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
        switch (status) {
            case 'completed':
                return 'مكتمل';

            case 'in-progress':
                return 'قيد التنفيذ';

            default:
                return status || 'غير محدد';
        }
    };

    const getStatusClass = (status) => {
        if (status === 'completed') {
            return 'completed';
        }

        if (status === 'in-progress') {
            return 'in-progress';
        }

        return 'neutral';
    };

    const getUserName = (userData) => {
        if (!userData) {
            return 'غير معين';
        }

        if (typeof userData === 'string') {
            return userData;
        }

        return (
            userData.name ||
            userData.displayName ||
            userData.email ||
            'غير معين'
        );
    };

    const getCreatorName = (project) => {
        return (
            project?.createdBy?.name ||
            project?.createdBy?.displayName ||
            project?.createdBy?.email ||
            project?.createdByName ||
            'غير محدد'
        );
    };

    /* =========================================================
       Load Projects
    ========================================================= */

    const loadProjects = useCallback(
        async (showLoader = true) => {
            try {
                if (showLoader) {
                    setLoading(true);
                } else {
                    setRefreshing(true);
                }

                setError('');

                const response = await getProjects();

                setProjects(getArray(response));
            } catch (err) {
                console.error(
                    '❌ Admin Projects Error:',
                    err
                );

                setError(
                    err?.message ||
                    'حدث خطأ أثناء تحميل المشاريع.'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!user) {
            return;
        }

        loadProjects(true);
    }, [user, loadProjects]);

    /* =========================================================
       Filtered Projects
    ========================================================= */

    const filteredProjects = useMemo(() => {
        const normalizedSearch = searchTerm
            .trim()
            .toLowerCase();

        return projects.filter((project) => {
            const projectName =
                project?.projectName || '';

            const description =
                project?.description || '';

            const brief =
                project?.brief ||
                project?.briefName ||
                '';

            const creator =
                getCreatorName(project);

            const searchableText =
                `${projectName} ${description} ${brief} ${creator}`
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
        });
    }, [
        projects,
        searchTerm,
        statusFilter
    ]);

    /* =========================================================
       Statistics
    ========================================================= */

    const totalProjects = projects.length;

    const completedProjects = projects.filter(
        (project) =>
            project?.status === 'completed'
    ).length;

    const activeProjects =
        totalProjects - completedProjects;

    /* =========================================================
       Open Project
    ========================================================= */

    const openProject = (project) => {
        const projectId =
            project?._id ||
            project?.id;

        if (!projectId) {
            return;
        }

        navigate(
            `/admin/projects/${projectId}`
        );
    };

    /* =========================================================
       Edit Project
    ========================================================= */

    const openEditModal = (project) => {
        setSelectedProject(project);

        setEditForm({
            projectName:
                project?.projectName || '',

            brief:
                project?.brief ||
                project?.briefName ||
                '',

            description:
                project?.description || '',

            startDate:
                normalizeDateForInput(
                    project?.startDate
                ),

            deadline:
                normalizeDateForInput(
                    project?.deadline
                ),

            managerNotes:
                project?.managerNotes || '',

            coordinatorNotes:
                project?.coordinatorNotes || '',

            status:
                project?.status ||
                'in-progress',

            renderFileLink:
                project?.renderFileLink || '',

            renderFileName:
                project?.renderFileName || '',

            renderStatus:
                project?.renderStatus || '',

            presentationFileLink:
                project?.presentationFileLink || '',

            presentationFileName:
                project?.presentationFileName || '',

            presenterNote:
                project?.presenterNote || ''
        });

        setShowEditModal(true);
    };

    const closeEditModal = () => {
        if (saving) {
            return;
        }

        setShowEditModal(false);
        setSelectedProject(null);
    };

    const handleEditChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setEditForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const saveProject = async (event) => {
        event.preventDefault();

        if (!selectedProject) {
            return;
        }

        const projectId =
            selectedProject?._id ||
            selectedProject?.id;

        if (!projectId) {
            setError(
                'تعذر تحديد المشروع.'
            );

            return;
        }

        try {
            setSaving(true);
            setError('');

            /*
             * Preserve the existing project fields.
             * Only fields explicitly edited by the admin
             * are sent here.
             */

            const response =
                await updateProject(
                    projectId,
                    {
                        projectName:
                            editForm.projectName,

                        brief:
                            editForm.brief,

                        briefName:
                            editForm.brief,

                        description:
                            editForm.description,

                        startDate:
                            editForm.startDate || null,

                        deadline:
                            editForm.deadline || null,

                        managerNotes:
                            editForm.managerNotes,

                        coordinatorNotes:
                            editForm.coordinatorNotes,

                        status:
                            editForm.status,

                        renderFileLink:
                            editForm.renderFileLink,

                        renderFileName:
                            editForm.renderFileName,

                        renderStatus:
                            editForm.renderStatus,

                        presentationFileLink:
                            editForm.presentationFileLink,

                        presentationFileName:
                            editForm.presentationFileName,

                        presenterNote:
                            editForm.presenterNote
                    }
                );

            const updatedProject =
                response?.project ||
                response?.data ||
                response;

            setProjects((previous) =>
                previous.map((project) =>
                    (
                        project?._id === projectId ||
                        project?.id === projectId
                    )
                        ? {
                            ...project,
                            ...(updatedProject || editForm)
                        }
                        : project
                )
            );

            setShowEditModal(false);
            setSelectedProject(null);

        } catch (err) {
            console.error(
                '❌ Update Project Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تحديث المشروع.'
            );
        } finally {
            setSaving(false);
        }
    };

    /* =========================================================
       Delete Project
    ========================================================= */

    const openDeleteModal = (project) => {
        setSelectedProject(project);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        if (deleting) {
            return;
        }

        setShowDeleteModal(false);
        setSelectedProject(null);
    };

    const confirmDelete = async () => {
        if (!selectedProject) {
            return;
        }

        const projectId =
            selectedProject?._id ||
            selectedProject?.id;

        if (!projectId) {
            return;
        }

        try {
            setDeleting(true);
            setError('');

            await deleteProject(projectId);

            setProjects((previous) =>
                previous.filter(
                    (project) =>
                        project?._id !== projectId &&
                        project?.id !== projectId
                )
            );

            setShowDeleteModal(false);
            setSelectedProject(null);
        } catch (err) {
            console.error(
                '❌ Delete Project Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء حذف المشروع.'
            );
        } finally {
            setDeleting(false);
        }
    };

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
        <div className="admin-projects-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="admin-projects-content">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <span className="eyebrow">
                            ADMIN / PROJECTS
                        </span>

                        <h1>
                            إدارة المشاريع
                        </h1>

                        <p>
                            عرض وإدارة جميع مشاريع النظام.
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
                                    '/admin/dashboard'
                                )
                            }
                        >
                            لوحة التحكم
                        </button>

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={() =>
                                loadProjects(false)
                            }
                            disabled={refreshing}
                        >
                            {refreshing
                                ? 'جاري التحديث...'
                                : '↻ تحديث'}
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Error
                ================================================= */}

                {error && (
                    <div className="error-box">

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

                <section className="stats">

                    <div className="stat-card">

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

                    <div className="stat-card">

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

                    <div className="stat-card">

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

                <section className="filters">

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
                            placeholder="ابحث باسم المشروع أو الوصف أو المنشئ..."
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

                    <div className="filter-buttons">

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

                </section>

                {/* =================================================
                    Results
                ================================================= */}

                <section className="projects-section">

                    <div className="results-header">

                        <div>
                            <strong>
                                المشاريع
                            </strong>

                            <span>
                                {filteredProjects.length}
                                {' '}
                                نتيجة
                            </span>
                        </div>

                    </div>

                    {filteredProjects.length === 0 ? (

                        <div className="empty-state">

                            <div className="empty-icon">
                                📁
                            </div>

                            <h2>
                                لا توجد مشاريع
                            </h2>

                            <p>
                                لا توجد مشاريع مطابقة
                                للبحث أو الفلتر الحالي.
                            </p>

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

                                            <button
                                                type="button"
                                                className="project-title"
                                                onClick={() =>
                                                    openProject(
                                                        project
                                                    )
                                                }
                                            >
                                                {project?.projectName ||
                                                    'مشروع بدون اسم'}
                                            </button>

                                            <p className="description">

                                                {project?.description ||
                                                    project?.brief ||
                                                    'لا يوجد وصف للمشروع.'}

                                            </p>

                                            <div className="project-meta">

                                                <div>
                                                    <span>
                                                        المنشئ
                                                    </span>

                                                    <strong>
                                                        {getCreatorName(
                                                            project
                                                        )}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        تاريخ الإنشاء
                                                    </span>

                                                    <strong>
                                                        {formatDate(
                                                            project?.createdAt
                                                        )}
                                                    </strong>
                                                </div>

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

                                            <div className="assignments">

                                                <div>
                                                    <span>
                                                        Designer
                                                    </span>

                                                    <strong>
                                                        {getUserName(
                                                            project?.assignedDesigner
                                                        ) !== 'غير معين'
                                                            ? getUserName(
                                                                project?.assignedDesigner
                                                            )
                                                            : project?.assignedDesignerName ||
                                                              'غير معين'}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Presentation
                                                    </span>

                                                    <strong>
                                                        {getUserName(
                                                            project?.assignedPresenter
                                                        ) !== 'غير معين'
                                                            ? getUserName(
                                                                project?.assignedPresenter
                                                            )
                                                            : project?.assignedPresenterName ||
                                                              'غير معين'}
                                                    </strong>
                                                </div>

                                            </div>

                                            <div className="card-actions">

                                                <button
                                                    type="button"
                                                    className="details-button"
                                                    onClick={() =>
                                                        openProject(
                                                            project
                                                        )
                                                    }
                                                >
                                                    التفاصيل
                                                </button>

                                                <button
                                                    type="button"
                                                    className="edit-button"
                                                    onClick={() =>
                                                        openEditModal(
                                                            project
                                                        )
                                                    }
                                                >
                                                    تعديل
                                                </button>

                                                <button
                                                    type="button"
                                                    className="delete-button"
                                                    onClick={() =>
                                                        openDeleteModal(
                                                            project
                                                        )
                                                    }
                                                >
                                                    حذف
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
                Edit Modal
            ===================================================== */}

            {showEditModal && selectedProject && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEditModal();
                        }
                    }}
                >

                    <div className="modal">

                        <div className="modal-header">

                            <div>
                                <span className="eyebrow">
                                    EDIT PROJECT
                                </span>

                                <h2>
                                    تعديل المشروع
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                            >
                                ×
                            </button>

                        </div>

                        <form onSubmit={saveProject}>

                            <div className="form-grid">

                                <label>
                                    <span>
                                        اسم المشروع
                                    </span>

                                    <input
                                        name="projectName"
                                        value={
                                            editForm.projectName
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    <span>
                                        الحالة
                                    </span>

                                    <select
                                        name="status"
                                        value={
                                            editForm.status
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    >
                                        <option value="in-progress">
                                            قيد التنفيذ
                                        </option>

                                        <option value="completed">
                                            مكتمل
                                        </option>
                                    </select>
                                </label>

                                <label>
                                    <span>
                                        Brief
                                    </span>

                                    <input
                                        name="brief"
                                        value={
                                            editForm.brief
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        تاريخ البداية
                                    </span>

                                    <input
                                        type="date"
                                        name="startDate"
                                        value={
                                            editForm.startDate
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        الموعد النهائي
                                    </span>

                                    <input
                                        type="date"
                                        name="deadline"
                                        value={
                                            editForm.deadline
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                            </div>

                            <label className="full-field">
                                <span>
                                    الوصف
                                </span>

                                <textarea
                                    name="description"
                                    value={
                                        editForm.description
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    rows={4}
                                />
                            </label>

                            <label className="full-field">
                                <span>
                                    Manager Notes
                                </span>

                                <textarea
                                    name="managerNotes"
                                    value={
                                        editForm.managerNotes
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    rows={3}
                                />
                            </label>

                            <label className="full-field">
                                <span>
                                    Coordinator Notes
                                </span>

                                <textarea
                                    name="coordinatorNotes"
                                    value={
                                        editForm.coordinatorNotes
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    rows={3}
                                />
                            </label>

                            <div className="form-section-title">
                                Render
                            </div>

                            <div className="form-grid">

                                <label>
                                    <span>
                                        Render File Link
                                    </span>

                                    <input
                                        name="renderFileLink"
                                        value={
                                            editForm.renderFileLink
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Render File Name
                                    </span>

                                    <input
                                        name="renderFileName"
                                        value={
                                            editForm.renderFileName
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Render Status
                                    </span>

                                    <input
                                        name="renderStatus"
                                        value={
                                            editForm.renderStatus
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                            </div>

                            <div className="form-section-title">
                                Presentation
                            </div>

                            <div className="form-grid">

                                <label>
                                    <span>
                                        Presentation File Link
                                    </span>

                                    <input
                                        name="presentationFileLink"
                                        value={
                                            editForm.presentationFileLink
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Presentation File Name
                                    </span>

                                    <input
                                        name="presentationFileName"
                                        value={
                                            editForm.presentationFileName
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    />
                                </label>

                            </div>

                            <label className="full-field">
                                <span>
                                    Presenter Note
                                </span>

                                <textarea
                                    name="presenterNote"
                                    value={
                                        editForm.presenterNote
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                    rows={3}
                                />
                            </label>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={closeEditModal}
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={saving}
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
                Delete Modal
            ===================================================== */}

            {showDeleteModal && selectedProject && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDeleteModal();
                        }
                    }}
                >

                    <div className="delete-modal">

                        <div className="delete-icon">
                            ⚠️
                        </div>

                        <h2>
                            حذف المشروع؟
                        </h2>

                        <p>
                            أنت على وشك حذف المشروع:
                        </p>

                        <strong>
                            {selectedProject?.projectName ||
                                'مشروع بدون اسم'}
                        </strong>

                        <p className="delete-warning">
                            هذا الإجراء لا يمكن التراجع عنه.
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="danger-confirm"
                                onClick={confirmDelete}
                                disabled={deleting}
                            >
                                {deleting
                                    ? 'جاري الحذف...'
                                    : 'حذف المشروع'}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .admin-projects-page {
                    min-height: 100vh;

                    background: #f7f7f8;

                    color: #111827;

                    direction: rtl;
                }

                .admin-projects-content {
                    width: min(
                        1450px,
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

                .eyebrow {
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

                    gap: 8px;
                }

                .dashboard-button,
                .refresh-button {
                    min-height: 41px;

                    padding: 0 14px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #111827;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .dashboard-button:hover,
                .refresh-button:hover {
                    background: #f9fafb;
                }

                .refresh-button:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                .error-box {
                    margin-bottom: 20px;

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

                .error-box button {
                    margin-right: auto;

                    border: none;
                    background: transparent;

                    color: #991b1b;

                    font-size: 20px;

                    cursor: pointer;
                }

                .stats {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 14px;

                    margin-bottom: 20px;
                }

                .stat-card {
                    min-height: 95px;

                    padding: 17px;

                    display: flex;
                    align-items: center;

                    gap: 13px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;
                }

                .stat-icon {
                    width: 42px;
                    height: 42px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    font-size: 18px;
                }

                .stat-card span {
                    display: block;

                    margin-bottom: 5px;

                    color: #6b7280;

                    font-size: 10px;
                }

                .stat-card strong {
                    display: block;

                    font-size: 25px;

                    line-height: 1;
                }

                .filters {
                    padding: 14px;

                    display: flex;
                    align-items: center;

                    gap: 12px;

                    margin-bottom: 18px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;
                }

                .search-box {
                    min-width: 250px;

                    flex: 1;

                    height: 40px;

                    display: flex;
                    align-items: center;

                    gap: 8px;

                    padding: 0 11px;

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

                    font-size: 11px;
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

                .filter-buttons {
                    display: flex;

                    gap: 4px;

                    padding: 3px;

                    border-radius: 8px;

                    background: #f3f4f6;
                }

                .filter-buttons button {
                    min-height: 34px;

                    padding: 0 12px;

                    border: none;
                    border-radius: 6px;

                    background: transparent;

                    color: #6b7280;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 600;

                    cursor: pointer;
                }

                .filter-buttons button.active {
                    background: #ffffff;

                    color: #111827;

                    box-shadow:
                        0 1px 3px
                        rgba(0, 0, 0, 0.08);
                }

                .results-header {
                    margin-bottom: 13px;
                }

                .results-header > div {
                    display: flex;
                    align-items: center;

                    gap: 9px;
                }

                .results-header strong {
                    font-size: 15px;
                }

                .results-header span {
                    color: #9ca3af;

                    font-size: 10px;
                }

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
                    min-width: 0;

                    padding: 19px;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;

                    transition:
                        transform 0.18s ease,
                        box-shadow 0.18s ease;
                }

                .project-card:hover {
                    transform: translateY(-2px);

                    box-shadow:
                        0 12px 26px
                        rgba(0, 0, 0, 0.06);
                }

                .card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    margin-bottom: 14px;
                }

                .project-icon {
                    width: 40px;
                    height: 40px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    font-size: 18px;
                }

                .status {
                    padding: 5px 8px;

                    border-radius: 999px;

                    font-size: 8px;
                    font-weight: 700;
                }

                .status.completed {
                    background: #ecfdf5;
                    color: #047857;
                }

                .status.in-progress {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .status.neutral {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .project-title {
                    width: 100%;

                    margin: 0 0 7px;

                    padding: 0;

                    border: none;

                    background: transparent;

                    color: #111827;

                    text-align: right;

                    font-family: inherit;

                    font-size: 15px;
                    font-weight: 800;

                    cursor: pointer;
                }

                .project-title:hover {
                    text-decoration: underline;
                }

                .description {
                    min-height: 38px;

                    margin: 0 0 15px;

                    color: #6b7280;

                    font-size: 10px;

                    line-height: 1.7;

                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;

                    overflow: hidden;
                }

                .project-meta {
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

                .project-meta span,
                .assignments span {
                    display: block;

                    margin-bottom: 4px;

                    color: #9ca3af;

                    font-size: 8px;
                }

                .project-meta strong,
                .assignments strong {
                    display: block;

                    overflow: hidden;

                    color: #374151;

                    font-size: 9px;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .assignments {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 10px;

                    padding: 12px 0;
                }

                .card-actions {
                    display: grid;

                    grid-template-columns:
                        1.2fr 1fr 0.8fr;

                    gap: 6px;
                }

                .card-actions button {
                    min-height: 35px;

                    border-radius: 7px;

                    font-family: inherit;

                    font-size: 9px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .details-button {
                    border: 1px solid #e5e7eb;

                    background: #ffffff;
                    color: #111827;
                }

                .details-button:hover {
                    background: #f9fafb;
                }

                .edit-button {
                    border: 1px solid #dbeafe;

                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .edit-button:hover {
                    background: #dbeafe;
                }

                .delete-button {
                    border: 1px solid #fee2e2;

                    background: #fef2f2;
                    color: #b91c1c;
                }

                .delete-button:hover {
                    background: #fee2e2;
                }

                .empty-state {
                    min-height: 300px;

                    padding: 40px 20px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    flex-direction: column;

                    text-align: center;

                    border: 1px dashed #d1d5db;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .empty-icon {
                    width: 58px;
                    height: 58px;

                    margin-bottom: 13px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 13px;

                    background: #f3f4f6;

                    font-size: 25px;
                }

                .empty-state h2 {
                    margin: 0 0 6px;

                    font-size: 17px;
                }

                .empty-state p {
                    margin: 0;

                    color: #9ca3af;

                    font-size: 11px;
                }

                .modal-overlay {
                    position: fixed;

                    inset: 0;

                    z-index: 1000;

                    padding: 25px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background:
                        rgba(
                            0,
                            0,
                            0,
                            0.45
                        );

                    overflow-y: auto;
                }

                .modal {
                    width: min(
                        760px,
                        100%
                    );

                    max-height: calc(
                        100vh - 50px
                    );

                    padding: 24px;

                    overflow-y: auto;

                    border-radius: 14px;

                    background: #ffffff;

                    box-shadow:
                        0 25px 70px
                        rgba(0, 0, 0, 0.18);

                    direction: rtl;
                }

                .modal-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;

                    margin-bottom: 22px;
                }

                .modal-header h2 {
                    margin: 0;

                    font-size: 21px;
                }

                .modal-header > button {
                    width: 34px;
                    height: 34px;

                    border: none;
                    border-radius: 7px;

                    background: #f3f4f6;

                    color: #6b7280;

                    font-size: 21px;

                    cursor: pointer;
                }

                .modal-header > button:disabled {
                    opacity: 0.5;

                    cursor: not-allowed;
                }

                .form-grid {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 13px;

                    margin-bottom: 13px;
                }

                .form-grid label,
                .full-field {
                    display: block;
                }

                .form-grid label span,
                .full-field span {
                    display: block;

                    margin-bottom: 6px;

                    color: #374151;

                    font-size: 10px;
                    font-weight: 700;
                }

                .form-grid input,
                .form-grid select,
                .full-field textarea {
                    width: 100%;

                    padding: 10px 11px;

                    border: 1px solid #e5e7eb;
                    border-radius: 7px;

                    outline: none;

                    background: #ffffff;

                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                }

                .form-grid input:focus,
                .form-grid select:focus,
                .full-field textarea:focus {
                    border-color: #9ca3af;
                }

                .full-field {
                    margin-bottom: 13px;
                }

                .full-field textarea {
                    resize: vertical;

                    line-height: 1.7;
                }

                .form-section-title {
                    margin: 20px 0 12px;

                    padding-bottom: 7px;

                    border-bottom:
                        1px solid #f3f4f6;

                    color: #111827;

                    font-size: 11px;
                    font-weight: 800;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;

                    gap: 8px;

                    margin-top: 22px;
                }

                .modal-actions button {
                    min-height: 39px;

                    padding: 0 17px;

                    border-radius: 7px;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .cancel-button {
                    border: 1px solid #e5e7eb;

                    background: #ffffff;
                    color: #374151;
                }

                .save-button {
                    border: none;

                    background: #111827;
                    color: #ffffff;
                }

                .save-button:disabled,
                .cancel-button:disabled {
                    opacity: 0.55;

                    cursor: not-allowed;
                }

                .delete-modal {
                    width: min(
                        430px,
                        100%
                    );

                    padding: 28px;

                    border-radius: 14px;

                    background: #ffffff;

                    text-align: center;
                }

                .delete-icon {
                    width: 58px;
                    height: 58px;

                    margin: 0 auto 14px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 14px;

                    background: #fef2f2;

                    font-size: 25px;
                }

                .delete-modal h2 {
                    margin: 0 0 9px;

                    font-size: 20px;
                }

                .delete-modal p {
                    margin: 6px 0;

                    color: #6b7280;

                    font-size: 11px;
                }

                .delete-modal > strong {
                    display: block;

                    margin: 10px 0;

                    color: #111827;

                    font-size: 13px;
                }

                .delete-modal .delete-warning {
                    margin-top: 13px;

                    color: #b91c1c;

                    font-size: 10px;
                }

                .danger-confirm {
                    border: none;

                    background: #dc2626;
                    color: #ffffff;
                }

                .danger-confirm:hover {
                    background: #b91c1c;
                }

                .danger-confirm:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                @media (max-width: 1100px) {

                    .projects-grid {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0, 1fr)
                            );
                    }

                    .filters {
                        flex-wrap: wrap;
                    }

                    .search-box {
                        min-width: 100%;
                    }

                }

                @media (max-width: 750px) {

                    .admin-projects-content {
                        width: calc(100% - 28px);

                        padding-top: 28px;
                    }

                    .page-header {
                        align-items: flex-start;

                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;

                        flex-wrap: wrap;
                    }

                    .dashboard-button,
                    .refresh-button {
                        flex: 1;
                    }

                    .stats {
                        grid-template-columns:
                            1fr;
                    }

                    .projects-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .filters {
                        align-items: stretch;

                        flex-direction: column;
                    }

                    .search-box {
                        min-width: 0;
                    }

                    .filter-buttons {
                        width: 100%;
                    }

                    .filter-buttons button {
                        flex: 1;
                    }

                    .form-grid {
                        grid-template-columns:
                            1fr;
                    }

                }

                @media (max-width: 480px) {

                    .card-actions {
                        grid-template-columns:
                            1fr 1fr;
                    }

                    .details-button {
                        grid-column: 1 / -1;
                    }

                    .modal-overlay {
                        padding: 12px;
                    }

                    .modal {
                        max-height:
                            calc(100vh - 24px);

                        padding: 18px;
                    }

                }

            `}</style>

        </div>
    );
};

export default AdminProjects;