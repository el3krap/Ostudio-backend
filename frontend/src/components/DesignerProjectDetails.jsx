import React, { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToCloudinary } from '../uploadService';
import './OstudioLayout.css';

export default function DesignerProjectDetails({ project, user, onBack }) {
  const [projData, setProjData] = useState(project);
  const [renderFileObj, setRenderFileObj] = useState(null);
  const [presentationFileObj, setPresentationFileObj] = useState(null);
  
  const [previewImage, setPreviewImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);
  const [uploadingCpIndex, setUploadingCpIndex] = useState(null);
  const [isUploadingRender, setIsUploadingRender] = useState(false);
  const [isUploadingPresentation, setIsUploadingPresentation] = useState(false);

  const projectId = project.id || project._id;
  const checkpointsList = Array.isArray(projData.checkpoints) ? projData.checkpoints : [];

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 2500);
  };

  // دالة لتحويل رابط Cloudinary إلى رابط تحميل إجباري للملفات (PDF, PPTX, وغيرها)
  const getForceDownloadUrl = (url) => {
    if (!url) return '#';
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };

  // 1. الاستماع اللحظي لأي تغيير يجريه المنسق على المشروع
  useEffect(() => {
    if (!projectId) return;

    const projRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(projRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, _id: docSnap.id, ...docSnap.data() };
        setProjData(data);
      }
    }, (err) => {
      console.error('Error listening to project:', err);
    });

    return () => unsubscribe();
  }, [projectId]);

  // دالة تحديد الأيقونة حسب نوع وامتداد الملف
  const getFileIcon = (fileName) => {
    if (!fileName) return '📁';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📈';
    return '📁';
  };

  const getDeadlineStatusStyle = () => {
    if (!projData.deadline) return { color: '#000' };
    const isPast = new Date() > new Date(projData.deadline);
    if (projData.status === 'finished' || projData.status === 'Finished' || projData.status === 'completed') {
      return { background: '#dcfce7', color: '#16a34a', padding: '5px 10px', borderRadius: '6px' };
    }
    if (isPast) {
      return { background: '#fee2e2', color: '#dc2626', padding: '5px 10px', borderRadius: '6px' };
    }
    return { background: '#e0f2fe', color: '#0284c7', padding: '5px 10px', borderRadius: '6px' };
  };

  // 2. رفع صورة أو ملف الـ Checkpoint إلى Cloudinary
  const handleUploadCheckpointImage = async (index, file) => {
    if (!file) return;
    setUploadingCpIndex(index);

    try {
      const result = await uploadToCloudinary(file);

      const updatedCheckpoints = [...checkpointsList];
      updatedCheckpoints[index] = {
        ...updatedCheckpoints[index],
        imageLink: result.url,
        fileUrl: result.url,
        fileName: result.originalName,
        status: 'submitted'
      };

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, { checkpoints: updatedCheckpoints });

      showPopup('تم رفع العمل بنجاح وإرساله للمراجعة! 📸');
    } catch (err) {
      console.error(err);
      showPopup('فشل رفع الملف: ' + err.message);
    } finally {
      setUploadingCpIndex(null);
    }
  };

  // 3. رفع ملف الـ Render النهائي إلى Cloudinary
  const handleUploadRender = async () => {
    if (!renderFileObj && !projData.renderFileLink) {
      showPopup('الرجاء اختيار ملف الـ Render أولاً ⚠️');
      return;
    }
    setIsUploadingRender(true);

    try {
      let downloadURL = projData.renderFileLink;
      let fileName = projData.renderFileName;

      if (renderFileObj) {
        const result = await uploadToCloudinary(renderFileObj);
        downloadURL = result.url;
        fileName = result.originalName;
      }

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        renderFileLink: downloadURL,
        renderFileName: fileName,
        renderStatus: 'uploaded'
      });

      setRenderFileObj(null);
      showPopup('تم رفع ملف الـ Render بنجاح 🚀');
    } catch (err) {
      console.error(err);
      showPopup('فشل رفع ملف الـ Render: ' + err.message);
    } finally {
      setIsUploadingRender(false);
    }
  };

  // 4. رفع وحفظ ملف البرزنتيشن إلى Cloudinary
  const handleFinishPresentation = async () => {
    if (!presentationFileObj && !projData.presentationFileLink) {
      showPopup('الرجاء اختيار ملف البرزنتيشن أولاً ⚠️');
      return;
    }
    setIsUploadingPresentation(true);

    try {
      let downloadURL = projData.presentationFileLink;
      let fileName = projData.presentationFileName;

      if (presentationFileObj) {
        const result = await uploadToCloudinary(presentationFileObj);
        downloadURL = result.url;
        fileName = result.originalName;
      }

      const projRef = doc(db, 'projects', projectId);
      await updateDoc(projRef, {
        presentationFileLink: downloadURL,
        presentationFileName: fileName,
        status: 'finished'
      });

      setPresentationFileObj(null);
      showPopup('تم إنهاء وحفظ البرزنتيشن بنجاح! 🎉');
    } catch (err) {
      console.error(err);
      showPopup('فشل حفظ البرزنتيشن: ' + err.message);
    } finally {
      setIsUploadingPresentation(false);
    }
  };

  return (
    <div className="ostudio-wrapper" style={{ direction: 'ltr', textAlign: 'left', color: '#000', background: '#ffffff', minHeight: '100vh', paddingBottom: '60px', position: 'relative' }}>
      
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

      {/* Image Preview Modal */}
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
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
              Status: <strong style={{ color: (projData.status === 'finished' || projData.status === 'completed') ? '#16a34a' : '#d97706' }}>{projData.status || 'in-progress'}</strong>
            </p>
          </div>

          {/* Brief File & Notes */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#000', margin: '0 0 10px 0', fontSize: '15px' }}>
              <strong>Brief File: </strong> 
              {projData.brief ? (
                <a href={getForceDownloadUrl(projData.brief)} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 'bold' }}>
                  📥 {projData.briefName || projData.brief.split('/').pop() || 'تحميل ملف الـ Brief'}
                </a>
              ) : 'No file uploaded'}
            </p>
            {projData.managerNotes && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <strong style={{ color: '#0284c7', display: 'block', marginBottom: '4px', fontSize: '13px' }}>Manager Notes:</strong>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{projData.managerNotes}</p>
              </div>
            )}
          </div>

          {/* Project Timelines */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000' }}>
            <h4 style={{ color: '#000', marginBottom: '15px', fontSize: '18px' }}>Project Timelines:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>START DATE *</label>
                <input 
                  type="text" 
                  disabled 
                  value={projData.startDate ? new Date(projData.startDate).toLocaleString() : 'Not Set'} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: '600', fontSize: '14px', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>DEADLINE *</label>
                <input 
                  type="text" 
                  disabled 
                  value={projData.deadline ? new Date(projData.deadline).toLocaleString() : 'Not Set'} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: '600', fontSize: '14px', boxSizing: 'border-box' }} 
                />
              </div>
            </div>
          </div>

          {/* Checkpoints (Tasks) */}
          <div style={{ marginBottom: '25px', color: '#000' }}>
            <h4 style={{ color: '#000', fontSize: '18px', marginBottom: '15px' }}>Checkpoints (Tasks):</h4>
            {checkpointsList.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>لا توجد نقاط مراجعة حالياً من المنسق.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', color: '#000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#000' }}>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '35%' }}>Task</th>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '45%' }}>Upload Work (Image/File/Video)</th>
                    <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '20%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {checkpointsList.map((cp, idx) => {
                    const currentImg = cp.imageLink || cp.fileUrl;
                    const isCompleted = cp.isCompleted || cp.status === 'approved';

                    return (
                      <tr key={cp.id || idx} style={{ background: isCompleted ? '#dcfce7' : '#fff' }}>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', verticalAlign: 'middle', fontWeight: '600' }}>{cp.title}</td>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', verticalAlign: 'middle', textAlign: 'center' }}>
                          {currentImg ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <img src={currentImg} alt="Uploaded Work" onClick={() => setPreviewImage(currentImg)} style={{ width: '110px', height: '75px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} />
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{cp.fileName || 'ملف مرفوع'}</span>
                              <label style={{ background: '#64748b', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                                {uploadingCpIndex === idx ? 'جاري الرفع...' : 'تغيير الملف 🔄'}
                                <input type="file" accept="image/*,video/*" style={{ display: 'none' }} disabled={uploadingCpIndex === idx} onChange={(e) => handleUploadCheckpointImage(idx, e.target.files[0])} />
                              </label>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px', fontWeight: 'bold' }}>NO Picture / File</span>
                              <label style={{ background: '#0284c7', color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                {uploadingCpIndex === idx ? 'جاري الرفع...' : 'Upload From Device 📁'}
                                <input type="file" accept="image/*,video/*" style={{ display: 'none' }} disabled={uploadingCpIndex === idx} onChange={(e) => handleUploadCheckpointImage(idx, e.target.files[0])} />
                              </label>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 'bold', color: isCompleted ? '#16a34a' : cp.status === 'submitted' ? '#0284c7' : '#d97706' }}>
                            {isCompleted ? 'Completed 🟢' : cp.status === 'submitted' ? 'Under Review ⏳' : 'In Progress ⏳'}
                          </span>
                          {cp.note && (
                            <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', display: 'block', marginTop: '4px' }}>
                              {cp.note}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Render Section */}
          <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000' }}>
            <h4 style={{ color: '#000', marginBottom: '12px', fontSize: '18px' }}>Render Section:</h4>
            
            {!projData.isDoneAll ? (
              <div style={{ padding: '15px', background: '#e2e8f0', borderRadius: '6px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>
                ⏳ Render Section مغلقة حالياً (في انتظار اعتماد المنسق لجميع الـ Checkpoints عبر Done All)
              </div>
            ) : (
              <div>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
                  {renderFileObj || projData.renderFileLink ? (
                    <a href={getForceDownloadUrl(renderFileObj ? URL.createObjectURL(renderFileObj) : projData.renderFileLink)} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', textDecoration: 'underline' }}>
                      {getFileIcon(renderFileObj ? renderFileObj.name : projData.renderFileName || projData.renderFileLink)} {renderFileObj ? renderFileObj.name : (projData.renderFileName || projData.renderFileLink.split('/').pop() || 'Render_Project_File')}
                    </a>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>No file uploaded yet</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                  <label style={{ background: '#f59e0b', color: '#fff', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', margin: 0 }}>
                    {renderFileObj ? 'تم اختيار ملف جديد' : 'تعديل ✏️'}
                    <input 
                      type="file" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setRenderFileObj(e.target.files[0]);
                        }
                      }} 
                    />
                  </label>

                  <button 
                    onClick={handleUploadRender}
                    disabled={isUploadingRender}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: isUploadingRender ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                  >
                    {isUploadingRender ? 'جارٍ الرفع...' : 'Done 🚀'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Presentation Section */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#000' }}>
            <h4 style={{ color: '#000', marginBottom: '12px', fontSize: '18px' }}>Presentation Section:</h4>
            
            <div>
              <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
                {presentationFileObj || projData.presentationFileLink ? (
                  <a href={getForceDownloadUrl(presentationFileObj ? URL.createObjectURL(presentationFileObj) : projData.presentationFileLink)} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', textDecoration: 'underline' }}>
                    {getFileIcon(presentationFileObj ? presentationFileObj.name : projData.presentationFileName || projData.presentationFileLink)} {presentationFileObj ? presentationFileObj.name : (projData.presentationFileName || projData.presentationFileLink.split('/').pop() || 'Presentation_File')}
                  </a>
                ) : (
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>No file uploaded yet</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                <label style={{ background: '#f59e0b', color: '#fff', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', margin: 0 }}>
                  {presentationFileObj ? 'تم اختيار ملف جديد' : 'تعديل ✏️'}
                  <input 
                    type="file" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        setPresentationFileObj(e.target.files[0]);
                      }
                    }} 
                  />
                </label>

                <button 
                  onClick={handleFinishPresentation}
                  disabled={isUploadingPresentation}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: isUploadingPresentation ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                >
                  {isUploadingPresentation ? 'جارٍ الحفظ والرفع...' : 'Finish 🎉'}
                </button>
              </div>
            </div>

            {projData.presenterNote && (
              <div style={{ background: '#fee2e2', border: '1px solid #f59e0b', padding: '12px', borderRadius: '6px', marginTop: '15px' }}>
                <strong style={{ color: '#dc2626', display: 'block', marginBottom: '4px' }}>ملاحظات التعديل المطلوبة:</strong>
                <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>{projData.presenterNote}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}