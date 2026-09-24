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

export default function ProjectDetails({ project, user, onBack, onLogout }) {
  const [projData, setProjData] = useState(project);
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');
  const [showAddCpInput, setShowAddCpInput] = useState(false);
  
  // قائمة المصممين لإسناد البرزنتيشن
  const [designers, setDesigners] = useState([]);
  const [selectedPresenterDesignerId, setSelectedPresenterDesignerId] = useState(project.assignedPresenterId || '');
  const [isAssigningPresenter, setIsAssigningPresenter] = useState(false);

  const [uploadingPres, setUploadingPres] = useState(false);
  const [presentationFile, setPresentationFile] = useState(projData.presentationFileLink || '');
  
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [newBrief, setNewBrief] = useState(projData.brief || '');
  const [newBriefFileObj, setNewBriefFileObj] = useState(null);
  const [isUploadingBrief, setIsUploadingBrief] = useState(false);
  const [managerNotesInput, setManagerNotesInput] = useState(projData.managerNotes || '');

  // حالات نافذة كتابة الملاحظات الكبيرة (Modal)
  const [activeModalIndex, setActiveModalIndex] = useState(null);
  const [modalNoteText, setModalNoteText] = useState('');

  // حالات تعديل اسم المهمة (Edit Task Title)
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');

  const [previewImage, setPreviewImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 2000);
  };

  const projectId = project.id || project._id;
  const checkpointsList = Array.isArray(projData.checkpoints) ? projData.checkpoints : [];

  // دالة لجعل روابط Cloudinary تنزل الملفات مباشرة (PDF, PPTX, وغيرها)
  const getForceDownloadUrl = (url) => {
    if (!url) return '#';
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };

  // 1. الاستماع اللحظي لتحديثات المشروع من Firestore
  useEffect(() => {
    if (!projectId) return;

    const projRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(projRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, _id: docSnap.id, ...docSnap.data() };
        setProjData(data);
        if (data.assignedPresenterId) {
          setSelectedPresenterDesignerId(data.assignedPresenterId);
        }
        if (data.presentationFileLink) {
          setPresentationFile(data.presentationFileLink);
        }
        localStorage.setItem('ostudio_active_project', JSON.stringify(data));
      }
    }, (err) => {
      console.error('Firestore sync error:', err);
    });

    return () => unsubscribe();
  }, [projectId]);

  // 2. جلب قائمة المصممين من Firestore لقائمة البرزنتيشن
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'designer')
    );

    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        _id: d.id,
        id: d.id,
        ...d.data()
      }));
      setDesigners(list);
    }, (err) => {
      console.error('Error fetching designers:', err);
    });

    return () => unsubscribeUsers();
  }, []);

  const getDeadlineStatusStyle = () => {
    if (!projData.deadline) return { color: '#000' };
    const isPast = new Date() > new Date(projData.deadline);
    if (projData.status === 'completed' || projData.status === 'created') return { background: '#dcfce7', color: '#16a34a', padding: '5px 10px', borderRadius: '6px' };
    if (isPast) return { background: '#fee2e2', color: '#dc2626', padding: '5px 10px', borderRadius: '6px' };
    return { background: '#e0f2fe', color: '#0284c7', padding: '5px 10px', borderRadius: '6px' };
  };

  // إضافة Checkpoint جديدة
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

  // حذف Checkpoint
  const handleDeleteCheckpoint = async (index) => {
    const updatedCheckpoints = checkpointsList.filter((_, idx) => idx !== index);
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      showPopup('تم حذف نقطة المراجعة بنجاح 🗑️');
    } catch (err) {
      console.error(err);
      showPopup('فشل حذف نقطة المراجعة ❌');
    }
  };

  // حفظ تعديل اسم المهمة (Task Title)
  const handleSaveTaskTitle = async (index) => {
    if (!editedTaskTitle.trim()) return;
    const updatedCheckpoints = [...checkpointsList];
    updatedCheckpoints[index].title = editedTaskTitle.trim();

    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      setEditingTaskIndex(null);
      showPopup('تم تعديل اسم المهمة بنجاح! ✏️');
    } catch (err) {
      console.error(err);
      showPopup('فشل تعديل اسم المهمة ❌');
    }
  };

  // مراجعة المهمة وحفظ الملاحظات
  const handleCheckpointAction = async (index, actionType, customNote = null) => {
    const updatedCheckpoints = [...checkpointsList];
    if (actionType === 'done') {
      updatedCheckpoints[index].isCompleted = !updatedCheckpoints[index].isCompleted;
    } else if (actionType === 'note') {
      if (customNote !== null) {
        updatedCheckpoints[index].note = customNote;
      }
    }
    
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });
      setActiveModalIndex(null);
      setModalNoteText('');
      showPopup('تم تحديث المهمة بنجاح! ✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل تحديث الحالة ❌');
    }
  };

  const allCheckpointsDone = checkpointsList.length > 0 && checkpointsList.every(cp => cp.isCompleted);

  // اعتماد كل النقاط
  const handleDoneAll = async () => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        isDoneAll: true,
        renderStatus: 'processing'
      });
      showPopup('تم اعتماد جميع النقاط وتحويل المشروع للـ Render! ⏳');
    } catch (err) {
      console.error(err);
      showPopup('حدث خطأ ❌');
    }
  };

  // حفظ ملاحظات المدير
  const handleSaveNotes = async () => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        managerNotes: managerNotesInput
      });
      showPopup('تم حفظ الملاحظات بنجاح! 💾');
    } catch (err) {
      console.error(err);
      showPopup('فشل حفظ الملاحظات ❌');
    }
  };

  // حفظ التواريخ
  const handleDateChange = async (field, dateString) => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { [field]: dateString });
      showPopup('تم تحديث التاريخ بنجاح 📅');
    } catch (err) {
      console.error(err);
      showPopup('فشل حفظ التاريخ ❌');
    }
  };

  // إسناد ومنشن مصمم البرزنتيشن وإرسال إشعار له
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

      // إرسال إشعار فوري في مجموعة notifications للمصمم المطلوب
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

  // إنهاء المشروع
  const handleFinalFinish = async () => {
    try {
      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { status: 'completed' });
      showPopup('تم إنهاء المشروع بنجاح! 🎉');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error(err);
      showPopup('حدث خطأ أثناء إنهاء المشروع ❌');
    }
  };

  // حفظ تعديل الـ Brief عبر Cloudinary
  const handleSaveBrief = async () => {
    try {
      setIsUploadingBrief(true);
      let briefUrl = newBrief;
      let briefName = newBriefFileObj ? newBriefFileObj.name : (typeof newBrief === 'string' ? newBrief.split('/').pop() : 'Brief_File');

      if (newBriefFileObj) {
        const uploadRes = await uploadToCloudinary(newBriefFileObj);
        briefUrl = uploadRes.url;
        briefName = uploadRes.originalName;
      }

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        brief: briefUrl,
        briefName: briefName
      });

      setIsEditingBrief(false);
      setNewBriefFileObj(null);
      showPopup('تم تحديث الـ Brief بنجاح ✨');
    } catch (err) {
      console.error(err);
      showPopup('خطأ في التحديث ❌');
    } finally {
      setIsUploadingBrief(false);
    }
  };

  const handleDownloadImage = async (imgUrl) => {
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'checkpoint-work.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      window.open(imgUrl, '_blank');
    }
  };

  return (
    <div className="ostudio-wrapper" style={{ direction: 'ltr', textAlign: 'left', color: '#000', background: '#ffffff', minHeight: '100vh', paddingBottom: '60px', position: 'relative' }}>
      
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

      {/* نافذة كتابة الملاحظات الكبيرة (Modal) */}
      {activeModalIndex !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '95%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
            <h3 style={{ marginBottom: '15px', color: '#0f172a', fontSize: '20px' }}>أدخل ملاحظات التعديل المطلوبة 📝</h3>
            <textarea 
              rows="5"
              value={modalNoteText}
              onChange={(e) => setModalNoteText(e.target.value)}
              placeholder="اكتب التعديلات والملاحظات هنا بالتفصيل للمصمم..."
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '15px', 
                backgroundColor: '#ffffff', 
                color: '#000000', 
                fontWeight: 'bold', 
                marginBottom: '20px', 
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px' }}>
              <button 
                onClick={() => handleCheckpointAction(activeModalIndex, 'note', modalNoteText)}
                style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                حفظ (Save)
              </button>
              <button 
                onClick={() => { setActiveModalIndex(null); setModalNoteText(''); }}
                style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                إلغاء (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة المعاينة المكبرة للصورة */}
      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ position: 'relative', background: '#fff', padding: '25px', borderRadius: '12px', maxWidth: '95%', maxHeight: '95%', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            
            <button 
              onClick={() => { setPreviewImage(null); setIsZoomed(false); }}
              style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: '#fff', border: 'none', width: '35px', height: '35px', borderRadius: '50%', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
            >
              ✕
            </button>

            <div 
              onClick={() => setIsZoomed(!isZoomed)}
              style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '72vh', borderRadius: '8px', marginBottom: '15px', cursor: isZoomed ? 'zoom-out' : 'zoom-in', display: 'flex', justifyContent: 'center' }}
            >
              <img 
                src={previewImage} 
                alt="Full Preview" 
                style={{ 
                  maxWidth: isZoomed ? 'none' : '100%', 
                  maxHeight: isZoomed ? 'none' : '72vh', 
                  width: isZoomed ? '160%' : 'auto',
                  transition: 'transform 0.3s ease',
                  objectFit: 'contain' 
                }} 
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>اضغط على الصورة للتبديل بين الزوم (تكبير/تصغير)</span>

            <button 
              onClick={() => handleDownloadImage(previewImage)}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Download
            </button>

          </div>
        </div>
      )}

      <div className="ostudio-main-content" style={{ maxWidth: '900px', margin: '20px auto', padding: '0 20px', background: '#ffffff' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <button onClick={onBack} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            ⬅ Back to List
          </button>
          <span style={getDeadlineStatusStyle()}>
            Deadline: {projData.deadline ? new Date(projData.deadline).toLocaleDateString() : 'غير محدد'}
          </span>
        </div>

        <div style={{ color: '#000', background: '#ffffff' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#0f172a', fontSize: '36px', fontWeight: '800' }}>{projData.projectName || projData.name}</h1>
          </div>

          {/* Brief File & Notes */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ color: '#000', margin: 0, fontSize: '15px' }}>
                <strong>Brief File: </strong> 
                {projData.brief ? (
                  <a href={getForceDownloadUrl(projData.brief)} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 'bold' }}>
                    📥 {projData.briefName || projData.brief.split('/').pop() || 'تحميل ملف الـ Brief'}
                  </a>
                ) : 'No file uploaded'}
              </p>
              <button 
                onClick={() => setIsEditingBrief(!isEditingBrief)} 
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                {isEditingBrief ? 'Cancel' : 'Edit Brief'}
              </button>
            </div>

            {isEditingBrief && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={newBriefFileObj ? newBriefFileObj.name : newBrief} 
                  onChange={(e) => {
                    setNewBrief(e.target.value);
                    setNewBriefFileObj(null);
                  }} 
                  placeholder="Enter link or select file..."
                  style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', color: '#000' }}
                />
                <label style={{ background: '#0ea5e9', color: '#fff', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  Choose File 📁
                  <input 
                    type="file" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        const file = e.target.files[0];
                        setNewBriefFileObj(file);
                        setNewBrief(file.name);
                      }
                    }} 
                  />
                </label>
                <button 
                  onClick={handleSaveBrief} 
                  disabled={isUploadingBrief}
                  style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: isUploadingBrief ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  {isUploadingBrief ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#000', display: 'block', marginBottom: '6px' }}>Notes (Optional):</label>
              <textarea 
                placeholder="Add optional note here..." 
                value={managerNotesInput} 
                onChange={(e) => setManagerNotesInput(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#000', fontWeight: 'bold', fontSize: '14px', boxSizing: 'border-box' }}
                rows="2"
              />
              <button 
                onClick={handleSaveNotes}
                style={{ marginTop: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Save Notes 💾
              </button>
            </div>
          </div>

          {/* Project Timelines */}
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

          {/* Checkpoints */}
          <div style={{ marginBottom: '25px', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ color: '#000', fontSize: '18px', margin: 0 }}>Checkpoints:</h4>
              <button 
                onClick={() => setShowAddCpInput(!showAddCpInput)} 
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
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
              <p style={{ color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>لا توجد نقاط مراجعة حالياً (قم بإضافة نقاط جديدة).</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', color: '#000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#000' }}>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '35%' }}>Task</th>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '40%' }}>Image Upload (View Only)</th>
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
                                <button 
                                  onClick={() => {
                                    setEditingTaskIndex(idx);
                                    setEditedTaskTitle(cp.title);
                                  }}
                                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  Edit ✏️
                                </button>
                                <button 
                                  onClick={() => handleDeleteCheckpoint(idx)}
                                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                                  title="حذف هذه النقطة"
                                >
                                  Delete 🗑️
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', verticalAlign: 'middle', textAlign: 'center' }}>
                          {hasImage ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img 
                                src={currentImg} 
                                alt="Uploaded Work" 
                                onClick={() => setPreviewImage(currentImg)}
                                style={{ width: '120px', height: '85px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'block', cursor: 'pointer' }} 
                                title="اضغط لتكبير ومعاينة الصورة" 
                              />
                              <button 
                                onClick={() => setPreviewImage(currentImg)}
                                style={{ background: 'none', border: 'none', fontSize: '11px', color: '#0284c7', marginTop: '4px', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                              >
                                🔍 معاينة الصورة كاملة
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'bold', fontSize: '13px' }}>NO Picture (في انتظار رفع المصمم)</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button 
                                onClick={() => {
                                  setActiveModalIndex(idx);
                                  setModalNoteText(cp.note || '');
                                }} 
                                style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                              >
                                Note
                              </button>
                              <button 
                                disabled={!hasImage}
                                onClick={() => handleCheckpointAction(idx, 'done')} 
                                style={{ background: hasImage ? '#22c55e' : '#cbd5e1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: hasImage ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 'bold' }}
                              >
                                Done {isDone && '✓'}
                              </button>
                            </div>

                            {cp.note && (
                              <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', marginTop: '4px', maxWidth: '100%', wordBreak: 'break-word' }}>
                                ملاحظة: {cp.note}
                              </span>
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

          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <button 
              disabled={!allCheckpointsDone || projData.isDoneAll}
              onClick={handleDoneAll}
              style={{ 
                background: projData.isDoneAll ? '#16a34a' : allCheckpointsDone ? '#2563eb' : '#94a3b8', 
                color: '#fff', 
                border: 'none', 
                padding: '12px 30px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: allCheckpointsDone && !projData.isDoneAll ? 'pointer' : 'not-allowed',
                fontSize: '16px'
              }}
            >
              {projData.isDoneAll ? 'Done All Completed ✅' : 'Done All'}
            </button>
          </div>

          {/* Render Section */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000' }}>
            <h4 style={{ color: '#000', marginBottom: '12px', fontSize: '18px' }}>Render Section:</h4>
            
            {!projData.isDoneAll ? (
              <div style={{ padding: '15px', background: '#e2e8f0', borderRadius: '6px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>
                Render
              </div>
            ) : projData.renderStatus === 'uploaded' ? (
              <div style={{ padding: '15px', background: '#dcfce7', borderRadius: '6px', fontWeight: 'bold', color: '#16a34a', textAlign: 'center' }}>
                ✅ تم إنجاز الـ Render ورفعه بنجاح بواسطة المصمم
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b', textAlign: 'center' }}>
                <span style={{ fontSize: '24px' }}>⏳</span>
                <p style={{ fontWeight: 'bold', color: '#d97706', marginTop: '5px' }}>جاري التنفيذ (في انتظار قيام المصمم بالـ Render ورفع المشروع)</p>
              </div>
            )}
          </div>

          {/* Presentation Section */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000' }}>
            <h4 style={{ color: '#000', marginBottom: '14px', fontSize: '18px' }}>Presentation Section:</h4>
            
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
                📢 إسناد / منشن مصمم لعمل البرزنتيشن:
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

            {presentationFile ? (
              <div style={{ marginBottom: '15px' }}>
                <a href={getForceDownloadUrl(presentationFile)} download target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 'bold', textDecoration: 'underline' }}>
                  📥 Download Presentation File ({projData.presentationFileName || 'Presentation'})
                </a>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '15px' }}>لم يتم رفع ملف البرزنتيشن بعد.</p>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
              <label style={{ 
                background: '#0284c7', color: '#fff', padding: '8px 16px', borderRadius: '6px', 
                fontSize: '13px', fontWeight: 'bold', cursor: uploadingPres ? 'not-allowed' : 'pointer' 
              }}>
                {uploadingPres ? 'Uploading...' : '📊 Upload Presentation File'}
                <input type="file" onChange={handlePresentationUpload} disabled={uploadingPres} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button 
                onClick={handleFinalFinish}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '14px 45px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
              >
                Finish
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}