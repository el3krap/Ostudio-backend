import React, { useState } from 'react';
import { loginUser, registerUser } from '../authService';
import './Auth.css';

export default function Auth({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('designer');
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [popupMessage, setPopupMessage] = useState(null);

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 2000);
  };

  // تسجيل الدخول عبر Firebase
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const res = await loginUser(email, password);
    setLoading(false);

    if (res.success) {
      setMessage('تم تسجيل الدخول بنجاح! 🎉');
      if (rememberMe) {
        localStorage.setItem('ostudio_user', JSON.stringify(res.user));
      }
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } else {
      setMessage(res.error || 'حدث خطأ أثناء تسجيل الدخول');
    }
  };

  // إرسال طلب إنشاء حساب جديد إلى Firebase
  const handleSignupRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const res = await registerUser(name, email, password, role);
    setLoading(false);

    if (res.success) {
      setMessage(res.message);
      showPopup('تم إرسال طلب إنشاء الحساب بنجاح! ينتظر موافقة الأدمن. 🎉');
      setName('');
      setEmail('');
      setPassword('');
      setTimeout(() => {
        setIsSignup(false);
        setMessage('');
      }, 1500);
    } else {
      setMessage(res.error || 'حدث خطأ أثناء إرسال الطلب');
    }
  };

  return (
    <div className="portal-container" style={{ position: 'relative' }}>
      
      {popupMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 100000,
          textAlign: 'center',
          border: '1px solid #38bdf8'
        }}>
          {popupMessage}
        </div>
      )}

      <div className="portal-card">
        
        <div className="portal-header">
          <img 
            src="/logo.png" 
            alt="Ostudio Logo" 
            className="portal-logo" 
            onError={(e)=>{e.target.style.display='none'}}
          />
          <span className="portal-title">Ostudio</span>
        </div>

        {message && (
          <div 
            className="portal-message" 
            style={{ 
              padding: '10px', 
              marginBottom: '15px', 
              borderRadius: '6px', 
              background: message.includes('نجاح') || message.includes('بنجاح') ? '#dcfce7' : '#fee2e2', 
              color: message.includes('نجاح') || message.includes('بنجاح') ? '#16a34a' : '#dc2626', 
              fontWeight: 'bold', 
              textAlign: 'center', 
              fontSize: '14px' 
            }}
          >
            {message}
          </div>
        )}

        {!isSignup ? (
          /* نموذج تسجيل الدخول */
          <form onSubmit={handleLogin} className="portal-form">
            <div className="input-group">
              <input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group" style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="كلمة المرور" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ paddingRight: '45px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#64748b'
                }}
                title={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>

            <div className="recaptcha-box">
              <div className="recaptcha-inner">
                <input type="checkbox" id="robot" required />
                <label htmlFor="robot">أنا لست روبوت (I'm not a robot)</label>
              </div>
              <div className="recaptcha-brand">
                <span className="recaptcha-logo-icon">🔄</span>
                <small>reCAPTCHA</small>
              </div>
            </div>

            <div className="remember-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
                تذكرني (Remember Me)
              </label>
            </div>

            <button type="submit" disabled={loading} className="portal-login-btn">
              {loading ? 'جارٍ تسجيل الدخول...' : 'Login'}
            </button>

            <button 
              type="button" 
              className="portal-signup-btn"
              onClick={() => { setIsSignup(true); setMessage(''); }}
            >
              Sign Up (طلب حساب جديد)
            </button>
          </form>
        ) : (
          /* نموذج طلب إنشاء حساب جديد */
          <form onSubmit={handleSignupRequest} className="portal-form">
            <div className="input-group">
              <input 
                type="text" 
                placeholder="الاسم الكامل" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group" style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="كلمة المرور (6 أحرف على الأقل)" 
                minLength={6}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ paddingRight: '45px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#64748b'
                }}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>

            <div className="input-group">
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#000', fontSize: '15px' }}
              >
                <option value="manager">مدير مشاريع (Manager)</option>
                <option value="coordinator">منسق (Coordinator)</option>
                <option value="designer">مصمم (Designer)</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="portal-login-btn">
              {loading ? 'جارٍ إرسال الطلب...' : 'إرسال طلب التسجيل'}
            </button>

            <button 
              type="button" 
              className="portal-signup-btn"
              style={{ background: '#64748b' }}
              onClick={() => { setIsSignup(false); setMessage(''); }}
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        )}

        <div className="portal-footer">
          <p>لا يمكنك تسجيل الدخول أو نسيت كلمة المرور؟ انقر <span className="portal-link">هنا</span> لإرسال كلمة المرور.</p>
        </div>

      </div>
    </div>
  );
}