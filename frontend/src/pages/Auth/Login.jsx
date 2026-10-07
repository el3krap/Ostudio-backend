// frontend/src/pages/Auth/Login.jsx

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
    loginUser,
    getCurrentUser,
    isAuthenticated
} from '../../services/authService';


/* =========================================================
   Login
========================================================= */

const Login = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: '',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


    /* =========================================================
       Redirect By Role
       Role comes from Backend / MongoDB.
       There is NO role selection on Login.
    ========================================================= */

    const redirectByRole = (role) => {
        switch (role) {
            case 'manager':
                navigate('/manager/dashboard', {
                    replace: true
                });
                break;

            case 'account_manager':
                navigate('/account-manager/dashboard', {
                    replace: true
                });
                break;

            case 'coordinator':
                navigate('/coordinator/dashboard', {
                    replace: true
                });
                break;

            case 'designer':
                navigate('/designer/dashboard', {
                    replace: true
                });
                break;

            case 'admin':
                navigate('/admin/dashboard', {
                    replace: true
                });
                break;

            default:
                setError(
                    'نوع الحساب غير معروف. برجاء التواصل مع المسؤول.'
                );
        }
    };


    /* =========================================================
       Check Existing Session
    ========================================================= */

    useEffect(() => {
        try {
            if (!isAuthenticated()) {
                return;
            }

            const currentUser = getCurrentUser();

            if (!currentUser?.role) {
                return;
            }

            redirectByRole(currentUser.role);
        } catch (error) {
            console.error(
                '❌ Existing session check failed:',
                error
            );
        }
    }, []);


    /* =========================================================
       Input Change
    ========================================================= */

    const handleChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

        if (error) {
            setError('');
        }
    };


    /* =========================================================
       Login Submit
    ========================================================= */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) {
            return;
        }

        const email = form.email.trim();
        const password = form.password;

        /* -----------------------------------------------------
           Validation
        ----------------------------------------------------- */

        if (!email) {
            setError(
                'من فضلك أدخل البريد الإلكتروني.'
            );

            return;
        }

        if (!password) {
            setError(
                'من فضلك أدخل كلمة المرور.'
            );

            return;
        }

        try {
            setLoading(true);
            setError('');

            /*
             * loginUser handles:
             *
             * 1. Firebase Authentication
             * 2. Firebase ID Token
             * 3. Backend authentication
             * 4. MongoDB user lookup
             * 5. Role validation
             * 6. Account status validation
             * 7. Session storage
             *
             * It returns the normalized user directly.
             */

            const loggedInUser = await loginUser(
                email,
                password
            );

            if (!loggedInUser) {
                throw new Error(
                    'تعذر الحصول على بيانات الحساب.'
                );
            }

            const role = loggedInUser.role;

            if (!role) {
                throw new Error(
                    'لم يتم العثور على نوع الحساب.'
                );
            }

            redirectByRole(role);

        } catch (error) {
            console.error(
                '❌ Login error:',
                error
            );

            let message =
                error?.message ||
                'حدث خطأ أثناء تسجيل الدخول.';

            /* -------------------------------------------------
               Firebase Friendly Messages
            ------------------------------------------------- */

            if (
                error?.code ===
                'auth/invalid-credential'
            ) {
                message =
                    'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            }

            else if (
                error?.code ===
                'auth/invalid-email'
            ) {
                message =
                    'البريد الإلكتروني غير صحيح.';
            }

            else if (
                error?.code ===
                'auth/user-not-found'
            ) {
                message =
                    'لا يوجد حساب بهذا البريد الإلكتروني.';
            }

            else if (
                error?.code ===
                'auth/wrong-password'
            ) {
                message =
                    'كلمة المرور غير صحيحة.';
            }

            else if (
                error?.code ===
                'auth/user-disabled'
            ) {
                message =
                    'هذا الحساب تم تعطيله.';
            }

            else if (
                error?.code ===
                'auth/too-many-requests'
            ) {
                message =
                    'تم إجراء محاولات كثيرة. حاول مرة أخرى لاحقًا.';
            }

            setError(message);

        } finally {
            setLoading(false);
        }
    };


    /* =========================================================
       Render
    ========================================================= */

    return (
        <div className="login-page">

            <div className="login-card">

                {/* =================================================
                   Brand
                ================================================= */}

                <div className="brand-section">

                    <div className="brand-logo">
                        O
                    </div>

                    <div className="brand-text">
                        <h1>
                            OSTUDIO
                        </h1>

                        <p>
                            PROJECT MANAGEMENT
                        </p>
                    </div>

                </div>


                {/* =================================================
                   Header
                ================================================= */}

                <div className="login-header">

                    <h2>
                        تسجيل الدخول
                    </h2>

                    <p>
                        ادخل إلى حسابك للمتابعة
                    </p>

                </div>


                {/* =================================================
                   Error
                ================================================= */}

                {error && (
                    <div className="login-error">
                        <span className="error-icon">
                            !
                        </span>

                        <span>
                            {error}
                        </span>
                    </div>
                )}


                {/* =================================================
                   Form
                ================================================= */}

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >

                    {/* =================================================
                       Email
                    ================================================= */}

                    <div className="input-group">

                        <label htmlFor="email">
                            البريد الإلكتروني
                        </label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                @
                            </span>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="example@email.com"
                                autoComplete="email"
                                disabled={loading}
                                dir="ltr"
                            />

                        </div>

                    </div>


                    {/* =================================================
                       Password
                    ================================================= */}

                    <div className="input-group">

                        <label htmlFor="password">
                            كلمة المرور
                        </label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                •
                            </span>

                            <input
                                id="password"
                                name="password"
                                type={
                                    showPassword
                                        ? 'text'
                                        : 'password'
                                }
                                value={form.password}
                                onChange={handleChange}
                                placeholder="أدخل كلمة المرور"
                                autoComplete="current-password"
                                disabled={loading}
                                dir="ltr"
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(
                                        (previous) =>
                                            !previous
                                    )
                                }
                                disabled={loading}
                                aria-label={
                                    showPassword
                                        ? 'إخفاء كلمة المرور'
                                        : 'إظهار كلمة المرور'
                                }
                            >
                                {showPassword
                                    ? 'إخفاء'
                                    : 'إظهار'}
                            </button>

                        </div>

                    </div>


                    {/* =================================================
                       Login Button
                    ================================================= */}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >

                        {loading ? (
                            <>
                                <span className="spinner" />

                                <span>
                                    جاري تسجيل الدخول...
                                </span>
                            </>
                        ) : (
                            'تسجيل الدخول'
                        )}

                    </button>

                </form>


                {/* =================================================
                   Signup
                ================================================= */}

                <div className="signup-section">

                    <div className="signup-line">
                        <span />
                        <span className="signup-or">
                            أو
                        </span>
                        <span />
                    </div>

                    <p className="signup-question">
                        ليس لديك حساب؟
                    </p>

                    <Link
                        to="/signup"
                        className="signup-button"
                    >
                        تقديم طلب اكونت جديد
                    </Link>

                </div>


                {/* =================================================
                   Footer
                ================================================= */}

                <div className="login-footer">

                    <span>
                        OSTUDIO
                    </span>

                    <span className="footer-dot">
                        •
                    </span>

                    <span>
                        Secure Access
                    </span>

                </div>

            </div>


            {/* =====================================================
               Styles
            ===================================================== */}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .login-page {
                    min-height: 100vh;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    background:
                        linear-gradient(
                            135deg,
                            #f8fafc 0%,
                            #ffffff 50%,
                            #f1f5f9 100%
                        );
                    font-family:
                        "Segoe UI",
                        Tahoma,
                        Geneva,
                        Verdana,
                        sans-serif;
                    direction: rtl;
                }

                .login-card {
                    width: 100%;
                    max-width: 440px;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 20px;
                    padding: 38px 34px 30px;
                    box-shadow:
                        0 20px 60px
                        rgba(15, 23, 42, 0.08);
                }

                /* =============================================
                   Brand
                ============================================= */

                .brand-section {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 32px;
                    direction: ltr;
                }

                .brand-logo {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 13px;
                    background: #111827;
                    color: #ffffff;
                    font-size: 24px;
                    font-weight: 800;
                    letter-spacing: -1px;
                }

                .brand-text {
                    text-align: left;
                }

                .brand-text h1 {
                    margin: 0;
                    color: #111827;
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: 2px;
                }

                .brand-text p {
                    margin: 3px 0 0;
                    color: #9ca3af;
                    font-size: 8px;
                    font-weight: 700;
                    letter-spacing: 1.8px;
                }

                /* =============================================
                   Header
                ============================================= */

                .login-header {
                    text-align: center;
                    margin-bottom: 25px;
                }

                .login-header h2 {
                    margin: 0 0 8px;
                    color: #111827;
                    font-size: 28px;
                    font-weight: 800;
                }

                .login-header p {
                    margin: 0;
                    color: #6b7280;
                    font-size: 14px;
                }

                /* =============================================
                   Error
                ============================================= */

                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 18px;
                    padding: 12px 14px;
                    border: 1px solid #fecaca;
                    border-radius: 10px;
                    background: #fef2f2;
                    color: #b91c1c;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .error-icon {
                    width: 21px;
                    height: 21px;
                    flex: 0 0 21px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: #dc2626;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 800;
                }

                /* =============================================
                   Form
                ============================================= */

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .input-group label {
                    color: #374151;
                    font-size: 13px;
                    font-weight: 700;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-wrapper input {
                    width: 100%;
                    height: 50px;
                    padding:
                        0 45px
                        0 14px;
                    border: 1px solid #d1d5db;
                    border-radius: 10px;
                    outline: none;
                    background: #ffffff;
                    color: #111827;
                    font-size: 14px;
                    transition:
                        border-color 0.2s ease,
                        box-shadow 0.2s ease;
                }

                .input-wrapper input:focus {
                    border-color: #111827;
                    box-shadow:
                        0 0 0 3px
                        rgba(17, 24, 39, 0.08);
                }

                .input-wrapper input:disabled {
                    background: #f9fafb;
                    cursor: not-allowed;
                }

                .input-wrapper input::placeholder {
                    color: #9ca3af;
                }

                .input-icon {
                    position: absolute;
                    right: 16px;
                    z-index: 2;
                    color: #9ca3af;
                    font-size: 16px;
                    font-weight: 700;
                    pointer-events: none;
                }

                .password-toggle {
                    position: absolute;
                    left: 10px;
                    z-index: 2;
                    border: 0;
                    background: transparent;
                    color: #6b7280;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 6px;
                }

                .password-toggle:hover {
                    color: #111827;
                }

                .password-toggle:disabled {
                    cursor: not-allowed;
                    opacity: 0.5;
                }

                /* =============================================
                   Login Button
                ============================================= */

                .login-button {
                    width: 100%;
                    height: 50px;
                    margin-top: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    border: 0;
                    border-radius: 10px;
                    background: #111827;
                    color: #ffffff;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 800;
                    transition:
                        transform 0.15s ease,
                        background 0.15s ease,
                        box-shadow 0.15s ease;
                }

                .login-button:hover:not(:disabled) {
                    background: #1f2937;
                    transform: translateY(-1px);
                    box-shadow:
                        0 8px 20px
                        rgba(17, 24, 39, 0.15);
                }

                .login-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                .login-button:disabled {
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .spinner {
                    width: 17px;
                    height: 17px;
                    border: 2px solid
                        rgba(255, 255, 255, 0.35);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation:
                        login-spin 0.7s linear infinite;
                }

                @keyframes login-spin {
                    from {
                        transform: rotate(0deg);
                    }

                    to {
                        transform: rotate(360deg);
                    }
                }

                /* =============================================
                   Signup
                ============================================= */

                .signup-section {
                    margin-top: 25px;
                    text-align: center;
                }

                .signup-line {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .signup-line > span:first-child,
                .signup-line > span:last-child {
                    flex: 1;
                    height: 1px;
                    background: #e5e7eb;
                }

                .signup-or {
                    color: #9ca3af;
                    font-size: 11px;
                }

                .signup-question {
                    margin: 0 0 12px;
                    color: #6b7280;
                    font-size: 13px;
                }

                .signup-button {
                    width: 100%;
                    min-height: 46px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d1d5db;
                    border-radius: 10px;
                    background: #ffffff;
                    color: #111827;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 800;
                    transition:
                        background 0.15s ease,
                        border-color 0.15s ease,
                        transform 0.15s ease;
                }

                .signup-button:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                    transform: translateY(-1px);
                }

                /* =============================================
                   Footer
                ============================================= */

                .login-footer {
                    margin-top: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: #b0b4ba;
                    font-size: 9px;
                    direction: ltr;
                }

                .footer-dot {
                    color: #d1d5db;
                }

                /* =============================================
                   Responsive
                ============================================= */

                @media (max-width: 520px) {
                    .login-page {
                        padding: 25px 14px;
                    }

                    .login-card {
                        padding: 28px 20px 24px;
                        border-radius: 16px;
                    }

                    .login-header h2 {
                        font-size: 24px;
                    }

                    .brand-section {
                        margin-bottom: 25px;
                    }
                }

            `}</style>

        </div>
    );
};

export default Login;