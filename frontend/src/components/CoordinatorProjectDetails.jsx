import React, { useState, useEffect } from 'react';
import { 
  doc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToCloudinary } from '../uploadService';
import './OstudioLayout.css';

export default function CoordinatorProjectDetails({ project, user, onBack }) {
  const [projData, setProjData] = useState(project);
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');
  const [showAddCpInput, setShowAddCpInput] = useState(false);
  const [designers, setDesigners] = useState([]);
  
  // حالة مصمم المشروع الأساسي
  const [selectedDesignerId, setSelectedDesignerId] = useState(project.assignedDesigner || project.assignedDesignerId || '');
  const [isAssignedLocked, setIsAssignedLocked] = useState(Boolean(project.assignedDesigner || project.assignedDesignerId));

  // حالة مصمم البرزنتيشن (المنشن)
  const [selectedPresenterDesignerId, setSelectedPresenterDesignerId] = useState(project.assignedPresenterId || '');
  const [isAssigningPresenter, setIsAssigningPresenter] = useState(false);

  // حالات لتعديل الـ Checkpoints
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');

  // حالات للملاحظات والمعاينة
  const [activeModalIndex, setActiveModalIndex] = useState(null);
  const [modalNoteText, setModalNoteText] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // حالات رفع الملفات (Brief & Presentation)
  const [uploadingBrief, setUploadingBrief] = useState(false);
  const [uploadingPres, setUploadingPres] = useState(false);

  // حالة ملاحظات البرزنتيشن
  const [presenterNoteText, setPresenterNoteText] = useState(project.presenterNote || '');
  const [showPresenterNoteInput, setShowPresenterNoteInput] = useState(false);

  const [popupMessage, setPopupMessage] = useState(null);

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 2500);
  };

  // دالة لجعل روابط Cloudinary تنزل الملفات مباشرة (PDF, PPTX, وغيرها)
  const getForceDownloadUrl = (url) => {
    if (!url) return '#';
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };

  const checkpointsList = Array.isArray(projData.checkpoints) ? projData.checkpoints : [];
  const projectId = project.id || project._id;

  // 1. الاستماع اللحظي لتحديثات المشروع من Firestore
  useEffect(() => {
    if (!projectId) return;

    const projRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(projRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, _id: docSnap.id, ...docSnap.data() };
        setProjData(data);
        if (data.assignedDesigner || data.assignedDesignerId) {
          setSelectedDesignerId(data.assignedDesigner || data.assignedDesignerId);
          setIsAssignedLocked(true);
        }
        if (data.assignedPresenterId) {
          setSelectedPresenterDesignerId(data.assignedPresenterId);
        }
      }
    });

    return () => unsubscribe();
  }, [projectId]);

  // 2. جلب قائمة المصممين من Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'designer')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        _id: d.id,
        id: d.id,
        ...d.data()
      }));
      setDesigners(list);
    }, (err) => {
      console.error('Error fetching designers:', err);
    });

    return () => unsubscribe();
  }, []);

  // دالة لتحديث التواريخ (Start Date / Deadline)
  const handleDateChange = async (field, value) => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { [field]: value });
      showPopup(field === 'startDate' ? 'تم تحديث تاريخ البدء 📅' : 'تم تحديث الموعد النهائي 📅');
    } catch (err) {
      console.error(err);
      showPopup('فشل تحديث التاريخ ❌');
    }
  };

  // دالة إسناد المصمم الأساسي للمشروع
  const handleAssignDesigner = async () => {
    if (!selectedDesignerId) {
      showPopup('الرجاء اختيار مصمم أولاً ⚠️');
      return;
    }

    try {
      const assignedDesignerObj = designers.find(d => d._id === selectedDesignerId || d.id === selectedDesignerId || d.name === selectedDesignerId);
      const designerIdentifier = assignedDesignerObj ? assignedDesignerObj.id : selectedDesignerId;
      const designerName = assignedDesignerObj ? assignedDesignerObj.name : 'المصمم';

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        assignedDesigner: designerIdentifier,
        assignedDesignerId: designerIdentifier,
        assignedDesignerName: designerName
      });

      setIsAssignedLocked(true);

      // إشعار للمصمم الأساسي
      try {
        await addDoc(collection(db, 'notifications'), {
          designerId: designerIdentifier,
          targetUserId: designerIdentifier,
          projectId: projectId,
          message: `تم إسناد مشروع جديد إليك: "${projData.projectName || projData.name}" بواسطة المنسق.`,
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifyErr) {
        console.error('Failed to create notification', notifyErr);
      }

      showPopup(`تم إسناد المشروع إلى ${designerName} وتثبيته بنجاح! 🔔✅`);
    } catch (err) {
      console.error(err);
      showPopup('فشل إسناد المصمم ❌');
    }
  };

  // دالة إسناد ومنشن مصمم البرزنتيشن وإرسال إشعار له
  const handleAssignPresenterDesigner = async () => {
    if (!selectedPresenterDesignerId) {
      showPopup('يرجى اختيار مصمم للبرزنتيشن أولاً ⚠️');
      return;
    }

    try {
      setIsAssigningPresenter(true);
      const chosenDesigner = designers.find(d => d.id === selectedPresenterDesignerId || d._id === selectedPresenterDesignerId);
      const chosenName = chosenDesigner ? chosenDesigner.name : 'المصمم';

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        assignedPresenterId: selectedPresenterDesignerId,
        assignedPresenterName: chosenName
      });

      // إرسال إشعار فوري للمصمم المطلوب لعمل البرزنتيشن
      try {
        await addDoc(collection(db, 'notifications'), {
          designerId: selectedPresenterDesignerId,
          targetUserId: selectedPresenterDesignerId,
          projectId: projectId,
          type: 'presentation_request',
          message: `تم عمل منشن لك لتجهيز ورفع ملف البرزنتيشن لمشروع: "${projData.projectName || projData.name}".`,
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifyErr) {
        console.error('Failed to notify presenter designer', notifyErr);
      }

      showPopup(`تم إسناد البرزنتيشن إلى ${chosenName} وإرسال إشعار له بنجاح! 🔔📊`);
    } catch (err) {
      console.error(err);
      showPopup('فشل إسناد مصمم البرزنتيشن ❌');
    } finally {
      setIsAssigningPresenter(false);
    }
  };

  // رفع ملف الـ Brief عبر Cloudinary
  const handleBriefUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingBrief(true);
      const result = await uploadToCloudinary(file);

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        brief: result.url,
        briefName: result.originalName
      });

      showPopup('تم رفع ملف الـ Brief بنجاح! 📁✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل رفع الملف: ' + err.message);
    } finally {
      setUploadingBrief(false);
      e.target.value = '';
    }
  };

  // رفع ملف الـ Presentation عبر Cloudinary
  const handlePresentationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPres(true);
      const result = await uploadToCloudinary(file);

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        presentationFileLink: result.url,
        presentationFileName: result.originalName
      });

      showPopup('تم رفع ملف البرزنتيشن بنجاح! 📊✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل رفع الملف: ' + err.message);
    } finally {
      setUploadingPres(false);
      e.target.value = '';
    }
  };

  const handleAddCheckpoint = async () => {
    if (!newCheckpointTitle.trim()) return;
    const newCp = {
      id: Date.now(),
      title: newCheckpointTitle.trim(),
      isCompleted: false,
      imageLink: '',
      note: ''
    };
    const updatedCheckpoints = [...checkpointsList, newCp];

    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      setNewCheckpointTitle('');
      setShowAddCpInput(false);
      showPopup('تمت إضافة نقطة المراجعة بنجاح! 🎯');
    } catch (err) {
      console.error(err);
      showPopup('فشل إضافة نقطة المراجعة ❌');
    }
  };

  const handleSaveTaskTitle = async (index) => {
    if (!editedTaskTitle.trim()) return;
    const updatedCheckpoints = [...checkpointsList];
    updatedCheckpoints[index].title = editedTaskTitle.trim();

    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      setEditingTaskIndex(null);
      showPopup('تم تعديل اسم النقطة بنجاح! ✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل التعديل ❌');
    }
  };

  const handleDeleteCheckpoint = async (index) => {
    const updatedCheckpoints = checkpointsList.filter((_, i) => i !== index);
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      showPopup('تم حذف نقطة المراجعة بنجاح! 🗑️');
    } catch (err) {
      console.error(err);
      showPopup('فشل الحذف ❌');
    }
  };

  const handleCheckpointAction = async (index, actionType) => {
    const updatedCheckpoints = [...checkpointsList];
    if (actionType === 'done') {
      updatedCheckpoints[index].isCompleted = !updatedCheckpoints[index].isCompleted;
      updatedCheckpoints[index].status = updatedCheckpoints[index].isCompleted ? 'approved' : 'pending';
    }

    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      showPopup('تم تحديث الحالة بنجاح! ✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل تحديث الحالة ❌');
    }
  };

  const handleSaveNote = async (index) => {
    const updatedCheckpoints = [...checkpointsList];
    updatedCheckpoints[index].note = modalNoteText;

    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      setActiveModalIndex(null);
      showPopup('تم حفظ الملاحظة بنجاح! 📝');
    } catch (err) {
      console.error(err);
      showPopup('فشل حفظ الملاحظة ❌');
    }
  };

  const allCheckpointsDone = checkpointsList.length > 0 && checkpointsList.every(cp => cp.isCompleted);

  const handleDoneAll = async () => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { isDoneAll: true });
      showPopup('تم اعتماد جميع النقاط بنجاح! 🎉');
    } catch (err) {
      console.error(err);
      showPopup('حدث خطأ ❌');
    }
  };

  const handleSavePresenterNote = async () => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { presenterNote: presenterNoteText });
      setShowPresenterNoteInput(false);
      showPopup('تم حفظ ملاحظات البرزنتيشن بنجاح! ✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل حفظ الملاحظة ❌');
    }
  };

  // إنهاء المشروع وإرسال إشعار لحظي للمدير (Manager)
  const handleFinishProject = async () => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { status: 'completed' });

      try {
        await addDoc(collection(db, 'notifications'), {
          targetRole: 'manager',
          type: 'project_finished',
          projectId: projectId,
          projectName: projData.projectName || projData.name || 'المشروع',
          message: `تم إنهاء المشروع "${projData.projectName || projData.name}" بنجاح بواسطة المنسق ${user?.name || ''}.`,
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifyErr) {
        console.error('Failed to create notification', notifyErr);
      }

      showPopup('تم إنهاء المشروع بنجاح وتحويل حالته إلى مكتمل وإشعار المدير! 🎉');
    } catch (err) {
      console.error(err);
      showPopup('فشل إنهاء المشروع ❌');
    }
  };

  return (
    <div className="ostudio-wrapper" style={{ direction: 'ltr', textAlign: 'left', color: '#000', position: 'relative' }}>
      
      {/* نافذة الرسائل التنبيهية */}
      {popupMessage && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: '#0f172a', color: '#fff', padding: '16px 32px', borderRadius: '10px',
          fontSize: '16px', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 100000, textAlign: 'center', border: '1px solid #38bdf8'
        }}>
          {popupMessage}
        </div>
      )}

      {/* معاينة الصورة بالحجم الكامل */}
      {previewImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إغلاق X</button>
            <img src={previewImage} alt="Full Preview" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', marginTop: '20px' }} />
          </div>
        </div>
      )}

      {/* نافذة الملاحظة للمهمة */}
      {activeModalIndex !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '400px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>إضافة أو تعديل ملاحظة للمهمة</h3>
            <textarea 
              value={modalNoteText} 
              onChange={(e) => setModalNoteText(e.target.value)} 
              placeholder="اكتب الملاحظة هنا..." 
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setActiveModalIndex(null)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إلغاء</button>
              <button onClick={() => handleSaveNote(activeModalIndex)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ الملاحظة</button>
            </div>
          </div>
        </div>
      )}

      {/* شريط الملاحة */}
      <nav className="ostudio-navbar">
        <div className="nav-brand">
          <div className="nav-title" style={{ color: '#000' }}>Ostudio</div>
        </div>
        <button onClick={onBack} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>
          Back to List
        </button>
      </nav>

      <div className="ostudio-main-content">
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#000' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ color: '#000', fontSize: '32px', fontWeight: '800' }}>{projData.projectName || projData.name}</h1>
          </div>

          {/* قسم إسناد وتثبيت المصمم الأساسي للمشروع */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#000', marginBottom: '12px' }}>Assign Project to Designer (Coordinator Control):</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select 
                value={selectedDesignerId} 
                onChange={(e) => setSelectedDesignerId(e.target.value)} 
                disabled={isAssignedLocked} 
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: isAssignedLocked ? '#f1f5f9' : '#fff', color: '#000', cursor: isAssignedLocked ? 'not-allowed' : 'pointer' }}
              >
                <option value="">Select available designer...</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.isBusy ? '🔴 (Busy / غير متاح)' : '🟢 (Available / متاح)'}
                  </option>
                ))}
              </select>
              <button 
                onClick={handleAssignDesigner} 
                disabled={isAssignedLocked} 
                style={{ background: isAssignedLocked ? '#94a3b8' : '#22c55e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: isAssignedLocked ? 'not-allowed' : 'pointer' }}
              >
                {isAssignedLocked ? 'Assigned & Locked 🔒' : 'Assign & Lock 🔒'}
              </button>
            </div>
            {isAssignedLocked && (
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>
                ✅ تم تثبيت المصمم لهذا المشروع وإرسال إشعار له بنجاح.
              </p>
            )}
          </div>

          {/* 1. Brief File */}
          <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong>Brief File: </strong> 
                {projData.brief ? (
                  <a href={getForceDownloadUrl(projData.brief)} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 'bold' }}>
                    Download {projData.briefName || projData.brief.split('/').pop()}
                  </a>
                ) : (
                  <span style={{ color: '#64748b' }}>No file uploaded</span>
                )}
              </div>
              <div>
                <label style={{ 
                  background: '#0284c7', color: '#fff', padding: '6px 14px', borderRadius: '6px', 
                  fontSize: '13px', fontWeight: 'bold', cursor: uploadingBrief ? 'not-allowed' : 'pointer' 
                }}>
                  {uploadingBrief ? 'Uploading...' : '📁 Upload / Replace Brief'}
                  <input type="file" onChange={handleBriefUpload} disabled={uploadingBrief} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          {/* 2. Project Timelines */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000' }}>
            <h4 style={{ color: '#000', marginBottom: '15px', fontSize: '18px' }}>Project Timelines:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Start Date </label>
                <div 
                  onClick={(e) => {
                    const inputEl = e.currentTarget.querySelector('input');
                    if (inputEl && inputEl.showPicker) inputEl.showPicker();
                  }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 16px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px', marginRight: '10px', pointerEvents: 'none' }}>📅</span>
                  <input 
                    type="datetime-local" 
                    defaultValue={projData.startDate ? projData.startDate.slice(0, 16) : ''} 
                    onChange={(e) => handleDateChange('startDate', e.target.value)} 
                    style={{ width: '100%', padding: '12px 0', background: 'transparent', color: '#0f172a', fontSize: '14px', fontWeight: '600', border: 'none', outline: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Deadline </label>
                <div 
                  onClick={(e) => {
                    const inputEl = e.currentTarget.querySelector('input');
                    if (inputEl && inputEl.showPicker) inputEl.showPicker();
                  }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 16px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px', marginRight: '10px', pointerEvents: 'none' }}>📅</span>
                  <input 
                    type="datetime-local" 
                    defaultValue={projData.deadline ? projData.deadline.slice(0, 16) : ''} 
                    onChange={(e) => handleDateChange('deadline', e.target.value)} 
                    style={{ width: '100%', padding: '12px 0', background: 'transparent', color: '#0f172a', fontSize: '14px', fontWeight: '600', border: 'none', outline: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Checkpoints */}
          <div style={{ marginBottom: '25px', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ color: '#000', fontSize: '18px', margin: 0 }}>Checkpoints:</h4>
              <button onClick={() => setShowAddCpInput(!showAddCpInput)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Add Check Point
              </button>
            </div>

            {showAddCpInput && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <input 
                  type="text" 
                  placeholder="Enter checkpoint task..." 
                  value={newCheckpointTitle} 
                  onChange={(e) => setNewCheckpointTitle(e.target.value)} 
                  style={{ flex: 1, padding: '10px', background: '#fff', color: '#000', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                />
                <button 
                  type="button"
                  onClick={handleAddCheckpoint} 
                  style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Save
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddCpInput(false);
                    setNewCheckpointTitle('');
                  }} 
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {checkpointsList.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>لا توجد نقاط مراجعة حالياً.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', color: '#000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#000' }}>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '35%' }}>Task</th>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '40%' }}>Image Upload</th>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '25%' }}>Review Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checkpointsList.map((cp, idx) => {
                    const hasImage = Boolean(cp.imageLink || cp.fileUrl);
                    const currentImg = cp.imageLink || cp.fileUrl;
                    const isDone = cp.isCompleted || cp.status === 'approved';

                    return (
                      <tr key={cp.id || idx} style={{ background: isDone ? '#dcfce7' : '#fff' }}>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          {editingTaskIndex === idx ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <input 
                                type="text" 
                                value={editedTaskTitle} 
                                onChange={(e) => setEditedTaskTitle(e.target.value)} 
                                style={{ padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleSaveTaskTitle(idx)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ</button>
                                <button onClick={() => setEditingTaskIndex(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>إلغاء</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: '600' }}>{cp.title}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => { setEditingTaskIndex(idx); setEditedTaskTitle(cp.title); }} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Edit ✏️</button>
                                <button onClick={() => handleDeleteCheckpoint(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Delete 🗑️</button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', verticalAlign: 'middle', textAlign: 'center' }}>
                          {hasImage ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img src={currentImg} alt="Uploaded Work" onClick={() => setPreviewImage(currentImg)} style={{ width: '120px', height: '85px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'block', cursor: 'pointer' }} />
                              <button onClick={() => setPreviewImage(currentImg)} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#0284c7', marginTop: '4px', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>🔍 معاينة الصورة</button>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'bold', fontSize: '13px' }}>NO Picture</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button onClick={() => { setActiveModalIndex(idx); setModalNoteText(cp.note || ''); }} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Note</button>
                              <button disabled={!hasImage} onClick={() => handleCheckpointAction(idx, 'done')} style={{ background: hasImage ? '#22c55e' : '#cbd5e1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: hasImage ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 'bold' }}>Done {isDone && '✓'}</button>
                            </div>
                            {cp.note && (
                              <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', marginTop: '4px' }}>ملاحظة: {cp.note}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginBottom: '25px', textAlign: 'center' }}>
            <button disabled={!allCheckpointsDone || projData.isDoneAll} onClick={handleDoneAll} style={{ background: projData.isDoneAll ? '#16a34a' : allCheckpointsDone ? '#2563eb' : '#94a3b8', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: allCheckpointsDone && !projData.isDoneAll ? 'pointer' : 'not-allowed', fontSize: '16px' }}>
              {projData.isDoneAll ? 'Done All Completed ✅' : 'Done All'}
            </button>
          </div>

          {/* 4. Render Section */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#000', marginBottom: '10px' }}>Render Section (Designer Output):</h4>
            <p style={{ fontSize: '14px', color: '#334155', marginBottom: '8px' }}>
              Render Status: <span style={{ fontWeight: 'bold', color: projData.renderStatus === 'completed' || projData.renderStatus === 'uploaded' ? '#16a34a' : '#d97706' }}>{projData.renderStatus || 'pending'}</span>
            </p>
            {projData.renderFileLink ? (
              <div style={{ marginTop: '10px' }}>
                <a href={getForceDownloadUrl(projData.renderFileLink)} download target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'underline' }}>
                  📥 Download Render File ({projData.renderFileName || projData.renderFileLink.split('/').pop()})
                </a>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>في انتظار قيام المصمم برفع ملف الـ Render...</p>
            )}
          </div>

          {/* 5. Presentation Section مع ميزة المنشن وإرسال الإشعار */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#000', marginBottom: '14px', fontSize: '18px' }}>Presentation Section:</h4>
            
            {/* قسم المنشن / الإسناد لمصمم البرزنتيشن */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
                📢 إسناد / منشن مصمم لعمل البرزنتيشن (نفس المصمم أو مصمم آخر):
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  value={selectedPresenterDesignerId}
                  onChange={(e) => setSelectedPresenterDesignerId(e.target.value)}
                  style={{ flex: 1, minWidth: '220px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#000' }}
                >
                  <option value="">اختر المصمم المسؤول عن البرزنتيشن...</option>
                  {designers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.id === (projData.assignedDesigner || projData.assignedDesignerId) ? '⭐ (مصمم المشروع الأصلي)' : ''}
                    </option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={handleAssignPresenterDesigner}
                  disabled={isAssigningPresenter}
                  style={{ 
                    background: '#0284c7', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '10px 20px', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: isAssigningPresenter ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {isAssigningPresenter ? 'جاري الإرسال...' : 'منشن وإشعار المصمم 🔔'}
                </button>
              </div>
              
              {projData.assignedPresenterName && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#0284c7', fontWeight: 'bold', background: '#eff6ff', padding: '8px 12px', borderRadius: '6px' }}>
                  📌 المصمم المسند إليه عمل البرزنتيشن حالياً: <strong>{projData.assignedPresenterName}</strong>
                </div>
              )}
            </div>

            {projData.presentationFileLink ? (
              <div style={{ marginBottom: '15px' }}>
                <a href={getForceDownloadUrl(projData.presentationFileLink)} download target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'underline' }}>
                  📥 Download Presentation File ({projData.presentationFileName || 'Presentation'})
                </a>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '15px' }}>لم يتم رفع ملف البرزنتيشن بعد.</p>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ 
                background: '#0284c7', color: '#fff', padding: '8px 16px', borderRadius: '6px', 
                fontSize: '13px', fontWeight: 'bold', cursor: uploadingPres ? 'not-allowed' : 'pointer' 
              }}>
                {uploadingPres ? 'Uploading...' : '📊 Upload Presentation File'}
                <input type="file" onChange={handlePresentationUpload} disabled={uploadingPres} style={{ display: 'none' }} />
              </label>

              <button onClick={() => setShowPresenterNoteInput(!showPresenterNoteInput)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Note 📝
              </button>
            </div>

            {showPresenterNoteInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <textarea 
                  value={presenterNoteText} 
                  onChange={(e) => setPresenterNoteText(e.target.value)} 
                  placeholder="اكتب ملاحظة حول البرزنتيشن..." 
                  style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
                <button onClick={handleSavePresenterNote} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: 'fit-content' }}>حفظ الملاحظة</button>
              </div>
            )}

            {projData.presenterNote && !showPresenterNoteInput && (
              <p style={{ fontSize: '13px', color: '#dc2626', background: '#fee2e2', padding: '8px', borderRadius: '6px', marginTop: '10px', fontWeight: 'bold' }}>
                ملاحظة البرزنتيشن: {projData.presenterNote}
              </p>
            )}
          </div>

          {/* زر إنهاء المشروع نهائياً */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              onClick={handleFinishProject} 
              style={{ 
                background: projData.status === 'completed' ? '#16a34a' : '#0f172a', 
                color: '#fff', 
                border: 'none', 
                padding: '14px 40px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                fontSize: '18px', 
                cursor: 'pointer', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
              }}
            >
              {projData.status === 'completed' ? 'Project Finished ✅' : 'Finish Project 🏁'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}