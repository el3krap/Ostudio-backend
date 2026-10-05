import React, { useState } from 'react';

import { loginUser, registerUser } from '../authService';export default function Auth({ onLoginSuccess }) {

  // =========================================================
  // STATE
  // =========================================================  const [isSignup, setIsSignup] = useState(false);  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');  const [showPassword, setShowPassword] = useState(false);  const [name, setName] = useState('');

  const [role, setRole] = useState('designer');  const [rememberMe, setRememberMe] = useState(false);  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);  const [popupMessage, setPopupMessage] = useState(null);  // =========================================================

  // POPUP

  // =========================================================  const showPopup = (msg) => {

    setPopupMessage(msg);    setTimeout(() => {

      setPopupMessage(null);

    }, 2500);

  };  // =========================================================

  // LOGIN

  // =========================================================  const handleLogin = async (e) => {

    e.preventDefault();    if (loading) return;    setLoading(true);

    setMessage('');    try {

      const res = await loginUser(email.trim(), password);      if (res.success) {

        setMessage('تم تسجيل الدخول بنجاح! 🎉');        /*

         * Firebase Authentication هو مصدر الحقيقة

         * وليس localStorage.

         *

         * localStorage هنا مجرد تفضيل بسيط لـ Remember Me.

         */        if (rememberMe) {

          localStorage.setItem(

            'ostudio_user',

            JSON.stringify(res.user)

          );

        } else {

          localStorage.removeItem('ostudio_user');

        }        if (onLoginSuccess) {

          onLoginSuccess(res.user);

        }

      } else {

        setMessage(

          res.error ||

            'حدث خطأ أثناء تسجيل الدخول'

        );

      }

    } catch (error) {

      console.error('Login error:', error);      setMessage(

        error?.message ||

          'حدث خطأ أثناء تسجيل الدخول'

      );

    } finally {

      setLoading(false);

    }

  };  // =========================================================

  // SIGNUP REQUEST

  // =========================================================  const handleSignupRequest = async (e) => {

    e.preventDefault();    if (loading) return;    setLoading(true);

    setMessage('');    try {

      const res = await registerUser(
        email.trim(),
        password,
        name.trim(),
        role
      );      if (res.success) {

        setMessage(

          res.message ||

            'تم إرسال طلب إنشاء الحساب بنجاح.'

        );        showPopup(

          'تم إرسال طلب إنشاء الحساب بنجاح! ينتظر موافقة الأدمن. 🎉'

        );        // Reset form

        setName('');

        setEmail('');

        setPassword('');

        setRole('designer');        // Return to login

        setTimeout(() => {

          setIsSignup(false);

          setMessage('');

        }, 1500);

      } else {

        setMessage(

          res.error ||

            'حدث خطأ أثناء إرسال الطلب'

        );

      }

    } catch (error) {

      console.error(

        'Signup request error:',

        error

      );      setMessage(

        error?.message ||

          'حدث خطأ أثناء إرسال طلب التسجيل'

      );

    } finally {

      setLoading(false);

    }

  };  // =========================================================

  // SWITCH TO SIGNUP

  // =========================================================  const openSignup = () => {

    setIsSignup(true);

    setMessage('');

    setPassword('');

  };  // =========================================================

  // SWITCH TO LOGIN

  // =========================================================  const openLogin = () => {

    setIsSignup(false);

    setMessage('');

    setPassword('');

  };  // =========================================================

  // RENDER

  // =========================================================  return (

    <>

      {/* =====================================================

          INTERNAL CSS

          ===================================================== */}      <style>{`        /* =====================================================

           GLOBAL CONTAINER

           ===================================================== */        .portal-container {

          display: flex;          justify-content: center;

          align-items: center;          min-height: 100vh;          background-color: #ffffff;          font-family:

            'Segoe UI',

            Tahoma,

            Geneva,

            Verdana,

            sans-serif;          direction: ltr;          padding: 20px;          box-sizing: border-box;

        }        .portal-container * {

          box-sizing: border-box;

        }        /* =====================================================

           CARD

           ===================================================== */        .portal-card {

          background: #ffffff;          padding: 40px 30px;          border-radius: 12px;          box-shadow:

            0 4px 25px rgba(0, 0, 0, 0.08);          width: 100%;          max-width: 440px;          border: 1px solid #e2e8f0;

        }        /* =====================================================

           HEADER

           ===================================================== */        .portal-header {

          display: flex;          flex-direction: column;          align-items: center;          justify-content: center;          gap: 12px;          margin-bottom: 30px;          border-bottom:

            1px solid #f1f5f9;          padding-bottom: 20px;          text-align: center;

        }        .portal-logo {

          width: 60px;          height: 60px;          object-fit: contain;

        }

        .portal-logo-hidden {
          display: none;
        }

        .portal-password-input {
          padding-right: 45px !important;
        }        .portal-title {

          font-size: 26px;          font-weight: 700;          color: #1e293b;          letter-spacing: -0.5px;

        }        /* =====================================================

           MESSAGE

           ===================================================== */        .portal-message {

          padding: 10px;          border-radius: 6px;          margin-bottom: 15px;          font-size: 13px;          text-align: center;          font-weight: bold;          border: 1px solid transparent;

        }        .portal-message.success {

          background: #dcfce7;          border-color: #bbf7d0;          color: #16a34a;

        }        .portal-message.error {

          background: #fee2e2;          border-color: #fecaca;          color: #dc2626;

        }        /* =====================================================

           FORM

           ===================================================== */        .portal-form {

          display: flex;          flex-direction: column;          gap: 16px;

        }        .input-group {

          position: relative;          width: 100%;

        }        /* =====================================================

           INPUTS

           ===================================================== */        .portal-form input[type="email"],

        .portal-form input[type="password"],

        .portal-form input[type="text"],

        .portal-form select {

          width: 100%;          padding: 14px 16px;          background: #ffffff !important;          border:

            1px solid #cbd5e1;          border-radius: 8px;          font-size: 15px;          color: #000000 !important;          outline: none;          transition:

            border-color 0.2s ease,

            box-shadow 0.2s ease;          box-sizing: border-box;

        }        .portal-form input::placeholder {

          color: #64748b;          opacity: 1;

        }        .portal-form input:focus,

        .portal-form select:focus {

          border-color: #0284c7;          box-shadow:

            0 0 0 3px

            rgba(2, 132, 199, 0.15);

        }        /* =====================================================

           AUTOFILL

           ===================================================== */        .portal-form input:-webkit-autofill {

          -webkit-box-shadow:

            0 0 0 30px white inset !important;          -webkit-text-fill-color:

            #000000 !important;

        }        /* =====================================================

           PASSWORD TOGGLE

           ===================================================== */        .password-toggle {

          position: absolute;          right: 12px;          top: 50%;          transform:

            translateY(-50%);          background: none;          border: none;          cursor: pointer;          font-size: 18px;          color: #64748b;          padding: 4px;          display: flex;          align-items: center;          justify-content: center;          z-index: 2;

        }        .password-toggle:hover {

          color: #0284c7;

        }        /* =====================================================

           RECAPTCHA VISUAL BOX

           ===================================================== */        .recaptcha-box {

          display: flex;          justify-content: space-between;          align-items: center;          background: #f9fafb;          border:

            1px solid #d1d5db;          border-radius: 6px;          padding: 12px 15px;          margin-top: 5px;

        }        .recaptcha-inner {

          display: flex;          align-items: center;          gap: 12px;          font-size: 14px;          color: #374151;

        }        .recaptcha-inner input[type="checkbox"] {

          width: 20px;          height: 20px;          cursor: pointer;          accent-color: #0284c7;

        }        .recaptcha-inner label {

          cursor: pointer;

        }        .recaptcha-brand {

          display: flex;          flex-direction: column;          align-items: center;          font-size: 10px;          color: #6b7280;

        }        .recaptcha-logo-icon {

          font-size: 18px;          color: #2563eb;

        }        /* =====================================================

           REMEMBER ME

           ===================================================== */        .remember-row {

          display: flex;          align-items: center;          gap: 8px;          font-size: 14px;          color: #475569;          margin-top: 5px;          cursor: pointer;

        }        .remember-row label {

          display: flex;          align-items: center;          gap: 8px;          cursor: pointer;

        }        .remember-row input {

          width: 16px;          height: 16px;          cursor: pointer;          accent-color: #0284c7;

        }        /* =====================================================

           LOGIN BUTTON

           ===================================================== */        .portal-login-btn {

          width: 100%;          padding: 14px;          background: #0082c8;          color: white;          border: none;          border-radius: 8px;          font-size: 16px;          font-weight: 600;          cursor: pointer;          transition:

            background 0.2s ease,

            opacity 0.2s ease,

            transform 0.2s ease;          margin-top: 5px;

        }        .portal-login-btn:hover:not(:disabled) {

          background: #026aa7;          transform: translateY(-1px);

        }        .portal-login-btn:disabled {

          opacity: 0.65;          cursor: not-allowed;          transform: none;

        }        /* =====================================================

           SIGNUP BUTTON

           ===================================================== */        .portal-signup-btn {

          width: 100%;          padding: 12px;          background: #10b981;          color: white;          border: none;          border-radius: 8px;          font-size: 15px;          font-weight: 600;          cursor: pointer;          transition:

            opacity 0.2s ease,

            transform 0.2s ease;

        }        .portal-signup-btn:hover {

          opacity: 0.9;          transform: translateY(-1px);

        }        .portal-signup-btn.secondary {

          background: #64748b;

        }        /* =====================================================

           FOOTER

           ===================================================== */        .portal-footer {

          margin-top: 25px;          text-align: center;          font-size: 13px;          color: #64748b;          line-height: 1.5;

        }        .portal-footer p {

          margin: 0;

        }        .portal-link {

          color: #0284c7;          text-decoration: underline;          cursor: pointer;          font-weight: 600;

        }        .portal-link:hover {

          color: #026aa7;

        }        /* =====================================================

           POPUP

           ===================================================== */        .portal-popup {

          position: fixed;          top: 50%;          left: 50%;          transform:

            translate(-50%, -50%);          background-color: #0f172a;          color: #fff;          padding: 16px 32px;          border-radius: 10px;          font-size: 16px;          font-weight: bold;          box-shadow:

            0 10px 25px

            rgba(0, 0, 0, 0.3);          z-index: 100000;          text-align: center;          border:

            1px solid #38bdf8;          min-width: 280px;          max-width: 90vw;

        }        /* =====================================================

           MOBILE

           ===================================================== */        @media (max-width: 480px) {          .portal-container {

            padding: 15px;

          }          .portal-card {

            padding: 30px 20px;            border-radius: 10px;

          }          .portal-title {

            font-size: 23px;

          }          .portal-logo {

            width: 55px;            height: 55px;

          }          .recaptcha-box {

            padding: 10px;

          }          .recaptcha-inner {

            gap: 8px;            font-size: 12px;

          }          .recaptcha-inner input[type="checkbox"] {

            width: 18px;            height: 18px;

          }          .portal-popup {

            min-width: 240px;            padding:

              14px 20px;            font-size: 14px;

          }

        }      `}</style>      {/* =====================================================

          CONTAINER

          ===================================================== */}      <div className="portal-container">        {/* ===================================================

            POPUP

            =================================================== */}        {popupMessage && (

          <div className="portal-popup">

            {popupMessage}

          </div>

        )}        {/* ===================================================

            CARD

            =================================================== */}        <div className="portal-card">          {/* =================================================

              HEADER

              ================================================= */}          <div className="portal-header">            <img

              src="/logo.png"

              alt="Ostudio Logo"

              className="portal-logo"
              onError={(e) => {
                e.currentTarget.classList.add('portal-logo-hidden');
              }}

            />            <span className="portal-title">

              Ostudio

            </span>          </div>          {/* =================================================

              MESSAGE

              ================================================= */}          {message && (

            <div

              className={`

                portal-message

                ${

                  message.includes('نجاح') ||

                  message.includes('بنجاح')

                    ? 'success'

                    : 'error'

                }

              `}

            >

              {message}

            </div>

          )}          {/* =================================================

              LOGIN

              ================================================= */}          {!isSignup ? (            <form

              onSubmit={handleLogin}

              className="portal-form"

            >              {/* EMAIL */}              <div className="input-group">                <input

                  type="email"

                  placeholder="البريد الإلكتروني"

                  value={email}

                  onChange={(e) =>

                    setEmail(e.target.value)

                  }

                  autoComplete="email"

                  required

                />              </div>              {/* PASSWORD */}              <div className="input-group">                <input

                  type={

                    showPassword

                      ? 'text'

                      : 'password'

                  }

                  placeholder="كلمة المرور"

                  value={password}

                  onChange={(e) =>

                    setPassword(e.target.value)

                  }

                  autoComplete="current-password"

                  required
                  className="portal-password-input"

                />                <button

                  type="button"

                  className="password-toggle"

                  onClick={() =>

                    setShowPassword(

                      !showPassword

                    )

                  }

                  title={

                    showPassword

                      ? 'إخفاء كلمة المرور'

                      : 'عرض كلمة المرور'

                  }

                  aria-label={

                    showPassword

                      ? 'إخفاء كلمة المرور'

                      : 'عرض كلمة المرور'

                  }

                >

                  {showPassword

                    ? '👁️‍🗨️'

                    : '👁️'}

                </button>              </div>              {/* ROBOT CHECK */}              <div className="recaptcha-box">                <div className="recaptcha-inner">                  <input

                    type="checkbox"

                    id="robot"

                    required

                  />                  <label htmlFor="robot">

                    أنا لست روبوت

                    (I'm not a robot)

                  </label>                </div>                <div className="recaptcha-brand">                  <span className="recaptcha-logo-icon">

                    🔄

                  </span>                  <small>

                    reCAPTCHA

                  </small>                </div>              </div>              {/* REMEMBER ME */}              <div className="remember-row">                <label>                  <input

                    type="checkbox"

                    checked={rememberMe}

                    onChange={(e) =>

                      setRememberMe(

                        e.target.checked

                      )

                    }

                  />                  <span>

                    تذكرني

                    (Remember Me)

                  </span>                </label>              </div>              {/* LOGIN */}              <button

                type="submit"

                disabled={loading}

                className="portal-login-btn"

              >

                {loading

                  ? 'جارٍ تسجيل الدخول...'

                  : 'Login'}

              </button>              {/* SIGNUP */}              <button

                type="button"

                className="portal-signup-btn"

                onClick={openSignup}

              >

                Sign Up (طلب حساب جديد)

              </button>            </form>          ) : (            /* =================================================

               SIGNUP

               ================================================= */            <form

              onSubmit={handleSignupRequest}

              className="portal-form"

            >              {/* NAME */}              <div className="input-group">                <input

                  type="text"

                  placeholder="الاسم الكامل"

                  value={name}

                  onChange={(e) =>

                    setName(e.target.value)

                  }

                  autoComplete="name"

                  required

                />              </div>              {/* EMAIL */}              <div className="input-group">                <input

                  type="email"

                  placeholder="البريد الإلكتروني"

                  value={email}

                  onChange={(e) =>

                    setEmail(e.target.value)

                  }

                  autoComplete="email"

                  required

                />              </div>              {/* PASSWORD */}              <div className="input-group">                <input

                  type={

                    showPassword

                      ? 'text'

                      : 'password'

                  }

                  placeholder="كلمة المرور (6 أحرف على الأقل)"

                  minLength={6}

                  value={password}

                  onChange={(e) =>

                    setPassword(e.target.value)

                  }

                  autoComplete="new-password"

                  required
                  className="portal-password-input"

                />                <button

                  type="button"

                  className="password-toggle"

                  onClick={() =>

                    setShowPassword(

                      !showPassword

                    )

                  }

                  title={

                    showPassword

                      ? 'إخفاء كلمة المرور'

                      : 'عرض كلمة المرور'

                  }

                  aria-label={

                    showPassword

                      ? 'إخفاء كلمة المرور'

                      : 'عرض كلمة المرور'

                  }

                >

                  {showPassword

                    ? '👁️‍🗨️'

                    : '👁️'}

                </button>              </div>              {/* ROLE */}              <div className="input-group">                <select

                  value={role}

                  onChange={(e) =>

                    setRole(e.target.value)

                  }

                  aria-label="اختيار الدور"

                >                  <option value="manager">

                    مدير مشاريع (Manager)

                  </option>                  <option value="coordinator">

                    منسق (Coordinator)

                  </option>                  <option value="designer">

                    مصمم (Designer)

                  </option>                  <option value="presenter">

                    مقدم عرض (Presenter)

                  </option>                </select>              </div>              {/* SUBMIT */}              <button

                type="submit"

                disabled={loading}

                className="portal-login-btn"

              >

                {loading

                  ? 'جارٍ إرسال الطلب...'

                  : 'إرسال طلب التسجيل'}

              </button>              {/* BACK TO LOGIN */}              <button

                type="button"

                className="portal-signup-btn secondary"

                onClick={openLogin}

              >

                العودة لتسجيل الدخول

              </button>            </form>          )}          {/* =================================================

              FOOTER

              ================================================= */}          <div className="portal-footer">            <p>

              لا يمكنك تسجيل الدخول أو نسيت كلمة المرور؟

              {' '}              <span

                className="portal-link"

                onClick={() => {

                  showPopup(

                    'استعادة كلمة المرور سيتم تفعيلها في الخطوة التالية.'

                  );

                }}

              >

                انقر هنا

              </span>            </p>          </div>        </div>      </div>

    </>

  );

}