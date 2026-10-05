import React, { useState, useEffect } from 'react';import { subscribeToUsersByRole } from '../services/userService';
import { subscribeToProject, updateProject } from '../services/projectService';
import { createNotification } from '../services/notificationService';import { uploadToCloudinary } from '../uploadService';export default function ProjectDetails({ project, user, onBack, onLogout }) {  const [projData, setProjData] = useState(project);  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');  const [showAddCpInput, setShowAddCpInput] = useState(false);


  // قائمة المصممين لإسناد البرزنتيشن  const [designers, setDesigners] = useState([]);  const [selectedPresenterDesignerId, setSelectedPresenterDesignerId] = useState(project.assignedPresenterId || '');  const [isAssigningPresenter, setIsAssigningPresenter] = useState(false);


  const [uploadingPres, setUploadingPres] = useState(false);  const [presentationFile, setPresentationFile] = useState(projData.presentationFileLink || '');


  const [isEditingBrief, setIsEditingBrief] = useState(false);  const [newBrief, setNewBrief] = useState(projData.brief || '');  const [newBriefFileObj, setNewBriefFileObj] = useState(null);  const [isUploadingBrief, setIsUploadingBrief] = useState(false);  const [managerNotesInput, setManagerNotesInput] = useState(projData.managerNotes || '');


  // حالات نافذة كتابة الملاحظات الكبيرة (Modal)  const [activeModalIndex, setActiveModalIndex] = useState(null);  const [modalNoteText, setModalNoteText] = useState('');


  // حالات تعديل اسم المهمة (Edit Task Title)  const [editingTaskIndex, setEditingTaskIndex] = useState(null);  const [editedTaskTitle, setEditedTaskTitle] = useState('');


  const [previewImage, setPreviewImage] = useState(null);  const [isZoomed, setIsZoomed] = useState(false);  const [popupMessage, setPopupMessage] = useState(null);


  const showPopup = (msg) => {    setPopupMessage(msg);    setTimeout(() => {      setPopupMessage(null);    }, 2000);  };


  const projectId = project.id || project._id;  const checkpointsList = Array.isArray(projData.checkpoints) ? projData.checkpoints : [];


  // دالة لجعل روابط Cloudinary تنزل الملفات مباشرة (PDF, PPTX, وغيرها)  const getForceDownloadUrl = (url) => {    if (!url) return '#';    if (url.includes('cloudinary.com')) {      return url.replace('/upload/', '/upload/fl_attachment/');    }    return url;  };


  // 1. الاستماع اللحظي لتحديثات المشروع عبر projectService
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribeToProject(
      projectId,
      (data) => {
        if (data) {
          setProjData(data);

          if (data.assignedPresenterId) {
            setSelectedPresenterDesignerId(data.assignedPresenterId);
          }

          if (data.presentationFileLink) {
            setPresentationFile(data.presentationFileLink);
          }

          localStorage.setItem('ostudio_active_project', JSON.stringify(data));
        }
      },
      (err) => {
        console.error('Project sync error:', err);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // 2. جلب قائمة المصممين عبر userService
  useEffect(() => {
    const unsubscribeUsers = subscribeToUsersByRole(
      'designer',
      (list) => setDesigners(list.filter((designer) => designer.status === 'active')),
      (err) => console.error('Error fetching designers:', err)
    );

    return () => unsubscribeUsers();
  }, []);

  const getDeadlineStatusClass = () => {
    if (!projData.deadline) return 'deadline-default';

    const isPast = new Date() > new Date(projData.deadline);

    if (projData.status === 'completed' || projData.status === 'created') {
      return 'deadline-success';
    }

    if (isPast) return 'deadline-danger';

    return 'deadline-active';
  };

  // إضافة Checkpoint جديدة  const handleAddCheckpoint = async () => {    if (!newCheckpointTitle.trim()) return;    const newCp = {      id: Date.now(),      title: newCheckpointTitle.trim(),      isCompleted: false,      imageLink: '',      note: ''    };    const updatedCheckpoints = [...checkpointsList, newCp];


    try {      await updateProject(projectId, { checkpoints: updatedCheckpoints });      setNewCheckpointTitle('');      setShowAddCpInput(false);      showPopup('تمت إضافة نقطة المراجعة بنجاح! 🎯');    } catch (err) {      console.error(err);      showPopup('فشل إضافة نقطة المراجعة ❌');    }  };


  // حذف Checkpoint  const handleDeleteCheckpoint = async (index) => {    const updatedCheckpoints = checkpointsList.filter((_, idx) => idx !== index);    try {      await updateProject(projectId, { checkpoints: updatedCheckpoints });      showPopup('تم حذف نقطة المراجعة بنجاح ');    } catch (err) {      console.error(err);      showPopup('فشل حذف نقطة المراجعة ❌');    }  };


  // حفظ تعديل اسم المهمة (Task Title)  const handleSaveTaskTitle = async (index) => {    if (!editedTaskTitle.trim()) return;    const updatedCheckpoints = [...checkpointsList];    updatedCheckpoints[index].title = editedTaskTitle.trim();


    try {      await updateProject(projectId, { checkpoints: updatedCheckpoints });      setEditingTaskIndex(null);      showPopup('تم تعديل اسم المهمة بنجاح! ');    } catch (err) {      console.error(err);      showPopup('فشل تعديل اسم المهمة ❌');    }  };


  // مراجعة المهمة وحفظ الملاحظات  const handleCheckpointAction = async (index, actionType, customNote = null) => {    const updatedCheckpoints = [...checkpointsList];    if (actionType === 'done') {      updatedCheckpoints[index].isCompleted = !updatedCheckpoints[index].isCompleted;    } else if (actionType === 'note') {      if (customNote !== null) {        updatedCheckpoints[index].note = customNote;      }    }


    try {      await updateProject(projectId, { checkpoints: updatedCheckpoints });      setActiveModalIndex(null);      setModalNoteText('');      showPopup('تم تحديث المهمة بنجاح! ✅');    } catch (err) {      console.error(err);      showPopup('فشل تحديث الحالة ❌');    }  };


  const allCheckpointsDone = checkpointsList.length > 0 && checkpointsList.every(cp => cp.isCompleted);


  // اعتماد كل النقاط  const handleDoneAll = async () => {    try {      await updateProject(projectId, {        isDoneAll: true,        renderStatus: 'processing'      });      showPopup('تم اعتماد جميع النقاط وتحويل المشروع للـ Render! ⏳');    } catch (err) {      console.error(err);      showPopup('حدث خطأ ❌');    }  };


  // حفظ ملاحظات المدير  const handleSaveNotes = async () => {    try {      await updateProject(projectId, {        managerNotes: managerNotesInput      });      showPopup('تم حفظ الملاحظات بنجاح! 💾');    } catch (err) {      console.error(err);      showPopup('فشل حفظ الملاحظات ❌');    }  };


  // حفظ التواريخ  const handleDateChange = async (field, dateString) => {    try {      await updateProject(projectId, { [field]: dateString });      showPopup('تم تحديث التاريخ بنجاح 📅');    } catch (err) {      console.error(err);      showPopup('فشل حفظ التاريخ ❌');    }  };


  // إسناد ومنشن مصمم البرزنتيشن وإرسال إشعار له  const handleAssignPresenterDesigner = async () => {    if (!selectedPresenterDesignerId) {      showPopup('يرجى اختيار مصمم للبرزنتيشن أولاً ⚠️');      return;    }


    try {      setIsAssigningPresenter(true);      const chosenDesigner = designers.find(d => d.id === selectedPresenterDesignerId || d._id === selectedPresenterDesignerId);      const chosenName = chosenDesigner ? chosenDesigner.name : 'المصمم';


      await updateProject(projectId, {        assignedPresenterId: selectedPresenterDesignerId,        assignedPresenterName: chosenName      });


      // إرسال إشعار فوري في مجموعة notifications للمصمم المطلوب      try {        await createNotification({
            recipientId: selectedPresenterDesignerId,
            recipientRole: 'designer',
            projectId,
            type: 'presentation_request',
            title: 'تم إسناد البرزنتيشن إليك',
            message: `تم عمل منشن لك لتجهيز ورفع ملف البرزنتيشن لمشروع: "${projData.projectName || projData.name}".`,
            createdById: user?.uid || user?.id || ''
          });      } catch (notifyErr) {        console.error('Failed to notify presenter designer', notifyErr);      }


      showPopup(`تم إسناد البرزنتيشن إلى ${chosenName} وإرسال إشعار له بنجاح! 📊`);    } catch (err) {      console.error(err);      showPopup('فشل إسناد مصمم البرزنتيشن ❌');    } finally {      setIsAssigningPresenter(false);    }  };


  // إنهاء المشروع  const handleFinalFinish = async () => {    try {      await updateProject(projectId, { status: 'completed' });      showPopup('تم إنهاء المشروع بنجاح! 🎉');      setTimeout(() => {        onBack();      }, 1500);    } catch (err) {      console.error(err);      showPopup('حدث خطأ أثناء إنهاء المشروع ❌');    }  };


  // حفظ تعديل الـ Brief عبر Cloudinary  const handleSaveBrief = async () => {    try {      setIsUploadingBrief(true);      let briefUrl = newBrief;      let briefName = newBriefFileObj ? newBriefFileObj.name : (typeof newBrief === 'string' ? newBrief.split('/').pop() : 'Brief_File');


      if (newBriefFileObj) {        const uploadRes = await uploadToCloudinary(newBriefFileObj);        briefUrl = uploadRes.url;        briefName = uploadRes.originalName;      }


      await updateProject(projectId, {        brief: briefUrl,        briefName: briefName      });


      setIsEditingBrief(false);      setNewBriefFileObj(null);      showPopup('تم تحديث الـ Brief بنجاح ✨');    } catch (err) {      console.error(err);      showPopup('خطأ في التحديث ❌');    } finally {      setIsUploadingBrief(false);    }  };


  const handleDownloadImage = async (imgUrl) => {    try {      const response = await fetch(imgUrl);      const blob = await response.blob();      const blobUrl = window.URL.createObjectURL(blob);      const link = document.createElement('a');      link.href = blobUrl;      link.download = 'checkpoint-work.png';      document.body.appendChild(link);      link.click();      document.body.removeChild(link);    } catch (error) {      window.open(imgUrl, '_blank');    }  };


  return (
  <><style>{`
    .manager-details-deadline-status {
      padding: 5px 10px;
      border-radius: 6px;
      display: inline-block;
    }

    .manager-details-deadline-status.deadline-default {
      color: #000;
    }

    .manager-details-deadline-status.deadline-success {
      background: #dcfce7;
      color: #16a34a;
    }

    .manager-details-deadline-status.deadline-danger {
      background: #fee2e2;
      color: #dc2626;
    }

    .manager-details-deadline-status.deadline-active {
      background: #e0f2fe;
      color: #0284c7;
    }
  `}</style><div className="ostudio-wrapper manager-details-page">


        {/* نافذة الرسائل المنبثقة */}        {popupMessage && (          <div className="manager-details-toast">            {popupMessage}          </div>        )}


        {/* نافذة كتابة الملاحظات الكبيرة (Modal) */}        {activeModalIndex !== null && (          <div className="manager-details-note-overlay">            <div className="manager-details-note-modal">              <h3 className="manager-details-note-title">أدخل ملاحظات التعديل المطلوبة 📝</h3>              <textarea                rows="5"                value={modalNoteText}                onChange={(e) => setModalNoteText(e.target.value)}                placeholder="اكتب التعديلات والملاحظات هنا بالتفصيل للمصمم..."                className="manager-details-note-textarea" />              <div className="manager-details-modal-actions">                <button                  onClick={() => handleCheckpointAction(activeModalIndex, 'note', modalNoteText)}                  className="manager-details-save-note"                >                  حفظ (Save)                </button>                <button                  onClick={() => { setActiveModalIndex(null); setModalNoteText(''); } }                  className="manager-details-cancel-note"                >                  إلغاء (Cancel)                </button>              </div>            </div>          </div>        )}


        {/* نافذة المعاينة المكبرة للصورة */}        {previewImage && (          <div className="manager-details-preview-overlay">            <div className="manager-details-preview-modal">


              <button                onClick={() => { setPreviewImage(null); setIsZoomed(false); } }                className="manager-details-preview-close"              >                ✕              </button>


              <div                onClick={() => setIsZoomed(!isZoomed)}                className="manager-details-preview-scroll"              >                <img                  src={previewImage}                  alt="Full Preview"


                  className={`manager-details-preview-image ${isZoomed ? "is-zoomed" : ""}`} />              </div>              <span className="manager-details-preview-hint">اضغط على الصورة للتبديل بين الزوم (تكبير/تصغير)</span>


              <button                onClick={() => handleDownloadImage(previewImage)}                className="manager-details-download-image"              >                Download              </button>


            </div>          </div>        )}


        <div className="ostudio-main-content manager-details-content">


          <div className="manager-details-topbar">            <button onClick={onBack} className="manager-details-back">              ⬅ Back to List            </button>            <span className={`manager-details-deadline-status ${getDeadlineStatusClass()}`}>              Deadline: {projData.deadline ? new Date(projData.deadline).toLocaleDateString() : 'غير محدد'}            </span>          </div>


          <div className="manager-details-deadline">


            <div className="manager-details-body">              <h1 className="manager-details-title-wrap">{projData.projectName || projData.name}</h1>            </div>


            {/* Brief File & Notes */}            <div className="manager-details-title">              <div className="manager-details-brief-section">                <p className="manager-details-brief-header">                  <strong>Brief File: </strong>                  {projData.brief ? (                    <a href={getForceDownloadUrl(projData.brief)} target="_blank" rel="noreferrer" className="manager-details-brief-text">                      📥 {projData.briefName || projData.brief.split('/').pop() || 'تحميل ملف الـ Brief'}                    </a>                  ) : 'No file uploaded'}                </p>                <button                  onClick={() => setIsEditingBrief(!isEditingBrief)}                  className="manager-details-brief-link"                >                  {isEditingBrief ? 'Cancel' : 'Edit Brief'}                </button>              </div>


              {isEditingBrief && (                <div className="manager-details-edit-brief">                  <input                    type="text"                    value={newBriefFileObj ? newBriefFileObj.name : newBrief}                    onChange={(e) => {                      setNewBrief(e.target.value);                      setNewBriefFileObj(null);                    } }                    placeholder="Enter link or select file..."                    className="manager-details-brief-editor" />                  <label className="manager-details-brief-input">                    Choose File 📁                    <input                      type="file"


                      onChange={(e) => {                        if (e.target.files[0]) {                          const file = e.target.files[0];                          setNewBriefFileObj(file);                          setNewBrief(file.name);                        }                      } } />                  </label>                  <button                    onClick={handleSaveBrief}                    disabled={isUploadingBrief}


                    className="manager-details-hidden-file">                    {isUploadingBrief ? 'Saving...' : 'Save'}                  </button>                </div>              )}


              <div className="manager-details-save-brief">                <label className="manager-details-notes-wrap">Notes (Optional):</label>                <textarea                  placeholder="Add optional note here..."                  value={managerNotesInput}                  onChange={(e) => setManagerNotesInput(e.target.value)}                  className="manager-details-notes-label"                  rows="2" />                <button                  onClick={handleSaveNotes}


                  className="manager-details-notes">                  Save Notes 💾                </button>              </div>            </div>


            {/* Project Timelines */}            <div className="manager-details-save-notes">              <h4 className="manager-details-timeline">Project Timelines:</h4>              <div className="manager-details-section-title">                <div>                  <label className="manager-details-timeline-fields">Start Date </label>                  <div                    onClick={(e) => {                      const inputEl = e.currentTarget.querySelector('input');                      if (inputEl && inputEl.showPicker) inputEl.showPicker();                    } }                    className="manager-details-field"                  >                    <span className="manager-details-field-label">📅</span>                    <input                      type="datetime-local"                      defaultValue={projData.startDate ? projData.startDate.slice(0, 16) : ''}                      onChange={(e) => handleDateChange('startDate', e.target.value)}                      className="manager-details-date-picker" />                  </div>                </div>


                <div>                  <label className="manager-details-timeline-fields">Deadline </label>                  <div                    onClick={(e) => {                      const inputEl = e.currentTarget.querySelector('input');                      if (inputEl && inputEl.showPicker) inputEl.showPicker();                    } }                    className="manager-details-field"                  >                    <span className="manager-details-field-label">📅</span>                    <input                      type="datetime-local"                      defaultValue={projData.deadline ? projData.deadline.slice(0, 16) : ''}                      onChange={(e) => handleDateChange('deadline', e.target.value)}                      className="manager-details-date-picker" />                  </div>                </div>              </div>            </div>


            {/* Checkpoints */}            <div className="manager-details-calendar-icon">              <div className="manager-details-date-input">                <h4 className="manager-details-checkpoints">Checkpoints:</h4>                <button                  onClick={() => setShowAddCpInput(!showAddCpInput)}                  className="manager-details-checkpoints-header"                >                  + Add Check Point                </button>              </div>


              {showAddCpInput && (                <div className="manager-details-add-button">                  <input                    type="text"                    placeholder="Enter checkpoint task..."                    value={newCheckpointTitle}                    onChange={(e) => setNewCheckpointTitle(e.target.value)}                    className="manager-details-add-row" />                  <button                    type="button"                    onClick={handleAddCheckpoint}


                    className="manager-details-checkpoint-input">                    Save                  </button>                  <button                    type="button"                    onClick={() => {                      setShowAddCpInput(false);                      setNewCheckpointTitle('');                    } }                    className="manager-details-save-button"                  >                    Cancel                  </button>                </div>              )}


              {checkpointsList.length === 0 ? (                <p className="manager-details-cancel-button">لا توجد نقاط مراجعة حالياً (قم بإضافة نقاط جديدة).</p>              ) : (                <table className="manager-details-empty">                  <thead>                    <tr className="manager-details-table">                      <th className="manager-details-table-head">Task</th>                      <th className="manager-details-table-cell">Image Upload (View Only)</th>                      <th className={`manager-details-checkpoint-row ${isDone ? "is-done" : ""}`}>Review Actions</th>                    </tr>                  </thead>                  <tbody>                    {checkpointsList.map((cp, idx) => {                      const hasImage = Boolean(cp.imageLink || cp.fileUrl);                      const currentImg = cp.imageLink || cp.fileUrl;                      const isDone = cp.isCompleted || cp.status === 'approved';


                      return (                        <tr key={cp.id || idx} className="manager-details-edit-column">                          <td className="manager-details-edit-stack">                            {editingTaskIndex === idx ? (                              <div className="manager-details-task-input">                                <input                                  type="text"                                  value={editedTaskTitle}                                  onChange={(e) => setEditedTaskTitle(e.target.value)}                                  className="manager-details-task-actions" />                                <div className="manager-details-small-save">                                  <button onClick={() => handleSaveTaskTitle(idx)} className="manager-details-small-cancel">حفظ</button>                                  <button onClick={() => setEditingTaskIndex(null)} className="manager-details-task-view">إلغاء</button>                                </div>                              </div>                            ) : (                              <div className="manager-details-task-name">                                <span className="manager-details-task-buttons">{cp.title}</span>                                <div className="manager-details-edit-task">                                  <button                                    onClick={() => {                                      setEditingTaskIndex(idx);                                      setEditedTaskTitle(cp.title);                                    } }                                    className="manager-details-delete-task"                                  >                                    Edit                                   </button>                                  <button                                    onClick={() => handleDeleteCheckpoint(idx)}                                    className="manager-details-image-cell"                                    title="حذف هذه النقطة"                                  >                                    Delete                                   </button>                                </div>                              </div>                            )}                          </td>                          <td className="manager-details-image-wrap">                            {hasImage ? (                              <div className="manager-details-image">                                <img                                  src={currentImg}                                  alt="Uploaded Work"                                  onClick={() => setPreviewImage(currentImg)}                                  className="manager-details-preview-link"                                  title="اضغط لتكبير ومعاينة الصورة" />                                <button                                  onClick={() => setPreviewImage(currentImg)}                                  className="manager-details-review-cell"                                >                                  🔍 معاينة الصورة كاملة                                </button>                              </div>                            ) : (                              <span className="manager-details-review-stack">NO Picture (في انتظار رفع المصمم)</span>                            )}                          </td>                          <td className="manager-details-review-buttons">                            <div className="manager-details-note-button">                              <div className={`manager-details-done-button ${hasImage ? "has-image" : "no-image"}`}>                                <button                                  onClick={() => {                                    setActiveModalIndex(idx);                                    setModalNoteText(cp.note || '');                                  } }                                  className="manager-details-note-display"                                >                                  Note                                </button>                                <button                                  disabled={!hasImage}                                  onClick={() => handleCheckpointAction(idx, 'done')}                                  className="manager-details-done-all-wrap"                                >                                  Done {isDone && '✓'}                                </button>                              </div>


                              {cp.note && (                                <span className={`manager-details-done-all ${projData.isDoneAll ? "is-complete" : allCheckpointsDone ? "is-ready" : "is-disabled"}`}>                                  ملاحظة: {cp.note}                                </span>                              )}                            </div>                          </td>                        </tr>                      );                    })}                  </tbody>                </table>              )}            </div>


            <div className={`manager-details-render ${projData.isDoneAll ? (projData.renderStatus === "uploaded" ? "render-complete-state" : "render-processing-state") : "render-locked-state"}`}>              <button                disabled={!allCheckpointsDone || projData.isDoneAll}                onClick={handleDoneAll}


                className="manager-details-render-locked">                {projData.isDoneAll ? 'Done All Completed ✅' : 'Done All'}              </button>            </div>


            {/* Render Section */}            <div className="manager-details-save-notes">              <h4 className="manager-details-render-complete">Render Section:</h4>


              {!projData.isDoneAll ? (                <div className="manager-details-render-processing">                  Render                </div>              ) : projData.renderStatus === 'uploaded' ? (                <div className="manager-details-render-icon">                  ✅ تم إنجاز الـ Render ورفعه بنجاح بواسطة المصمم                </div>              ) : (                <div className="manager-details-render-text">                  <span className="manager-details-presentation">⏳</span>                  <p className="manager-details-presentation-box">جاري التنفيذ (في انتظار قيام المصمم بالـ Render ورفع المشروع)</p>                </div>              )}            </div>


            {/* Presentation Section */}            <div className="manager-details-presentation-label">              <h4 className="manager-details-presentation-controls">Presentation Section:</h4>


              <div className="manager-details-presenter-select">                <label className="manager-details-assign-presenter">                  📢 إسناد / منشن مصمم لعمل البرزنتيشن:                </label>                <div className="manager-details-assigned-presenter">                  <select                    value={selectedPresenterDesignerId}                    onChange={(e) => setSelectedPresenterDesignerId(e.target.value)}                    className="manager-details-presentation-download"                  >                    <option value="">اختر المصمم المسؤول عن البرزنتيشن...</option>                    {designers.map((d) => (                      <option key={d.id} value={d.id}>                        {d.name} {d.id === (projData.assignedDesigner || projData.assignedDesignerId) ? '⭐ (مصمم المشروع الأصلي)' : ''}                      </option>                    ))}                  </select>                  <button                    type="button"                    onClick={handleAssignPresenterDesigner}                    disabled={isAssigningPresenter}


                    className="manager-details-presentation-empty">                    {isAssigningPresenter ? 'جاري الإرسال...' : 'منشن وإشعار المصمم '}                  </button>                </div>


                {projData.assignedPresenterName && (                  <div className="manager-details-presentation-upload-row">                    📌 المصمم المسند إليه عمل البرزنتيشن حالياً: <strong>{projData.assignedPresenterName}</strong>                  </div>                )}              </div>


              {presentationFile ? (                <div className="manager-details-upload-presentation">                  <a href={getForceDownloadUrl(presentationFile)} download target="_blank" rel="noreferrer" className="manager-details-finish-wrap">                    📥 Download Presentation File ({projData.presentationFileName || 'Presentation'})                  </a>                </div>              ) : (                <p className="manager-details-finish">لم يتم رفع ملف البرزنتيشن بعد.</p>              )}


              <div className="manager-details-style-99">                <label className="manager-details-style-100">                  {uploadingPres ? 'Uploading...' : '📊 Upload Presentation File'}                  <input type="file" onChange={handlePresentationUpload} disabled={uploadingPres} className="manager-details-file-label" />                </label>              </div>


              <div className="manager-details-style-101">                <button                  onClick={handleFinalFinish}


                  className="manager-details-style-102">                  Finish                </button>              </div>            </div>


          </div>        </div>      </div></>  );}