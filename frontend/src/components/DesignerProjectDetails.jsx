import React, { useState, useEffect } from 'react';


import { subscribeToProject, updateProject } from '../services/projectService';

import { createNotification } from '../services/notificationService';import { uploadToCloudinary } from '../uploadService';export default function DesignerProjectDetails({ project, user, onBack }) {


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

    if (!projectId) return;    const unsubscribe = subscribeToProject(

      projectId,

      (data) => {

        if (data) setProjData(data);

      },

      (err) => console.error('Error listening to project:', err)

    );    return () => unsubscribe();

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
  // 2. رفع صورة أو ملف الـ Checkpoint إلى Cloudinary وإشعار المنسق


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
      await updateProject(projectId, { checkpoints: updatedCheckpoints });
            // إرسال إشعار لحظي للمنسق

      if (projData.coordinatorId) {

        try {

          await createNotification({

            recipientId: projData.coordinatorId,

            recipientRole: 'coordinator',

            projectId,

            type: 'checkpoint_submitted',

            title: 'تم تسليم Checkpoint',

            message: `📸 قام المصمم ${user?.name || 'المصمم'} برفع تسليم للنقطة "${updatedCheckpoints[index].title}" في مشروع: "${projData.projectName || projData.name}".`,

            createdById: user?.uid || user?.id || user?._id || '',

          });

        } catch (notifyErr) {

          console.error('Failed to notify coordinator about checkpoint', notifyErr);

        }

      }    showPopup('تم رفع العمل بنجاح وإرساله للمراجعة وإشعار المنسق! 📸');


    } catch (err) {


      console.error(err);


      showPopup('فشل رفع الملف: ' + err.message);


    } finally {


      setUploadingCpIndex(null);


    }


  };
  // 3. رفع ملف الـ Render النهائي إلى Cloudinary وإشعار المنسق


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
      await updateProject(projectId, {


        renderFileLink: downloadURL,


        renderFileName: fileName,


        renderStatus: 'uploaded'


      });
            // إرسال إشعار لحظي للمنسق

      if (projData.coordinatorId) {

        try {

          await createNotification({

            recipientId: projData.coordinatorId,

            recipientRole: 'coordinator',

            projectId,

            type: 'render_uploaded',

            title: 'تم رفع Render',

            message: `🎨 قام المصمم ${user?.name || 'المصمم'} برفع ملف الـ Render لمشروع: "${projData.projectName || projData.name}".`,

            createdById: user?.uid || user?.id || user?._id || '',

          });

        } catch (notifyErr) {

          console.error('Failed to notify coordinator about render', notifyErr);

        }

      }    showPopup('تم رفع ملف الـ Render بنجاح وإشعار المنسق! 🚀');


    } catch (err) {


      console.error(err);


      showPopup('فشل رفع ملف الـ Render: ' + err.message);


    } finally {


      setIsUploadingRender(false);


    }


  };
  // 4. رفع وحفظ ملف البرزنتيشن إلى Cloudinary وإشعار المنسق


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
      await updateProject(projectId, {


        presentationFileLink: downloadURL,


        presentationFileName: fileName,


        status: 'finished'


      });
            // إرسال إشعار لحظي للمنسق

      if (projData.coordinatorId) {

        try {

          await createNotification({

            recipientId: projData.coordinatorId,

            recipientRole: 'coordinator',

            projectId,

            type: 'presentation_finished',

            title: 'تم إنهاء البرزنتيشن',

            message: `📊 قام المصمم ${user?.name || 'المصمم'} برفع وإنهاء البرزنتيشن لمشروع: "${projData.projectName || projData.name}".`,

            createdById: user?.uid || user?.id || user?._id || '',

          });

        } catch (notifyErr) {

          console.error('Failed to notify coordinator about presentation', notifyErr);

        }

      }    showPopup('تم إنهاء وحفظ البرزنتيشن بنجاح وإشعار المنسق! 🎉');


    } catch (err) {


      console.error(err);


      showPopup('فشل حفظ البرزنتيشن: ' + err.message);


    } finally {


      setIsUploadingPresentation(false);


    }


  };
  return (    <>      <style>{`


        /* =====================================================           Designer Project Details - page specific styles           ===================================================== */


        .designer-project-page {          direction: ltr;          text-align: left;          color: #000;          background: #fff;          min-height: 100vh;          padding-bottom: 60px;          position: relative;          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;        }


        .designer-project-popup {          position: fixed;          top: 50%;          left: 50%;          transform: translate(-50%, -50%);          background: #0f172a;          color: #fff;          padding: 16px 32px;          border-radius: 10px;          font-size: 16px;          font-weight: bold;          box-shadow: 0 10px 25px rgba(0,0,0,0.3);          z-index: 100000;          text-align: center;          border: 1px solid #38bdf8;          max-width: calc(100vw - 30px);        }


        .designer-project-preview-overlay {          position: fixed;          inset: 0;          width: 100vw;          height: 100vh;          background: rgba(0,0,0,0.85);          z-index: 9999;          display: flex;          justify-content: center;          align-items: center;          padding: 20px;        }


        .designer-project-preview-modal {          position: relative;          background: #fff;          padding: 25px;          border-radius: 12px;          max-width: 95%;          max-height: 95%;          display: flex;          flex-direction: column;          align-items: center;          box-shadow: 0 10px 25px rgba(0,0,0,0.3);          overflow: hidden;        }


        .designer-project-preview-close {          position: absolute;          top: 12px;          right: 12px;          background: #ef4444;          color: #fff;          border: none;          width: 35px;          height: 35px;          border-radius: 50%;          font-size: 18px;          font-weight: bold;          cursor: pointer;          display: flex;          align-items: center;          justify-content: center;          z-index: 10000;        }


        .designer-project-preview-scroll {          overflow: auto;          max-width: 100%;          max-height: 72vh;          border-radius: 8px;          margin-bottom: 15px;          cursor: zoom-in;          display: flex;          justify-content: center;        }


        .designer-project-preview-image {          max-width: 100%;          max-height: 72vh;          width: auto;          transition: transform 0.3s ease;          object-fit: contain;        }


        .designer-project-preview-image.zoomed {          max-width: none;          max-height: none;          width: 160%;        }


        .designer-project-deadline {          padding: 5px 10px;          border-radius: 6px;          font-weight: 600;        }


        .designer-project-deadline-none {          color: #000;        }


        .designer-project-deadline-completed {          background: #dcfce7;          color: #16a34a;        }


        .designer-project-deadline-past {          background: #fee2e2;          color: #dc2626;        }


        .designer-project-deadline-active {          background: #e0f2fe;          color: #0284c7;        }


        .designer-project-status-completed {          color: #16a34a;        }


        .designer-project-status-active {          color: #d97706;        }


        .designer-project-checkpoint-row {          background: #fff;        }


        .designer-project-checkpoint-row-completed {          background: #dcfce7;        }


        .designer-project-checkpoint-status {          font-weight: bold;        }


        .designer-project-checkpoint-status.is-completed {          color: #16a34a;        }


        .designer-project-checkpoint-status.is-submitted {          color: #0284c7;        }


        .designer-project-checkpoint-status.is-progress {          color: #d97706;        }


        .designer-project-action-button {          border: none;          padding: 8px 25px;          border-radius: 6px;          font-weight: bold;          font-size: 14px;        }


        .designer-project-done-button,        .designer-project-finish-button {          background: #16a34a;          color: #fff;          cursor: pointer;        }


        .designer-project-done-button:disabled,        .designer-project-finish-button:disabled {          cursor: not-allowed;          opacity: 0.65;        }


        .designer-project-file-link {          font-size: 14px;          font-weight: bold;          color: #0284c7;          text-decoration: underline;        }


        .designer-project-hidden-input {          display: none;        }


        .designer-project-table {          width: 100%;          border-collapse: collapse;          background: #fff;          color: #000;        }


        .designer-project-table-head {          background: #f1f5f9;          text-align: left;          color: #000;        }


        .designer-project-table-cell {          padding: 12px;          border: 1px solid #cbd5e1;        }


        .designer-project-table-cell-task {          width: 35%;        }


        .designer-project-table-cell-upload {          width: 45%;        }


        .designer-project-table-cell-status {          text-align: center;          width: 20%;        }


        .designer-project-upload-preview {          width: 110px;          height: 75px;          object-fit: cover;          border-radius: 6px;          border: 1px solid #cbd5e1;          cursor: pointer;        }


        .designer-project-upload-column {          display: flex;          flex-direction: column;          align-items: center;          gap: 6px;        }


        .designer-project-upload-name {          font-size: 11px;          color: #64748b;        }


        .designer-project-upload-change {          background: #64748b;          color: #fff;          padding: 4px 10px;          border-radius: 4px;          cursor: pointer;          font-size: 11px;          font-weight: bold;        }


        .designer-project-upload-empty {          color: #94a3b8;          font-style: italic;          font-size: 13px;          font-weight: bold;        }


        .designer-project-upload-button {          background: #0284c7;          color: #fff;          padding: 6px 14px;          border-radius: 6px;          cursor: pointer;          font-size: 12px;          font-weight: bold;        }


        .designer-project-note {          font-size: 11px;          color: #dc2626;          background: #fee2e2;          padding: 2px 6px;          border-radius: 4px;          display: block;          margin-top: 4px;        }


        .designer-project-locked-message {          padding: 15px;          background: #e2e8f0;          border-radius: 6px;          font-weight: bold;          color: #64748b;          text-align: center;        }


        .designer-project-file-box {          background: #fff;          padding: 15px;          border-radius: 8px;          border: 1px solid #cbd5e1;          margin-bottom: 15px;        }


        .designer-project-file-actions {          display: flex;          align-items: center;          justify-content: flex-start;          gap: 10px;        }


        .designer-project-edit-file {          background: #f59e0b;          color: #fff;          padding: 8px 20px;          border-radius: 6px;          cursor: pointer;          font-size: 13px;          font-weight: bold;          display: inline-block;          margin: 0;        }


        .designer-project-section {          background: #f8fafc;          padding: 20px;          border-radius: 12px;          border: 1px solid #e2e8f0;          color: #000;          margin-bottom: 25px;        }


        .designer-project-section-title {          color: #000;          margin: 0 0 12px;          font-size: 18px;        }


        .designer-project-warning-note {          background: #fee2e2;          border: 1px solid #f59e0b;          padding: 12px;          border-radius: 6px;          margin-top: 15px;        }


        .designer-project-warning-title {          color: #dc2626;          display: block;          margin-bottom: 4px;        }


        .designer-project-warning-text {          margin: 0;          font-size: 14px;          color: #991b1b;        }


        .designer-project-main {          max-width: 900px;          margin: 20px auto;          padding: 0 20px;          background: #fff;        }


        .designer-project-topbar {          display: flex;          justify-content: space-between;          align-items: center;          margin-bottom: 25px;        }


        .designer-project-back-button {          background: #64748b;          color: #fff;          border: none;          padding: 10px 20px;          border-radius: 6px;          cursor: pointer;          font-weight: bold;        }


        .designer-project-header {          color: #000;          background: #fff;        }


        .designer-project-title-area {          text-align: center;          margin-bottom: 30px;        }


        .designer-project-title {          color: #0f172a;          font-size: 36px;          font-weight: 800;          margin: 0;        }


        .designer-project-status-line {          font-size: 14px;          color: #64748b;          margin-top: 5px;        }


        .designer-project-brief-section {          margin-bottom: 25px;          background: #f8fafc;          padding: 20px;          border-radius: 12px;          border: 1px solid #e2e8f0;        }


        .designer-project-brief-text {          color: #000;          margin: 0 0 10px;          font-size: 15px;        }


        .designer-project-manager-note {          margin-top: 12px;          padding: 12px;          background: #fff;          border-radius: 6px;          border: 1px solid #cbd5e1;        }


        .designer-project-manager-note-title {          color: #0284c7;          display: block;          margin-bottom: 4px;          font-size: 13px;        }


        .designer-project-manager-note-text {          margin: 0;          font-size: 14px;          color: #334155;        }


        .designer-project-timeline-fields {          display: flex;          flex-direction: column;          gap: 15px;        }


        .designer-project-field-label {          font-size: 12px;          font-weight: bold;          color: #64748b;          display: block;          margin-bottom: 6px;        }


        .designer-project-readonly-input {          width: 100%;          padding: 12px 16px;          border-radius: 10px;          border: 1px solid #cbd5e1;          background: #fff;          color: #0f172a;          font-weight: 600;          font-size: 14px;        }


        .designer-project-checkpoints {          margin-bottom: 25px;          color: #000;        }


        .designer-project-checkpoints-title {          color: #000;          font-size: 18px;          margin: 0 0 15px;        }


        .designer-project-empty-checkpoints {          color: #64748b;          font-style: italic;          background: #f8fafc;          padding: 20px;          border-radius: 8px;          text-align: center;          border: 1px solid #e2e8f0;        }


        @media (max-width: 700px) {          .designer-project-main {            padding: 0 12px;          }


          .designer-project-topbar {            flex-direction: column;            align-items: stretch;            gap: 12px;          }


          .designer-project-back-button {            width: 100%;          }


          .designer-project-title {            font-size: 28px;          }


          .designer-project-table {            min-width: 700px;          }


          .designer-project-checkpoints {            overflow-x: auto;          }


          .designer-project-preview-modal {            padding: 18px;            max-width: 98%;            max-height: 98%;          }


          .designer-project-preview-image.zoomed {            width: 140%;          }


          .designer-project-file-actions {            flex-wrap: wrap;          }        }


        @media (max-width: 480px) {          .designer-project-title {            font-size: 24px;          }


          .designer-project-section,          .designer-project-brief-section {            padding: 15px;          }


          .designer-project-popup {            padding: 14px 20px;            font-size: 14px;          }        }


        .designer-project-inline-1 {          direction: ltr;          text-align: left;          color: #000;          background: #ffffff;          min-height: 100vh;          padding-bottom: 60px;          position: relative;        }        .designer-project-inline-2 {          position: fixed;          top: 50%;          left: 50%;          transform: translate(-50%, -50%);          background-color: #0f172a;          color: #fff;          padding: 16px 32px;          border-radius: 10px;          font-size: 16px;          font-weight: bold;          box-shadow: 0 10px 25px rgba(0,0,0,0.3);          z-index: 100000;          text-align: center;          border: 1px solid #38bdf8;        }        .designer-project-inline-3 {          position: fixed;          top: 0;          left: 0;          width: 100vw;          height: 100vh;          background: rgba(0,0,0,0.85);          z-index: 9999;          display: flex;          justify-content: center;          align-items: center;          padding: 20px;        }        .designer-project-inline-4 {          position: relative;          background: #fff;          padding: 25px;          border-radius: 12px;          max-width: 95%;          max-height: 95%;          display: flex;          flex-direction: column;          align-items: center;          box-shadow: 0 10px 25px rgba(0,0,0,0.3);          overflow: hidden;        }        .designer-project-inline-5 {          position: absolute;          top: 12px;          right: 12px;          background: #ef4444;          color: #fff;          border: none;          width: 35px;          height: 35px;          border-radius: 50%;          font-size: 18px;          font-weight: bold;          cursor: pointer;          display: flex;          align-items: center;          justify-content: center;          z-index: 10000;        }        .designer-project-inline-6 {          max-width: 900px;          margin: 20px auto;          padding: 0 20px;          background: #ffffff;        }        .designer-project-inline-7 {          display: flex;          justify-content: space-between;          align-items: center;          margin-bottom: 25px;        }        .designer-project-inline-8 {          background: #64748b;          color: #fff;          border: none;          padding: 10px 20px;          border-radius: 6px;          cursor: pointer;          font-weight: bold;        }        .designer-project-inline-9 {          color: #000;          background: #ffffff;        }        .designer-project-inline-10 {          text-align: center;          margin-bottom: 30px;        }        .designer-project-inline-11 {          color: #0f172a;          font-size: 36px;          font-weight: 800;        }        .designer-project-inline-12 {          font-size: 14px;          color: #64748b;          margin-top: 5px;        }        .designer-project-inline-13 {          margin-bottom: 25px;          background: #f8fafc;          padding: 20px;          border-radius: 12px;          border: 1px solid #e2e8f0;        }        .designer-project-inline-14 {          color: #000;          margin: 0 0 10px 0;          font-size: 15px;        }        .designer-project-inline-15 {          color: #0284c7;          text-decoration: underline;          font-weight: bold;        }        .designer-project-inline-16 {          margin-top: 12px;          padding: 12px;          background: #fff;          border-radius: 6px;          border: 1px solid #cbd5e1;        }        .designer-project-inline-17 {          color: #0284c7;          display: block;          margin-bottom: 4px;          font-size: 13px;        }        .designer-project-inline-18 {          margin: 0;          font-size: 14px;          color: #334155;        }        .designer-project-inline-19 {          margin-bottom: 25px;          background: #f8fafc;          padding: 20px;          border-radius: 12px;          border: 1px solid #e2e8f0;          color: #000;        }        .designer-project-inline-20 {          color: #000;          margin-bottom: 15px;          font-size: 18px;        }        .designer-project-inline-21 {          display: flex;          flex-direction: column;          gap: 15px;        }        .designer-project-inline-22 {          font-size: 12px;          font-weight: bold;          color: #64748b;          display: block;          margin-bottom: 6px;        }        .designer-project-inline-23 {          width: 100%;          padding: 12px 16px;          border-radius: 10px;          border: 1px solid #cbd5e1;          background: #fff;          color: #0f172a;          font-weight: 600;          font-size: 14px;          box-sizing: border-box;        }        .designer-project-inline-24 {          margin-bottom: 25px;          color: #000;        }        .designer-project-inline-25 {          color: #000;          font-size: 18px;          margin-bottom: 15px;        }        .designer-project-inline-26 {          color: #64748b;          font-style: italic;          background: #f8fafc;          padding: 20px;          border-radius: 8px;          text-align: center;          border: 1px solid #e2e8f0;        }        .designer-project-inline-27 {          width: 100%;          border-collapse: collapse;          background: #fff;          color: #000;        }        .designer-project-inline-28 {          background: #f1f5f9;          text-align: left;          color: #000;        }        .designer-project-inline-29 {          padding: 12px;          border: 1px solid #cbd5e1;          width: 35%;        }        .designer-project-inline-30 {          padding: 12px;          border: 1px solid #cbd5e1;          width: 45%;        }        .designer-project-inline-31 {          padding: 12px;          border: 1px solid #cbd5e1;          text-align: center;          width: 20%;        }        .designer-project-inline-32 {          padding: 12px;          border: 1px solid #cbd5e1;          vertical-align: middle;          font-weight: 600;        }        .designer-project-inline-33 {          padding: 12px;          border: 1px solid #cbd5e1;          vertical-align: middle;          text-align: center;        }        .designer-project-inline-34 {          display: flex;          flex-direction: column;          align-items: center;          gap: 6px;        }        .designer-project-inline-35 {          width: 110px;          height: 75px;          object-fit: cover;          border-radius: 6px;          border: 1px solid #cbd5e1;          cursor: pointer;        }        .designer-project-inline-36 {          font-size: 11px;          color: #64748b;        }        .designer-project-inline-37 {          background: #64748b;          color: #fff;          padding: 4px 10px;          border-radius: 4px;          cursor: pointer;          font-size: 11px;          font-weight: bold;        }        .designer-project-inline-38 {          display: none;        }        .designer-project-inline-39 {          color: #94a3b8;          font-style: italic;          font-size: 13px;          font-weight: bold;        }        .designer-project-inline-40 {          background: #0284c7;          color: #fff;          padding: 6px 14px;          border-radius: 6px;          cursor: pointer;          font-size: 12px;          font-weight: bold;        }        .designer-project-inline-41 {          padding: 12px;          border: 1px solid #cbd5e1;          text-align: center;          vertical-align: middle;        }        .designer-project-inline-42 {          font-size: 11px;          color: #dc2626;          background: #fee2e2;          padding: 2px 6px;          border-radius: 4px;          display: block;          margin-top: 4px;        }        .designer-project-inline-43 {          color: #000;          margin-bottom: 12px;          font-size: 18px;        }        .designer-project-inline-44 {          padding: 15px;          background: #e2e8f0;          border-radius: 6px;          font-weight: bold;          color: #64748b;          text-align: center;        }        .designer-project-inline-45 {          background: #fff;          padding: 15px;          border-radius: 8px;          border: 1px solid #cbd5e1;          margin-bottom: 15px;        }        .designer-project-inline-46 {          font-size: 14px;          font-weight: bold;          color: #0284c7;          text-decoration: underline;        }        .designer-project-inline-47 {          font-size: 14px;          color: #94a3b8;          font-style: italic;        }        .designer-project-inline-48 {          display: flex;          align-items: center;          justify-content: flex-start;          gap: 10px;        }        .designer-project-inline-49 {          background: #f59e0b;          color: #fff;          padding: 8px 20px;          border-radius: 6px;          cursor: pointer;          font-size: 13px;          font-weight: bold;          display: inline-block;          margin: 0;        }        .designer-project-inline-50 {          background: #f8fafc;          padding: 20px;          border-radius: 12px;          border: 1px solid #e2e8f0;          color: #000;        }        .designer-project-inline-51 {          background: #fee2e2;          border: 1px solid #f59e0b;          padding: 12px;          border-radius: 6px;          margin-top: 15px;        }        .designer-project-inline-52 {          color: #dc2626;          display: block;          margin-bottom: 4px;        }        .designer-project-inline-53 {          margin: 0;          font-size: 14px;          color: #991b1b;        }      `}</style>


      <div className="designer-project-page designer-project-inline-1">
      {/* Toast Notification */}


      {popupMessage && (


        <div className="designer-project-inline-2">


          {popupMessage}


        </div>


      )}
      {/* Image Preview Modal */}


      {previewImage && (


        <div className="designer-project-inline-3">


          <div className="designer-project-inline-4">
            <button 


              onClick={() => { setPreviewImage(null); setIsZoomed(false); }}


              className="designer-project-inline-5"


            >


              ✕


            </button>
            <div 


              onClick={() => setIsZoomed(!isZoomed)}


              className="designer-project-preview-scroll"


            >


              <img 


                src={previewImage} 


                alt="Full Preview" 


                className={`designer-project-preview-image ${isZoomed ? "zoomed" : ""}`} 


              />


            </div>


          </div>


        </div>


      )}
      <div className="designer-project-main designer-project-inline-6">
        <div className="designer-project-inline-7">


          <button onClick={onBack} className="designer-project-inline-8">


            ⬅ Back to List


          </button>


          <span style={getDeadlineStatusStyle()}>


            Deadline: {projData.deadline ? new Date(projData.deadline).toLocaleDateString() : 'غير محدد'}


          </span>


        </div>
        <div className="designer-project-inline-9">
          <div className="designer-project-inline-10">


            <h1 className="designer-project-inline-11">{projData.projectName || projData.name}</h1>


            <p className="designer-project-inline-12">


              Status: <strong className={(projData.status === 'finished' || projData.status === 'completed') ? 'designer-project-status-completed' : 'designer-project-status-active'}>{projData.status || 'in-progress'}</strong>


            </p>


          </div>
          {/* Brief File & Notes */}


          <div className="designer-project-inline-13">


            <p className="designer-project-inline-14">


              <strong>Brief File: </strong> 


              {projData.brief ? (


                <a href={getForceDownloadUrl(projData.brief)} target="_blank" rel="noreferrer" className="designer-project-inline-15">


                  📥 {projData.briefName || projData.brief.split('/').pop() || 'تحميل ملف الـ Brief'}


                </a>


              ) : 'No file uploaded'}


            </p>


            {projData.managerNotes && (


              <div className="designer-project-inline-16">


                <strong className="designer-project-inline-17">Manager Notes:</strong>


                <p className="designer-project-inline-18">{projData.managerNotes}</p>


              </div>


            )}


          </div>
          {/* Project Timelines */}


          <div className="designer-project-inline-19">


            <h4 className="designer-project-inline-20">Project Timelines:</h4>


            <div className="designer-project-inline-21">


              <div>


                <label className="designer-project-inline-22">START DATE *</label>


                <input 


                  type="text" 


                  disabled 


                  value={projData.startDate ? new Date(projData.startDate).toLocaleString() : 'Not Set'} 


                  className="designer-project-inline-23" 


                />


              </div>


              <div>


                <label className="designer-project-inline-22">DEADLINE *</label>


                <input 


                  type="text" 


                  disabled 


                  value={projData.deadline ? new Date(projData.deadline).toLocaleString() : 'Not Set'} 


                  className="designer-project-inline-23" 


                />


              </div>


            </div>


          </div>
          {/* Checkpoints (Tasks) */}


          <div className="designer-project-inline-24">


            <h4 className="designer-project-inline-25">Checkpoints (Tasks):</h4>


            {checkpointsList.length === 0 ? (


              <p className="designer-project-inline-26">لا توجد نقاط مراجعة حالياً من المنسق.</p>


            ) : (


              <table className="designer-project-inline-27">


                <thead>


                  <tr className="designer-project-inline-28">


                    <th className="designer-project-inline-29">Task</th>


                    <th className="designer-project-inline-30">Upload Work (Image/File/Video)</th>


                    <th className="designer-project-inline-31">Status</th>


                  </tr>


                </thead>


                <tbody>


                  {checkpointsList.map((cp, idx) => {


                    const currentImg = cp.imageLink || cp.fileUrl;


                    const isCompleted = cp.isCompleted || cp.status === 'approved';
                    return (


                      <tr key={cp.id || idx} className={isCompleted ? 'designer-project-checkpoint-row designer-project-checkpoint-row-completed' : 'designer-project-checkpoint-row'}>


                        <td className="designer-project-inline-32">{cp.title}</td>


                        <td className="designer-project-inline-33">


                          {currentImg ? (


                            <div className="designer-project-inline-34">


                              <img src={currentImg} alt="Uploaded Work" onClick={() => setPreviewImage(currentImg)} className="designer-project-inline-35" />


                              <span className="designer-project-inline-36">{cp.fileName || 'ملف مرفوع'}</span>


                              <label className="designer-project-inline-37">


                                {uploadingCpIndex === idx ? 'جاري الرفع...' : 'تغيير الملف 🔄'}


                                <input type="file" accept="image/*,video/*" className="designer-project-inline-38" disabled={uploadingCpIndex === idx} onChange={(e) => handleUploadCheckpointImage(idx, e.target.files[0])} />


                              </label>


                            </div>


                          ) : (


                            <div className="designer-project-inline-34">


                              <span className="designer-project-inline-39">NO Picture / File</span>


                              <label className="designer-project-inline-40">


                                {uploadingCpIndex === idx ? 'جاري الرفع...' : 'Upload From Device 📁'}


                                <input type="file" accept="image/*,video/*" className="designer-project-inline-38" disabled={uploadingCpIndex === idx} onChange={(e) => handleUploadCheckpointImage(idx, e.target.files[0])} />


                              </label>


                            </div>


                          )}


                        </td>


                        <td className="designer-project-inline-41">


                          <span className={`designer-project-checkpoint-status ${isCompleted ? 'is-completed' : cp.status === 'submitted' ? 'is-submitted' : 'is-progress'}`}>


                            {isCompleted ? 'Completed 🟢' : cp.status === 'submitted' ? 'Under Review ⏳' : 'In Progress ⏳'}


                          </span>


                          {cp.note && (


                            <span className="designer-project-inline-42">


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


          <div className="designer-project-inline-19">


            <h4 className="designer-project-inline-43">Render Section:</h4>
            {!projData.isDoneAll ? (


              <div className="designer-project-inline-44">


                ⏳ Render Section مغلقة حالياً (في انتظار اعتماد المنسق لجميع الـ Checkpoints عبر Done All)


              </div>


            ) : (


              <div>


                <div className="designer-project-inline-45">


                  {renderFileObj || projData.renderFileLink ? (


                    <a href={getForceDownloadUrl(renderFileObj ? URL.createObjectURL(renderFileObj) : projData.renderFileLink)} target="_blank" rel="noreferrer" className="designer-project-inline-46">


                      {getFileIcon(renderFileObj ? renderFileObj.name : projData.renderFileName || projData.renderFileLink)} {renderFileObj ? renderFileObj.name : (projData.renderFileName || projData.renderFileLink.split('/').pop() || 'Render_Project_File')}


                    </a>


                  ) : (


                    <span className="designer-project-inline-47">No file uploaded yet</span>


                  )}


                </div>
                <div className="designer-project-inline-48">


                  <label className="designer-project-inline-49">


                    {renderFileObj ? 'تم اختيار ملف جديد' : 'تعديل '}


                    <input 


                      type="file" 


                      className="designer-project-inline-38" 


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


                    className="designer-project-action-button designer-project-done-button"


                  >


                    {isUploadingRender ? 'جارٍ الرفع...' : 'Done 🚀'}


                  </button>


                </div>


              </div>


            )}


          </div>
          {/* Presentation Section */}


          <div className="designer-project-inline-50">


            <h4 className="designer-project-inline-43">Presentation Section:</h4>
            <div>


              <div className="designer-project-inline-45">


                {presentationFileObj || projData.presentationFileLink ? (


                  <a href={getForceDownloadUrl(presentationFileObj ? URL.createObjectURL(presentationFileObj) : projData.presentationFileLink)} target="_blank" rel="noreferrer" className="designer-project-inline-46">


                    {getFileIcon(presentationFileObj ? presentationFileObj.name : projData.presentationFileName || projData.presentationFileLink)} {presentationFileObj ? presentationFileObj.name : (projData.presentationFileName || projData.presentationFileLink.split('/').pop() || 'Presentation_File')}


                  </a>


                ) : (


                  <span className="designer-project-inline-47">No file uploaded yet</span>


                )}


              </div>
              <div className="designer-project-inline-48">


                <label className="designer-project-inline-49">


                  {presentationFileObj ? 'تم اختيار ملف جديد' : 'تعديل '}


                  <input 


                    type="file" 


                    className="designer-project-inline-38" 


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


                  className="designer-project-action-button designer-project-finish-button"


                >


                  {isUploadingPresentation ? 'جارٍ الحفظ والرفع...' : 'Finish 🎉'}


                </button>


              </div>


            </div>
            {projData.presenterNote && (


              <div className="designer-project-inline-51">


                <strong className="designer-project-inline-52">ملاحظات التعديل المطلوبة:</strong>


                <p className="designer-project-inline-53">{projData.presenterNote}</p>


              </div>


            )}


          </div>
        </div>


      </div>


    </div>    </>

  );


}