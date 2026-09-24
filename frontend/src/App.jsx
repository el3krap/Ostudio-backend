import React, { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import DesignerDashboard from './components/DesignerDashboard';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  // استعادة جلسة المستخدم المسجل مسبقاً
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('ostudio_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // حالة التبديل بين شاشتي تسجيل الدخول وإنشاء حساب ('login' أو 'signup')
  const [authView, setAuthView] = useState('login');

  // عند نجاح تسجيل الدخول
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('ostudio_user', JSON.stringify(userData));
  };

  // عند تسجيل الخروج
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ostudio_user');
    setAuthView('login');
  };

  // 1. في حال لم يكن المستخدم مسجلاً لدخوله، نعرض شاشات المصادقة (Login أو Signup)
  if (!currentUser) {
    if (authView === 'signup') {
      return <Signup onSwitchToLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => setAuthView('signup')}
      />
    );
  }

  // 2. التوجيه المباشر حسب دور المستخدم (Role-Based Routing)
  if (currentUser.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }

  // إذا كان لديك مكون ManagerDashboard مستقل ومكتمل يمكنك استخدامه، أو توجيهه للـ CoordinatorDashboard
  if (currentUser.role === 'manager') {
    return typeof ManagerDashboard !== 'undefined' ? (
      <ManagerDashboard user={currentUser} onLogout={handleLogout} />
    ) : (
      <CoordinatorDashboard user={currentUser} onLogout={handleLogout} />
    );
  }

  if (currentUser.role === 'coordinator') {
    return <CoordinatorDashboard user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'designer') {
    return <DesignerDashboard user={currentUser} onLogout={handleLogout} />;
  }

  // شاشة احتياطية في حال كان الدور غير محدد
  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}

export default App;