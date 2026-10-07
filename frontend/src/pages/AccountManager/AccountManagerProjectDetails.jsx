import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getMyProject,
    updateMyProject
} from '../../services/accountManagerService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AccountManagerProjectDetails = () => {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [user, setUser] = useState(null);
    const [project, setProject] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        brief: '',
        description: '',
        startDate: '',
        deadline: '',
        managerNotes: ''
    });

    /* =========================================================
       Current User
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
       Load Project
    ========================================================= */

    const loadProject = useCallback(async () => {
        if (!projectId) {
            setError('معرف المشروع غير موجود.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const data = await getMyProject(projectId);

            if (!data) {
                throw new Error(
                    'لم يتم العثور على المشروع.'
                );
            }

            setProject(data);

            setFormData({
                projectName:
                    data.projectName || '',

                brief:
                    data.brief ||
                    data.briefName ||
                    '',

                description:
                    data.description || '',

                startDate:
                    formatDateForInput(
                        data.startDate
                    ),

                deadline:
                    formatDateForInput(
                        data.deadline
                    ),

                managerNotes:
                    data.managerNotes || ''
            });
        } catch (err) {
            console.error(
                '❌ Account Manager Project Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تحميل المشروع.'
            );
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (user && projectId) {
            loadProject();
        }
    }, [user, projectId, loadProject]);

    /* =========================================================
       Helpers
    ========================================================= */

    function formatDateForInput(dateValue) {
        if (!dateValue) {
            return '';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
            date.getDate()
        ).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

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
                month: 'long',
                day: 'numeric'
            }
        );
    };

    const getStatusLabel = (status) => {
        if (status === 'completed') {
            return 'مكتمل';
        }

        return 'قيد التنفيذ';
    };

    const getStatusClass = (status) => {
        if (status === 'completed') {
            return 'completed';
        }

        return 'in-progress';
    };

    /* =========================================================
       Form
    ========================================================= */

    const handleInputChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value
        }));
    };

    /* =========================================================
       Edit
    ========================================================= */

    const handleStartEditing = () => {
        setSuccess('');
        setError('');
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        if (!project) {
            return;
        }

        setFormData({
            projectName:
                project.projectName || '',

            brief:
                project.brief ||
                project.briefName ||
                '',

            description:
                project.description || '',

            startDate:
                formatDateForInput(
                    project.startDate
                ),

            deadline:
                formatDateForInput(
                    project.deadline
                ),

            managerNotes:
                project.managerNotes || ''
        });

        setIsEditing(false);
        setError('');
    };

    /* =========================================================
       Save
    ========================================================= */

    const handleSave = async (event) => {
        event.preventDefault();

        if (!projectId) {
            return;
        }

        if (!formData.projectName.trim()) {
            setError(
                'اسم المشروع مطلوب.'
            );

            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess('');

            const updatedProject =
                await updateMyProject(
                    projectId,
                    {
                        projectName:
                            formData.projectName.trim(),

                        brief:
                            formData.brief.trim(),

                        description:
                            formData.description.trim(),

                        startDate:
                            formData.startDate ||
                            null,

                        deadline:
                            formData.deadline ||
                            null,

                        managerNotes:
                            formData.managerNotes.trim()
                    }
                );

            const newProject =
                updatedProject || {
                    ...project,
                    ...formData
                };

            setProject(newProject);

            setFormData({
                projectName:
                    newProject.projectName || '',

                brief:
                    newProject.brief ||
                    newProject.briefName ||
                    '',

                description:
                    newProject.description ||
                    '',

                startDate:
                    formatDateForInput(
                        newProject.startDate
                    ),

                deadline:
                    formatDateForInput(
                        newProject.deadline
                    ),

                managerNotes:
                    newProject.managerNotes ||
                    ''
            });

            setIsEditing(false);

            setSuccess(
                'تم تحديث بيانات المشروع بنجاح.'
            );
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
       Logout
    ========================================================= */

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error(
                '❌ Logout Error:',
                error
            );
        } finally {
            navigate('/login', {
                replace: true
            });
        }
    };

    /* =========================================================
       Back
    ========================================================= */

    const handleBack = () => {
        navigate(
            '/account-manager/dashboard'
        );
    };

    /* =========================================================
       Loading
    ========================================================= */

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل تفاصيل المشروع..."
            />
        );
    }

    /* =========================================================
       Project Not Found
    ========================================================= */

    if (!project) {
        return (
            <div className="project-details-page">

                <Navbar
                    user={user}
                    onLogout={handleLogout}
                />

                <main className="not-found-container">

                    <div className="not-found-card">

                        <div className="not-found-icon">
                            📁
                        </div>

                        <h2>
                            المشروع غير موجود
                        </h2>

                        <p>
                            لم نتمكن من العثور على
                            المشروع المطلوب أو ليس لديك
                            صلاحية الوصول إليه.
                        </p>

                        <button
                            type="button"
                            onClick={handleBack}
                        >
                            العودة إلى المشاريع
                        </button>

                    </div>

                </main>

            </div>
        );
    }

    return (
        <div className="project-details-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="project-details-content">

                {/* =================================================
                    Top Bar
                ================================================= */}

                <div className="top-bar">

                    <button
                        type="button"
                        className="back-button"
                        onClick={handleBack}
                    >
                        <span>→</span>
                        العودة للمشاريع
                    </button>

                    <NotificationBell
                        user={user}
                    />

                </div>

                {/* =================================================
                    Header
                ================================================= */}

                <section className="project-header">

                    <div className="project-header-main">

                        <div className="project-icon">
                            📁
                        </div>

                        <div>

                            <div className="project-title-row">

                                <h1>
                                    {project.projectName ||
                                        'مشروع بدون اسم'}
                                </h1>

                                <span
                                    className={`status-badge ${getStatusClass(
                                        project.status
                                    )}`}
                                >
                                    {getStatusLabel(
                                        project.status
                                    )}
                                </span>

                            </div>

                            <p>
                                تم إنشاء المشروع بواسطة حسابك
                            </p>

                        </div>

                    </div>

                    <button
                        type="button"
                        className="edit-button"
                        onClick={handleStartEditing}
                        disabled={isEditing}
                    >
                        ✎ تعديل البيانات
                    </button>

                </section>

                {/* =================================================
                    Messages
                ================================================= */}

                {error && (
                    <div className="message error-message">

                        <span>⚠️</span>

                        <span>{error}</span>

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
                    <div className="message success-message">

                        <span>✓</span>

                        <span>{success}</span>

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
                    Main Content
                ================================================= */}

                <div className="details-grid">

                    {/* =================================================
                        Project Information
                    ================================================= */}

                    <section className="details-card main-card">

                        <div className="card-header">

                            <div>
                                <span>
                                    PROJECT INFORMATION
                                </span>

                                <h2>
                                    بيانات المشروع
                                </h2>
                            </div>

                        </div>

                        {isEditing ? (

                            <form
                                className="edit-form"
                                onSubmit={handleSave}
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
                                        required
                                    />

                                </div>

                                <div className="form-group">

                                    <label>
                                        Brief
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
                                        rows="6"
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
                                        ملاحظات المدير
                                    </label>

                                    <textarea
                                        name="managerNotes"
                                        value={
                                            formData.managerNotes
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        rows="5"
                                    />

                                </div>

                                <div className="form-actions">

                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={
                                            handleCancelEditing
                                        }
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

                        ) : (

                            <div className="information-content">

                                <div className="info-item full">

                                    <span>
                                        اسم المشروع
                                    </span>

                                    <strong>
                                        {project.projectName ||
                                            'غير محدد'}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        Brief
                                    </span>

                                    <strong>
                                        {project.brief ||
                                            project.briefName ||
                                            'غير محدد'}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        الحالة
                                    </span>

                                    <strong>
                                        {getStatusLabel(
                                            project.status
                                        )}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        تاريخ البداية
                                    </span>

                                    <strong>
                                        {formatDate(
                                            project.startDate
                                        )}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        موعد التسليم
                                    </span>

                                    <strong>
                                        {formatDate(
                                            project.deadline
                                        )}
                                    </strong>

                                </div>

                                <div className="info-item full">

                                    <span>
                                        وصف المشروع
                                    </span>

                                    <p>
                                        {project.description ||
                                            'لا يوجد وصف للمشروع.'}
                                    </p>

                                </div>

                                <div className="info-item full">

                                    <span>
                                        ملاحظات المدير
                                    </span>

                                    <p>
                                        {project.managerNotes ||
                                            'لا توجد ملاحظات.'}
                                    </p>

                                </div>

                            </div>

                        )}

                    </section>

                    {/* =================================================
                        Project Status
                    ================================================= */}

                    <aside className="side-column">

                        <section className="details-card">

                            <div className="card-header">

                                <div>
                                    <span>
                                        STATUS
                                    </span>

                                    <h2>
                                        حالة المشروع
                                    </h2>
                                </div>

                            </div>

                            <div className="status-display">

                                <div
                                    className={`large-status-icon ${getStatusClass(
                                        project.status
                                    )}`}
                                >
                                    {project.status ===
                                    'completed'
                                        ? '✓'
                                        : '↻'}
                                </div>

                                <h3>
                                    {getStatusLabel(
                                        project.status
                                    )}
                                </h3>

                                <p>
                                    {project.status ===
                                    'completed'
                                        ? 'تم الانتهاء من المشروع.'
                                        : 'المشروع ما زال قيد التنفيذ.'}
                                </p>

                            </div>

                        </section>

                        {/* =================================================
                            Team / Assignment Information
                        ================================================= */}

                        <section className="details-card">

                            <div className="card-header">

                                <div>
                                    <span>
                                        ASSIGNMENTS
                                    </span>

                                    <h2>
                                        فريق المشروع
                                    </h2>
                                </div>

                            </div>

                            <div className="assignment-info">

                                <div className="assignment-row">

                                    <div className="assignment-icon">
                                        🎨
                                    </div>

                                    <div>
                                        <span>
                                            Designer
                                        </span>

                                        <strong>
                                            {project.assignedDesignerName ||
                                                project.assignedDesigner?.name ||
                                                'لم يتم التعيين بعد'}
                                        </strong>
                                    </div>

                                </div>

                                <div className="assignment-row">

                                    <div className="assignment-icon">
                                        🖼️
                                    </div>

                                    <div>
                                        <span>
                                            Presentation Designer
                                        </span>

                                        <strong>
                                            {project.assignedPresenterName ||
                                                project.assignedPresenter?.name ||
                                                'لم يتم التعيين بعد'}
                                        </strong>
                                    </div>

                                </div>

                            </div>

                            <div className="assignment-note">
                                يتم تحديد فريق العمل من خلال الـ Coordinator.
                            </div>

                        </section>

                    </aside>

                </div>

                {/* =================================================
                    Checkpoints
                ================================================= */}

                <section className="details-card checkpoints-card">

                    <div className="card-header">

                        <div>
                            <span>
                                PROJECT PROGRESS
                            </span>

                            <h2>
                                مراحل المشروع
                            </h2>
                        </div>

                        <div className="checkpoint-count">
                            {Array.isArray(
                                project.checkpoints
                            )
                                ? project.checkpoints.filter(
                                      (item) =>
                                          item?.isCompleted
                                  ).length
                                : 0}

                            {' / '}

                            {Array.isArray(
                                project.checkpoints
                            )
                                ? project.checkpoints.length
                                : 0}
                        </div>

                    </div>

                    {!Array.isArray(
                        project.checkpoints
                    ) ||
                    project.checkpoints.length === 0 ? (

                        <div className="no-checkpoints">
                            <span>📋</span>

                            <p>
                                لا توجد مراحل مسجلة للمشروع حتى الآن.
                            </p>
                        </div>

                    ) : (

                        <div className="checkpoints-list">

                            {project.checkpoints.map(
                                (checkpoint, index) => (
                                    <div
                                        key={
                                            checkpoint?.id ||
                                            checkpoint?._id ||
                                            index
                                        }
                                        className={`checkpoint ${
                                            checkpoint?.isCompleted
                                                ? 'completed'
                                                : ''
                                        }`}
                                    >

                                        <div className="checkpoint-number">

                                            {checkpoint?.isCompleted
                                                ? '✓'
                                                : index + 1}

                                        </div>

                                        <div className="checkpoint-content">

                                            <h3>
                                                {checkpoint?.title ||
                                                    `المرحلة ${
                                                        index + 1
                                                    }`}
                                            </h3>

                                            {checkpoint?.note && (
                                                <p>
                                                    {
                                                        checkpoint.note
                                                    }
                                                </p>
                                            )}

                                            {checkpoint?.fileUrl && (
                                                <a
                                                    href={
                                                        checkpoint.fileUrl
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="file-link"
                                                >
                                                    📎 عرض الملف
                                                </a>
                                            )}

                                        </div>

                                        <span
                                            className={`checkpoint-status ${
                                                checkpoint?.isCompleted
                                                    ? 'completed'
                                                    : 'pending'
                                            }`}
                                        >
                                            {checkpoint?.isCompleted
                                                ? 'مكتملة'
                                                : 'قيد التنفيذ'}
                                        </span>

                                    </div>
                                )
                            )}

                        </div>

                    )}

                </section>

                {/* =================================================
                    Files
                ================================================= */}

                <section className="files-grid">

                    <div className="details-card">

                        <div className="card-header">

                            <div>
                                <span>
                                    RENDER
                                </span>

                                <h2>
                                    ملف الـ Render
                                </h2>
                            </div>

                        </div>

                        {project.renderFileLink ? (

                            <a
                                href={
                                    project.renderFileLink
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="file-card"
                            >

                                <div className="file-icon">
                                    🎨
                                </div>

                                <div>
                                    <strong>
                                        {project.renderFileName ||
                                            'Render File'}
                                    </strong>

                                    <span>
                                        فتح الملف
                                    </span>
                                </div>

                                <span>
                                    ↗
                                </span>

                            </a>

                        ) : (

                            <div className="no-file">
                                لا يوجد ملف Render حتى الآن.
                            </div>

                        )}

                    </div>

                    <div className="details-card">

                        <div className="card-header">

                            <div>
                                <span>
                                    PRESENTATION
                                </span>

                                <h2>
                                    ملف العرض
                                </h2>
                            </div>

                        </div>

                        {project.presentationFileLink ? (

                            <a
                                href={
                                    project.presentationFileLink
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="file-card"
                            >

                                <div className="file-icon">
                                    🖼️
                                </div>

                                <div>
                                    <strong>
                                        {project.presentationFileName ||
                                            'Presentation File'}
                                    </strong>

                                    <span>
                                        فتح الملف
                                    </span>
                                </div>

                                <span>
                                    ↗
                                </span>

                            </a>

                        ) : (

                            <div className="no-file">
                                لا يوجد ملف عرض حتى الآن.
                            </div>

                        )}

                    </div>

                </section>

                {/* =================================================
                    Coordinator Notes
                ================================================= */}

                <section className="details-card notes-card">

                    <div className="card-header">

                        <div>
                            <span>
                                COORDINATOR NOTES
                            </span>

                            <h2>
                                ملاحظات الـ Coordinator
                            </h2>
                        </div>

                    </div>

                    <div className="notes-content">

                        {project.coordinatorNotes ? (
                            <p>
                                {project.coordinatorNotes}
                            </p>
                        ) : (
                            <span>
                                لا توجد ملاحظات من الـ Coordinator حتى الآن.
                            </span>
                        )}

                    </div>

                </section>

            </main>

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .project-details-page {
                    min-height: 100vh;
                    background: #f7f7f8;
                    color: #111827;
                    direction: rtl;
                }

                .project-details-content {
                    width: min(1300px, calc(100% - 48px));
                    margin: 0 auto;
                    padding: 30px 0 70px;
                }

                .top-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 28px;
                }

                .back-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: none;
                    background: transparent;
                    color: #4b5563;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .back-button:hover {
                    color: #111827;
                }

                .back-button span {
                    font-size: 18px;
                }

                .project-header {
                    padding: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 25px;
                    border: 1px solid #e5e7eb;
                    border-radius: 15px;
                    background: #ffffff;
                    margin-bottom: 20px;
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
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 13px;
                    background: #f3f4f6;
                    font-size: 27px;
                }

                .project-title-row {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .project-title-row h1 {
                    margin: 0;
                    font-size: clamp(23px, 3vw, 31px);
                    font-weight: 800;
                }

                .project-header-main p {
                    margin: 7px 0 0;
                    color: #6b7280;
                    font-size: 12px;
                }

                .status-badge {
                    padding: 6px 10px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 700;
                }

                .status-badge.in-progress {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .status-badge.completed {
                    background: #ecfdf5;
                    color: #047857;
                }

                .edit-button {
                    min-height: 40px;
                    padding: 0 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: #ffffff;
                    color: #111827;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .edit-button:hover {
                    background: #f9fafb;
                }

                .edit-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .message {
                    margin-bottom: 20px;
                    padding: 13px 16px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    border-radius: 9px;
                    font-size: 13px;
                }

                .message button {
                    margin-right: auto;
                    border: none;
                    background: transparent;
                    font-size: 19px;
                    cursor: pointer;
                }

                .error-message {
                    border: 1px solid #fecaca;
                    background: #fef2f2;
                    color: #991b1b;
                }

                .success-message {
                    border: 1px solid #bbf7d0;
                    background: #f0fdf4;
                    color: #166534;
                }

                .details-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.8fr);
                    gap: 18px;
                    align-items: start;
                }

                .side-column {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .details-card {
                    padding: 23px;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    background: #ffffff;
                }

                .main-card {
                    min-width: 0;
                }

                .card-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 23px;
                }

                .card-header span {
                    display: block;
                    margin-bottom: 5px;
                    color: #9ca3af;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    direction: ltr;
                }

                .card-header h2 {
                    margin: 0;
                    color: #111827;
                    font-size: 19px;
                    font-weight: 800;
                }

                .information-content {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .info-item {
                    min-width: 0;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f3f4f6;
                }

                .info-item.full {
                    grid-column: 1 / -1;
                }

                .info-item span {
                    display: block;
                    margin-bottom: 7px;
                    color: #9ca3af;
                    font-size: 11px;
                }

                .info-item strong {
                    display: block;
                    color: #111827;
                    font-size: 13px;
                    line-height: 1.6;
                }

                .info-item p {
                    margin: 0;
                    color: #4b5563;
                    font-size: 13px;
                    line-height: 1.8;
                    white-space: pre-wrap;
                }

                .edit-form {
                    width: 100%;
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
                }

                .form-group input:focus,
                .form-group textarea:focus {
                    border-color: #111827;
                    box-shadow:
                        0 0 0 3px rgba(17, 24, 39, 0.07);
                }

                .form-group textarea {
                    resize: vertical;
                    line-height: 1.7;
                }

                .date-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-start;
                    gap: 10px;
                    margin-top: 23px;
                    padding-top: 19px;
                    border-top: 1px solid #f3f4f6;
                }

                .cancel-button,
                .save-button {
                    min-height: 40px;
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

                .status-display {
                    display: flex;
                    align-items: center;
                    flex-direction: column;
                    text-align: center;
                    padding: 10px 0 4px;
                }

                .large-status-icon {
                    width: 58px;
                    height: 58px;
                    margin-bottom: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 15px;
                    font-size: 24px;
                    font-weight: 800;
                }

                .large-status-icon.in-progress {
                    background: #eff6ff;
                    color: #2563eb;
                }

                .large-status-icon.completed {
                    background: #ecfdf5;
                    color: #059669;
                }

                .status-display h3 {
                    margin: 0 0 7px;
                    font-size: 17px;
                }

                .status-display p {
                    margin: 0;
                    color: #6b7280;
                    font-size: 11px;
                    line-height: 1.6;
                }

                .assignment-info {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .assignment-row {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 11px;
                    border-radius: 9px;
                    background: #f9fafb;
                }

                .assignment-icon {
                    width: 37px;
                    height: 37px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 9px;
                    background: #ffffff;
                    font-size: 17px;
                }

                .assignment-row span {
                    display: block;
                    margin-bottom: 4px;
                    color: #9ca3af;
                    font-size: 10px;
                }

                .assignment-row strong {
                    display: block;
                    color: #374151;
                    font-size: 11px;
                }

                .assignment-note {
                    margin-top: 14px;
                    padding: 10px;
                    border-radius: 8px;
                    background: #f9fafb;
                    color: #6b7280;
                    font-size: 10px;
                    line-height: 1.6;
                }

                .checkpoints-card {
                    margin-top: 18px;
                }

                .checkpoint-count {
                    min-width: 42px;
                    height: 30px;
                    padding: 0 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 7px;
                    background: #f3f4f6;
                    color: #374151;
                    font-size: 11px;
                    font-weight: 700;
                }

                .checkpoints-list {
                    display: flex;
                    flex-direction: column;
                }

                .checkpoint {
                    display: flex;
                    align-items: flex-start;
                    gap: 13px;
                    padding: 15px 0;
                    border-bottom: 1px solid #f3f4f6;
                }

                .checkpoint:last-child {
                    border-bottom: none;
                }

                .checkpoint-number {
                    width: 32px;
                    height: 32px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: #f3f4f6;
                    color: #6b7280;
                    font-size: 11px;
                    font-weight: 700;
                }

                .checkpoint.completed .checkpoint-number {
                    background: #ecfdf5;
                    color: #047857;
                }

                .checkpoint-content {
                    flex: 1;
                    min-width: 0;
                }

                .checkpoint-content h3 {
                    margin: 1px 0 5px;
                    font-size: 13px;
                }

                .checkpoint-content p {
                    margin: 0 0 6px;
                    color: #6b7280;
                    font-size: 11px;
                    line-height: 1.6;
                }

                .file-link {
                    color: #2563eb;
                    font-size: 11px;
                    text-decoration: none;
                }

                .file-link:hover {
                    text-decoration: underline;
                }

                .checkpoint-status {
                    flex-shrink: 0;
                    padding: 5px 8px;
                    border-radius: 999px;
                    font-size: 9px;
                    font-weight: 700;
                }

                .checkpoint-status.completed {
                    background: #ecfdf5;
                    color: #047857;
                }

                .checkpoint-status.pending {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .no-checkpoints,
                .no-file {
                    min-height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 7px;
                    color: #9ca3af;
                    text-align: center;
                    font-size: 12px;
                }

                .no-checkpoints span {
                    font-size: 23px;
                }

                .no-checkpoints p {
                    margin: 0;
                }

                .files-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                    margin-top: 18px;
                }

                .file-card {
                    min-height: 70px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    background: #ffffff;
                    color: inherit;
                    text-decoration: none;
                    transition: background 0.2s ease,
                                border-color 0.2s ease;
                }

                .file-card:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }

                .file-icon {
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 9px;
                    background: #f3f4f6;
                    font-size: 18px;
                }

                .file-card > div:nth-child(2) {
                    min-width: 0;
                    flex: 1;
                }

                .file-card strong {
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: #374151;
                    font-size: 11px;
                }

                .file-card span {
                    color: #9ca3af;
                    font-size: 10px;
                }

                .file-card > span:last-child {
                    color: #374151;
                    font-size: 16px;
                }

                .notes-card {
                    margin-top: 18px;
                }

                .notes-content {
                    padding: 15px;
                    border-radius: 9px;
                    background: #f9fafb;
                }

                .notes-content p {
                    margin: 0;
                    color: #4b5563;
                    font-size: 12px;
                    line-height: 1.8;
                    white-space: pre-wrap;
                }

                .notes-content span {
                    color: #9ca3af;
                    font-size: 12px;
                }

                .not-found-container {
                    min-height: calc(100vh - 70px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 30px;
                }

                .not-found-card {
                    width: min(480px, 100%);
                    padding: 35px;
                    border: 1px solid #e5e7eb;
                    border-radius: 15px;
                    background: #ffffff;
                    text-align: center;
                }

                .not-found-icon {
                    font-size: 42px;
                    margin-bottom: 15px;
                }

                .not-found-card h2 {
                    margin: 0 0 9px;
                    font-size: 21px;
                }

                .not-found-card p {
                    margin: 0 0 22px;
                    color: #6b7280;
                    font-size: 12px;
                    line-height: 1.7;
                }

                .not-found-card button {
                    min-height: 40px;
                    padding: 0 18px;
                    border: none;
                    border-radius: 8px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                @media (max-width: 900px) {
                    .details-grid {
                        grid-template-columns: 1fr;
                    }

                    .side-column {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (max-width: 700px) {
                    .project-details-content {
                        width: calc(100% - 28px);
                        padding-top: 22px;
                    }

                    .project-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .edit-button {
                        width: 100%;
                    }

                    .information-content {
                        grid-template-columns: 1fr;
                    }

                    .info-item.full {
                        grid-column: auto;
                    }

                    .side-column {
                        display: flex;
                    }

                    .files-grid {
                        grid-template-columns: 1fr;
                    }

                    .date-grid {
                        grid-template-columns: 1fr;
                    }

                    .checkpoint {
                        flex-wrap: wrap;
                    }

                    .checkpoint-status {
                        margin-right: 45px;
                    }

                    .form-actions {
                        flex-direction: column;
                    }

                    .cancel-button,
                    .save-button {
                        width: 100%;
                    }
                }

            `}</style>

        </div>
    );
};

export default AccountManagerProjectDetails;