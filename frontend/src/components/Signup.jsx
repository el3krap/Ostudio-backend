import React, { useState } from "react";

import { registerUser } from "../authService";
export default function Signup({ onSwitchToLogin }) {

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [role, setRole] = useState("manager");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState(null);

  const [isError, setIsError] = useState(false);
  const handleSubmit = async (e) => {

    e.preventDefault();
    setLoading(true);

    setMessage(null);

    setIsError(false);
    try {

      const res = await registerUser(email, password, name, role);
      setLoading(false);
      if (res && res.success === false) {

        setIsError(true);

        setMessage(res.error || "حدث خطأ أثناء إرسال الطلب.");

        return;

      }
      setIsError(false);

      setMessage(

        "تم إرسال طلب التسجيل بنجاح! حسابك في انتظار موافقة الأدمن."

      );
      setName("");

      setEmail("");

      setPassword("");

      setRole("manager");

    } catch (err) {

      setLoading(false);

      setIsError(true);
      if (err.code === "auth/email-already-in-use") {

        setMessage("هذا البريد الإلكتروني مسجل بالفعل.");

      } else if (err.code === "auth/weak-password") {

        setMessage("كلمة المرور ضعيفة جداً (يجب ألا تقل عن 6 أحرف).");

      } else if (err.code === "auth/invalid-email") {

        setMessage("البريد الإلكتروني غير صحيح.");

      } else {

        setMessage(err.message || "حدث خطأ في التسجيل.");

      }

    }

  };
  return (

    <div className="signup-container">

      <div className="signup-card">

        <div className="signup-header">

          <h2 className="signup-title">Ostudio</h2>
          <p className="signup-subtitle">

            إنشاء طلب حساب جديد في المنصة

          </p>

        </div>
        {message && (

          <div

            className={`signup-alert ${

              isError ? "signup-alert-error" : "signup-alert-success"

            }`}

          >

            {message}

          </div>

        )}
        <form className="signup-form" onSubmit={handleSubmit}>

          <div className="signup-input-group">

            <label className="signup-label">

              الاسم بالكامل (Full Name)

            </label>
            <input

              className="signup-input"

              type="text"

              required

              placeholder="مثال: علي وائل"

              value={name}

              onChange={(e) => setName(e.target.value)}

              autoComplete="name"

            />

          </div>
          <div className="signup-input-group">

            <label className="signup-label">

              البريد الإلكتروني (Email)

            </label>
            <input

              className="signup-input"

              type="email"

              required

              placeholder="name@example.com"

              value={email}

              onChange={(e) => setEmail(e.target.value)}

              autoComplete="email"

            />

          </div>
          <div className="signup-input-group">

            <label className="signup-label">

              كلمة المرور (Password)

            </label>
            <input

              className="signup-input"

              type="password"

              required

              minLength={6}

              placeholder="••••••••"

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              autoComplete="new-password"

            />

          </div>
          <div className="signup-input-group">

            <label className="signup-label">

              نوع الدور والوظيفة (Role)

            </label>
            <select

              className="signup-select"

              value={role}

              onChange={(e) => setRole(e.target.value)}

            >

              <option value="manager">

                👔 مدير مشاريع (Project Manager)

              </option>
              <option value="coordinator">

                📋 منسق مشاريع (Coordinator)

              </option>
              <option value="designer">

                🎨 مصمم (Designer)

              </option>
              <option value="presenter">

                🎤 مقدم (Presenter)

              </option>

            </select>

          </div>
          <button

            className={`signup-submit-btn ${

              loading ? "signup-submit-loading" : ""

            }`}

            type="submit"

            disabled={loading}

          >

            {loading ? "جارٍ إرسال الطلب..." : "إرسال طلب التسجيل"}

          </button>

        </form>
        <div className="signup-footer">

          <span>لديك حساب بالفعل؟ </span>
          <button

            type="button"

            className="signup-link-btn"

            onClick={onSwitchToLogin}

          >

            تسجيل الدخول

          </button>

        </div>

      </div>
      <style>{`

        \* {

          box-sizing: border-box;

        }
        .signup-container {

          min-height: 100vh;

          width: 100%;

          display: flex;

          align-items: center;

          justify-content: center;

          background-color: #0f172a;

          padding: 20px;

          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;

          direction: rtl;

        }
        .signup-card {

          width: 100%;

          max-width: 420px;

          background-color: #ffffff;

          border-radius: 16px;

          padding: 32px;

          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);

        }
        .signup-header {

          text-align: center;

          margin-bottom: 24px;

        }
        .signup-title {

          margin: 0;

          font-size: 28px;

          font-weight: 800;

          color: #0f172a;

          letter-spacing: 1px;

        }
        .signup-subtitle {

          margin: 8px 0 0;

          font-size: 14px;

          color: #64748b;

          line-height: 1.6;

        }
        .signup-alert {

          padding: 12px;

          border-radius: 8px;

          font-size: 14px;

          margin-bottom: 16px;

          border: 1px solid;

          text-align: center;

          line-height: 1.6;

        }
        .signup-alert-error {

          background-color: #fee2e2;

          color: #dc2626;

          border-color: #f87171;

        }
        .signup-alert-success {

          background-color: #dcfce7;

          color: #15803d;

          border-color: #86efac;

        }
        .signup-form {

          display: flex;

          flex-direction: column;

          gap: 16px;

        }
        .signup-input-group {

          display: flex;

          flex-direction: column;

          gap: 6px;

        }
        .signup-label {

          font-size: 13px;

          font-weight: 600;

          color: #334155;

        }
        .signup-input,

        .signup-select {

          width: 100%;

          padding: 10px 14px;

          border-radius: 8px;

          border: 1px solid #cbd5e1;

          font-size: 14px;

          outline: none;

          background-color: #ffffff;

          color: #1e293b;

          box-sizing: border-box;

          transition:

            border-color 0.2s ease,

            box-shadow 0.2s ease;

        }
        .signup-input:focus,

        .signup-select:focus {

          border-color: #0284c7;

          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);

        }
        .signup-select {

          cursor: pointer;

        }
        .signup-submit-btn {

          width: 100%;

          margin-top: 8px;

          padding: 12px;

          background-color: #0284c7;

          color: #ffffff;

          border: none;

          border-radius: 8px;

          font-size: 15px;

          font-weight: 700;

          transition:

            background-color 0.2s ease,

            opacity 0.2s ease,

            transform 0.1s ease;

          cursor: pointer;

        }
        .signup-submit-btn:hover:not(:disabled) {

          background-color: #0369a1;

        }
        .signup-submit-btn:active:not(:disabled) {

          transform: translateY(1px);

        }
        .signup-submit-btn:disabled {

          opacity: 0.7;

          cursor: not-allowed;

        }
        .signup-submit-loading {

          cursor: not-allowed;

        }
        .signup-footer {

          margin-top: 24px;

          text-align: center;

          font-size: 13px;

          color: #64748b;

          line-height: 1.6;

        }
        .signup-link-btn {

          background: none;

          border: none;

          padding: 0;

          color: #0284c7;

          font-weight: 700;

          cursor: pointer;

          font-size: 13px;

          font-family: inherit;

        }
        .signup-link-btn:hover {

          color: #0369a1;

          text-decoration: underline;

        }
        @media (max-width: 480px) {

          .signup-container {

            padding: 14px;

          }
          .signup-card {

            padding: 24px 20px;

            border-radius: 14px;

          }
          .signup-title {

            font-size: 25px;

          }
          .signup-subtitle {

            font-size: 13px;

          }
          .signup-input,

          .signup-select {

            padding: 10px 12px;

          }

        }
        @media (max-height: 650px) {

          .signup-container {

            align-items: flex-start;

            padding-top: 20px;

            padding-bottom: 20px;

            overflow-y: auto;

          }

        }

      `}</style>

    </div>

  );

}