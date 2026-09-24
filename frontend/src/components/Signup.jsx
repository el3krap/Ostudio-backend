import React, { useState } from 'react';
import { registerUser } from "../authService";

export default function Signup({ onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager'); // القيمة الافتراضية مدير المشاريع
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      // استدعاء دالة التسجيل مع دعم الترتيبين لتجنب أخطاء المعاملات
      const res = await registerUser(email, password, name, role).catch(async () => {
        return await registerUser(name, email, password, role);
      });

      setLoading(false);

      if (res && res.success === false) {
        setIsError(true);
        setMessage(res.error || 'حدث خطأ أثناء إرسال الطلب');
      } else {
        setIsError(false);
        setMessage('تم إرسال طلب التسجيل بنجاح! حسابك في انتظار موافقة الأدمن.');
        setName('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setLoading(false);
      setIsError(true);
      if (err.code === 'auth/email-already-in-use') {
        setMessage('هذا البريد الإلكتروني مسجل بالفعل.');
      } else if (err.code === 'auth/weak-password') {
        setMessage('كلمة المرور ضعيفة جداً (يجب ألا تقل عن 6 أحرف).');
      } else {
        setMessage(err.message || 'حدث خطأ في التسجيل.');
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Ostudio</h2>
          <p style={styles.subtitle}>إنشاء طلب حساب جديد في المنصة</p>
        </div>

        {message && (
          <div style={{
            ...styles.alertBox,
            backgroundColor: isError ? '#fee2e2' : '#dcfce7',
            color: isError ? '#dc2626' : '#15803d',
            borderColor: isError ? '#f87171' : '#86efac'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>الاسم بالكامل (Full Name)</label>
            <input
              type="text"
              required
              placeholder="مثال: علي وائل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>البريد الإلكتروني (Email)</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>كلمة المرور (Password)</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>نوع الدور والوظيفة (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.select}
            >
              <option value="manager">👔 مدير مشاريع (Project Manager)</option>
              <option value="coordinator">📋 منسق مشاريع (Coordinator)</option>
              <option value="designer">🎨 مصمم (Designer)</option>
              <option value="admin">👑 مسؤول النظام (Admin)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'جارٍ إرسال الطلب...' : 'إرسال طلب التسجيل'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>لديك حساب بالفعل؟ </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={styles.linkBtn}
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '20px',
    fontFamily: 'sans-serif',
    direction: 'rtl'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '1px'
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: '14px',
    color: '#64748b'
  },
  alertBox: {
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  submitBtn: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    transition: '0.2s'
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#64748b'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#0284c7',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '13px'
  }
};