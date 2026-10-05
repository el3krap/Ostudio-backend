import React, { useEffect, useState } from 'react';



import { subscribeToUsers, updateUserProfile, deleteUserProfile } from '../services/userService';

export default function AdminDashboard({ user, onLogout }) {



  // =========================================================



  // STATE



  // ========================================================= 
  const [users, setUsers] = useState([]);



  const [pendingUsers, setPendingUsers] = useState([]);  const [stats, setStats] = useState({



    totalUsers: 0,



    activeUsers: 0,



    pendingCount: 0,



    designersCount: 0,



    coordinatorsCount: 0,



    managersCount: 0,



    presentersCount: 0,



  });  const [searchTerm, setSearchTerm] = useState('');



  const [roleFilter, setRoleFilter] = useState('all');  // Edit Modal



  const [editingUser, setEditingUser] = useState(null);



  const [editName, setEditName] = useState('');



  const [editRole, setEditRole] = useState('');  // Popup



  const [popupMessage, setPopupMessage] = useState(null);  // =========================================================



  // POPUP MESSAGE



  // ========================================================= 
  const showPopup = (msg) => {



    setPopupMessage(msg);    setTimeout(() => {



      setPopupMessage(null);



    }, 2500);



  };  // =========================================================



  // LOAD USERS FROM FIRESTORE



  // ========================================================= 
  useEffect(() => {

    const unsubscribe = subscribeToUsers(

      (allUsersData) => {

        const pendingList = allUsersData.filter(

          (u) => u.status === 'pending'

        );



        const active = allUsersData.filter(

          (u) => u.status === 'active'

        ).length;



        const designers = allUsersData.filter(

          (u) => u.role === 'designer'

        ).length;



        const coordinators = allUsersData.filter(

          (u) => u.role === 'coordinator'

        ).length;



        const managers = allUsersData.filter(

          (u) => u.role === 'manager'

        ).length;



        const presenters = allUsersData.filter(

          (u) => u.role === 'presenter'

        ).length;



        setUsers(allUsersData);

        setPendingUsers(pendingList);



        setStats({

          totalUsers: allUsersData.length,

          activeUsers: active,

          pendingCount: pendingList.length,

          designersCount: designers,

          coordinatorsCount: coordinators,

          managersCount: managers,

          presentersCount: presenters,

        });

      },

      (err) => {

        console.error('Users Service Error:', err);

        showPopup('فشل تحميل بيانات المستخدمين من Firebase ❌');

      }

    );



    return () => unsubscribe();

  }, []);  // =========================================================



  // APPROVE USER



  // ========================================================= 
  const handleApprove = async (id) => {



    try {



      await updateUserProfile(id, {

        status: 'active',

      });      showPopup('تم تفعيل الحساب بنجاح! ✅');



    } catch (err) {



      console.error('Approve user error:', err);



      showPopup('فشل تفعيل الحساب ❌');



    }



  };  // =========================================================



  // REJECT PENDING USER



  // ========================================================= 
  const handleReject = async (id) => {



    if (



      !window.confirm(



        'هل أنت متأكد من رفض وحذف هذا الطلب؟'



      )



    ) {



      return;



    }    try {



      await deleteUserProfile(id);      showPopup('تم رفض الطلب بنجاح ');



    } catch (err) {



      console.error('Reject user error:', err);



      showPopup('فشل رفض الطلب ❌');



    }



  };  // =========================================================



  // DELETE USER PROFILE



  // ========================================================= 
  const handleDeleteUser = async (id) => {



    if (



      !window.confirm(



        'تحذير: سيتم حذف ملف المستخدم من Firestore. هل أنت متأكد؟'



      )



    ) {



      return;



    }    try {



      await deleteUserProfile(id);      showPopup(



        'تم حذف ملف المستخدم من Firestore بنجاح '



      );



    } catch (err) {



      console.error('Delete user error:', err);



      showPopup('فشل حذف المستخدم ❌');



    }



  };  // =========================================================



  // OPEN EDIT MODAL



  // ========================================================= 
  const handleOpenEdit = (usr) => {



    setEditingUser(usr);    setEditName(usr.name || '');    setEditRole(usr.role || 'designer');



  };  // =========================================================



  // SAVE USER EDIT



  // ========================================================= 
  const handleSaveEdit = async (e) => {



    e.preventDefault();    if (!editingUser) {



      return;



    }    try {



      const userId =



        editingUser.id || editingUser._id;      await updateUserProfile(userId, {

        name: editName.trim(),

        role: editRole,

      });      showPopup(



        'تم تحديث بيانات المستخدم بنجاح! 💾'



      );      setEditingUser(null);



    } catch (err) {



      console.error('Update user error:', err);



      showPopup('فشل تحديث بيانات المستخدم ❌');



    }



  };  // =========================================================



  // FILTER USERS



  // ========================================================= 
  const filteredUsers = users.filter((u) => {



    const nameStr = u.name || '';



    const emailStr = u.email || '';    const search = searchTerm.toLowerCase().trim();    const matchesSearch =



      nameStr.toLowerCase().includes(search) ||



      emailStr.toLowerCase().includes(search);    const matchesRole =



      roleFilter === 'all' ||



      u.role === roleFilter;    return matchesSearch && matchesRole;



  });  // =========================================================



  // ROLE LABEL



  // ========================================================= 
  const getRoleLabel = (role) => {



    switch (role) {



      case 'admin':



        return 'Admin';      case 'manager':



        return 'Manager';      case 'coordinator':



        return 'Coordinator';      case 'designer':



        return 'Designer';      case 'presenter':



        return 'Presenter';      default:



        return role || 'Unknown';



    }



  };  // =========================================================



  // STATUS LABEL



  // ========================================================= 
  const getStatusLabel = (status) => {



    switch (status) {



      case 'active':



        return 'Active';      case 'pending':



        return 'Pending';      default:



        return status || 'Unknown';



    }



  };  // =========================================================



  // RENDER



  // ========================================================= 
  return (



    <>



      {/* =====================================================



          INTERNAL CSS



          ===================================================== */}      <style>{`        /* =====================================================



           GLOBAL ADMIN PAGE



           ===================================================== */        .admin-container {



          min-height: 100vh;



          background: linear-gradient(



            135deg,



            #0f172a 0%,



            #1e1b4b 100%



          );



          font-family:



            'Segoe UI',



            Tahoma,



            Geneva,



            Verdana,



            sans-serif;          direction: rtl;



          color: #fff;



          padding: 40px 20px;



          box-sizing: border-box;



        }        .admin-container * {



          box-sizing: border-box;



        }        /* =====================================================



           MAIN WRAPPER



           ===================================================== */        .admin-page {



          max-width: 1200px;



          margin: 0 auto;



        }        /* =====================================================



           NAVBAR



           ===================================================== */        .admin-navbar {



          background: rgba(255, 255, 255, 0.97);



          color: #0f172a;          padding: 15px 25px;



          border-radius: 14px;          display: flex;



          align-items: center;



          justify-content: space-between;          gap: 20px;          margin-bottom: 30px;          border: 1px solid rgba(255, 255, 255, 0.5);          box-shadow:



            0 10px 30px rgba(0, 0, 0, 0.18);          direction: ltr;



        }        .admin-navbar-left {



          display: flex;



          align-items: center;



          gap: 10px;



          min-width: 0;



        }        .admin-navbar-profile {



          font-weight: 700;



          color: #0f172a;



          font-size: 14px;



          white-space: nowrap;



        }        .admin-navbar-center {



          flex: 1;



          text-align: center;



        }        .admin-navbar-title {



          font-size: 20px;



          font-weight: 800;



          color: #0f172a;



        }        .admin-logout-btn {



          background: #ef4444;



          color: #fff;          border: none;



          padding: 9px 17px;          border-radius: 7px;          cursor: pointer;          font-weight: 700;



          font-size: 13px;          transition:



            transform 0.2s ease,



            opacity 0.2s ease,



            box-shadow 0.2s ease;



        }        .admin-logout-btn:hover {



          opacity: 0.92;



          transform: translateY(-1px);          box-shadow:



            0 5px 15px rgba(239, 68, 68, 0.25);



        }        /* =====================================================



           HEADINGS



           ===================================================== */        .admin-container h2 {



          color: #60a5fa;



          font-size: 26px;



          margin-bottom: 20px;



        }        .admin-section-title {



          color: #0f172a;



          margin: 0 0 15px 0;



          font-size: 18px;



        }        /* =====================================================



           POPUP



           ===================================================== */        .admin-popup {



          position: fixed;          top: 50%;



          left: 50%;          transform: translate(-50%, -50%);          background: #0f172a;



          color: #fff;          padding: 16px 32px;          border-radius: 10px;          font-size: 16px;



          font-weight: bold;          box-shadow:



            0 10px 25px rgba(0, 0, 0, 0.3);          z-index: 100000;          text-align: center;          border: 1px solid #38bdf8;          min-width: 260px;



          max-width: 90vw;



        }        /* =====================================================



           MAIN CONTENT



           ===================================================== */        .admin-main-content {



          width: 100%;



        }        /* =====================================================



           STATS GRID



           ===================================================== */        .admin-stats-grid {



          display: grid;          grid-template-columns:



            repeat(



              auto-fit,



              minmax(180px, 1fr)



            );          gap: 15px;          margin-bottom: 30px;



        }        .admin-stat-card {



          background: rgba(255, 255, 255, 0.98);          padding: 20px;          border-radius: 12px;          border: 1px solid #e2e8f0;          box-shadow:



            0 5px 18px rgba(0, 0, 0, 0.08);          color: #0f172a;          transition:



            transform 0.2s ease,



            box-shadow 0.2s ease;



        }        .admin-stat-card:hover {



          transform: translateY(-2px);          box-shadow:



            0 8px 24px rgba(0, 0, 0, 0.12);



        }        .admin-stat-label {



          margin: 0;          font-size: 13px;          color: #64748b;          font-weight: bold;



        }        .admin-stat-value {



          margin: 8px 0 0 0;          font-size: 28px;          color: #0f172a;



        }        .admin-stat-value.green {



          color: #16a34a;



        }        .admin-stat-value.orange {



          color: #d97706;



        }        .admin-stat-value.indigo {



          color: #6366f1;



          font-size: 22px;



        }        .admin-stat-value.blue {



          color: #0284c7;



          font-size: 22px;



        }        .admin-stat-value.purple {



          color: #7c3aed;



          font-size: 22px;



        }        /* =====================================================



           WHITE SECTION



           ===================================================== */        .admin-section {



          background: rgba(255, 255, 255, 0.98);          padding: 25px;          border-radius: 12px;          border: 1px solid #e2e8f0;          margin-bottom: 30px;          box-shadow:



            0 4px 15px rgba(0, 0, 0, 0.08);          color: #0f172a;          overflow-x: auto;



        }        /* =====================================================



           EMPTY MESSAGE



           ===================================================== */        .no-requests {



          color: #64748b;          font-size: 14px;          font-style: italic;          margin: 0;



        }        /* =====================================================



           TABLE



           ===================================================== */        .admin-table {



          width: 100%;          border-collapse: collapse;          min-width: 720px;



        }        .admin-table th {



          padding: 10px;          border: 1px solid #cbd5e1;          background: #f1f5f9;          color: #0f172a;          font-size: 13px;          font-weight: 700;          text-align: left;



        }        .admin-table td {



          padding: 10px;          border: 1px solid #cbd5e1;          color: #334155;          font-size: 14px;



        }        .admin-table tbody tr {



          transition:



            background 0.15s ease;



        }        .admin-table tbody tr:hover {



          background: #f8fafc;



        }        .admin-table .center {



          text-align: center;



        }        .admin-table .name-cell {



          font-weight: 600;



          color: #0f172a;



        }        /* =====================================================



           ROLE BADGES



           ===================================================== */        .role-badge {



          display: inline-block;          padding: 3px 8px;          border-radius: 5px;          font-size: 12px;          font-weight: bold;          text-transform: capitalize;



        }        .role-admin {



          background: #fee2e2;



          color: #dc2626;



        }        .role-manager {



          background: #e0e7ff;



          color: #4338ca;



        }        .role-coordinator {



          background: #fef3c7;



          color: #b45309;



        }        .role-designer {



          background: #e0f2fe;



          color: #0284c7;



        }        .role-presenter {



          background: #ede9fe;



          color: #7c3aed;



        }        /* =====================================================



           STATUS



           ===================================================== */        .status-active {



          color: #16a34a;



          font-weight: bold;



          font-size: 13px;



        }        .status-pending {



          color: #d97706;



          font-weight: bold;



          font-size: 13px;



        }        /* =====================================================



           BUTTONS



           ===================================================== */        .admin-btn {



          border: none;          padding: 7px 13px;          border-radius: 6px;          cursor: pointer;          font-weight: bold;          font-size: 12px;          transition:



            opacity 0.2s ease,



            transform 0.2s ease;



        }        .admin-btn:hover {



          opacity: 0.9;



          transform: translateY(-1px);



        }        .admin-btn-approve {



          background: #22c55e;



          color: #fff;



        }        .admin-btn-reject {



          background: #ef4444;



          color: #fff;



        }        .admin-btn-edit {



          background: #f59e0b;



          color: #fff;



        }        .admin-btn-delete {



          background: #ef4444;



          color: #fff;



        }        .admin-btn-cancel {



          background: #64748b;



          color: #fff;



        }        .admin-btn-save {



          background: #0284c7;



          color: #fff;



        }        .admin-actions {



          display: flex;          justify-content: center;          align-items: center;          gap: 8px;          flex-wrap: wrap;



        }        /* =====================================================



           SEARCH / FILTER



           ===================================================== */        .admin-section-header {



          display: flex;          justify-content: space-between;          align-items: center;          margin-bottom: 20px;          flex-wrap: wrap;          gap: 15px;



        }        .admin-filters {



          display: flex;          gap: 10px;          flex-wrap: wrap;



        }        .admin-input,



        .admin-select {



          padding: 8px 12px;          border-radius: 6px;          border: 1px solid #cbd5e1;          font-size: 13px;          background: #fff;          color: #0f172a;          outline: none;



        }        .admin-input {



          width: 220px;



        }        .admin-input:focus,



        .admin-select:focus {



          border-color: #0284c7;          box-shadow:



            0 0 0 3px rgba(2, 132, 199, 0.1);



        }        /* =====================================================



           EDIT MODAL



           ===================================================== */        .admin-modal-overlay {



          position: fixed;          inset: 0;          width: 100%;



          height: 100%;          background: rgba(0, 0, 0, 0.6);          display: flex;          justify-content: center;          align-items: center;          z-index: 99999;          padding: 20px;



        }        .admin-modal {



          background: #fff;          padding: 30px;          border-radius: 12px;          width: 400px;          max-width: 100%;          box-shadow:



            0 10px 25px rgba(0, 0, 0, 0.2);          color: #0f172a;



        }        .admin-modal h3 {



          margin: 0 0 20px 0;          color: #0f172a;          font-size: 20px;



        }        .admin-form {



          display: flex;          flex-direction: column;          gap: 12px;



        }        .admin-form-group {



          display: flex;          flex-direction: column;          gap: 6px;



        }        .admin-form-label {



          font-size: 12px;          font-weight: bold;          color: #64748b;



        }        .admin-form-input,



        .admin-form-select {



          width: 100%;          padding: 9px;          border-radius: 6px;          border: 1px solid #cbd5e1;          box-sizing: border-box;          color: #0f172a;          background: #fff;          outline: none;



        }        .admin-form-input:focus,



        .admin-form-select:focus {



          border-color: #0284c7;          box-shadow:



            0 0 0 3px rgba(2, 132, 199, 0.1);



        }        .admin-modal-actions {



          display: flex;          justify-content: flex-end;          gap: 10px;          margin-top: 15px;



        }        .admin-email-note {



          font-size: 11px;          line-height: 1.5;          color: #64748b;          background: #f8fafc;          border: 1px solid #e2e8f0;          padding: 9px;          border-radius: 6px;



        }        /* =====================================================



           RESPONSIVE



           ===================================================== */        @media (max-width: 768px) {          .admin-container {



            padding: 20px 12px;



          }          .admin-navbar {



            flex-direction: column;            align-items: stretch;            text-align: center;



          }          .admin-navbar-left {



            justify-content: center;



          }          .admin-navbar-center {



            order: -1;



          }          .admin-navbar-profile {



            white-space: normal;



          }          .admin-logout-btn {



            width: 100%;



          }          .admin-section {



            padding: 18px;



          }          .admin-section-header {



            align-items: stretch;



          }          .admin-filters {



            width: 100%;



            flex-direction: column;



          }          .admin-input,



          .admin-select {



            width: 100%;



          }          .admin-modal {



            padding: 22px;



          }



        }        @media (max-width: 480px) {          .admin-container {



            padding: 12px 8px;



          }          .admin-navbar-title {



            font-size: 17px;



          }          .admin-stat-card {



            padding: 16px;



          }          .admin-section {



            padding: 14px;



          }          .admin-modal-actions {



            flex-direction: column;



          }          .admin-modal-actions .admin-btn {



            width: 100%;



          }



        }      `}</style>      {/* =====================================================



          PAGE



          ===================================================== */}      <div className="admin-container">



        <div className="admin-page">          {/* ===================================================



              POPUP



              =================================================== */}          {popupMessage && (



            <div className="admin-popup">



              {popupMessage}



            </div>



          )}          {/* ===================================================



              NAVBAR



              =================================================== */}          <nav className="admin-navbar">            <div className="admin-navbar-left">



              <span className="admin-navbar-profile">



                 {user?.name || 'Admin'} (Admin Dashboard)



              </span>



            </div>            <div className="admin-navbar-center">



              <div className="admin-navbar-title">



                Ostudio Admin Panel



              </div>



            </div>            <button



              onClick={onLogout}



              className="admin-logout-btn"



            >



              Logout



            </button>          </nav>          {/* ===================================================



              MAIN CONTENT



              =================================================== */}          <main className="admin-main-content">            {/* =================================================



                STATISTICS



                ================================================= */}            <div className="admin-stats-grid">              <div className="admin-stat-card">



                <p className="admin-stat-label">



                  إجمالي الحسابات



                </p>                <h2 className="admin-stat-value">



                  {stats.totalUsers}



                </h2>



              </div>              <div className="admin-stat-card">



                <p className="admin-stat-label">



                  الحسابات المفعلة



                </p>                <h2 className="admin-stat-value green">



                  {stats.activeUsers}



                </h2>



              </div>              <div className="admin-stat-card">



                <p className="admin-stat-label">



                  الطلبات المعلقة ⏳



                </p>                <h2 className="admin-stat-value orange">



                  {stats.pendingCount}



                </h2>



              </div>              <div className="admin-stat-card">



                <p className="admin-stat-label">



                  المديرون / المنسقون



                </p>                <h2 className="admin-stat-value indigo">



                  {stats.managersCount} / {stats.coordinatorsCount}



                </h2>



              </div>              <div className="admin-stat-card">



                <p className="admin-stat-label">



                  المصممون



                </p>                <h2 className="admin-stat-value blue">



                  {stats.designersCount}



                </h2>



              </div>              <div className="admin-stat-card">



                <p className="admin-stat-label">



                  مقدمو العرض



                </p>                <h2 className="admin-stat-value purple">



                  {stats.presentersCount}



                </h2>



              </div>            </div>            {/* =================================================



                PENDING REQUESTS



                ================================================= */}            <section className="admin-section">              <h3 className="admin-section-title">



                 طلبات الانضمام المعلقة ({pendingUsers.length})



              </h3>              {pendingUsers.length === 0 ? (                <p className="no-requests">



                  لا توجد طلبات معلقة في الوقت الحالي.



                </p>              ) : (                <table className="admin-table">                  <thead>



                    <tr>



                      <th>Name</th>



                      <th>Email</th>



                      <th>Role</th>



                      <th className="center">



                        Actions



                      </th>



                    </tr>



                  </thead>                  <tbody>                    {pendingUsers.map((pUser) => (                      <tr



                        key={



                          pUser.id ||



                          pUser._id



                        }



                      >                        <td className="name-cell">



                          {pUser.name}



                        </td>                        <td>



                          {pUser.email}



                        </td>                        <td>



                          {getRoleLabel(pUser.role)}



                        </td>                        <td className="center">                          <div className="admin-actions">                            <button



                              onClick={() =>



                                handleApprove(



                                  pUser.id ||



                                  pUser._id



                                )



                              }



                              className="admin-btn admin-btn-approve"



                            >



                              قبول ✅



                            </button>                            <button



                              onClick={() =>



                                handleReject(



                                  pUser.id ||



                                  pUser._id



                                )



                              }



                              className="admin-btn admin-btn-reject"



                            >



                              رفض ❌



                            </button>                          </div>                        </td>                      </tr>                    ))}                  </tbody>                </table>              )}            </section>            {/* =================================================



                USERS MANAGEMENT



                ================================================= */}            <section className="admin-section">              <div className="admin-section-header">                <h3 className="admin-section-title">



                   إدارة الحسابات في النظام



                </h3>                {/* ===========================================



                    SEARCH / FILTER



                    =========================================== */}                <div className="admin-filters">                  <input



                    type="text"



                    placeholder="بحث بالاسم أو البريد..."



                    value={searchTerm}



                    onChange={(e) =>



                      setSearchTerm(e.target.value)



                    }



                    className="admin-input"



                  />                  <select



                    value={roleFilter}



                    onChange={(e) =>



                      setRoleFilter(e.target.value)



                    }



                    className="admin-select"



                  >                    <option value="all">



                      جميع الأدوار



                    </option>                    <option value="manager">



                      Manager



                    </option>                    <option value="coordinator">



                      Coordinator



                    </option>                    <option value="designer">



                      Designer



                    </option>                    <option value="presenter">



                      Presenter



                    </option>                    <option value="admin">



                      Admin



                    </option>                  </select>                </div>              </div>              {/* =============================================



                  USERS TABLE



                  ============================================= */}              <table className="admin-table">                <thead>                  <tr>                    <th>



                      Name



                    </th>                    <th>



                      Email



                    </th>                    <th>



                      Role



                    </th>                    <th>



                      Status



                    </th>                    <th className="center">



                      Control Actions



                    </th>                  </tr>                </thead>                <tbody>                  {filteredUsers.length === 0 ? (                    <tr>                      <td



                        colSpan="5"



                        className="center"



                      >



                        لا توجد نتائج مطابقة للبحث.



                      </td>                    </tr>                  ) : (                    filteredUsers.map((usr) => (                      <tr



                        key={



                          usr.id ||



                          usr._id



                        }



                      >                        {/* ================================



                            NAME



                            ================================= */}                        <td className="name-cell">



                          {usr.name}



                        </td>                        {/* ================================



                            EMAIL



                            ================================= */}                        <td>



                          {usr.email}



                        </td>                        {/* ================================



                            ROLE



                            ================================= */}                        <td>                          <span



                            className={`



                              role-badge



                              role-${usr.role || 'designer'}



                            `}



                          >



                            {getRoleLabel(usr.role)}



                          </span>                        </td>                        {/* ================================



                            STATUS



                            ================================= */}                        <td>                          <span



                            className={



                              usr.status === 'active'



                                ? 'status-active'



                                : 'status-pending'



                            }



                          >



                            {getStatusLabel(



                              usr.status



                            )}



                          </span>                        </td>                        {/* ================================



                            ACTIONS



                            ================================= */}                        <td className="center">                          <div className="admin-actions">                            <button



                              onClick={() =>



                                handleOpenEdit(usr)



                              }



                              className="admin-btn admin-btn-edit"



                            >



                              تعديل 



                            </button>                            <button



                              onClick={() =>



                                handleDeleteUser(



                                  usr.id ||



                                  usr._id



                                )



                              }



                              className="admin-btn admin-btn-delete"



                            >



                              حذف 



                            </button>                          </div>                        </td>                      </tr>                    ))                  )}                </tbody>              </table>            </section>          </main>



        </div>



      </div>      {/* =====================================================



          EDIT USER MODAL



          ===================================================== */}      {editingUser && (        <div className="admin-modal-overlay">          <div className="admin-modal">            <h3>



              تعديل بيانات المستخدم 



            </h3>            <form



              onSubmit={handleSaveEdit}



              className="admin-form"



            >              {/* =============================================



                  NAME



                  ============================================= */}              <div className="admin-form-group">                <label className="admin-form-label">



                  Name:



                </label>                <input



                  type="text"



                  value={editName}



                  onChange={(e) =>



                    setEditName(e.target.value)



                  }



                  className="admin-form-input"



                  required



                />              </div>              {/* =============================================



                  EMAIL



                  ============================================= */}              <div className="admin-form-group">                <label className="admin-form-label">



                  Email:



                </label>                <input



                  type="email"



                  value={editingUser.email || ''}



                  className="admin-form-input"



                  disabled



                  readOnly



                />                <div className="admin-email-note">



                  🔒 لا يمكن تعديل البريد الإلكتروني من



                  Firestore فقط. البريد الإلكتروني مرتبط



                  بحساب Firebase Authentication.



                </div>              </div>              {/* =============================================



                  ROLE



                  ============================================= */}              <div className="admin-form-group">                <label className="admin-form-label">



                  Role:



                </label>                <select



                  value={editRole}



                  onChange={(e) =>



                    setEditRole(e.target.value)



                  }



                  className="admin-form-select"



                >                  <option value="manager">



                    Project Manager



                  </option>                  <option value="coordinator">



                    Coordinator



                  </option>                  <option value="designer">



                    Designer



                  </option>                  <option value="presenter">



                    Presenter



                  </option>                  <option value="admin">



                    Admin



                  </option>                </select>              </div>              {/* =============================================



                  ACTIONS



                  ============================================= */}              <div className="admin-modal-actions">                <button



                  type="button"



                  onClick={() =>



                    setEditingUser(null)



                  }



                  className="admin-btn admin-btn-cancel"



                >



                  إلغاء



                </button>                <button



                  type="submit"



                  className="admin-btn admin-btn-save"



                >



                  حفظ التعديلات



                </button>
                              </div>
                                          </form>
                                                    </div>
                                                            </div>
                                                                  )}
                                                                      </>

  );

}