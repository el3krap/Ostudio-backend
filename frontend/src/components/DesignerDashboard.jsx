import React, { useEffect, useState } from 'react';

import DesignerProjectDetails from './DesignerProjectDetails';

import {
  subscribeToAllProjects,
} from '../services/projectService';

import {
  subscribeToMyNotifications,
  markNotificationAsRead,
} from '../services/notificationService';
export default function DesignerDashboard({ user, onLogout }) {

  const [projects, setProjects] = useState([]);

  const [notifications, setNotifications] = useState([]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [activeProject, setActiveProject] = useState(() => {

    try {

      const savedProj = localStorage.getItem(

        'ostudio_designer_active_proj'

      );
      return savedProj ? JSON.parse(savedProj) : null;

    } catch {

      return null;

    }

  });
  const [popupMessage, setPopupMessage] = useState(null);
  const showPopup = (msg) => {

    setPopupMessage(msg);
    setTimeout(() => {

      setPopupMessage(null);

    }, 2000);

  };
  const designerId = user?.uid || user?.id || user?._id;

  const designerName = user?.name || '';
  /*
   * 1. الاستماع اللحظي للمشاريع عبر projectService
   */
  useEffect(() => {
    const unsubscribe = subscribeToAllProjects(
      (allProjects) => {
        /*
         * تصفية المشاريع المخصصة للمصمم
         * بواسطة UID أو ID أو الاسم أو منشن البرزنتيشن
         * أو المشاريع غير المحددة
         */
        const designerProjects = allProjects.filter((p) => {
          const assigned =
            p.assignedDesigner ||
            p.assignedDesignerId ||
            p.assignedDesignerName;

          const presenter = p.assignedPresenterId;

          return (
            assigned === designerId ||
            assigned === designerName ||
            presenter === designerId ||
            !assigned
          );
        });

        setProjects(designerProjects);

        if (activeProject) {
          const latest = designerProjects.find(
            (p) =>
              p._id === activeProject._id ||
              p.id === activeProject.id
          );

          if (latest) {
            setActiveProject(latest);

            localStorage.setItem(
              'ostudio_designer_active_proj',
              JSON.stringify(latest)
            );
          }
        }
      },
      (err) => {
        console.error(
          'Projects subscription error:',
          err
        );
      }
    );

    return () => unsubscribe();
  }, [
    designerId,
    designerName,
    activeProject?._id,
    activeProject?.id
  ]);

  /*
   * 2. الاستماع اللحظي لإشعارات المصمم عبر notificationService
   */
  useEffect(() => {
    if (!designerId) return;

    const unsubscribe = subscribeToMyNotifications(
      designerId,
      (notifs) => {
        setNotifications(notifs);
      },
      (err) => {
        console.warn(
          'Notifications fetch notice:',
          err
        );

        setNotifications([]);
      }
    );

    return () => unsubscribe();
  }, [designerId]);

  const handleOpenProject = (proj) => {

    setActiveProject(proj);
    localStorage.setItem(

      'ostudio_designer_active_proj',

      JSON.stringify(proj)

    );

  };
  const handleBackToList = () => {

    setActiveProject(null);
    localStorage.removeItem(

      'ostudio_designer_active_proj'

    );

  };
  /*

   * تحديد الإشعار كمقروء

   */

  const handleMarkAsRead = async (notifId) => {
    try {
      await markNotificationAsRead(notifId);

      showPopup(
        'تم تحديث الإشعار كمقروء ✓'
      );
    } catch (e) {
      console.error(e);
    }
  };
  /*

   * إذا كان هناك مشروع مفتوح

   * نعرض صفحة تفاصيل المشروع

   */

  if (activeProject) {

    return (

      <DesignerProjectDetails

        project={activeProject}

        user={user}

        onBack={handleBackToList}

      />

    );

  }
  const unreadNotifsCount =

    notifications.filter(

      (n) => !n.read

    ).length;
  return (

    <>

      <style>{`

        /* =====================================================

           Designer Dashboard

           ===================================================== */
        .designer-dashboard-page {

          direction: ltr;

          text-align: left;

          color: #000;

          background-color: #ffffff;

          min-height: 100vh;

          position: relative;

          font-family:

            "Segoe UI",

            Tahoma,

            Geneva,

            Verdana,

            sans-serif;

          box-sizing: border-box;

        }
        .designer-dashboard-page *,

        .designer-dashboard-page *::before,

        .designer-dashboard-page *::after {

          box-sizing: border-box;

        }
        /* =====================================================

           Popup

           ===================================================== */
        .designer-dashboard-popup {

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

          box-shadow:

            0 10px 25px rgba(0, 0, 0, 0.3);

          z-index: 100000;

          text-align: center;

          border: 1px solid #38bdf8;

          max-width: calc(100vw - 40px);

        }
        /* =====================================================

           Navbar

           ===================================================== */
        .designer-dashboard-navbar {

          position: relative;

          width: 100%;

          background: #fff;

          padding: 15px 30px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          border-bottom: 1px solid #e2e8f0;

          min-height: 65px;

          z-index: 1000;

        }
        .designer-dashboard-nav-profile {

          display: flex;

          align-items: center;

          min-width: 0;

        }
        .designer-dashboard-nav-profile span {

          font-weight: bold;

          color: #0f172a;

          white-space: nowrap;

        }
        .designer-dashboard-nav-brand {

          position: absolute;

          left: 50%;

          top: 50%;

          transform: translate(-50%, -50%);

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 10px;

        }
        .designer-dashboard-nav-logo {

          width: 38px;

          height: 38px;

          object-fit: contain;

        }
        .designer-dashboard-nav-title {

          color: #0f172a;

          font-size: 20px;

          font-weight: bold;

        }
        .designer-dashboard-nav-actions {

          display: flex;

          align-items: center;

          gap: 15px;

        }
        /* =====================================================

           Notification Button

           ===================================================== */
        .designer-dashboard-notification-wrapper {

          position: relative;

        }
        .designer-dashboard-notification-button {

          background: none;

          border: none;

          font-size: 18px;

          cursor: pointer;

          position: relative;

          padding: 5px;

          line-height: 1;

        }
        .designer-dashboard-notification-badge {

          position: absolute;

          top: -5px;

          right: -5px;

          background: #ef4444;

          color: #fff;

          border-radius: 50%;

          width: 18px;

          height: 18px;

          font-size: 10px;

          display: flex;

          justify-content: center;

          align-items: center;

          font-weight: bold;

        }
        /* =====================================================

           Notifications Dropdown

           ===================================================== */
        .designer-dashboard-notifications-dropdown {

          position: absolute;

          right: 0;

          top: 35px;

          width: 320px;

          background-color: #fff;

          border: 1px solid #cbd5e1;

          border-radius: 8px;

          box-shadow:

            0 4px 12px rgba(0, 0, 0, 0.15);

          z-index: 1000;

          padding: 15px;

        }
        .designer-dashboard-notifications-header {

          margin: 0 0 10px 0;

          font-size: 14px;

          color: #0f172a;

          border-bottom: 1px solid #e2e8f0;

          padding-bottom: 6px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 10px;

        }
        .designer-dashboard-unread-count {

          font-size: 11px;

          color: #64748b;

          white-space: nowrap;

        }
        .designer-dashboard-no-notifications {

          font-size: 12px;

          color: #64748b;

          margin: 0;

          text-align: center;

          padding: 10px 0;

        }
        .designer-dashboard-notifications-list {

          display: flex;

          flex-direction: column;

          gap: 8px;

          max-height: 220px;

          overflow-y: auto;

        }
        .designer-dashboard-notification-item {

          font-size: 12px;

          padding: 10px;

          border-radius: 6px;

          border: 1px solid;

          color: #334155;

          display: flex;

          flex-direction: column;

          gap: 6px;

        }
        .designer-dashboard-notification-item.is-read {

          background: #f8fafc;

          border-color: #e2e8f0;

        }
        .designer-dashboard-notification-item.is-unread {

          background: #e0f2fe;

          border-color: #bae6fd;

        }
        .designer-dashboard-notification-message {

          line-height: 1.5;

          word-break: break-word;

        }
        .designer-dashboard-notification-footer {

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 8px;

        }
        .designer-dashboard-notification-type {

          font-size: 10px;

          color: #64748b;

        }
        .designer-dashboard-mark-read-button {

          border: none;

          background: #0284c7;

          color: #fff;

          padding: 2px 6px;

          border-radius: 4px;

          font-size: 10px;

          cursor: pointer;

          font-weight: bold;

        }
        .designer-dashboard-mark-read-button:hover {

          background: #0369a1;

        }
        /* =====================================================

           Logout

           ===================================================== */
        .designer-dashboard-logout-button {

          background: #ef4444;

          color: #fff;

          border: none;

          padding: 6px 16px;

          border-radius: 6px;

          cursor: pointer;

          font-size: 13px;

          font-weight: bold;

          transition:

            background 0.2s ease,

            transform 0.15s ease;

        }
        .designer-dashboard-logout-button:hover {

          background: #dc2626;

          transform: translateY(-1px);

        }
        /* =====================================================

           Main Content

           ===================================================== */
        .designer-dashboard-main {

          width: 100%;

          max-width: 800px;

          margin: 30px auto;

          padding: 0 20px;

          background-color: #ffffff;

        }
        .designer-dashboard-page-title {

          color: #0f172a;

          margin: 0 0 20px;

          font-size: 22px;

          font-weight: 700;

        }
        /* =====================================================

           Empty State

           ===================================================== */
        .designer-dashboard-empty {

          color: #64748b;

          background: #f8fafc;

          padding: 20px;

          border-radius: 8px;

          text-align: center;

          border: 1px solid #e2e8f0;

        }
        /* =====================================================

           Projects List

           ===================================================== */
        .designer-dashboard-projects {

          display: flex;

          flex-direction: column;

          gap: 20px;

        }
        .designer-dashboard-project-card {

          background: #ffffff;

          border-radius: 12px;

          border: 1px solid #e2e8f0;

          overflow: hidden;

          box-shadow:

            0 4px 12px rgba(0, 0, 0, 0.03);

          padding: 25px;

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 20px;

        }
        .designer-dashboard-project-info {

          min-width: 0;

          flex: 1;

        }
        .designer-dashboard-project-title {

          font-size: 20px;

          font-weight: bold;

          color: #0f172a;

          margin: 0 0 6px;

          word-break: break-word;

        }
        .designer-dashboard-project-status {

          font-size: 14px;

          color: #64748b;

          margin: 0 0 6px;

        }
        .designer-dashboard-project-status-value {

          font-weight: bold;

        }
        .designer-dashboard-project-status-value.is-completed {

          color: #16a34a;

        }
        .designer-dashboard-project-status-value.is-active {

          color: #d97706;

        }
        .designer-dashboard-presentation-badge {

          display: inline-block;

          background: #e0f2fe;

          color: #0284c7;

          padding: 3px 8px;

          border-radius: 4px;

          font-size: 11px;

          font-weight: bold;

          line-height: 1.5;

        }
        .designer-dashboard-project-action {

          flex-shrink: 0;

        }
        .designer-dashboard-open-button {

          background: #0284c7;

          color: #fff;

          padding: 10px 20px;

          border-radius: 6px;

          border: none;

          cursor: pointer;

          font-weight: 600;

          font-size: 14px;

          transition:

            background 0.2s ease,

            transform 0.15s ease;

        }
        .designer-dashboard-open-button:hover {

          background: #0369a1;

          transform: translateY(-1px);

        }
        .designer-dashboard-open-button:active {

          transform: translateY(0);

        }
        /* =====================================================

           Responsive - Tablet

           ===================================================== */
        @media (max-width: 800px) {

          .designer-dashboard-navbar {

            padding: 14px 20px;

          }
          .designer-dashboard-nav-brand {

            position: static;

            transform: none;

            margin: 0 auto;

          }
          .designer-dashboard-nav-title {

            font-size: 18px;

          }
          .designer-dashboard-nav-logo {

            width: 32px;

            height: 32px;

          }
          .designer-dashboard-nav-profile span {

            font-size: 13px;

          }
          .designer-dashboard-main {

            margin-top: 25px;

          }
          .designer-dashboard-project-card {

            padding: 20px;

          }

        }
        /* =====================================================

           Responsive - Mobile

           ===================================================== */
        @media (max-width: 600px) {

          .designer-dashboard-navbar {

            padding: 12px 15px;

            flex-wrap: wrap;

            gap: 12px;

          }
          .designer-dashboard-nav-profile {

            order: 1;

            width: 100%;

          }
          .designer-dashboard-nav-profile span {

            white-space: normal;

            font-size: 12px;

          }
          .designer-dashboard-nav-brand {

            order: 2;

            margin: 0;

          }
          .designer-dashboard-nav-title {

            font-size: 17px;

          }
          .designer-dashboard-nav-actions {

            order: 3;

            margin-left: auto;

            gap: 8px;

          }
          .designer-dashboard-notifications-dropdown {

            position: fixed;

            top: 70px;

            right: 10px;

            left: 10px;

            width: auto;

            max-width: none;

          }
          .designer-dashboard-main {

            margin: 20px auto;

            padding: 0 12px;

          }
          .designer-dashboard-page-title {

            font-size: 20px;

          }
          .designer-dashboard-project-card {

            flex-direction: column;

            align-items: stretch;

            padding: 18px;

          }
          .designer-dashboard-project-action {

            width: 100%;

          }
          .designer-dashboard-open-button {

            width: 100%;

          }
          .designer-dashboard-project-title {

            font-size: 18px;

          }
          .designer-dashboard-popup {

            width: calc(100vw - 30px);

            padding: 14px 18px;

            font-size: 14px;

          }

        }
        /* =====================================================

           Responsive - Very Small Screens

           ===================================================== */
        @media (max-width: 400px) {

          .designer-dashboard-nav-brand {

            display: none;

          }
          .designer-dashboard-nav-actions {

            margin-left: auto;

          }
          .designer-dashboard-logout-button {

            padding: 6px 12px;

            font-size: 12px;

          }
          .designer-dashboard-notification-button {

            font-size: 17px;

          }

        }

      `}</style>
      <div className="designer-dashboard-page">
        {/* نافذة الرسائل المنبثقة الصغيرة */}

        {popupMessage && (

          <div className="designer-dashboard-popup">

            {popupMessage}

          </div>

        )}
        {/* الشريط العلوي */}

        <nav className="designer-dashboard-navbar">
          <div className="designer-dashboard-nav-profile">

            <span>

              👤 {user?.name || 'Ali Wael'} (

              {user?.role || 'designer'}

              )

            </span>

          </div>
          <div className="designer-dashboard-nav-brand">

            <img

              src="/logo.png"

              alt="Ostudio"

              className="designer-dashboard-nav-logo"

              onError={(e) => {

                e.target.style.display = 'none';

              }}

            />
            <div className="designer-dashboard-nav-title">

              Ostudio

            </div>

          </div>
          <div className="designer-dashboard-nav-actions">
            {/* زر الجرس والإشعارات والمنشن */}

            <div className="designer-dashboard-notification-wrapper">
              <button

                className="designer-dashboard-notification-button"

                onClick={() =>

                  setShowNotifications(

                    !showNotifications

                  )

                }

                title="الإشعارات والمنشن"

              >

                
                {unreadNotifsCount > 0 && (

                  <span className="designer-dashboard-notification-badge">

                    {unreadNotifsCount}

                  </span>

                )}

              </button>
              {/* قائمة الإشعارات والمنشن */}

              {showNotifications && (

                <div className="designer-dashboard-notifications-dropdown">
                  <h4 className="designer-dashboard-notifications-header">

                    <span>

                      الإشعارات والمنشن 

                    </span>
                    <span className="designer-dashboard-unread-count">

                      ({unreadNotifsCount} غير مقروءة)

                    </span>

                  </h4>
                  {notifications.length === 0 ? (

                    <p className="designer-dashboard-no-notifications">

                      لا توجد إشعارات حالياً.

                    </p>

                  ) : (

                    <div className="designer-dashboard-notifications-list">
                      {notifications.map((notif) => (

                        <div

                          key={notif.id}

                          className={`designer-dashboard-notification-item ${

                            notif.read

                              ? 'is-read'

                              : 'is-unread'

                          }`}

                        >
                          <span className="designer-dashboard-notification-message">

                            {notif.message}

                          </span>
                          <div className="designer-dashboard-notification-footer">
                            <span className="designer-dashboard-notification-type">

                              {notif.type ===

                              'presentation_request'

                                ? '📊 برزنتيشن'

                                : '📌 مهام'}

                            </span>
                            {!notif.read && (

                              <button

                                className="designer-dashboard-mark-read-button"

                                onClick={() =>

                                  handleMarkAsRead(

                                    notif.id

                                  )

                                }

                              >

                                مقروء ✓

                              </button>

                            )}
                          </div>

                        </div>

                      ))}
                    </div>

                  )}
                </div>

              )}
            </div>
            <button

              className="designer-dashboard-logout-button"

              onClick={onLogout}

            >

              Logout

            </button>
          </div>

        </nav>
        {/* قائمة المشاريع */}

        <div className="designer-dashboard-main">
          <h2 className="designer-dashboard-page-title">

            My Assigned Projects

          </h2>
          {projects.length === 0 ? (

            <p className="designer-dashboard-empty">

              لا توجد مشاريع مضافة حالياً.

            </p>

          ) : (

            <div className="designer-dashboard-projects">
              {projects.map((proj) => {

                const isCompleted =

                  proj.status === 'completed' ||

                  proj.status === 'finished';
                return (

                  <div

                    key={proj._id || proj.id}

                    className="designer-dashboard-project-card"

                  >
                    <div className="designer-dashboard-project-info">
                      <h4 className="designer-dashboard-project-title">

                        {proj.projectName ||

                          proj.name}

                      </h4>
                      <p className="designer-dashboard-project-status">

                        Status:{' '}

                        <span

                          className={`designer-dashboard-project-status-value ${

                            isCompleted

                              ? 'is-completed'

                              : 'is-active'

                          }`}

                        >

                          {proj.status ||

                            'in-progress'}

                        </span>

                      </p>
                      {proj.assignedPresenterId ===

                        designerId && (

                        <span className="designer-dashboard-presentation-badge">

                          📊 أنت مسند إليك تقديم

                          البرزنتيشن لهذا المشروع

                        </span>

                      )}
                    </div>
                    <div className="designer-dashboard-project-action">
                      <button

                        className="designer-dashboard-open-button"

                        onClick={() =>

                          handleOpenProject(proj)

                        }

                      >

                        Open Project Details

                      </button>
                    </div>
                  </div>

                );

              })}
            </div>

          )}
        </div>
      </div>

    </>

  );

}