import React, { useEffect, useState } from "react";

import { auth } from "../firebase";

import { uploadToCloudinary } from "../uploadService";

import { createNotification } from "../services/notificationService";

import {

  subscribeToUserTasks,

  updateTask,

} from "../services/taskService";export default function Dashboard({ user, onLogout }) {

  const [tasks, setTasks] = useState([]);

  const [taskInputs, setTaskInputs] = useState({});

  const [uploadingTaskId, setUploadingTaskId] = useState(null);

  const [popupMessage, setPopupMessage] = useState(null);  const currentUserId = user?.uid || auth.currentUser?.uid;  useEffect(() => {

    if (!currentUserId) return;    return subscribeToUserTasks(

      currentUserId,

      setTasks,

      (error) => {

        console.error("Tasks sync error:", error);

        setPopupMessage("فشل تحميل المهام ❌");

      }

    );

  }, [currentUserId]);  const showPopup = (message) => {

    setPopupMessage(message);    window.setTimeout(() => {

      setPopupMessage(null);

    }, 2200);

  };  const handleInputChange = (taskId, field, value) => {

    setTaskInputs((prev) => ({

      ...prev,

      [taskId]: {

        ...prev[taskId],

        [field]: value,

      },

    }));

  };  const handleFileUpload = async (taskId, file) => {

    if (!file) return;    try {

      setUploadingTaskId(taskId);      const uploaded = await uploadToCloudinary(file);      await updateTask(taskId, {

        fileLink: uploaded.url,

        fileName: uploaded.originalName,

      });      showPopup("تم رفع الملف بنجاح 📁✅");

    } catch (error) {

      console.error(error);

      showPopup(`فشل رفع الملف: ${error.message}`);

    } finally {

      setUploadingTaskId(null);

    }

  };  const handleUpdateTask = async (taskId, newStatus) => {

    try {

      const input = taskInputs[taskId] || {};      await updateTask(taskId, {

        status: newStatus,

        ...(input.fileLink !== undefined && {

          fileLink: input.fileLink,

        }),

        ...(input.notes !== undefined && {

          notes: input.notes,

        }),

      });      if (newStatus === "completed") {
        const completedTask = tasks.find(
          (task) => (task.id || task._id) === taskId
        );

        if (completedTask?.createdById) {
          try {
            await createNotification({
              recipientId: completedTask.createdById,
              recipientRole: "manager",
              taskId,
              projectId: completedTask.projectId || "",
              type: "task_completed",
              title: "تم تسليم مهمة",
              message: `تم تسليم المهمة "${completedTask.title || ""}" وإكمالها بواسطة ${user?.name || "المصمم"}.`,
              createdById: currentUserId,
            });
          } catch (notificationError) {
            console.error(
              "Task completion notification failed:",
              notificationError
            );
          }
        }
      }

      showPopup("تم تحديث المهمة بنجاح ✅");

    } catch (error) {

      console.error(error);

      showPopup("فشل تحديث المهمة ❌");

    }

  };  return (

    <>

      <style>{`

        /* =========================================

           Dashboard

           ========================================= */        .dashboard-page {

          display: flex;

          justify-content: center;

          align-items: flex-start;

          min-height: 100vh;

          box-sizing: border-box;

          background: linear-gradient(

            135deg,

            #0f172a 0%,

            #1e1b4b 100%

          );

          font-family:

            "Segoe UI",

            Tahoma,

            Geneva,

            Verdana,

            sans-serif;

          direction: rtl;

          color: #fff;

          padding: 40px 20px;

          overflow-y: auto;

          position: relative;

        }        /* =========================================

           Main Card

           ========================================= */        .dashboard-card {

          background: rgba(30, 41, 59, 0.7);

          backdrop-filter: blur(10px);

          -webkit-backdrop-filter: blur(10px);

          border: 1px solid rgba(255, 255, 255, 0.1);

          padding: 30px;

          border-radius: 16px;

          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

          width: 100%;

          max-width: 750px;

          box-sizing: border-box;

          text-align: right;

        }        /* =========================================

           Header

           ========================================= */        .dashboard-header {

          display: flex;

          justify-content: space-between;

          align-items: center;

          border-bottom: 1px solid #f1f5f9;

          padding-bottom: 20px;

          margin-bottom: 20px;

          gap: 15px;

        }        .dashboard-title {

          margin: 0;

          color: #60a5fa;

          font-size: 24px;

          font-weight: 700;

        }        /* =========================================

           Role Badge

           ========================================= */        .dashboard-role-badge {

          background: linear-gradient(

            135deg,

            #3b82f6 0%,

            #1d4ed8 100%

          );

          color: white;

          padding: 4px 10px;

          border-radius: 6px;

          font-size: 13px;

          font-weight: bold;

          white-space: nowrap;

        }        /* =========================================

           Tasks Section

           ========================================= */        .dashboard-tasks-section {

          width: 100%;

        }        .dashboard-tasks-title {

          color: #f8fafc;

          font-size: 18px;

          margin: 0 0 15px;

          border-bottom: 2px solid #334155;

          padding-bottom: 8px;

        }        .dashboard-empty-message {

          margin: 20px 0;

          color: #cbd5e1;

          text-align: center;

          font-size: 15px;

        }        /* =========================================

           Task Item

           ========================================= */        .dashboard-task-item {

          background: rgba(15, 23, 42, 0.8);

          padding: 15px;

          border-radius: 10px;

          margin-bottom: 12px;

          border: 1px solid #334155;

          transition:

            transform 0.2s ease,

            border-color 0.2s ease;

        }        .dashboard-task-item:hover {

          transform: translateY(-2px);

          border-color: #475569;

        }        .dashboard-task-title {

          color: #93c5fd;

          margin: 0 0 5px;

          font-size: 17px;

        }        .dashboard-task-description {

          color: #cbd5e1;

          margin: 8px 0;

          line-height: 1.6;

          font-size: 14px;

        }        .dashboard-task-status {

          color: #cbd5e1;

          margin: 8px 0 14px;

          font-size: 14px;

        }        .dashboard-task-status strong {

          color: #f8fafc;

        }        /* =========================================

           Inputs

           ========================================= */        .dashboard-task-input,

        .dashboard-task-textarea {

          width: 100%;

          box-sizing: border-box;

          background: rgba(30, 41, 59, 0.9);

          color: #fff;

          border: 1px solid #475569;

          border-radius: 7px;

          padding: 10px 12px;

          font-family: inherit;

          font-size: 14px;

          outline: none;

          margin-top: 8px;

        }        .dashboard-task-input::placeholder,

        .dashboard-task-textarea::placeholder {

          color: #94a3b8;

        }        .dashboard-task-input:focus,

        .dashboard-task-textarea:focus {

          border-color: #60a5fa;

          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.12);

        }        .dashboard-task-textarea {

          resize: vertical;

          min-height: 70px;

          line-height: 1.5;

        }        /* =========================================

           File Upload

           ========================================= */        .dashboard-upload-label {

          display: inline-flex;

          align-items: center;

          justify-content: center;

          background: #334155;

          color: #fff;

          padding: 8px 14px;

          border-radius: 7px;

          margin-top: 10px;

          cursor: pointer;

          font-size: 13px;

          font-weight: bold;

          transition:

            background 0.2s ease,

            opacity 0.2s ease;

        }        .dashboard-upload-label:hover {

          background: #475569;

        }        .dashboard-upload-label.is-uploading {

          opacity: 0.65;

          cursor: not-allowed;

        }        .dashboard-file-preview {

          margin: 10px 0 0;

          font-size: 14px;

        }        .dashboard-file-preview a {

          color: #60a5fa;

          text-decoration: underline;

          font-weight: bold;

        }        .dashboard-file-preview a:hover {

          color: #93c5fd;

        }        /* =========================================

           Task Buttons

           ========================================= */        .dashboard-task-buttons {

          margin-top: 12px;

          display: flex;

          gap: 10px;

          flex-wrap: wrap;

        }        .dashboard-task-button {

          padding: 7px 14px;

          border: none;

          border-radius: 6px;

          cursor: pointer;

          font-weight: bold;

          font-size: 13px;

          transition:

            opacity 0.2s ease,

            transform 0.15s ease;

        }        .dashboard-task-button:hover {

          opacity: 0.9;

          transform: translateY(-1px);

        }        .dashboard-task-button:active {

          transform: translateY(0);

        }        .dashboard-task-button-progress {

          background: #eab308;

          color: #000;

        }        .dashboard-task-button-completed {

          background: #22c55e;

          color: #fff;

        }        /* =========================================

           Logout

           ========================================= */        .dashboard-logout-button {

          background: linear-gradient(

            135deg,

            #ef4444 0%,

            #b91c1c 100%

          );

          color: white;

          border: none;

          padding: 12px;

          border-radius: 8px;

          cursor: pointer;

          font-weight: bold;

          font-size: 15px;

          transition: opacity 0.3s ease;

          width: 100%;

          margin-top: 20px;

        }        .dashboard-logout-button:hover {

          opacity: 0.9;

        }        /* =========================================

           Popup

           ========================================= */        .dashboard-popup {

          position: fixed;

          top: 50%;

          left: 50%;

          transform: translate(-50%, -50%);

          background: #0f172a;

          color: #fff;

          padding: 16px 32px;

          border-radius: 10px;

          z-index: 100000;

          border: 1px solid #334155;

          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

          text-align: center;

          font-weight: 600;

          max-width: calc(100vw - 40px);

          box-sizing: border-box;

        }        /* =========================================

           Responsive

           ========================================= */        @media (max-width: 600px) {

          .dashboard-page {

            padding: 25px 12px;

          }          .dashboard-card {

            padding: 20px 15px;

            border-radius: 12px;

          }          .dashboard-header {

            align-items: flex-start;

            flex-direction: column;

          }          .dashboard-title {

            font-size: 21px;

          }          .dashboard-role-badge {

            font-size: 12px;

          }          .dashboard-task-buttons {

            flex-direction: column;

          }          .dashboard-task-button {

            width: 100%;

          }          .dashboard-popup {

            padding: 14px 20px;

            font-size: 14px;

          }

        }

      `}</style>      {popupMessage && (

        <div className="dashboard-popup">

          {popupMessage}

        </div>

      )}      <div className="dashboard-page">

        <div className="dashboard-card">

          <div className="dashboard-header">

            <h2 className="dashboard-title">

              أهلاً بك، {user?.name} 🚀

            </h2>            <span className="dashboard-role-badge">

              {user?.role}

            </span>

          </div>          <div className="dashboard-tasks-section">

            <h3 className="dashboard-tasks-title">

              {user?.role === "presenter"

                ? "العروض التقديمية المسندة إليك 📊"

                : "المهام المسندة إليك 📋"}

            </h3>            {tasks.length === 0 ? (

              <p className="dashboard-empty-message">

                لا توجد مهام مسندة إليك حالياً ✨

              </p>

            ) : (

              tasks.map((task) => {

                const taskId = task.id || task._id;

                const input = taskInputs[taskId] || {};                return (

                  <div

                    key={taskId}

                    className="dashboard-task-item"

                  >

                    <h4 className="dashboard-task-title">

                      {task.title}

                    </h4>                    <p className="dashboard-task-description">

                      {task.description}

                    </p>                    <p className="dashboard-task-status">

                      الحالة:{" "}

                      <strong>

                        {task.status === "completed"

                          ? "مكتملة 🟢"

                          : task.status === "in-progress"

                          ? "قيد التنفيذ 🟡"

                          : "معلقة ⏳"}

                      </strong>

                    </p>                    <input

                      className="dashboard-task-input"

                      type="text"

                      placeholder="رابط الملف..."

                      defaultValue={task.fileLink || ""}

                      onChange={(e) =>

                        handleInputChange(

                          taskId,

                          "fileLink",

                          e.target.value

                        )

                      }

                    />                    <label

                      className={`dashboard-upload-label ${

                        uploadingTaskId === taskId

                          ? "is-uploading"

                          : ""

                      }`}

                    >

                      {uploadingTaskId === taskId

                        ? "رفع..."

                        : "رفع ملف 📁"}                      <input

                        type="file"

                        hidden

                        disabled={

                          uploadingTaskId === taskId

                        }

                        onChange={(e) =>

                          handleFileUpload(

                            taskId,

                            e.target.files?.[0]

                          )

                        }

                      />

                    </label>                    {task.fileLink && (

                      <p className="dashboard-file-preview">

                        <a

                          href={task.fileLink}

                          target="_blank"

                          rel="noreferrer"

                        >

                          معاينة الملف ↗

                        </a>

                      </p>

                    )}                    <textarea

                      className="dashboard-task-textarea"

                      placeholder="ملاحظات..."

                      defaultValue={task.notes || ""}

                      onChange={(e) =>

                        handleInputChange(

                          taskId,

                          "notes",

                          e.target.value

                        )

                      }

                      rows="2"

                    />                    <div className="dashboard-task-buttons">

                      <button

                        className="dashboard-task-button dashboard-task-button-progress"

                        onClick={() =>

                          handleUpdateTask(

                            taskId,

                            "in-progress"

                          )

                        }

                      >

                        بدء التنفيذ

                      </button>                      <button

                        className="dashboard-task-button dashboard-task-button-completed"

                        onClick={() =>

                          handleUpdateTask(

                            taskId,

                            "completed"

                          )

                        }

                      >

                        تسليم وإكمال

                      </button>

                    </div>

                  </div>

                );

              })

            )}

          </div>          <button

            className="dashboard-logout-button"

            onClick={onLogout}

          >

            تسجيل الخروج

          </button>

        </div>

      </div>

    </>

  );

}