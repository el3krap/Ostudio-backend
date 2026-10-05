import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  getUserProfile,
  subscribeToUsersByRole,
} from "../services/userService";
import { createTask } from "../services/taskService";
import { createNotification } from "../services/notificationService";

export default function CreateTask({ onCreated }) {
  const [designers, setDesigners] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    deadline: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToUsersByRole(
      "designer",
      (users) => {
        setDesigners(
          users.filter((user) => user.status === "active")
        );
      },
      (error) => {
        console.error("Failed to load designers:", error);
        setMessage("فشل تحميل المصممين.");
      }
    );

    return unsubscribe;
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.assignedToId) {
      setMessage("اكتب اسم المهمة واختر المصمم.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const creator = auth.currentUser;

      if (!creator) {
        throw new Error("يجب تسجيل الدخول أولاً.");
      }

      const assignedUser = designers.find(
        (user) =>
          user.uid === form.assignedToId ||
          user.id === form.assignedToId
      );

      if (!assignedUser) {
        throw new Error("المصمم المحدد غير موجود أو لم يعد متاحًا.");
      }

      const creatorProfile = await getUserProfile(creator.uid);

      const creatorName =
        creatorProfile?.name ||
        creator.displayName ||
        creator.email ||
        "";

      const createdTask = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        assignedToId: form.assignedToId,
        assignedToName: assignedUser.name || "",
        deadline: form.deadline
          ? new Date(form.deadline)
          : null,
        createdById: creator.uid,
        createdByName: creatorName,
      });

      // المهمة تم إنشاؤها بالفعل؛ فشل الإشعار لا يجب أن يعتبر
      // عملية إنشاء المهمة نفسها فاشلة.
      try {
        await createNotification({
          recipientId: form.assignedToId,
          recipientRole: "designer",
          taskId: createdTask?.id || createdTask?.taskId || "",
          type: "task_assigned",
          title: "تم إسناد مهمة جديدة",
          message: `تم إسناد مهمة جديدة إليك: "${form.title.trim()}" بواسطة ${creatorName}.`,
          createdById: creator.uid,
        });
      } catch (notificationError) {
        console.error(
          "Task created, but notification failed:",
          notificationError
        );
      }

      setForm({
        title: "",
        description: "",
        assignedToId: "",
        deadline: "",
      });

      setMessage("تم إسناد المهمة بنجاح وإرسال إشعار للمصمم ✅");

      onCreated?.();
    } catch (error) {
      console.error("Failed to create task:", error);
      setMessage(error.message || "فشل إنشاء المهمة.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        .create-task-container {
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 40px 20px;
          background: #f8fafc;
          font-family:
            "Segoe UI",
            Tahoma,
            Geneva,
            Verdana,
            sans-serif;
          color: #1e293b;
          direction: ltr;
        }

        .create-task-card {
          width: 100%;
          max-width: 600px;
          box-sizing: border-box;
          background: #ffffff;
          padding: 30px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.08);
        }

        .create-task-title {
          margin: 0 0 25px;
          text-align: center;
          color: #0f172a;
          font-size: 28px;
          font-weight: 800;
        }

        .create-task-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .create-task-input,
        .create-task-textarea,
        .create-task-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #0f172a;
          font-size: 14px;
          padding: 12px 14px;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .create-task-input::placeholder,
        .create-task-textarea::placeholder {
          color: #94a3b8;
        }

        .create-task-input:focus,
        .create-task-textarea:focus,
        .create-task-select:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
        }

        .create-task-textarea {
          min-height: 110px;
          resize: vertical;
          font-family: inherit;
        }

        .create-task-select {
          cursor: pointer;
        }

        .create-task-message {
          margin: 0;
          padding: 11px 13px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #334155;
          font-size: 14px;
          line-height: 1.5;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .create-task-button {
          width: 100%;
          border: none;
          border-radius: 8px;
          padding: 12px 18px;
          background: #0284c7;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.15s ease,
            opacity 0.2s ease;
        }

        .create-task-button:hover:not(:disabled) {
          background: #0369a1;
          transform: translateY(-1px);
        }

        .create-task-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .create-task-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .create-task-container {
            padding: 25px 15px;
          }

          .create-task-card {
            padding: 24px 20px;
          }

          .create-task-title {
            font-size: 24px;
            margin-bottom: 22px;
          }
        }

        @media (max-width: 480px) {
          .create-task-container {
            padding: 15px 10px;
          }

          .create-task-card {
            padding: 20px 15px;
            border-radius: 10px;
          }

          .create-task-title {
            font-size: 22px;
          }

          .create-task-input,
          .create-task-textarea,
          .create-task-select {
            font-size: 13px;
            padding: 11px 12px;
          }

          .create-task-button {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="create-task-container">
        <form className="create-task-card" onSubmit={handleSubmit}>
          <h2 className="create-task-title">
            Create Task
          </h2>

          <div className="create-task-form">
            <input
              className="create-task-input"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Task title"
              required
            />

            <textarea
              className="create-task-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description"
              rows={4}
            />

            <select
              className="create-task-select"
              name="assignedToId"
              value={form.assignedToId}
              onChange={handleChange}
              required
            >
              <option value="">
                Select designer
              </option>

              {designers.map((designer) => (
                <option
                  key={designer.uid || designer.id}
                  value={designer.uid || designer.id}
                >
                  {designer.name} — {designer.email}
                </option>
              ))}
            </select>

            <input
              className="create-task-input"
              type="datetime-local"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
            />

            {message && (
              <p className="create-task-message">
                {message}
              </p>
            )}

            <button
              className="create-task-button"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
