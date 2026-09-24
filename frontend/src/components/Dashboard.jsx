import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToCloudinary } from '../uploadService';
import './Dashboard.css';

export default function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [taskInputs, setTaskInputs] = useState({});
  const [uploadingTaskId, setUploadingTaskId] = useState(null);

  // حالة الرسالة المنبثقة (Popup Toast)
  const [popupMessage, setPopupMessage] = useState(null);

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 2000);
  };

  const currentUserId = user?.uid || user?.id || user?._id;

  // الاستماع اللحظي للمهام المسندة للمستخدم من Firestore
  useEffect(() => {
    if (!currentUserId) return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedTo', 'in', [currentUserId, user?.email, user?.name])
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        _id: docSnap.id,
        ...docSnap.data()
      }));
      setTasks(tasksList);
    }, (err) => {
      console.error('Firestore tasks sync error:', err);
    });

    return () => unsubscribe();
  }, [currentUserId, user?.email, user?.name]);

  const handleInputChange = (taskId, field, value) => {
    setTaskInputs(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  // رفع ملف للمهمة عبر Cloudinary
  const handleFileUpload = async (taskId, file) => {
    if (!file) return;

    try {
      setUploadingTaskId(taskId);
      const uploadRes = await uploadToCloudinary(file);

      handleInputChange(taskId, 'fileLink', uploadRes.url);
      handleInputChange(taskId, 'fileName', uploadRes.originalName);

      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        fileLink: uploadRes.url,
        fileName: uploadRes.originalName,
        updatedAt: serverTimestamp()
      });

      showPopup('تم رفع الملف بنجاح! 📁✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل رفع الملف: ' + err.message);
    } finally {
      setUploadingTaskId(null);
    }
  };

  // تحديث حالة المهمة في Firestore
  const handleUpdateTask = async (taskId, newStatus) => {
    try {
      const currentInput = taskInputs[taskId] || {};
      const taskRef = doc(db, 'tasks', taskId);

      const updatePayload = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (currentInput.fileLink !== undefined) {
        updatePayload.fileLink = currentInput.fileLink;
      }
      if (currentInput.notes !== undefined) {
        updatePayload.notes = currentInput.notes;
      }

      await updateDoc(taskRef, updatePayload);
      showPopup('تم حفظ وتحديث المهمة بنجاح! ✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل تحديث المهمة ❌');
    }
  };

  return (
    <div className="portal-container" style={{ alignItems: 'flex-start', padding: '40px 20px', overflowY: 'auto', position: 'relative' }}>
      
      {/* نافذة الرسائل المنبثقة */}
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

      <div className="portal-card" style={{ maxWidth: '750px', width: '100%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
          <h2>أهلاً بك، {user.name} 🚀</h2>
          <span className="role-badge" style={{ background: '#0284c7', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            {user.role}
          </span>
        </div>
        
        <div className="user-info-box" style={{ background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #e2e8f0', color: '#000' }}>
          <p style={{ margin: '6px 0' }}><strong>البريد الإلكتروني:</strong> {user.email}</p>
          <p style={{ margin: '6px 0' }}><strong>حالة الحساب:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>نشط ومفعل ✅</span></p>
        </div>

        <div className="tasks-section">
          <h3 style={{ color: '#1e293b', fontSize: '18px', marginBottom: '15px' }}>
            {user.role === 'presenter' 
              ? 'العروض التقديمية والبرزنتيشنات المسندة إليك 📊' 
              : user.role === 'designer' 
              ? 'مهام التصميم المسندة إليك 🎨' 
              : 'المهام المسندة إليك 📋'}
          </h3>

          {tasks.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>لا توجد مهام مسندة إليك حالياً ✨</p>
          ) : (
            <div>
              {tasks.map((task) => {
                const taskId = task.id || task._id;
                return (
                  <div key={taskId} className="task-item" style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #cbd5e1', color: '#000' }}>
                    <h4 style={{ color: '#0284c7', fontSize: '18px', marginBottom: '8px' }}>{task.title}</h4>
                    <p style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>{task.description}</p>
                    
                    <p style={{ fontSize: '13px', color: '#0369a1', marginBottom: '10px' }}>
                      الحالة: <strong>{task.status === 'completed' ? 'مكتملة 🟢' : task.status === 'in-progress' ? 'قيد التنفيذ 🟡' : 'معلقة ⏳'}</strong>
                    </p>

                    <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        placeholder={user.role === 'presenter' ? "رابط ملف العرض التقديمي (Drive...)" : "رابط التصميم أو الصق الرابط هنا..."}
                        defaultValue={task.fileLink || ''}
                        onChange={(e) => handleInputChange(taskId, 'fileLink', e.target.value)}
                        style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#000', fontSize: '13px' }}
                      />
                      <label style={{ 
                        background: '#0ea5e9', 
                        color: '#fff', 
                        padding: '0 16px', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: uploadingTaskId === taskId ? 'not-allowed' : 'pointer', 
                        fontWeight: 'bold', 
                        fontSize: '13px' 
                      }}>
                        {uploadingTaskId === taskId ? 'رفع...' : 'رفع ملف 📁'}
                        <input 
                          type="file" 
                          style={{ display: 'none' }} 
                          disabled={uploadingTaskId === taskId}
                          onChange={(e) => handleFileUpload(taskId, e.target.files[0])} 
                        />
                      </label>
                    </div>

                    {task.fileLink && (
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>
                        الملف المرفوع: <a href={task.fileLink} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'underline' }}>معاينة الملف ↗</a>
                      </p>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <textarea 
                        placeholder="ملاحظات..." 
                        defaultValue={task.notes || ''}
                        onChange={(e) => handleInputChange(taskId, 'notes', e.target.value)}
                        style={{ width: '100%', padding: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#000', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                        rows="2"
                      />
                    </div>
                    
                    <div className="task-buttons" style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-progress" onClick={() => handleUpdateTask(taskId, 'in-progress')} style={{ padding: '8px 14px', background: '#eab308', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>بدء التنفيذ</button>
                      <button className="btn-completed" onClick={() => handleUpdateTask(taskId, 'completed')} style={{ padding: '8px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>تسليم وإكمال</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <button className="portal-login-btn" onClick={onLogout} style={{ marginTop: '25px', background: '#ef4444' }}>تسجيل الخروج</button>
      </div>
    </div>
  );
}