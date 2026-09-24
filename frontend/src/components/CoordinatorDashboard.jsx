import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToCloudinary } from '../uploadService';
import CoordinatorProjectDetails from './CoordinatorProjectDetails';
import './OstudioLayout.css';

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
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

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

  // الاستماع اللحظي لكافة المشاريع
  useEffect(() => {
    const projectsQuery = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        _id: docSnap.id,
        ...docSnap.data()
      }));

      setProjects(projectsList);
      setLoading(false);

      if (activeProject) {
        const latest = projectsList.find(p => (p._id || p.id) === (activeProject._id || activeProject.id));
        if (latest) {
          setActiveProject(latest);
          localStorage.setItem('ostudio_coord_active_proj', JSON.stringify(latest));
        }
      }
    }, (err) => {
      console.error('Firestore Error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeProject?._id, activeProject?.id]);

  // الاستماع اللحظي لإشعارات المنسق
  useEffect(() => {
    const notifQuery = query(
      collection(db, 'notifications'),
      where('targetRole', 'in', ['coordinator', 'manager', 'all']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
      const notifList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setNotifications(notifList);
    }, (err) => {
      console.error('Notifications Error:', err);
    });

    return () => unsubscribeNotif();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenProject = (proj) => {
    setActiveProject(proj);
    localStorage.setItem('ostudio_coord_active_proj', JSON.stringify(proj));
  };

  const handleBackToList = () => {
    setActiveProject(null);
    localStorage.removeItem('ostudio_coord_active_proj');
  };

  // إنشاء مشروع جديد
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

      await addDoc(collection(db, 'projects'), {
        projectName: projectName.trim(),
        name: projectName.trim(),
        brief: finalBriefUrl,
        briefName: finalBriefName,
        managerNotes: managerNotes.trim(),
        status: 'created',
        createdBy: user?.name || 'Coordinator',
        createdById: user?.uid || user?.id || '',
        checkpoints: [],
        createdAt: serverTimestamp()
      });

      showPopup('Project created successfully! 🚀');
      setShowNewModal(false);
      setProjectName('');
      setBriefLinkOrText('');
      setBriefFile(null);
      setManagerNotes('');
    } catch (err) {
      console.error(err);
      showPopup('Failed to create project: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح نافذة تعديل الاسم
  const handleOpenEditModal = (e, proj) => {
    e.stopPropagation();
    setEditingProject(proj);
    setNewEditedName(proj.projectName || proj.name || '');
  };

  // حفظ الاسم الجديد
  const handleSaveProjectName = async (e) => {
    e.preventDefault();
    if (!newEditedName.trim() || !editingProject) return;

    try {
      setIsUpdating(true);
      const projRef = doc(db, 'projects', editingProject.id || editingProject._id);
      await updateDoc(projRef, {
        projectName: newEditedName.trim(),
        name: newEditedName.trim()
      });

      showPopup('تم تحديث اسم المشروع بنجاح! ✏️');
      setEditingProject(null);
      setNewEditedName('');
    } catch (err) {
      console.error(err);
      showPopup('فشل التعديل: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // حذف المشروع
  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    const confirmDelete = window.confirm('تحذير: هل أنت متأكد من حذف هذا المشروع نهائياً بكافة بياناته؟');
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      showPopup('تم حذف المشروع بنجاح 🗑️');
      if (activeProject && (activeProject.id === projectId || activeProject._id === projectId)) {
        handleBackToList();
      }
    } catch (err) {
      console.error(err);
      showPopup('فشل الحذف: ' + err.message);
    }
  };

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
    <div className="ostudio-wrapper" style={{ direction: 'ltr', textAlign: 'left', color: '#000', position: 'relative', background: '#f8fafc', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* Toast Notification */}
      {popupMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 100000,
          textAlign: 'center',
          border: '1px solid #38bdf8'
        }}>
          {popupMessage}
        </div>
      )}

      {/* الشريط العلوي (مطابق تماماً لصفحة المدير) */}
      <nav className="ostudio-navbar" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="nav-left-profile">
          <span style={{ fontWeight: '600', color: '#0f172a' }}>👤 {user?.name || 'Coordinator'} ({user?.role || 'coordinator'})</span>
        </div>
        
        <div className="nav-center-brand" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Ostudio" className="nav-logo" style={{ width: '35px', height: '35px', objectFit: 'contain' }} onError={(e)=>{e.target.style.display='none'}} />
          <div className="nav-title" style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Ostudio</div>
        </div>

        <div className="nav-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '18px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} 
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
              title="الإشعارات"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-6px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div style={{
                position: 'absolute',
                top: '35px',
                right: '0',
                width: '320px',
                background: '#fff',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                zIndex: 99999,
                padding: '12px',
                maxHeight: '380px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>الإشعارات ({unreadCount})</span>
                  <button onClick={() => setShowNotificationsDropdown(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                </div>

                {notifications.length === 0 ? (
                  <p style={{ margin: '15px 0', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>لا توجد إشعارات حالياً</p>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: n.read ? '#f8fafc' : '#eff6ff',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        borderLeft: n.read ? '3px solid transparent' : '3px solid #0284c7'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: n.read ? '500' : '700', color: '#1e293b' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button onClick={onLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="ostudio-main-content" style={{ maxWidth: '850px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* قسم Create A New Project وزر الإضافة */}
        <div style={{ marginTop: '35px', marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            Create A New Project
          </h3>
          <button 
            onClick={() => setShowNewModal(true)}
            style={{ 
              width: '100%', 
              background: '#0284c7', 
              color: '#fff', 
              border: 'none', 
              padding: '14px', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '16px', 
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)' 
            }}
          >
            + New Project
          </button>
        </div>

        {/* نموذج إنشاء مشروع جديد */}
        {showNewModal && (
          <form onSubmit={handleCreateProject} style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', color: '#000' }}>
            <h3 style={{ marginBottom: '20px', color: '#0f172a', textAlign: 'left' }}>Create New Project</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Project Name *</label>
              <input 
                type="text" 
                placeholder="Enter project name..." 
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#000000', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Brief (File Upload or Link)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Paste brief link or click upload..." 
                  value={briefFile ? briefFile.name : briefLinkOrText} 
                  onChange={(e) => {
                    setBriefLinkOrText(e.target.value);
                    setBriefFile(null);
                  }} 
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#000000', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
                <label style={{ background: '#0ea5e9', color: '#fff', padding: '0 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                  {briefFile ? 'Selected ✓' : 'Upload'}
                  <input 
                    type="file" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        setBriefFile(e.target.files[0]);
                        setBriefLinkOrText(e.target.files[0].name);
                      }
                    }} 
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Coordinator Notes (Optional)</label>
              <textarea 
                placeholder="Additional instructions for designers..." 
                value={managerNotes} 
                onChange={(e) => setManagerNotes(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#000000', fontSize: '15px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                rows="3"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isSubmitting ? 'Saving...' : 'Save Project'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowNewModal(false)} 
                style={{ background: '#64748b', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <h3 style={{ marginBottom: '15px', color: '#64748b', fontSize: '16px', fontWeight: 'bold', textAlign: 'left' }}>
          Active Projects ({projects.length})
        </h3>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>جارٍ مزامنة المشاريع مع Firebase...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: '#64748b', background: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>لا توجد مشاريع مسجلة حالياً.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {projects.map((proj) => (
              <div 
                key={proj._id || proj.id} 
                style={{ 
                  background: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)', 
                  padding: '22px 28px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div>
                  <h4 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                    {proj.projectName || proj.name}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                    Status: <span style={{ color: proj.status === 'completed' ? '#16a34a' : proj.status === 'created' ? '#0284c7' : '#d97706', fontWeight: 'bold' }}>{proj.status || 'in-progress'}</span>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    onClick={() => handleOpenProject(proj)}
                    style={{ background: '#0284c7', color: '#fff', padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
                  >
                    Open Project Details
                  </button>

                  <button 
                    onClick={(e) => handleOpenEditModal(e, proj)}
                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    title="تعديل اسم المشروع"
                  >
                    ✏️
                  </button>

                  <button 
                    onClick={(e) => handleDeleteProject(e, proj._id || proj.id)}
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
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

      {/* نافذة تعديل اسم المشروع */}
      {editingProject && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>تعديل اسم المشروع ✏️</h3>
            <form onSubmit={handleSaveProjectName} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>اسم المشروع الجديد:</label>
                <input 
                  type="text" 
                  required 
                  value={newEditedName} 
                  onChange={(e) => setNewEditedName(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingProject(null)} 
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating} 
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  {isUpdating ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}