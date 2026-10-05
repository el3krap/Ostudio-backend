import React, { useState } from 'react';
import { loginUser } from "../authService";

export default function Login({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await loginUser(email, password);

    setLoading(false);

    if (res.success) {
      // إرسال بيانات المستخدم المسجل لدالة التحكم الرئيسية (App.jsx)
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.error);
    }
  };

  return (
    <>
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #0f172a;
          padding: 20px;
          font-family: sans-serif;
          direction: rtl;
          box-sizing: border-box;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background-color: #ffffff;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          box-sizing: border-box;
        }

        .login-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .login-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 1px;
        }

        .login-subtitle {
          margin: 8px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .login-alert {
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #f87171;
          text-align: center;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .login-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .login-input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
        }

        .login-submit {
          margin-top: 8px;
          padding: 12px;
          background-color: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          transition: 0.2s;
        }

        .login-submit:not(:disabled) {
          cursor: pointer;
        }

        .login-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-submit:not(:disabled):hover {
          background-color: #1e293b;
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }

        .login-link {
          background: none;
          border: none;
          color: #0284c7;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          padding: 0;
        }

        .login-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 15px;
          }

          .login-card {
            padding: 24px 20px;
            border-radius: 14px;
          }

          .login-title {
            font-size: 25px;
          }

          .login-subtitle {
            font-size: 13px;
          }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">

          <div className="login-header">
            <h2 className="login-title">
              Ostudio
            </h2>

            <p className="login-subtitle">
              تسجيل الدخول إلى لوحة العمل
            </p>
          </div>

          {errorMsg && (
            <div className="login-alert">
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="login-form"
          >
            <div className="login-input-group">
              <label className="login-label">
                البريد الإلكتروني (Email)
              </label>

              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                autoComplete="email"
              />
            </div>

            <div className="login-input-group">
              <label className="login-label">
                كلمة المرور (Password)
              </label>

              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading
                ? 'جارٍ التحقق...'
                : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="login-footer">
            <span>
              ليس لديك حساب؟{' '}
            </span>

            <button
              type="button"
              onClick={onSwitchToSignup}
              className="login-link"
            >
              تقديم طلب انضمام
            </button>
          </div>

        </div>
      </div>
    </>
  );
}