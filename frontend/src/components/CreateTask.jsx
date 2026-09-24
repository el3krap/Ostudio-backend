import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Auth.css';

export default function CreateTask({ onBack }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState([]); // قائمة المستخدمين المفعلين
  const [message, setMessage] = useState('');

  // جلب كل المستخدمين من الباك إند عشان المدير يختار منهم
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/auth/all-users'); // هنعمل المسار ده حالا في الباك إند
        setUsers(res.data);
      } catch (err) {
        // لو المسار مش موجود، ممكن نجلبهم بطريقة بديلة
        console.error('خطأ في جلب المستخدمين:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8080/api/tasks/create', {
        title,
        description,
        assignedTo
      });
      setMessage(res.data.message);
      setTitle('');
      setDescription('');
      setAssignedTo('');
    } catch (err) {
      setMessage('حدث خطأ أثناء إسناد المهمة');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ width: '450px' }}>
        <h2>إسناد مهمة جديدة للمصممين 📋</h2>
        {message && <p className="auth-message">{message}</p>}

        <form onSubmit={handleCreateTask}>
          <input 
            type="text" 
            placeholder="عنوان المهمة" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="وصف المهمة بالتفصيل" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '15px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', resize: 'vertical' }}
            rows="3"
          />
          
          <select 
            value={assignedTo} 
            onChange={(e) => setAssignedTo(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '15px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }}
            required
          >
            <option value="">اختر المصمم المكلف بالمهمة</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <button type="submit">إسناد المهمة</button>
        </form>

        {onBack && (
          <button 
            onClick={onBack} 
            style={{ background: '#64748b', marginTop: '10px', width: '100%', padding: '10px', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
          >
            العودة للوحة التحكم
          </button>
        )}
      </div>
    </div>
  );
}