import React, { useEffect, useState } from 'react';import {

  createProject,

  deleteProject,

  subscribeToAllProjects,

  updateProject,

} from '../services/projectService';

import {

  markNotificationAsRead,

  subscribeToMyNotifications,

} from '../services/notificationService';import { uploadToCloudinary } from '../uploadService';import CoordinatorProjectDetails from './CoordinatorProjectDetails';export default function ManagerDashboard({ user, onLogout }) {  const [projects, setProjects] = useState([]);  const [loading, setLoading] = useState(true);  const [showNewModal, setShowNewModal] = useState(false);





// حالات إنشاء مشروع جديد
const [projectName, setProjectName] = useState('');  const [briefLinkOrText, setBriefLinkOrText] = useState('');  const [briefFile, setBriefFile] = useState(null);  const [managerNotes, setManagerNotes] = useState('');  const [isSubmitting, setIsSubmitting] = useState(false);





// حالات تعديل اسم المشروع
const [editingProject, setEditingProject] = useState(null);  const [newEditedName, setNewEditedName] = useState('');  const [isUpdating, setIsUpdating] = useState(false);





// حالات نظام الإشعارات
const [notifications, setNotifications] = useState([]);  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);





// حالة الرسالة المنبثقة (Popup Toast)
const [popupMessage, setPopupMessage] = useState(null);





  const showPopup = (msg) => {    setPopupMessage(msg);    setTimeout(() => {      setPopupMessage(null);    }, 2500);  };





  const [activeProject, setActiveProject] = useState(() => {    try {      const savedProj = localStorage.getItem('ostudio_active_project');      return savedProj ? JSON.parse(savedProj) : null;    } catch {      return null;    }  });





  // 1. الاستماع اللحظي لمشاريع Firestore عبر projectService

  useEffect(() => {

    const unsubscribe = subscribeToAllProjects(

      (projectsList) => {

        setProjects(projectsList);

        setLoading(false);



        if (activeProject) {

          const activeId = activeProject._id || activeProject.id;

          const latest = projectsList.find(

            (p) => (p._id || p.id) === activeId

          );



          if (latest) {

            setActiveProject(latest);

            localStorage.setItem(

              'ostudio_active_project',

              JSON.stringify(latest)

            );

          }

        }

      },

      (err) => {

        console.error('Projects Error:', err);

        setLoading(false);

      }

    );



    return () => unsubscribe();

  }, [activeProject?._id, activeProject?.id]);



  // 2. الاستماع اللحظي لإشعارات المدير عبر notificationService

  useEffect(() => {

    const uid = user?.uid || user?.id;

    if (!uid) {

      setNotifications([]);

      return () => {};

    }



    const unsubscribe = subscribeToMyNotifications(

      uid,

      (notificationList) => {

        setNotifications(notificationList);

      },

      (err) => {

        console.error('Notifications Error:', err);

      }

    );



    return () => unsubscribe();

  }, [user?.uid, user?.id]);



  const unreadCount = notifications.filter(n => !n.read).length;





// وضع علامة مقروء على إشعار
const handleMarkAsRead = async (notifId) => {

    try {

      await markNotificationAsRead(notifId);

    } catch (e) {

      console.error(e);

    }

  };





  const handleOpenProject = (proj) => {    setActiveProject(proj);    localStorage.setItem('ostudio_active_project', JSON.stringify(proj));  };





  const handleBackToList = () => {    setActiveProject(null);    localStorage.removeItem('ostudio_active_project');  };





// إنشاء مشروع جديد
const handleCreateProject = async (e) => {    e.preventDefault();    if (!projectName.trim()) return;





    try {      setIsSubmitting(true);      let finalBriefUrl = briefLinkOrText.trim();      let finalBriefName = '';





      if (briefFile) {        const uploadRes = await uploadToCloudinary(briefFile);        finalBriefUrl = uploadRes.url;        finalBriefName = uploadRes.originalName;      }





      await createProject({

        projectName: projectName.trim(),

        brief: finalBriefUrl,

        briefName: finalBriefName,

        managerNotes: managerNotes.trim(),

        createdById: user?.uid || user?.id || '',

        createdByName: user?.name || 'Manager',

      });





      showPopup('Project created successfully! 🚀');      setShowNewModal(false);      setProjectName('');      setBriefLinkOrText('');      setBriefFile(null);      setManagerNotes('');    } catch (err) {      console.error(err);      showPopup('Failed to create project: ' + err.message);    } finally {      setIsSubmitting(false);    }  };





// فتح نافذة تعديل الاسم
const handleOpenEditModal = (e, proj) => {    e.stopPropagation();    setEditingProject(proj);    setNewEditedName(proj.projectName || proj.name || '');  };





// حفظ الاسم الجديد
const handleSaveProjectName = async (e) => {    e.preventDefault();    if (!newEditedName.trim() || !editingProject) return;





    try {      setIsUpdating(true);      await updateProject(editingProject.id || editingProject._id, {

        projectName: newEditedName.trim(),

      });





      showPopup('تم تحديث اسم المشروع بنجاح! ');      setEditingProject(null);      setNewEditedName('');    } catch (err) {      console.error(err);      showPopup('فشل التعديل: ' + err.message);    } finally {      setIsUpdating(false);    }  };





// حذف المشروع بالكامل
const handleDeleteProject = async (e, projectId) => {    e.stopPropagation();    const confirmDelete = window.confirm('تحذير: هل أنت متأكد من حذف هذا المشروع نهائياً بكافة بياناته؟');    if (!confirmDelete) return;





    try {      await deleteProject(projectId);      showPopup('تم حذف المشروع بنجاح ');      if (activeProject && (activeProject.id === projectId || activeProject._id === projectId)) {        handleBackToList();      }    } catch (err) {      console.error(err);      showPopup('فشل الحذف: ' + err.message);    }  };





  if (activeProject) {    return (      <CoordinatorProjectDetails         project={activeProject}         user={user}         onBack={handleBackToList}         onLogout={onLogout}      />    );  }





  return (



    <><style>{`



.manager-page {



  direction: ltr;



  text-align: left;



  color: #000;



  position: relative;



  background: #f8fafc;



  min-height: 100vh;



  padding-bottom: 50px;



}.manager-toast {



  position: fixed;



  top: 50%;



  left: 50%;



  transform: translate(-50%, -50%);



  background-color: #0f172a;



  color: #fff;



  padding: 16px 32px;



  border-radius: 10px;



  font-size: 16px;



  font-weight: bold;



  box-shadow: 0 10px 25px rgba(0,0,0,0.3);



  z-index: 100000;



  text-align: center;



  border: 1px solid #38bdf8;



}.manager-navbar {



  background: #fff;



  border-bottom: 1px solid #e2e8f0;



  padding: 15px 40px;



  display: flex;



  justify-content: space-between;



  align-items: center;



}.manager-profile {



  font-weight: 600;



  color: #0f172a;



}.manager-brand {



  display: flex;



  flex-direction: row;



  align-items: center;



  justify-content: center;



  gap: 10px;



}.manager-logo {



  width: 35px;



  height: 35px;



  object-fit: contain;



}.manager-brand-title {



  font-size: 22px;



  font-weight: 800;



  color: #0f172a;



}.manager-actions {



  display: flex;



  align-items: center;



  gap: 18px;



  position: relative;



}.manager-notification-wrapper {



  position: relative;



}.manager-notification-button {



  background: none;



  border: none;



  font-size: 20px;



  cursor: pointer;



  position: relative;



  display: flex;



  align-items: center;



}.manager-notification-badge {



  position: absolute;



  top: -5px;



  right: -6px;



  background: #ef4444;



  color: #fff;



  border-radius: 50%;



  font-size: 11px;



  font-weight: bold;



  width: 18px;



  height: 18px;



  display: flex;



  align-items: center;



  justify-content: center;



}.manager-notification-dropdown {



  position: absolute;



  top: 35px;



  right: 0;



  width: 320px;



  background: #fff;



  border-radius: 10px;



  box-shadow: 0 10px 25px rgba(0,0,0,0.15);



  border: 1px solid #e2e8f0;



  z-index: 99999;



  padding: 12px;



  max-height: 380px;



  overflow-y: auto;



}.manager-notification-header {



  display: flex;



  justify-content: space-between;



  align-items: center;



  border-bottom: 1px solid #f1f5f9;



  padding-bottom: 8px;



  margin-bottom: 8px;



}.manager-notification-title {



  font-weight: bold;



  font-size: 14px;



  color: #0f172a;



}.manager-notification-close {



  background: none;



  border: none;



  color: #64748b;



  cursor: pointer;



  font-size: 13px;



}.manager-notification-empty {



  margin: 15px 0;



  font-size: 13px;



  color: #94a3b8;



  text-align: center;



}.manager-notification-time {



  font-size: 11px;



  color: #94a3b8;



  margin-top: 4px;



  display: block;



}.manager-logout {



  background: #ef4444;



  color: #fff;



  border: none;



  padding: 8px 18px;



  border-radius: 6px;



  cursor: pointer;



  font-size: 13px;



  font-weight: bold;



}.manager-content {



  max-width: 850px;



  margin: 0 auto;



  padding: 0 20px;



}.manager-create-section {



  margin-top: 35px;



  margin-bottom: 25px;



}.manager-create-heading {



  margin: 0 0 10px 0;



  font-size: 18px;



  font-weight: 800;



  color: #0f172a;



}.manager-new-project-button {



  width: 100%;



  background: #0284c7;



  color: #fff;



  border: none;



  padding: 14px;



  border-radius: 8px;



  font-weight: bold;



  cursor: pointer;



  font-size: 16px;



  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.2);



}.manager-create-form {



  background: #ffffff;



  padding: 30px;



  border-radius: 12px;



  margin-bottom: 30px;



  border: 1px solid #cbd5e1;



  box-shadow: 0 4px 15px rgba(0,0,0,0.05);



  color: #000;



}.manager-form-heading {



  margin-bottom: 20px;



  color: #0f172a;



  text-align: left;



}.manager-field-group {



  margin-bottom: 15px;



}.manager-field-label {



  display: block;



  font-size: 13px;



  font-weight: bold;



  color: #475569;



  margin-bottom: 6px;



}.manager-text-input {



  width: 100%;



  padding: 12px 16px;



  border-radius: 8px;



  border: 1px solid #cbd5e1;



  background: #ffffff;



  color: #000000;



  font-size: 15px;



  outline: none;



  box-sizing: border-box;



}.manager-brief-row {



  display: flex;



  gap: 10px;



}.manager-brief-input {



  flex: 1;



  padding: 12px 16px;



  border-radius: 8px;



  border: 1px solid #cbd5e1;



  background: #ffffff;



  color: #000000;



  font-size: 15px;



  outline: none;



  box-sizing: border-box;



}.manager-upload-label {



  background: #0ea5e9;



  color: #fff;



  padding: 0 20px;



  border-radius: 8px;



  display: flex;



  align-items: center;



  justify-content: center;



  cursor: pointer;



  font-weight: 600;



  font-size: 14px;



}.manager-hidden-file-input {



  display: none;



}.manager-notes-group {



  margin-bottom: 20px;



}.manager-textarea {



  width: 100%;



  padding: 12px 16px;



  border-radius: 8px;



  border: 1px solid #cbd5e1;



  background: #ffffff;



  color: #000000;



  font-size: 15px;



  outline: none;



  resize: vertical;



  box-sizing: border-box;



}.manager-form-actions {



  display: flex;



  gap: 10px;



  justify-content: flex-start;



}.manager-cancel-button {



  background: #64748b;



  color: #fff;



  border: none;



  padding: 12px 24px;



  border-radius: 8px;



  cursor: pointer;



}.manager-projects-heading {



  margin-bottom: 15px;



  color: #64748b;



  font-size: 16px;



  font-weight: bold;



  text-align: left;



}.manager-loading {



  text-align: center;



  color: #64748b;



}.manager-empty {



  color: #64748b;



  background: #fff;



  padding: 30px;



  border-radius: 12px;



  text-align: center;



  border: 1px solid #e2e8f0;



}.manager-project-list {



  display: flex;



  flex-direction: column;



  gap: 15px;



}.manager-project-card {



  background: #ffffff;



  border-radius: 12px;



  border: 1px solid #e2e8f0;



  box-shadow: 0 2px 8px rgba(0,0,0,0.02);



  padding: 22px 28px;



  display: flex;



  justify-content: space-between;



  align-items: center;



}.manager-project-title {



  font-size: 19px;



  font-weight: 800;



  color: #0f172a;



  margin: 0 0 6px 0;



}.manager-project-meta {



  font-size: 14px;



  color: #64748b;



  margin: 0;



}.manager-project-actions {



  display: flex;



  align-items: center;



  gap: 10px;



}.manager-open-button {



  background: #0284c7;



  color: #fff;



  padding: 10px 22px;



  border-radius: 8px;



  border: none;



  cursor: pointer;



  font-weight: 700;



  font-size: 14px;



}.manager-edit-button {



  background: #f8fafc;



  color: #475569;



  border: 1px solid #cbd5e1;



  padding: 10px 14px;



  border-radius: 8px;



  cursor: pointer;



  font-weight: bold;



  font-size: 14px;



}.manager-delete-button {



  background: #fef2f2;



  color: #ef4444;



  border: 1px solid #fca5a5;



  padding: 10px 14px;



  border-radius: 8px;



  cursor: pointer;



  font-weight: bold;



  font-size: 14px;



}.manager-edit-overlay {



  position: fixed;



  top: 0;



  left: 0;



  width: 100%;



  height: 100%;



  background: rgba(0,0,0,0.5);



  display: flex;



  justify-content: center;



  align-items: center;



  z-index: 10000;



}.manager-edit-modal {



  background: #fff;



  padding: 30px;



  border-radius: 12px;



  width: 400px;



  box-shadow: 0 10px 25px rgba(0,0,0,0.2);



}.manager-edit-title {



  margin: 0 0 16px 0;



  color: #0f172a;



  font-size: 18px;



}.manager-edit-input {



  width: 100%;



  padding: 10px 14px;



  border-radius: 6px;



  border: 1px solid #cbd5e1;



  font-size: 14px;



  box-sizing: border-box;



}.manager-edit-actions {



  display: flex;



  justify-content: flex-end;



  gap: 10px;



  margin-top: 10px;



}.manager-edit-cancel {



  background: #64748b;



  color: #fff;



  border: none;



  padding: 8px 16px;



  border-radius: 6px;



  cursor: pointer;



  font-weight: bold;



}.manager-notification-item {



  padding: 10px;



  border-radius: 6px;



  margin-bottom: 6px;



  cursor: pointer;



}.manager-notification-item.is-read {



  background: #f8fafc;



  border-left: 3px solid transparent;



}.manager-notification-item.is-unread {



  background: #eff6ff;



  border-left: 3px solid #0284c7;



}.manager-notification-message {



  margin: 0;



  font-size: 13px;



  color: #1e293b;



}.manager-notification-message.is-read {



  font-weight: 500;



}.manager-notification-message.is-unread {



  font-weight: 700;



}.manager-save-button {



  background: #22c55e;



  color: #fff;



  border: none;



  padding: 12px 24px;



  border-radius: 8px;



  font-weight: bold;



}.manager-save-button:not(:disabled),



.manager-edit-save:not(:disabled) {



  cursor: pointer;



}.manager-save-button:disabled,



.manager-edit-save:disabled {



  cursor: not-allowed;



}.manager-status {



  font-weight: bold;



}.manager-status.status-completed {



  color: #16a34a;



}.manager-status.status-created {



  color: #0284c7;



}.manager-status.status-other {



  color: #d97706;



}.manager-edit-save {



  background: #0284c7;



  color: #fff;



  border: none;



  padding: 8px 20px;



  border-radius: 6px;



  font-weight: bold;



}.manager-logo-hidden {



  display: none;



}@media (max-width: 768px) {



  .manager-navbar {



    padding: 12px 18px;



    gap: 12px;



  }  .manager-navbar .nav-left-profile span {



    font-size: 13px;



  }  .manager-brand-title {



    font-size: 19px;



  }  .manager-notification-dropdown {



    width: min(320px, calc(100vw - 30px));



    right: -70px;



  }  .manager-content {



    padding: 0 15px;



  }  .manager-project-card {



    flex-direction: column;



    align-items: stretch;



    gap: 18px;



  }  .manager-project-actions {



    flex-wrap: wrap;



  }  .manager-open-button {



    flex: 1;



  }  .manager-brief-row {



    flex-direction: column;



  }  .manager-upload-label {



    min-height: 44px;



  }



}@media (max-width: 480px) {



  .manager-navbar {



    padding: 12px;



  }  .manager-navbar .nav-left-profile {



    display: none;



  }  .manager-create-form,



  .manager-edit-modal {



    padding: 20px;



  }  .manager-edit-modal {



    width: calc(100% - 30px);



  }  .manager-project-card {



    padding: 18px;



  }  .manager-project-actions {



    width: 100%;



  }  .manager-open-button {



    width: 100%;



    flex-basis: 100%;



  }  .manager-new-project-button {



    font-size: 15px;



  }



}`}</style><div className="ostudio-wrapper manager-page">





        {/* Toast Notification */}        {popupMessage && (          <div className="manager-toast">            {popupMessage}          </div>        )}





        {/* الشريط العلوي */}        <nav className="ostudio-navbar manager-navbar">          <div className="nav-left-profile">            <span className="manager-profile">👤 {user?.name || 'Manager'} ({user?.role || 'manager'})</span>          </div>





          <div className="nav-center-brand manager-brand">            <img src="/logo.png" alt="Ostudio" className="nav-logo manager-logo" onError={(e) => { e.currentTarget.classList.add("manager-logo-hidden"); } } />            <div className="nav-title manager-brand-title">Ostudio</div>          </div>





          <div className="nav-right-actions manager-actions">            {/* زر الجرس مع عداد الإشعارات */}            <div className="manager-notification-wrapper">              <button                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}                className="manager-notification-button"                title="الإشعارات"              >                                {unreadCount > 0 && (                  <span className="manager-notification-badge">                    {unreadCount}                  </span>                )}              </button>





              {/* القائمة المنسدلة للإشعارات */}              {showNotificationsDropdown && (                <div className="manager-notification-dropdown">                  <div className="manager-notification-header">                    <span className="manager-notification-title">الإشعارات ({unreadCount})</span>                    <button onClick={() => setShowNotificationsDropdown(false)} className="manager-notification-close">✕</button>                  </div>





                  {notifications.length === 0 ? (                    <p className="manager-notification-empty">لا توجد إشعارات حالياً</p>                  ) : (                    notifications.map((n) => (                      <div                        key={n.id}                        onClick={() => handleMarkAsRead(n.id)}                        className={`manager-notification-item ${n.read ? "is-read" : "is-unread"}`}                      >                        <p className={`manager-notification-message ${n.read ? "is-read" : "is-unread"}`}>                          {n.message}                        </p>                        <span className="manager-notification-time">                          {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'الآن'}                        </span>                      </div>                    ))                  )}                </div>              )}            </div>





            <button onClick={onLogout} className="manager-logout">              Logout            </button>          </div>        </nav>





        <div className="ostudio-main-content manager-content">





          {/* قسم إضافة المشروع مع الكلمة المطلوبة Create A New Project */}          <div className="manager-create-section">            <h3 className="manager-create-heading">              Create A New Project            </h3>            <button              onClick={() => setShowNewModal(true)}              className="manager-new-project-button"            >              + New Project            </button>          </div>





          {/* نموذج إنشاء مشروع جديد */}          {showNewModal && (            <form onSubmit={handleCreateProject} className="manager-create-form">              <h3 className="manager-form-heading">Create New Project</h3>





              <div className="manager-field-group">                <label className="manager-field-label">Project Name *</label>                <input                  type="text"                  placeholder="Enter project name..."                  value={projectName}                  onChange={(e) => setProjectName(e.target.value)}                  required                  className="manager-text-input" />              </div>





              <div className="manager-field-group">                <label className="manager-field-label">Brief (File Upload or Link)</label>                <div className="manager-brief-row">                  <input                    type="text"                    placeholder="Paste brief link or click upload..."                    value={briefFile ? briefFile.name : briefLinkOrText}                    onChange={(e) => {                      setBriefLinkOrText(e.target.value);                      setBriefFile(null);                    } }                    className="manager-brief-input" />                  <label className="manager-upload-label">                    {briefFile ? 'Selected ✓' : 'Upload'}                    <input                      type="file"





                      className="manager-hidden-file-input"

                      onChange={(e) => {                        if (e.target.files[0]) {                          setBriefFile(e.target.files[0]);                          setBriefLinkOrText(e.target.files[0].name);                        }                      } } />                  </label>                </div>              </div>





              <div className="manager-notes-group">                <label className="manager-field-label">Manager Notes (Optional)</label>                <textarea                  placeholder="Additional instructions for designers/coordinators..."                  value={managerNotes}                  onChange={(e) => setManagerNotes(e.target.value)}                  className="manager-textarea"                  rows="3" />              </div>





              <div className="manager-form-actions">                <button                  type="submit"                  disabled={isSubmitting}





                  className="manager-save-button">                  {isSubmitting ? 'Saving...' : 'Save Project'}                </button>                <button                  type="button"                  onClick={() => setShowNewModal(false)}                  className="manager-cancel-button"                >                  Cancel                </button>              </div>            </form>          )}





          <h3 className="manager-projects-heading">            Active Projects ({projects.length})          </h3>





          {loading ? (            <p className="manager-loading">جارٍ مزامنة المشاريع مع Firebase...</p>          ) : projects.length === 0 ? (            <p className="manager-empty">لا توجد مشاريع مسجلة حالياً.</p>          ) : (            <div className="manager-project-list">              {projects.map((proj) => (                <div                  key={proj._id || proj.id}





                  className="manager-project-card">                  <div>                    <h4 className="manager-project-title">                      {proj.projectName || proj.name}                    </h4>                    <p className="manager-project-meta">                      Status: <span className={`manager-status ${proj.status === "completed" ? "status-completed" : proj.status === "created" ? "status-created" : "status-other"}`}>{proj.status || 'in-progress'}</span>                    </p>                  </div>





                  <div className="manager-project-actions">                    <button                      onClick={() => handleOpenProject(proj)}                      className="manager-open-button"                    >                      Open Project Details                    </button>





                    <button                      onClick={(e) => handleOpenEditModal(e, proj)}                      className="manager-edit-button"                      title="تعديل اسم المشروع"                    >                                          </button>





                    <button                      onClick={(e) => handleDeleteProject(e, proj._id || proj.id)}                      className="manager-delete-button"                      title="حذف المشروع بالكامل"                    >                                          </button>                  </div>                </div>              ))}            </div>          )}





        </div>





        {/* نافذة تعديل اسم المشروع */}        {editingProject && (          <div className="manager-edit-overlay">            <div className="manager-edit-modal">              <h3 className="manager-edit-title">تعديل اسم المشروع </h3>              <form onSubmit={handleSaveProjectName} className="manager-project-list">                <div>                  <label className="manager-field-label">اسم المشروع الجديد:</label>                  <input                    type="text"                    required                    value={newEditedName}                    onChange={(e) => setNewEditedName(e.target.value)}                    className="manager-edit-input" />                </div>





                <div className="manager-edit-actions">                  <button                    type="button"                    onClick={() => setEditingProject(null)}                    className="manager-edit-cancel"                  >                    إلغاء                  </button>                  <button                    type="submit"                    disabled={isUpdating}





                    className="manager-edit-save">                    {isUpdating ? 'جارٍ الحفظ...' : 'حفظ'}                  </button>                </div>              </form>            </div>          </div>        )}





      </div></>  );}
