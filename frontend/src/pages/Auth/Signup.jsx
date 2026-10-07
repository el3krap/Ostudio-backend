import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { registerUser } from '../../services/authService';

const Signup = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: ''
    });

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState('');

    const [success, setSuccess] =
        useState(false);

    /* =========================================================
       Public Signup Roles
       
       Admin is intentionally NOT included.
    ========================================================= */

    const signupRoles = [
        {
            value: 'manager',
            title: 'Manager',
            description:
                'إدارة المشاريع بالكامل ومتابعة جميع أعمال الاستوديو.'
        },
        {
            value: 'account_manager',
            title: 'Account Manager',
            description:
                'إنشاء وإدارة المشاريع الخاصة بك ومتابعة تفاصيلها.'
        },
        {
            value: 'coordinator',
            title: 'Coordinator',
            description:
                'متابعة المشاريع وتنسيق العمل وتعيين المصممين.'
        },
        {
            value: 'designer',
            title: 'Designer',
            description:
                'استقبال المشاريع والمهام التي يتم تعيينها لك.'
        }
    ];

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
       Role Selection
    ========================================================= */

    const handleRoleSelect = (role) => {
        setForm((previous) => ({
            ...previous,
            role
        }));

        if (error) {
            setError('');
        }
    };

    /* =========================================================
       Validation
    ========================================================= */

    const validateForm = () => {
        const name =
            form.name.trim();

        const email =
            form.email.trim();

        if (!name) {
            return 'من فضلك أدخل الاسم بالكامل.';
        }

        if (name.length < 2) {
            return 'الاسم يجب أن يحتوي على حرفين على الأقل.';
        }

        if (!email) {
            return 'من فضلك أدخل البريد الإلكتروني.';
        }

        if (!email.includes('@')) {
            return 'من فضلك أدخل بريدًا إلكترونيًا صحيحًا.';
        }

        if (!form.password) {
            return 'من فضلك أدخل كلمة المرور.';
        }

        if (form.password.length < 6) {
            return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
        }

        if (!form.confirmPassword) {
            return 'من فضلك أكد كلمة المرور.';
        }

        if (
            form.password !==
            form.confirmPassword
        ) {
            return 'كلمة المرور وتأكيدها غير متطابقين.';
        }

        if (!form.role) {
            return 'من فضلك اختر نوع الحساب.';
        }

        const allowedRoles = [
            'manager',
            'account_manager',
            'coordinator',
            'designer'
        ];

        if (
            !allowedRoles.includes(
                form.role
            )
        ) {
            return 'نوع الحساب المختار غير مسموح به.';
        }

        return '';
    };

    /* =========================================================
       Signup
    ========================================================= */

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        if (loading) {
            return;
        }

        const validationError =
            validateForm();

        if (validationError) {
            setError(
                validationError
            );

            return;
        }

        try {
            setLoading(true);
            setError('');

            await registerUser({
                name:
                    form.name.trim(),

                email:
                    form.email.trim(),

                password:
                    form.password,

                role:
                    form.role
            });

            setSuccess(true);

        } catch (err) {
            console.error(
                '❌ Signup Error:',
                err
            );

            let message =
                err?.message ||
                'حدث خطأ أثناء تقديم طلب الحساب.';

            if (
                message.includes(
                    'auth/email-already-in-use'
                )
            ) {
                message =
                    'يوجد حساب بالفعل بهذا البريد الإلكتروني.';
            }

            if (
                message.includes(
                    'auth/invalid-email'
                )
            ) {
                message =
                    'صيغة البريد الإلكتروني غير صحيحة.';
            }

            if (
                message.includes(
                    'auth/weak-password'
                )
            ) {
                message =
                    'كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.';
            }

            if (
                message.includes(
                    'already exists'
                )
            ) {
                message =
                    'يوجد طلب أو حساب مسجل بهذا البريد الإلكتروني بالفعل.';
            }

            if (
                message.includes(
                    'not allowed'
                )
            ) {
                message =
                    'نوع الحساب المختار غير مسموح به للتسجيل العام.';
            }

            setError(message);

        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       Successful Request Screen
    ========================================================= */

    if (success) {
        return (
            <div className="signup-page">

                <div className="signup-background">

                    <div className="background-grid" />

                    <div className="background-glow glow-one" />

                    <div className="background-glow glow-two" />

                </div>

                <main className="signup-container">

                    <section className="brand-section">

                        <div className="brand-mark">
                            O
                        </div>

                        <div className="brand-name">
                            OSTUDIO
                        </div>

                        <p className="brand-description">
                            Project Management Platform
                        </p>

                    </section>

                    <section className="success-card">

                        <div className="success-icon">
                            ✓
                        </div>

                        <span className="eyebrow">
                            REQUEST SUBMITTED
                        </span>

                        <h1>
                            تم تقديم طلب الحساب بنجاح
                        </h1>

                        <p>
                            تم إنشاء طلبك بنجاح، والحساب الآن
                            في انتظار مراجعة واعتماد المسؤول.
                        </p>

                        <div className="success-info">

                            <div className="success-info-row">

                                <span>
                                    البريد الإلكتروني
                                </span>

                                <strong>
                                    {form.email}
                                </strong>

                            </div>

                            <div className="success-info-row">

                                <span>
                                    نوع الحساب
                                </span>

                                <strong>
                                    {
                                        signupRoles.find(
                                            (item) =>
                                                item.value ===
                                                form.role
                                        )?.title
                                    }
                                </strong>

                            </div>

                            <div className="success-status">

                                <span className="status-dot" />

                                في انتظار الموافقة

                            </div>

                        </div>

                        <button
                            type="button"
                            className="success-login-button"
                            onClick={() =>
                                navigate(
                                    '/login',
                                    {
                                        replace: true
                                    }
                                )
                            }
                        >
                            العودة إلى تسجيل الدخول
                        </button>

                    </section>

                    <footer className="signup-footer">

                        <span>
                            © {new Date().getFullYear()} OSTUDIO
                        </span>

                        <span className="footer-dot">
                            •
                        </span>

                        <span>
                            Secure Access
                        </span>

                    </footer>

                </main>

                <style>{`

                    * {
                        box-sizing: border-box;
                    }

                    .signup-page {
                        position: relative;

                        min-height: 100vh;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        padding: 40px 20px;

                        overflow: hidden;

                        background: #f7f7f8;

                        color: #111827;

                        direction: rtl;
                    }

                    .signup-background {
                        position: fixed;

                        inset: 0;

                        pointer-events: none;

                        overflow: hidden;
                    }

                    .background-grid {
                        position: absolute;

                        inset: 0;

                        opacity: 0.28;

                        background-image:
                            linear-gradient(
                                rgba(
                                    17,
                                    24,
                                    39,
                                    0.035
                                ) 1px,
                                transparent 1px
                            ),
                            linear-gradient(
                                90deg,
                                rgba(
                                    17,
                                    24,
                                    39,
                                    0.035
                                ) 1px,
                                transparent 1px
                            );

                        background-size:
                            42px 42px;
                    }

                    .background-glow {
                        position: absolute;

                        width: 420px;
                        height: 420px;

                        border-radius: 50%;

                        filter: blur(90px);

                        opacity: 0.16;
                    }

                    .glow-one {
                        top: -180px;
                        right: -150px;

                        background: #cbd5e1;
                    }

                    .glow-two {
                        bottom: -220px;
                        left: -150px;

                        background: #d1d5db;
                    }

                    .signup-container {
                        position: relative;

                        z-index: 1;

                        width: min(
                            100%,
                            520px
                        );

                        display: flex;
                        flex-direction: column;

                        align-items: center;
                    }

                    .brand-section {
                        display: flex;
                        flex-direction: column;

                        align-items: center;

                        margin-bottom: 23px;

                        text-align: center;
                    }

                    .brand-mark {
                        width: 48px;
                        height: 48px;

                        margin-bottom: 10px;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        border-radius: 12px;

                        background: #111827;

                        color: #ffffff;

                        font-size: 22px;
                        font-weight: 900;

                        box-shadow:
                            0 10px 30px
                            rgba(
                                17,
                                24,
                                39,
                                0.15
                            );
                    }

                    .brand-name {
                        color: #111827;

                        font-size: 18px;
                        font-weight: 900;

                        letter-spacing: 3px;

                        direction: ltr;
                    }

                    .brand-description {
                        margin: 6px 0 0;

                        color: #9ca3af;

                        font-size: 9px;

                        letter-spacing: 0.7px;

                        direction: ltr;
                    }

                    .success-card {
                        width: 100%;

                        padding: 34px 31px;

                        border: 1px solid #e5e7eb;

                        border-radius: 16px;

                        background: rgba(
                            255,
                            255,
                            255,
                            0.96
                        );

                        box-shadow:
                            0 20px 60px
                            rgba(
                                0,
                                0,
                                0,
                                0.07
                            );

                        text-align: center;
                    }

                    .success-icon {
                        width: 58px;
                        height: 58px;

                        margin:
                            0 auto 17px;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        border-radius: 50%;

                        background: #ecfdf5;

                        color: #059669;

                        font-size: 25px;
                        font-weight: 900;
                    }

                    .eyebrow {
                        display: inline-block;

                        margin-bottom: 8px;

                        color: #9ca3af;

                        font-size: 9px;
                        font-weight: 800;

                        letter-spacing: 1.7px;

                        direction: ltr;
                    }

                    .success-card h1 {
                        margin: 0;

                        color: #111827;

                        font-size: 25px;
                        font-weight: 800;
                    }

                    .success-card > p {
                        max-width: 380px;

                        margin:
                            10px auto 22px;

                        color: #6b7280;

                        font-size: 11px;

                        line-height: 1.8;
                    }

                    .success-info {
                        margin-bottom: 20px;

                        padding: 14px;

                        border: 1px solid #f0f0f1;

                        border-radius: 9px;

                        background: #fafafa;

                        text-align: right;
                    }

                    .success-info-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;

                        gap: 15px;

                        padding: 9px 0;

                        border-bottom:
                            1px solid #eeeeef;

                        font-size: 9px;
                    }

                    .success-info-row:last-of-type {
                        border-bottom: none;
                    }

                    .success-info-row span {
                        color: #9ca3af;
                    }

                    .success-info-row strong {
                        max-width: 65%;

                        color: #374151;

                        text-align: left;

                        direction: ltr;

                        word-break: break-word;
                    }

                    .success-status {
                        margin-top: 9px;

                        padding-top: 9px;

                        border-top:
                            1px solid #eeeeef;

                        display: flex;
                        align-items: center;

                        gap: 7px;

                        color: #92400e;

                        font-size: 9px;
                        font-weight: 700;
                    }

                    .status-dot {
                        width: 7px;
                        height: 7px;

                        border-radius: 50%;

                        background: #f59e0b;
                    }

                    .success-login-button {
                        width: 100%;

                        min-height: 45px;

                        border: none;

                        border-radius: 8px;

                        background: #111827;

                        color: #ffffff;

                        font-family: inherit;

                        font-size: 10px;
                        font-weight: 800;

                        cursor: pointer;

                        transition:
                            background 0.15s ease,
                            transform 0.15s ease;
                    }

                    .success-login-button:hover {
                        background: #1f2937;

                        transform:
                            translateY(-1px);
                    }

                    .signup-footer {
                        margin-top: 22px;

                        display: flex;
                        align-items: center;

                        gap: 7px;

                        color: #b0b4ba;

                        font-size: 8px;

                        direction: ltr;
                    }

                    .footer-dot {
                        color: #d1d5db;
                    }

                `}</style>

            </div>
        );
    }

    /* =========================================================
       Main Signup Screen
    ========================================================= */

    return (
        <div className="signup-page">

            <div className="signup-background">

                <div className="background-grid" />

                <div className="background-glow glow-one" />

                <div className="background-glow glow-two" />

            </div>

            <main className="signup-container">

                <section className="brand-section">

                    <div className="brand-mark">
                        O
                    </div>

                    <div className="brand-name">
                        OSTUDIO
                    </div>

                    <p className="brand-description">
                        Project Management Platform
                    </p>

                </section>

                <section className="signup-card">

                    <div className="card-header">

                        <span className="eyebrow">
                            REQUEST AN ACCOUNT
                        </span>

                        <h1>
                            تقديم طلب اكونت جديد
                        </h1>

                        <p>
                            أنشئ طلب حساب وسيتم مراجعته واعتماده من المسؤول.
                        </p>

                    </div>

                    {error && (
                        <div className="error-message">

                            <span className="error-icon">
                                !
                            </span>

                            <span>
                                {error}
                            </span>

                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="signup-form"
                    >

                        {/* Name */}

                        <div className="form-group">

                            <label htmlFor="name">
                                الاسم بالكامل
                            </label>

                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="اكتب اسمك بالكامل"
                                autoComplete="name"
                                disabled={loading}
                                required
                            />

                        </div>

                        {/* Email */}

                        <div className="form-group">

                            <label htmlFor="email">
                                البريد الإلكتروني
                            </label>

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="example@email.com"
                                autoComplete="email"
                                disabled={loading}
                                required
                            />

                        </div>

                        {/* Passwords */}

                        <div className="form-row">

                            <div className="form-group">

                                <label htmlFor="password">
                                    كلمة المرور
                                </label>

                                <div className="password-wrapper">

                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={
                                            form.password
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="6 أحرف على الأقل"
                                        autoComplete="new-password"
                                        disabled={loading}
                                        required
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
                                    >
                                        {showPassword
                                            ? 'إخفاء'
                                            : 'إظهار'}
                                    </button>

                                </div>

                            </div>

                            <div className="form-group">

                                <label htmlFor="confirmPassword">
                                    تأكيد كلمة المرور
                                </label>

                                <div className="password-wrapper">

                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={
                                            form.confirmPassword
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="أعد كلمة المرور"
                                        autoComplete="new-password"
                                        disabled={loading}
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (previous) =>
                                                    !previous
                                            )
                                        }
                                        disabled={loading}
                                    >
                                        {showConfirmPassword
                                            ? 'إخفاء'
                                            : 'إظهار'}
                                    </button>

                                </div>

                            </div>

                        </div>

                        {/* Role */}

                        <div className="form-group">

                            <label>
                                نوع الحساب
                            </label>

                            <p className="role-helper">
                                اختر نوع الحساب المطلوب. سيتم مراجعة الطلب
                                قبل تفعيل الحساب.
                            </p>

                            <div className="roles-list">

                                {signupRoles.map(
                                    (role) => (
                                        <button
                                            key={
                                                role.value
                                            }
                                            type="button"
                                            className={
                                                form.role ===
                                                role.value
                                                    ? 'role-option selected'
                                                    : 'role-option'
                                            }
                                            onClick={() =>
                                                handleRoleSelect(
                                                    role.value
                                                )
                                            }
                                            disabled={
                                                loading
                                            }
                                        >

                                            <span className="role-radio">

                                                {form.role ===
                                                    role.value && (
                                                    <span />
                                                )}

                                            </span>

                                            <span className="role-content">

                                                <strong>
                                                    {
                                                        role.title
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        role.description
                                                    }
                                                </small>

                                            </span>

                                            <span className="role-arrow">
                                                ←
                                            </span>

                                        </button>
                                    )
                                )}

                            </div>

                        </div>

                        {/* Submit */}

                        <button
                            type="submit"
                            className="signup-submit"
                            disabled={loading}
                        >

                            {loading ? (
                                <>
                                    <span className="button-spinner" />

                                    جاري تقديم الطلب...
                                </>
                            ) : (
                                <>
                                    تقديم طلب الحساب

                                    <span className="button-arrow">
                                        ←
                                    </span>
                                </>
                            )}

                        </button>

                    </form>

                    <div className="login-link-section">

                        <span>
                            لديك حساب بالفعل؟
                        </span>

                        <Link
                            to="/login"
                            className="login-link"
                        >
                            تسجيل الدخول
                        </Link>

                    </div>

                </section>

                <footer className="signup-footer">

                    <span>
                        © {new Date().getFullYear()} OSTUDIO
                    </span>

                    <span className="footer-dot">
                        •
                    </span>

                    <span>
                        Secure Access
                    </span>

                </footer>

            </main>

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .signup-page {
                    position: relative;

                    min-height: 100vh;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 35px 20px;

                    overflow-x: hidden;

                    background: #f7f7f8;

                    color: #111827;

                    direction: rtl;
                }

                .signup-background {
                    position: fixed;

                    inset: 0;

                    pointer-events: none;

                    overflow: hidden;
                }

                .background-grid {
                    position: absolute;

                    inset: 0;

                    opacity: 0.28;

                    background-image:
                        linear-gradient(
                            rgba(
                                17,
                                24,
                                39,
                                0.035
                            ) 1px,
                            transparent 1px
                        ),
                        linear-gradient(
                            90deg,
                            rgba(
                                17,
                                24,
                                39,
                                0.035
                            ) 1px,
                            transparent 1px
                        );

                    background-size:
                        42px 42px;
                }

                .background-glow {
                    position: absolute;

                    width: 420px;
                    height: 420px;

                    border-radius: 50%;

                    filter: blur(90px);

                    opacity: 0.16;
                }

                .glow-one {
                    top: -180px;
                    right: -150px;

                    background: #cbd5e1;
                }

                .glow-two {
                    bottom: -220px;
                    left: -150px;

                    background: #d1d5db;
                }

                .signup-container {
                    position: relative;

                    z-index: 1;

                    width: min(
                        100%,
                        520px
                    );

                    display: flex;
                    flex-direction: column;

                    align-items: center;
                }

                .brand-section {
                    display: flex;
                    flex-direction: column;

                    align-items: center;

                    margin-bottom: 23px;

                    text-align: center;
                }

                .brand-mark {
                    width: 48px;
                    height: 48px;

                    margin-bottom: 10px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 12px;

                    background: #111827;

                    color: #ffffff;

                    font-size: 22px;
                    font-weight: 900;

                    box-shadow:
                        0 10px 30px
                        rgba(
                            17,
                            24,
                            39,
                            0.15
                        );
                }

                .brand-name {
                    color: #111827;

                    font-size: 18px;
                    font-weight: 900;

                    letter-spacing: 3px;

                    direction: ltr;
                }

                .brand-description {
                    margin: 6px 0 0;

                    color: #9ca3af;

                    font-size: 9px;

                    letter-spacing: 0.7px;

                    direction: ltr;
                }

                .signup-card {
                    width: 100%;

                    padding: 29px 31px;

                    border: 1px solid #e5e7eb;

                    border-radius: 16px;

                    background: rgba(
                        255,
                        255,
                        255,
                        0.96
                    );

                    box-shadow:
                        0 20px 60px
                        rgba(
                            0,
                            0,
                            0,
                            0.07
                        );
                }

                .card-header {
                    margin-bottom: 21px;

                    text-align: right;
                }

                .eyebrow {
                    display: inline-block;

                    margin-bottom: 8px;

                    color: #9ca3af;

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 1.7px;

                    direction: ltr;
                }

                .card-header h1 {
                    margin: 0;

                    color: #111827;

                    font-size: 25px;
                    font-weight: 800;

                    letter-spacing: -0.5px;
                }

                .card-header p {
                    margin: 7px 0 0;

                    color: #6b7280;

                    font-size: 10px;

                    line-height: 1.7;
                }

                .error-message {
                    margin-bottom: 16px;

                    padding: 10px 12px;

                    display: flex;
                    align-items: center;

                    gap: 9px;

                    border: 1px solid #fecaca;

                    border-radius: 8px;

                    background: #fef2f2;

                    color: #991b1b;

                    font-size: 10px;

                    line-height: 1.6;
                }

                .error-icon {
                    width: 19px;
                    height: 19px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    background: #dc2626;

                    color: #ffffff;

                    font-size: 11px;
                    font-weight: 800;
                }

                .signup-form {
                    display: flex;
                    flex-direction: column;

                    gap: 15px;
                }

                .form-group {
                    width: 100%;
                }

                .form-group label {
                    display: block;

                    margin-bottom: 7px;

                    color: #374151;

                    font-size: 10px;
                    font-weight: 700;
                }

                .form-group > input {
                    width: 100%;

                    height: 43px;

                    padding:
                        0 12px;

                    border: 1px solid #e5e7eb;

                    border-radius: 8px;

                    outline: none;

                    background: #ffffff;

                    color: #111827;

                    font-family: inherit;

                    font-size: 10px;

                    transition:
                        border-color 0.18s ease,
                        box-shadow 0.18s ease;
                }

                .form-group > input::placeholder {
                    color: #b0b4ba;
                }

                .form-group > input:focus {
                    border-color: #9ca3af;

                    box-shadow:
                        0 0 0 3px
                        rgba(
                            156,
                            163,
                            175,
                            0.12
                        );
                }

                .form-group > input:disabled {
                    background: #f9fafb;

                    cursor: not-allowed;
                }

                .form-row {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 12px;
                }

                .password-wrapper {
                    position: relative;
                }

                .password-wrapper input {
                    width: 100%;

                    height: 43px;

                    padding:
                        0 12px 0 49px;

                    border: 1px solid #e5e7eb;

                    border-radius: 8px;

                    outline: none;

                    background: #ffffff;

                    color: #111827;

                    font-family: inherit;

                    font-size: 10px;

                    transition:
                        border-color 0.18s ease,
                        box-shadow 0.18s ease;
                }

                .password-wrapper input::placeholder {
                    color: #b0b4ba;
                }

                .password-wrapper input:focus {
                    border-color: #9ca3af;

                    box-shadow:
                        0 0 0 3px
                        rgba(
                            156,
                            163,
                            175,
                            0.12
                        );
                }

                .password-wrapper input:disabled {
                    background: #f9fafb;

                    cursor: not-allowed;
                }

                .password-toggle {
                    position: absolute;

                    top: 50%;
                    left: 8px;

                    transform:
                        translateY(-50%);

                    padding: 4px 5px;

                    border: none;

                    background: transparent;

                    color: #6b7280;

                    font-family: inherit;

                    font-size: 8px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .password-toggle:hover {
                    color: #111827;
                }

                .password-toggle:disabled {
                    opacity: 0.5;

                    cursor: not-allowed;
                }

                .role-helper {
                    margin:
                        -1px 0 9px;

                    color: #9ca3af;

                    font-size: 9px;

                    line-height: 1.6;
                }

                .roles-list {
                    display: flex;
                    flex-direction: column;

                    gap: 8px;
                }

                .role-option {
                    width: 100%;

                    min-height: 62px;

                    padding:
                        10px 11px;

                    display: flex;
                    align-items: center;

                    gap: 10px;

                    border: 1px solid #e5e7eb;

                    border-radius: 9px;

                    background: #ffffff;

                    color: #111827;

                    text-align: right;

                    font-family: inherit;

                    cursor: pointer;

                    transition:
                        border-color 0.15s ease,
                        background 0.15s ease,
                        transform 0.15s ease;
                }

                .role-option:hover:not(:disabled) {
                    border-color: #d1d5db;

                    background: #fafafa;

                    transform:
                        translateY(-1px);
                }

                .role-option.selected {
                    border-color: #111827;

                    background: #f9fafb;
                }

                .role-option:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                .role-radio {
                    width: 17px;
                    height: 17px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 1px solid #d1d5db;

                    border-radius: 50%;

                    background: #ffffff;
                }

                .role-option.selected
                .role-radio {
                    border-color: #111827;
                }

                .role-radio span {
                    width: 8px;
                    height: 8px;

                    border-radius: 50%;

                    background: #111827;
                }

                .role-content {
                    min-width: 0;

                    flex: 1;

                    display: flex;
                    flex-direction: column;

                    gap: 3px;
                }

                .role-content strong {
                    color: #111827;

                    font-size: 10px;
                    font-weight: 800;

                    direction: ltr;

                    text-align: right;
                }

                .role-content small {
                    color: #9ca3af;

                    font-size: 8px;

                    line-height: 1.5;
                }

                .role-arrow {
                    color: #9ca3af;

                    font-size: 14px;

                    direction: ltr;
                }

                .signup-submit {
                    width: 100%;

                    min-height: 45px;

                    margin-top: 2px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    gap: 9px;

                    border: none;

                    border-radius: 8px;

                    background: #111827;

                    color: #ffffff;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 800;

                    cursor: pointer;

                    transition:
                        background 0.15s ease,
                        transform 0.15s ease;
                }

                .signup-submit:hover:not(:disabled) {
                    background: #1f2937;

                    transform:
                        translateY(-1px);
                }

                .signup-submit:active:not(:disabled) {
                    transform:
                        translateY(0);
                }

                .signup-submit:disabled {
                    opacity: 0.65;

                    cursor: not-allowed;
                }

                .button-arrow {
                    font-size: 15px;

                    direction: ltr;
                }

                .button-spinner {
                    width: 13px;
                    height: 13px;

                    border:
                        2px solid
                        rgba(
                            255,
                            255,
                            255,
                            0.3
                        );

                    border-top-color:
                        #ffffff;

                    border-radius: 50%;

                    animation:
                        signup-spin
                        0.7s linear infinite;
                }

                .login-link-section {
                    margin-top: 20px;

                    padding-top: 17px;

                    border-top:
                        1px solid #eeeeef;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    gap: 6px;

                    color: #9ca3af;

                    font-size: 9px;
                }

                .login-link {
                    color: #111827;

                    font-weight: 800;

                    text-decoration: none;
                }

                .login-link:hover {
                    text-decoration: underline;
                }

                .signup-footer {
                    margin-top: 20px;

                    display: flex;
                    align-items: center;

                    gap: 7px;

                    color: #b0b4ba;

                    font-size: 8px;

                    direction: ltr;
                }

                .footer-dot {
                    color: #d1d5db;
                }

                @keyframes signup-spin {

                    from {
                        transform:
                            rotate(0deg);
                    }

                    to {
                        transform:
                            rotate(360deg);
                    }

                }

                @media (max-width: 600px) {

                    .signup-page {
                        padding:
                            25px 14px;
                    }

                    .signup-card {
                        padding:
                            25px 19px;
                    }

                    .form-row {
                        grid-template-columns:
                            1fr;
                    }

                    .card-header h1 {
                        font-size: 22px;
                    }

                }

            `}</style>

        </div>
    );
};

export default Signup;