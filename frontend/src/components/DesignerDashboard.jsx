import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import DesignerProjectDetails from './DesignerProjectDetails';
import './OstudioLayout.css';

export default function DesignerDashboard({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [activeProject, setActiveProject] = useState(() => {
    try {
      const savedProj = localStorage.getItem('ostudio_designer_active_proj');
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

  // 1. الاستماع اللحظي للمشاريع من Firestore
  useEffect(() => {
    const projectsQuery = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      const allProjects = snapshot.docs.map((d) => ({
        id: d.id,
        _id: d.id,
        ...d.data()
      }));

      // تصفية المشاريع المخصصة للمصمم (بواسطة UID أو الاسم) أو غير المحددة
      const designerProjects = allProjects.filter((p) => {
        const assigned = p.assignedDesigner || p.assignedDesignerId || p.assignedDesignerName;
        return (
          assigned === designerId ||
          assigned === designerName ||
          !assigned
        );
      });

      setProjects(designerProjects);

      if (activeProject) {
        const latest = designerProjects.find(
          (p) => p._id === activeProject._id || p.id === activeProject.id
        );
        if (latest) {
          setActiveProject(latest);
          localStorage.setItem('ostudio_designer_active_proj', JSON.stringify(latest));
        }
      }
    }, (err) => {
      console.error('Projects subscription error:', err);
    });

    return () => unsubProjects();
  }, [designerId, designerName, activeProject?._id, activeProject?.id]);

  // 2. الاستماع اللحظي لإشعارات المصمم من Firestore
  useEffect(() => {
    if (!designerId && !designerName) return;

    const notifQuery = query(
      collection(db, 'notifications'),
      where('designerId', 'in', [designerId, designerName].filter(Boolean))
    );

    const unsubNotifs = onSnapshot(notifQuery, (snapshot) => {
      const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(notifs);
    }, (err) => {
      console.warn('Notifications fetch notice:', err);
      setNotifications([]);
    });

    return () => unsubNotifs();
  }, [designerId, designerName]);

  const handleOpenProject = (proj) => {
    setActiveProject(proj);
    localStorage.setItem('ostudio_designer_active_proj', JSON.stringify(proj));
  };

  const handleBackToList = () => {
    setActiveProject(null);
    localStorage.removeItem('ostudio_designer_active_proj');
  };

  if (activeProject) {
    return <DesignerProjectDetails project={activeProject} user={user} onBack={handleBackToList} />;
  }

  return (
    <div className="ostudio-wrapper" style={{ direction: 'ltr', textAlign: 'left', color: '#000', backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative' }}>
      
      {/* نافذة الرسائل المنبثقة الصغيرة */}
      {popupMessage && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: '#0f172a', color: '#fff', padding: '16px 32px', borderRadius: '10px',
          fontSize: '16px', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 100000, textAlign: 'center', border: '1px solid #38bdf8'
        }}>
          {popupMessage}
        </div>
      )}

      {/* الشريط العلوي (Navbar) */}
      <nav className="ostudio-navbar" style={{ position: 'relative' }}>
        <div className="nav-left-profile">
          <span>👤 {user?.name || 'Ali Wael'} ({user?.role || 'designer'})</span>
        </div>
        
        <div className="nav-center-brand">
          <img src="/logo.png" alt="Ostudio" className="nav-logo" onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="nav-title">Ostudio</div>
        </div>

        <div className="nav-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* زر الجرس والإشعارات */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', position: 'relative' }} 
              title="الإشعارات"
            >
              🔔
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {/* قائمة منسدلة للإشعارات */}
            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: '35px', width: '300px', backgroundColor: '#fff',
                border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, padding: '15px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>الإشعارات الجديدة 🔔</h4>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>لا توجد إشعارات حالياً.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {notifications.map((notif, index) => (
                      <div key={notif.id || index} style={{ fontSize: '12px', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155' }}>
                        {notif.message || notif}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={onLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* قائمة المشاريع */}
      <div className="ostudio-main-content" style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px', backgroundColor: '#ffffff' }}>
        {projects.length === 0 ? (
          <p style={{ color: '#64748b', background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>لا توجد مشاريع مضافة حالياً.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {projects.map((proj) => (
              <div key={proj._id || proj.id} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>{proj.projectName || proj.name}</h4>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                    Status: <span style={{ color: proj.status === 'completed' || proj.status === 'finished' ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>{proj.status || 'in-progress'}</span>
                  </p>
                </div>
                <div>
                  <button 
                    onClick={() => handleOpenProject(proj)}
                    style={{ background: '#0284c7', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                  >
                    Open Project Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}