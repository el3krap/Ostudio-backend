import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './OstudioLayout.css';

export default function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    activeUsers: 0, 
    pendingCount: 0, 
    designersCount: 0, 
    coordinatorsCount: 0,
    managersCount: 0 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // حالات نافذة التعديل (Edit Modal)
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  const [popupMessage, setPopupMessage] = useState(null);

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setTimeout(() => {
      setPopupMessage(null);
    }, 2500);
  };

  // جلب البيانات ومزامنتها لحظياً عبر Firestore (Realtime Listener)
  useEffect(() => {
    const usersCollection = collection(db, 'users');

    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const allUsersData = snapshot.docs.map((d) => ({
        id: d.id,
        _id: d.id,
        ...d.data()
      }));

      // فرز المستخدمين
      const pendingList = allUsersData.filter((u) => u.status === 'pending');
      const active = allUsersData.filter((u) => u.status === 'active' || u.status === 'approved').length;
      const designers = allUsersData.filter((u) => u.role === 'designer').length;
      const coordinators = allUsersData.filter((u) => u.role === 'coordinator').length;
      const managers = allUsersData.filter((u) => u.role === 'manager').length;

      setUsers(allUsersData);
      setPendingUsers(pendingList);
      setStats({
        totalUsers: allUsersData.length,
        activeUsers: active,
        pendingCount: pendingList.length,
        designersCount: designers,
        coordinatorsCount: coordinators,
        managersCount: managers
      });
    }, (err) => {
      console.error('Firestore Error:', err);
      showPopup('فشل تحميل البيانات من Firebase ❌');
    });

    return () => unsubscribe();
  }, []);

  // الموافقة على طلب انضمام
  const handleApprove = async (id) => {
    try {
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, { status: 'active' });
      showPopup('تم تفعيل الحساب بنجاح! ✅');
    } catch (err) {
      console.error(err);
      showPopup('فشل تفعيل الحساب ❌');
    }
  };

  // رفض طلب انضمام وحذفه
  const handleReject = async (id) => {
    if (!window.confirm('هل أنت متأكد من رفض وحذف هذا الطلب؟')) return;
    try {
      const userRef = doc(db, 'users', id);
      await deleteDoc(userRef);
      showPopup('تم رفض الطلب بنجاح 🗑️');
    } catch (err) {
      console.error(err);
      showPopup('فشل رفض الطلب ❌');
    }
  };

  // حذف مستخدم نهائياً
  const handleDeleteUser = async (id) => {
    if (!window.confirm('تحذير: سيتم حذف هذا الحساب نهائياً من النظام. هل أنت متأكد؟')) return;
    try {
      const userRef = doc(db, 'users', id);
      await deleteDoc(userRef);
      showPopup('تم حذف الحساب بنجاح 🗑️');
    } catch (err) {
      console.error(err);
      showPopup('فشل حذف الحساب ❌');
    }
  };

  // فتح نافذة التعديل
  const handleOpenEdit = (usr) => {
    setEditingUser(usr);
    setEditName(usr.name || '');
    setEditEmail(usr.email || '');
    setEditRole(usr.role || 'designer');
  };

  // حفظ التعديلات في Firestore
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', editingUser.id || editingUser._id);
      
      const updatedFields = {
        name: editName,
        email: editEmail,
        role: editRole
      };

      await updateDoc(userRef, updatedFields);

      showPopup('تم تحديث بيانات المستخدم بنجاح! 💾');
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      showPopup('فشل التحديث ❌');
    }
  };

  // فلترة المستخدمين للبحث والفرز
  const filteredUsers = users.filter((u) => {
    const nameStr = u.name || '';
    const emailStr = u.email || '';
    const matchesSearch = nameStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emailStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="ostudio-wrapper" style={{ direction: 'ltr', textAlign: 'left', color: '#000', backgroundColor: '#f8fafc', minHeight: '100vh', position: 'relative', paddingBottom: '50px' }}>
      
      {/* رسالة منبثقة */}
      {popupMessage && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: '#0f172a', color: '#fff', padding: '16px 32px', borderRadius: '10px',
          fontSize: '16px', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 100000, textAlign: 'center', border: '1px solid #38bdf8'
        }}>
          {popupMessage}
        </div>
      )}

      {/* نافذة التعديل المنبثقة (Edit Modal) */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '20px', color: '#0f172a' }}>تعديل بيانات المستخدم ✏️</h3>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Name:</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Email:</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Role:</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="manager">Project Manager</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="designer">Designer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>إلغاء</button>
                <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* الشريط العلوي (Navbar) */}
      <nav className="ostudio-navbar" style={{ background: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <div className="nav-left-profile">
          <span style={{ fontWeight: 'bold', color: '#0f172a' }}>🛡️ {user?.name || 'Admin'} (Admin Dashboard)</span>
        </div>
        <div className="nav-center-brand">
          <div className="nav-title" style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Ostudio Admin Panel</div>
        </div>
        <button onClick={onLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
          Logout
        </button>
      </nav>

      {/* المحتوى الرئيسي */}
      <div className="ostudio-main-content" style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px' }}>
        
        {/* قسم الإحصائيات (Analytics Stats Cards) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>إجمالي الحسابات</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#0f172a' }}>{stats.totalUsers}</h2>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>الحسابات المفعلة</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#16a34a' }}>{stats.activeUsers}</h2>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>الطلبات المعلقة ⏳</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#d97706' }}>{stats.pendingCount}</h2>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>المديرون / المنسقون</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#6366f1' }}>{stats.managersCount} / {stats.coordinatorsCount}</h2>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>المصممون</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#0284c7' }}>{stats.designersCount}</h2>
          </div>
        </div>

        {/* قسم طلبات الانضمام المعلقة (Pending Signup Requests) */}
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '15px', fontSize: '18px' }}>🔔 طلبات الانضمام المعلقة ({pendingUsers.length})</h3>
          {pendingUsers.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>لا توجد طلبات معلقة في الوقت الحالي.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left', fontSize: '13px' }}>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Name</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Email</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Role</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((pUser) => (
                  <tr key={pUser.id || pUser._id} style={{ fontSize: '14px' }}>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{pUser.name}</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{pUser.email}</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', textTransform: 'capitalize' }}>{pUser.role}</td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={() => handleApprove(pUser.id || pUser._id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>قبول ✅</button>
                        <button onClick={() => handleReject(pUser.id || pUser._id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>رفض ❌</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* قسم إدارة كافة الحسابات الحالية */}
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ color: '#0f172a', margin: 0, fontSize: '18px' }}>👥 إدارة الحسابات في النظام</h3>
            
            {/* أداة البحث والفلترة */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="بحث بالاسم أو البريد..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '220px' }}
              />
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="all">جميع الأدوار</option>
                <option value="manager">Manager</option>
                <option value="coordinator">Coordinator</option>
                <option value="designer">Designer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', fontSize: '13px' }}>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Name</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Email</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Role</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>Status</th>
                <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Control Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((usr) => (
                <tr key={usr.id || usr._id} style={{ fontSize: '14px' }}>
                  <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{usr.name}</td>
                  <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{usr.email}</td>
                  <td style={{ padding: '10px', border: '1px solid #cbd5e1', textTransform: 'capitalize' }}>
                    <span style={{ 
                      background: usr.role === 'admin' ? '#fee2e2' : usr.role === 'manager' ? '#e0e7ff' : usr.role === 'coordinator' ? '#fef3c7' : '#e0f2fe', 
                      color: usr.role === 'admin' ? '#dc2626' : usr.role === 'manager' ? '#4338ca' : usr.role === 'coordinator' ? '#b45309' : '#0284c7', 
                      padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
                    }}>
                      {usr.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>
                    <span style={{ color: usr.status === 'active' || usr.status === 'approved' ? '#16a34a' : '#d97706', fontWeight: 'bold', fontSize: '13px' }}>
                      {usr.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => handleOpenEdit(usr)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>تعديل ✏️</button>
                      <button onClick={() => handleDeleteUser(usr.id || usr._id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>حذف 🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}