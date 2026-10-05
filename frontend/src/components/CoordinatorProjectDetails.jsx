import React, { useEffect, useState } from 'react';

import {
  subscribeToAllProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../services/projectService';

import {
  subscribeToMyNotifications,
  markNotificationAsRead,
} from '../services/notificationService';

import { uploadToCloudinary } from '../uploadService';

import CoordinatorProjectDetails from './CoordinatorProjectDetails';

export default function CoordinatorDashboard({ user, onLogout }) {

  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showNewModal, setShowNewModal] = useState(false);



  // حالات إنشاء مشروع جديد

  const [projectName, setProjectName] = useState('');

  const [briefLinkOrText, setBriefLinkOrText] = useState('');

  const [briefFile, setBriefFile] = useState(null);

  const [managerNotes, setManagerNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);



  // حالات تعديل اسم المشروع

  const [editingProject, setEditingProject] = useState(null);

  const [newEditedName, setNewEditedName] = useState('');

  const [isUpdating, setIsUpdating] = useState(false);



  // حالات الإشعارات

  const [notifications, setNotifications] = useState([]);

  const [showNotificationsDropdown, setShowNotificationsDropdown] =

    useState(false);



  // حالة الرسائل المنبثقة

  const [popupMessage, setPopupMessage] = useState(null);



  const showPopup = (msg) => {

    setPopupMessage(msg);



    setTimeout(() => {

      setPopupMessage(null);

    }, 2500);

  };



  const [activeProject, setActiveProject] = useState(() => {

    try {

      const savedProj = localStorage.getItem('ostudio_coord_active_proj');

      return savedProj ? JSON.parse(savedProj) : null;

    } catch {

      return null;

    }

  });



  // =========================================================

  // الاستماع اللحظي لكافة المشاريع

  // =========================================================



  useEffect(() => {
    const unsubscribe = subscribeToAllProjects(
      (projectsList) => {
        setProjects(projectsList);
        setLoading(false);

        if (activeProject) {
          const latest = projectsList.find(
            (p) =>
              (p._id || p.id) ===
              (activeProject._id || activeProject.id)
          );

          if (latest) {
            setActiveProject(latest);
            localStorage.setItem(
              'ostudio_coord_active_proj',
              JSON.stringify(latest)
            );
          }
        }
      },
      (err) => {
        console.error('Projects Service Error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeProject?._id, activeProject?.id]);

  // =========================================================
  // الاستماع اللحظي لإشعارات المنسق
  // =========================================================


  // =========================================================



  useEffect(() => {
    const unsubscribeNotif = subscribeToMyNotifications(
      user?.uid,
      (notifList) => {
        setNotifications(notifList);
      },
      (err) => {
        console.error('Notifications Service Error:', err);
      }
    );

    return () => unsubscribeNotif();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;



  // =========================================================

  // تحديد الإشعار كمقروء

  // =========================================================



  const handleMarkAsRead = async (notifId) => {
    try {
      await markNotificationAsRead(notifId);
    } catch (e) {
      console.error('Mark notification as read error:', e);
    }
  };

  // فتح المشروع

  // =========================================================



  const handleOpenProject = (proj) => {

    setActiveProject(proj);



    localStorage.setItem(

      'ostudio_coord_active_proj',

      JSON.stringify(proj)

    );

  };



  // =========================================================

  // العودة لقائمة المشاريع

  // =========================================================



  const handleBackToList = () => {

    setActiveProject(null);

    localStorage.removeItem('ostudio_coord_active_proj');

  };



  // =========================================================

  // إنشاء مشروع جديد

  // =========================================================



  const handleCreateProject = async (e) => {

    e.preventDefault();



    if (!projectName.trim()) return;



    try {

      setIsSubmitting(true);



      let finalBriefUrl = briefLinkOrText.trim();

      let finalBriefName = '';



      if (briefFile) {

        const uploadRes = await uploadToCloudinary(briefFile);



        finalBriefUrl = uploadRes.url;

        finalBriefName = uploadRes.originalName;

      }



      await createProject({
        projectName: projectName.trim(),
        brief: finalBriefUrl,
        briefName: finalBriefName,
        managerNotes: managerNotes.trim(),
        createdById: user?.uid || '',
        createdByName: user?.name || 'Coordinator',
      });

      showPopup('Project created successfully! 🚀');



      setShowNewModal(false);

      setProjectName('');

      setBriefLinkOrText('');

      setBriefFile(null);

      setManagerNotes('');

    } catch (err) {

      console.error(err);



      showPopup(

        'Failed to create project: ' + err.message

      );

    } finally {

      setIsSubmitting(false);

    }

  };



  // =========================================================

  // فتح نافذة تعديل الاسم

  // =========================================================



  const handleOpenEditModal = (e, proj) => {

    e.stopPropagation();



    setEditingProject(proj);

    setNewEditedName(

      proj.projectName || proj.name || ''

    );

  };



  // =========================================================

  // حفظ الاسم الجديد

  // =========================================================



  const handleSaveProjectName = async (e) => {

    e.preventDefault();



    if (!newEditedName.trim() || !editingProject) return;



    try {

      setIsUpdating(true);



      await updateProject(
        editingProject.id || editingProject._id,
        {
          projectName: newEditedName.trim(),
        }
      );

      showPopup('تم تحديث اسم المشروع بنجاح! ✏️');



      setEditingProject(null);

      setNewEditedName('');

    } catch (err) {

      console.error(err);



      showPopup(

        'فشل التعديل: ' + err.message

      );

    } finally {

      setIsUpdating(false);

    }

  };



  // =========================================================

  // حذف المشروع

  // =========================================================



  const handleDeleteProject = async (e, projectId) => {

    e.stopPropagation();



    const confirmDelete = window.confirm(

      'تحذير: هل أنت متأكد من حذف هذا المشروع نهائياً بكافة بياناته؟'

    );



    if (!confirmDelete) return;



    try {

      await deleteProject(projectId);

      showPopup('تم حذف المشروع بنجاح 🗑️');



      if (

        activeProject &&

        (

          activeProject.id === projectId ||

          activeProject._id === projectId

        )

      ) {

        handleBackToList();

      }

    } catch (err) {

      console.error(err);



      showPopup(

        'فشل الحذف: ' + err.message

      );

    }

  };



  // =========================================================

  // صفحة تفاصيل المشروع

  // =========================================================



  if (activeProject) {

    return (

      <CoordinatorProjectDetails

        project={activeProject}

        user={user}

        onBack={handleBackToList}

        onLogout={onLogout}

      />

    );

  }



  return (

    <div className="coordinator-page">



      {/* =====================================================

          CSS الخاص بالصفحة بالكامل

      ====================================================== */}



      <style>{`



        /* =====================================================

           RESET خاص بالصفحة فقط

        ====================================================== */



        .coordinator-page {

          min-height: 100vh;

          background: #f8fafc;

          color: #1e293b;

          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

          direction: ltr;

          text-align: left;

          position: relative;

          padding-bottom: 50px;

        }



        .coordinator-page *,

        .coordinator-page *::before,

        .coordinator-page *::after {

          box-sizing: border-box;

        }



        /* =====================================================

           NAVBAR

        ====================================================== */



        .coordinator-navbar {

          display: flex;

          justify-content: space-between;

          align-items: center;

          background: #ffffff;

          padding: 15px 40px;

          border-bottom: 1px solid #e2e8f0;

          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

          position: sticky;

          top: 0;

          z-index: 1000;

          min-height: 66px;

        }



        .coordinator-nav-left {

          display: flex;

          align-items: center;

          gap: 8px;

          flex: 1;

          justify-content: flex-start;

          min-width: 0;

        }



        .coordinator-profile-text {

          font-size: 14px;

          font-weight: 600;

          color: #0f172a;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;

        }



        .coordinator-nav-center {

          display: flex;

          flex-direction: row;

          align-items: center;

          justify-content: center;

          gap: 10px;

          flex: 1;

          text-align: center;

        }



        .coordinator-nav-logo {

          width: 35px;

          height: 35px;

          object-fit: contain;

        }

        .coordinator-nav-logo-hidden {
          display: none;
        }



        .coordinator-nav-title {

          font-size: 22px;

          font-weight: 800;

          color: #0f172a;

          letter-spacing: -0.5px;

          margin: 0;

        }



        .coordinator-nav-right {

          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 18px;

          flex: 1;

          position: relative;

        }



        /* =====================================================

           NOTIFICATIONS

        ====================================================== */



        .coordinator-notification-wrapper {

          position: relative;

        }



        .coordinator-notification-button {

          background: none;

          border: none;

          font-size: 20px;

          cursor: pointer;

          position: relative;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 4px;

        }



        .coordinator-notification-badge {

          position: absolute;

          top: -5px;

          right: -6px;

          background: #ef4444;

          color: #ffffff;

          border-radius: 50%;

          font-size: 11px;

          font-weight: bold;

          width: 18px;

          height: 18px;

          display: flex;

          align-items: center;

          justify-content: center;

        }



        .coordinator-notification-dropdown {

          position: absolute;

          top: 35px;

          right: 0;

          width: 320px;

          background: #ffffff;

          border-radius: 10px;

          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);

          border: 1px solid #e2e8f0;

          z-index: 99999;

          padding: 12px;

          max-height: 380px;

          overflow-y: auto;

        }



        .coordinator-notification-header {

          display: flex;

          justify-content: space-between;

          align-items: center;

          border-bottom: 1px solid #f1f5f9;

          padding-bottom: 8px;

          margin-bottom: 8px;

        }



        .coordinator-notification-title {

          font-weight: bold;

          font-size: 14px;

          color: #0f172a;

        }



        .coordinator-notification-close {

          background: none;

          border: none;

          color: #64748b;

          cursor: pointer;

          font-size: 13px;

        }



        .coordinator-no-notifications {

          margin: 15px 0;

          font-size: 13px;

          color: #94a3b8;

          text-align: center;

        }



        .coordinator-notification-item {

          padding: 10px;

          border-radius: 6px;

          margin-bottom: 6px;

          cursor: pointer;

        }



        .coordinator-notification-item.read {

          background: #f8fafc;

          border-left: 3px solid transparent;

        }



        .coordinator-notification-item.unread {

          background: #eff6ff;

          border-left: 3px solid #0284c7;

        }



        .coordinator-notification-message {

          margin: 0;

          font-size: 13px;

          color: #1e293b;

        }



        .coordinator-notification-message.read {

          font-weight: 500;

        }



        .coordinator-notification-message.unread {

          font-weight: 700;

        }



        .coordinator-notification-time {

          font-size: 11px;

          color: #94a3b8;

          margin-top: 4px;

          display: block;

        }



        /* =====================================================

           LOGOUT

        ====================================================== */



        .coordinator-logout-button {

          background: #ef4444;

          color: #ffffff;

          border: none;

          padding: 8px 18px;

          border-radius: 6px;

          cursor: pointer;

          font-size: 13px;

          font-weight: bold;

          transition: background 0.2s ease;

        }



        .coordinator-logout-button:hover {

          background: #dc2626;

        }



        /* =====================================================

           TOAST / POPUP

        ====================================================== */



        .coordinator-popup {

          position: fixed;

          top: 50%;

          left: 50%;

          transform: translate(-50%, -50%);

          background: #0f172a;

          color: #ffffff;

          padding: 16px 32px;

          border-radius: 10px;

          font-size: 16px;

          font-weight: bold;

          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);

          z-index: 100000;

          text-align: center;

          border: 1px solid #38bdf8;

          max-width: calc(100vw - 40px);

        }



        /* =====================================================

           MAIN CONTENT

        ====================================================== */



        .coordinator-main-content {

          max-width: 850px;

          margin: 30px auto;

          padding: 0 20px;

        }



        .coordinator-create-section {

          margin-top: 35px;

          margin-bottom: 25px;

        }



        .coordinator-section-title {

          margin: 0 0 10px 0;

          font-size: 18px;

          font-weight: 800;

          color: #0f172a;

        }



        .coordinator-new-project-button {

          width: 100%;

          background: #0284c7;

          color: #ffffff;

          border: none;

          padding: 14px;

          border-radius: 8px;

          font-weight: bold;

          cursor: pointer;

          font-size: 16px;

          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.2);

          transition: background 0.2s ease, transform 0.15s ease;

        }



        .coordinator-new-project-button:hover {

          background: #0369a1;

        }



        .coordinator-new-project-button:active {

          transform: translateY(1px);

        }



        /* =====================================================

           CREATE PROJECT FORM

        ====================================================== */



        .coordinator-create-form {

          background: #ffffff;

          padding: 30px;

          border-radius: 12px;

          margin-bottom: 30px;

          border: 1px solid #cbd5e1;

          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);

          color: #000000;

        }



        .coordinator-form-title {

          margin: 0 0 20px 0;

          color: #0f172a;

          text-align: left;

        }



        .coordinator-form-group {

          margin-bottom: 15px;

        }



        .coordinator-form-group.notes {

          margin-bottom: 20px;

        }



        .coordinator-form-label {

          display: block;

          font-size: 13px;

          font-weight: bold;

          color: #475569;

          margin-bottom: 6px;

        }



        .coordinator-input,

        .coordinator-textarea {

          width: 100%;

          padding: 12px 16px;

          border-radius: 8px;

          border: 1px solid #cbd5e1;

          background: #ffffff;

          color: #000000;

          font-size: 15px;

          outline: none;

          box-sizing: border-box;

          transition: border-color 0.2s ease, box-shadow 0.2s ease;

        }



        .coordinator-input:focus,

        .coordinator-textarea:focus {

          border-color: #0284c7;

          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);

        }



        .coordinator-textarea {

          resize: vertical;

        }



        .coordinator-brief-row {

          display: flex;

          gap: 10px;

        }



        .coordinator-brief-input {

          flex: 1;

        }



        .coordinator-upload-label {

          background: #0ea5e9;

          color: #ffffff;

          padding: 0 20px;

          border-radius: 8px;

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          font-weight: 600;

          font-size: 14px;

          white-space: nowrap;

          transition: background 0.2s ease;

        }



        .coordinator-upload-label:hover {

          background: #0284c7;

        }



        .coordinator-hidden-file {

          display: none;

        }



        .coordinator-form-actions {

          display: flex;

          gap: 10px;

          justify-content: flex-start;

        }



        .coordinator-save-button {

          background: #22c55e;

          color: #ffffff;

          border: none;

          padding: 12px 24px;

          border-radius: 8px;

          cursor: pointer;

          font-weight: bold;

          transition: background 0.2s ease;

        }



        .coordinator-save-button:hover:not(:disabled) {

          background: #16a34a;

        }



        .coordinator-save-button:disabled {

          cursor: not-allowed;

          opacity: 0.7;

        }



        .coordinator-cancel-button {

          background: #64748b;

          color: #ffffff;

          border: none;

          padding: 12px 24px;

          border-radius: 8px;

          cursor: pointer;

          transition: background 0.2s ease;

        }



        .coordinator-cancel-button:hover {

          background: #475569;

        }



        /* =====================================================

           PROJECTS

        ====================================================== */



        .coordinator-projects-title {

          margin-bottom: 15px;

          color: #64748b;

          font-size: 16px;

          font-weight: bold;

          text-align: left;

        }



        .coordinator-loading {

          text-align: center;

          color: #64748b;

        }



        .coordinator-empty {

          color: #64748b;

          background: #ffffff;

          padding: 30px;

          border-radius: 12px;

          text-align: center;

          border: 1px solid #e2e8f0;

        }



        .coordinator-project-list {

          display: flex;

          flex-direction: column;

          gap: 15px;

        }



        .coordinator-project-card {

          background: #ffffff;

          border-radius: 12px;

          border: 1px solid #e2e8f0;

          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

          padding: 22px 28px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 20px;

          transition: transform 0.2s ease, box-shadow 0.2s ease;

        }



        .coordinator-project-card:hover {

          transform: translateY(-2px);

          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);

        }



        .coordinator-project-info {

          min-width: 0;

        }



        .coordinator-project-name {

          font-size: 19px;

          font-weight: 800;

          color: #0f172a;

          margin: 0 0 6px 0;

          word-break: break-word;

        }



        .coordinator-project-status {

          font-size: 14px;

          color: #64748b;

          margin: 0;

        }



        .coordinator-status-value {

          font-weight: bold;

        }



        .coordinator-status-value.completed {

          color: #16a34a;

        }



        .coordinator-status-value.created {

          color: #0284c7;

        }



        .coordinator-status-value.in-progress {

          color: #d97706;

        }



        .coordinator-project-actions {

          display: flex;

          align-items: center;

          gap: 10px;

          flex-shrink: 0;

        }



        .coordinator-open-button {

          background: #0284c7;

          color: #ffffff;

          padding: 10px 22px;

          border-radius: 8px;

          border: none;

          cursor: pointer;

          font-weight: 700;

          font-size: 14px;

          transition: background 0.2s ease;

        }



        .coordinator-open-button:hover {

          background: #0369a1;

        }



        .coordinator-edit-button {

          background: #f8fafc;

          color: #475569;

          border: 1px solid #cbd5e1;

          padding: 10px 14px;

          border-radius: 8px;

          cursor: pointer;

          font-weight: bold;

          font-size: 14px;

          transition: background 0.2s ease;

        }



        .coordinator-edit-button:hover {

          background: #e2e8f0;

        }



        .coordinator-delete-button {

          background: #fef2f2;

          color: #ef4444;

          border: 1px solid #fca5a5;

          padding: 10px 14px;

          border-radius: 8px;

          cursor: pointer;

          font-weight: bold;

          font-size: 14px;

          transition: background 0.2s ease;

        }



        .coordinator-delete-button:hover {

          background: #fee2e2;

        }



        /* =====================================================

           EDIT PROJECT MODAL

        ====================================================== */



        .coordinator-modal-overlay {

          position: fixed;

          top: 0;

          left: 0;

          width: 100%;

          height: 100%;

          background: rgba(0, 0, 0, 0.5);

          display: flex;

          justify-content: center;

          align-items: center;

          z-index: 10000;

          padding: 20px;

        }



        .coordinator-edit-modal {

          background: #ffffff;

          padding: 30px;

          border-radius: 12px;

          width: 400px;

          max-width: 100%;

          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);

        }



        .coordinator-edit-modal-title {

          margin: 0 0 16px 0;

          color: #0f172a;

          font-size: 18px;

        }



        .coordinator-edit-form {

          display: flex;

          flex-direction: column;

          gap: 15px;

        }



        .coordinator-edit-input {

          width: 100%;

          padding: 10px 14px;

          border-radius: 6px;

          border: 1px solid #cbd5e1;

          font-size: 14px;

          box-sizing: border-box;

          outline: none;

        }



        .coordinator-edit-input:focus {

          border-color: #0284c7;

          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);

        }



        .coordinator-edit-actions {

          display: flex;

          justify-content: flex-end;

          gap: 10px;

          margin-top: 10px;

        }



        .coordinator-edit-cancel {

          background: #64748b;

          color: #ffffff;

          border: none;

          padding: 8px 16px;

          border-radius: 6px;

          cursor: pointer;

          font-weight: bold;

        }



        .coordinator-edit-cancel:hover {

          background: #475569;

        }



        .coordinator-edit-save {

          background: #0284c7;

          color: #ffffff;

          border: none;

          padding: 8px 20px;

          border-radius: 6px;

          cursor: pointer;

          font-weight: bold;

        }



        .coordinator-edit-save:hover:not(:disabled) {

          background: #0369a1;

        }



        .coordinator-edit-save:disabled {

          cursor: not-allowed;

          opacity: 0.7;

        }



        /* =====================================================

           RESPONSIVE

        ====================================================== */



        @media (max-width: 900px) {

          .coordinator-navbar {

            padding: 14px 20px;

          }



          .coordinator-main-content {

            max-width: 100%;

          }

        }



        @media (max-width: 700px) {

          .coordinator-navbar {

            flex-wrap: wrap;

            gap: 12px;

          }



          .coordinator-nav-left,

          .coordinator-nav-center,

          .coordinator-nav-right {

            flex: none;

          }



          .coordinator-nav-left {

            order: 1;

            width: 50%;

          }



          .coordinator-nav-center {

            order: 0;

            width: 100%;

          }



          .coordinator-nav-right {

            order: 2;

            width: 50%;

            justify-content: flex-end;

          }



          .coordinator-profile-text {

            font-size: 12px;

          }



          .coordinator-nav-title {

            font-size: 20px;

          }



          .coordinator-project-card {

            flex-direction: column;

            align-items: stretch;

          }



          .coordinator-project-actions {

            width: 100%;

            flex-wrap: wrap;

          }



          .coordinator-open-button {

            flex: 1;

          }



          .coordinator-brief-row {

            flex-direction: column;

          }



          .coordinator-upload-label {

            min-height: 44px;

          }



          .coordinator-form-actions {

            flex-wrap: wrap;

          }

        }



        @media (max-width: 480px) {

          .coordinator-navbar {

            padding: 12px 15px;

          }



          .coordinator-main-content {

            padding: 0 12px;

          }



          .coordinator-create-form {

            padding: 20px;

          }



          .coordinator-project-card {

            padding: 18px;

          }



          .coordinator-project-actions {

            flex-direction: column;

            align-items: stretch;

          }



          .coordinator-open-button,

          .coordinator-edit-button,

          .coordinator-delete-button {

            width: 100%;

          }



          .coordinator-notification-dropdown {

            position: fixed;

            top: 70px;

            right: 12px;

            width: calc(100vw - 24px);

          }



          .coordinator-popup {

            width: calc(100vw - 40px);

            padding: 14px 18px;

            font-size: 14px;

          }

        }



      `}</style>



      {/* =====================================================

          Toast Notification

      ====================================================== */}



      {popupMessage && (

        <div className="coordinator-popup">

          {popupMessage}

        </div>

      )}



      {/* =====================================================

          NAVBAR

      ====================================================== */}



      <nav className="coordinator-navbar">



        <div className="coordinator-nav-left">

          <span className="coordinator-profile-text">

            👤 {user?.name || 'Coordinator'} (

            {user?.role || 'coordinator'}

            )

          </span>

        </div>



        <div className="coordinator-nav-center">

          <img

            src="/logo.png"

            alt="Ostudio"

            className="coordinator-nav-logo"

            onError={(e) => {

              e.currentTarget.classList.add('coordinator-nav-logo-hidden');

            }}

          />



          <div className="coordinator-nav-title">

            Ostudio

          </div>

        </div>



        <div className="coordinator-nav-right">



          {/* Notifications */}



          <div className="coordinator-notification-wrapper">



            <button

              onClick={() =>

                setShowNotificationsDropdown(

                  !showNotificationsDropdown

                )

              }

              className="coordinator-notification-button"

              title="الإشعارات"

            >

              🔔



              {unreadCount > 0 && (

                <span className="coordinator-notification-badge">

                  {unreadCount}

                </span>

              )}

            </button>



            {showNotificationsDropdown && (

              <div className="coordinator-notification-dropdown">



                <div className="coordinator-notification-header">



                  <span className="coordinator-notification-title">

                    الإشعارات ({unreadCount})

                  </span>



                  <button

                    onClick={() =>

                      setShowNotificationsDropdown(false)

                    }

                    className="coordinator-notification-close"

                  >

                    ✕

                  </button>



                </div>



                {notifications.length === 0 ? (



                  <p className="coordinator-no-notifications">

                    لا توجد إشعارات حالياً

                  </p>



                ) : (



                  notifications.map((n) => (



                    <div

                      key={n.id}

                      onClick={() =>

                        handleMarkAsRead(n.id)

                      }

                      className={`coordinator-notification-item ${

                        n.read ? 'read' : 'unread'

                      }`}

                    >



                      <p

                        className={`coordinator-notification-message ${

                          n.read ? 'read' : 'unread'

                        }`}

                      >

                        {n.message}

                      </p>



                      <span className="coordinator-notification-time">

                        {n.createdAt?.toDate

                          ? n.createdAt

                              .toDate()

                              .toLocaleTimeString([], {

                                hour: '2-digit',

                                minute: '2-digit'

                              })

                          : 'الآن'}

                      </span>



                    </div>



                  ))



                )}



              </div>

            )}



          </div>



          {/* Logout */}



          <button

            onClick={onLogout}

            className="coordinator-logout-button"

          >

            Logout

          </button>



        </div>



      </nav>



      {/* =====================================================

          MAIN CONTENT

      ====================================================== */}



      <div className="coordinator-main-content">



        {/* Create New Project */}



        <div className="coordinator-create-section">



          <h3 className="coordinator-section-title">

            Create A New Project

          </h3>



          <button

            onClick={() => setShowNewModal(true)}

            className="coordinator-new-project-button"

          >

            + New Project

          </button>



        </div>



        {/* ===================================================

            Create Project Form

        ==================================================== */}



        {showNewModal && (

          <form

            onSubmit={handleCreateProject}

            className="coordinator-create-form"

          >



            <h3 className="coordinator-form-title">

              Create New Project

            </h3>



            {/* Project Name */}



            <div className="coordinator-form-group">



              <label className="coordinator-form-label">

                Project Name *

              </label>



              <input

                type="text"

                placeholder="Enter project name..."

                value={projectName}

                onChange={(e) =>

                  setProjectName(e.target.value)

                }

                required

                className="coordinator-input"

              />



            </div>



            {/* Brief */}



            <div className="coordinator-form-group">



              <label className="coordinator-form-label">

                Brief (File Upload or Link)

              </label>



              <div className="coordinator-brief-row">



                <input

                  type="text"

                  placeholder="Paste brief link or click upload..."

                  value={

                    briefFile

                      ? briefFile.name

                      : briefLinkOrText

                  }

                  onChange={(e) => {

                    setBriefLinkOrText(

                      e.target.value

                    );

                    setBriefFile(null);

                  }}

                  className="coordinator-input coordinator-brief-input"

                />



                <label className="coordinator-upload-label">



                  {briefFile

                    ? 'Selected ✓'

                    : 'Upload'}



                  <input

                    type="file"

                    className="coordinator-hidden-file"

                    onChange={(e) => {

                      if (e.target.files[0]) {

                        setBriefFile(

                          e.target.files[0]

                        );



                        setBriefLinkOrText(

                          e.target.files[0].name

                        );

                      }

                    }}

                  />



                </label>



              </div>



            </div>



            {/* Coordinator Notes */}



            <div className="coordinator-form-group notes">



              <label className="coordinator-form-label">

                Coordinator Notes (Optional)

              </label>



              <textarea

                placeholder="Additional instructions for designers..."

                value={managerNotes}

                onChange={(e) =>

                  setManagerNotes(e.target.value)

                }

                className="coordinator-textarea"

                rows="3"

              />



            </div>



            {/* Buttons */}



            <div className="coordinator-form-actions">



              <button

                type="submit"

                disabled={isSubmitting}

                className="coordinator-save-button"

              >

                {isSubmitting

                  ? 'Saving...'

                  : 'Save Project'}

              </button>



              <button

                type="button"

                onClick={() =>

                  setShowNewModal(false)

                }

                className="coordinator-cancel-button"

              >

                Cancel

              </button>



            </div>



          </form>

        )}



        {/* ===================================================

            Active Projects

        ==================================================== */}



        <h3 className="coordinator-projects-title">

          Active Projects ({projects.length})

        </h3>



        {loading ? (



          <p className="coordinator-loading">

            جارٍ مزامنة المشاريع مع Firebase...

          </p>



        ) : projects.length === 0 ? (



          <p className="coordinator-empty">

            لا توجد مشاريع مسجلة حالياً.

          </p>



        ) : (



          <div className="coordinator-project-list">



            {projects.map((proj) => (



              <div

                key={proj._id || proj.id}

                className="coordinator-project-card"

              >



                <div className="coordinator-project-info">



                  <h4 className="coordinator-project-name">

                    {proj.projectName || proj.name}

                  </h4>



                  <p className="coordinator-project-status">

                    Status:{' '}



                    <span

                      className={`coordinator-status-value ${

                        proj.status === 'completed'

                          ? 'completed'

                          : proj.status === 'created'

                          ? 'created'

                          : 'in-progress'

                      }`}

                    >

                      {proj.status || 'in-progress'}

                    </span>

                  </p>



                </div>



                <div className="coordinator-project-actions">



                  {/* Open */}



                  <button

                    onClick={() =>

                      handleOpenProject(proj)

                    }

                    className="coordinator-open-button"

                  >

                    Open Project Details

                  </button>



                  {/* Edit */}



                  <button

                    onClick={(e) =>

                      handleOpenEditModal(e, proj)

                    }

                    className="coordinator-edit-button"

                    title="تعديل اسم المشروع"

                  >

                    ✏️

                  </button>



                  {/* Delete */}



                  <button

                    onClick={(e) =>

                      handleDeleteProject(

                        e,

                        proj._id || proj.id

                      )

                    }

                    className="coordinator-delete-button"

                    title="حذف المشروع بالكامل"

                  >

                    🗑️

                  </button>



                </div>



              </div>



            ))}



          </div>



        )}



      </div>



      {/* =====================================================

          EDIT PROJECT MODAL

      ====================================================== */}



      {editingProject && (



        <div className="coordinator-modal-overlay">



          <div className="coordinator-edit-modal">



            <h3 className="coordinator-edit-modal-title">

              تعديل اسم المشروع ✏️

            </h3>



            <form

              onSubmit={handleSaveProjectName}

              className="coordinator-edit-form"

            >



              <div>



                <label className="coordinator-form-label">

                  اسم المشروع الجديد:

                </label>



                <input

                  type="text"

                  required

                  value={newEditedName}

                  onChange={(e) =>

                    setNewEditedName(

                      e.target.value

                    )

                  }

                  className="coordinator-edit-input"

                />



              </div>



              <div className="coordinator-edit-actions">



                <button

                  type="button"

                  onClick={() =>

                    setEditingProject(null)

                  }

                  className="coordinator-edit-cancel"

                >

                  إلغاء

                </button>



                <button

                  type="submit"

                  disabled={isUpdating}

                  className="coordinator-edit-save"

                >

                  {isUpdating

                    ? 'جارٍ الحفظ...'

                    : 'حفظ'}

                </button>



              </div>



            </form>



          </div>



        </div>



      )}



    </div>

  );

}