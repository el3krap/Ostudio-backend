import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../../components/shared/Navbar';
import NotificationBell from '../../components/shared/NotificationBell';
import Loading from '../../components/shared/Loading';

import {
    getUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    updateUser,
    updateUserRole,
    activateUser,
    deactivateUser,
    deleteUser
} from '../../services/adminService';

import {
    getCurrentUser,
    logoutUser
} from '../../services/authService';

const AdminUsers = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedUser, setSelectedUser] = useState(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        status: 'active'
    });

    const [selectedRole, setSelectedRole] = useState('');

    /* =========================================================
       Current Admin
    ========================================================= */

    useEffect(() => {
        const currentUser = getCurrentUser();

        if (!currentUser) {
            navigate('/login', {
                replace: true
            });

            return;
        }

        if (currentUser.role !== 'admin') {
            navigate('/login', {
                replace: true
            });

            return;
        }

        setUser(currentUser);
    }, [navigate]);

    /* =========================================================
       Helpers
    ========================================================= */

    const getArray = (response, keys = []) => {
        if (Array.isArray(response)) {
            return response;
        }

        for (const key of keys) {
            if (Array.isArray(response?.[key])) {
                return response[key];
            }
        }

        return [];
    };

    const getUserId = (item) => {
        return (
            item?._id ||
            item?.id ||
            item?.mongoId
        );
    };

    const getUserName = (item) => {
        return (
            item?.name ||
            item?.displayName ||
            item?.email ||
            'مستخدم بدون اسم'
        );
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin':
                return 'Admin';

            case 'manager':
                return 'Manager';

            case 'account_manager':
                return 'Account Manager';

            case 'coordinator':
                return 'Coordinator';

            case 'designer':
                return 'Designer';

            default:
                return role || 'غير محدد';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'نشط';

            case 'approved':
                return 'مقبول';

            case 'pending':
                return 'معلق';

            default:
                return status || 'غير محدد';
        }
    };

    const getRoleClass = (role) => {
        switch (role) {
            case 'admin':
                return 'admin';

            case 'manager':
                return 'manager';

            case 'account_manager':
                return 'account-manager';

            case 'coordinator':
                return 'coordinator';

            case 'designer':
                return 'designer';

            default:
                return 'neutral';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'active':
            case 'approved':
                return 'active';

            case 'pending':
                return 'pending';

            default:
                return 'inactive';
        }
    };

    const formatDate = (value) => {
        if (!value) {
            return 'غير محدد';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'غير محدد';
        }

        return date.toLocaleDateString(
            'ar-EG',
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );
    };

    /* =========================================================
       Load Users
    ========================================================= */

    const loadUsers = useCallback(
        async (showLoader = true) => {
            try {
                if (showLoader) {
                    setLoading(true);
                } else {
                    setRefreshing(true);
                }

                setError('');

                const [
                    usersResponse,
                    pendingResponse
                ] = await Promise.all([
                    getUsers(),
                    getPendingUsers().catch(() => [])
                ]);

                const allUsers =
                    getArray(
                        usersResponse,
                        ['users', 'data']
                    );

                const pendingUsers =
                    getArray(
                        pendingResponse,
                        [
                            'users',
                            'pendingUsers',
                            'data'
                        ]
                    );

                /*
                 * Merge without duplicating users.
                 * Pending users are included even if the
                 * normal users endpoint does not include them.
                 */

                const map = new Map();

                [
                    ...allUsers,
                    ...pendingUsers
                ].forEach((item) => {
                    const id =
                        getUserId(item) ||
                        item?.firebaseUid ||
                        item?.email;

                    if (!id) {
                        return;
                    }

                    map.set(
                        String(id),
                        item
                    );
                });

                setUsers(
                    Array.from(
                        map.values()
                    )
                );
            } catch (err) {
                console.error(
                    '❌ Admin Users Error:',
                    err
                );

                setError(
                    err?.message ||
                    'حدث خطأ أثناء تحميل المستخدمين.'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!user) {
            return;
        }

        loadUsers(true);
    }, [user, loadUsers]);

    /* =========================================================
       Filter Users
    ========================================================= */

    const filteredUsers = useMemo(() => {
        const normalizedSearch =
            searchTerm
                .trim()
                .toLowerCase();

        return users.filter((item) => {
            const name =
                item?.name ||
                item?.displayName ||
                '';

            const email =
                item?.email ||
                '';

            const role =
                getRoleLabel(item?.role);

            const searchableText =
                `${name} ${email} ${role}`
                    .toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                searchableText.includes(
                    normalizedSearch
                );

            const matchesRole =
                roleFilter === 'all' ||
                item?.role === roleFilter;

            const normalizedStatus =
                item?.status || '';

            const matchesStatus =
                statusFilter === 'all' ||
                normalizedStatus === statusFilter;

            return (
                matchesSearch &&
                matchesRole &&
                matchesStatus
            );
        });
    }, [
        users,
        searchTerm,
        roleFilter,
        statusFilter
    ]);

    /* =========================================================
       Statistics
    ========================================================= */

    const totalUsers = users.length;

    const pendingUsers = users.filter(
        (item) =>
            item?.status === 'pending'
    ).length;

    const activeUsers = users.filter(
        (item) =>
            item?.status === 'active' ||
            item?.status === 'approved'
    ).length;

    const designers = users.filter(
        (item) =>
            item?.role === 'designer'
    ).length;

    const coordinators = users.filter(
        (item) =>
            item?.role === 'coordinator'
    ).length;

    const accountManagers = users.filter(
        (item) =>
            item?.role === 'account_manager'
    ).length;

    /* =========================================================
       Edit User
    ========================================================= */

    const openEditModal = (item) => {
        setSelectedUser(item);

        setEditForm({
            name:
                item?.name ||
                item?.displayName ||
                '',

            email:
                item?.email || '',

            status:
                item?.status ||
                'active'
        });

        setShowEditModal(true);
    };

    const closeEditModal = () => {
        if (saving) {
            return;
        }

        setShowEditModal(false);
        setSelectedUser(null);
    };

    const handleEditChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setEditForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const saveUser = async (event) => {
        event.preventDefault();

        if (!selectedUser) {
            return;
        }

        const userId =
            getUserId(selectedUser);

        if (!userId) {
            setError(
                'تعذر تحديد المستخدم.'
            );

            return;
        }

        try {
            setSaving(true);
            setError('');

            const response =
                await updateUser(
                    userId,
                    {
                        name:
                            editForm.name,

                        email:
                            editForm.email,

                        status:
                            editForm.status
                    }
                );

            const updatedUser =
                response?.user ||
                response?.data ||
                response;

            setUsers((previous) =>
                previous.map((item) =>
                    getUserId(item) === userId
                        ? {
                            ...item,
                            ...(updatedUser || editForm)
                        }
                        : item
                )
            );

            setShowEditModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error(
                '❌ Update User Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تحديث المستخدم.'
            );
        } finally {
            setSaving(false);
        }
    };

    /* =========================================================
       Role Change
    ========================================================= */

    const openRoleModal = (item) => {
        setSelectedUser(item);

        setSelectedRole(
            item?.role || ''
        );

        setShowRoleModal(true);
    };

    const closeRoleModal = () => {
        if (saving) {
            return;
        }

        setShowRoleModal(false);
        setSelectedUser(null);
        setSelectedRole('');
    };

    const saveRole = async () => {
        if (!selectedUser || !selectedRole) {
            return;
        }

        const userId =
            getUserId(selectedUser);

        if (!userId) {
            setError(
                'تعذر تحديد المستخدم.'
            );

            return;
        }

        try {
            setSaving(true);
            setError('');

            const response =
                await updateUserRole(
                    userId,
                    selectedRole
                );

            const updatedUser =
                response?.user ||
                response?.data ||
                {};

            setUsers((previous) =>
                previous.map((item) =>
                    getUserId(item) === userId
                        ? {
                            ...item,
                            role:
                                updatedUser.role ||
                                selectedRole
                        }
                        : item
                )
            );

            setShowRoleModal(false);
            setSelectedUser(null);
            setSelectedRole('');
        } catch (err) {
            console.error(
                '❌ Update Role Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تغيير الدور.'
            );
        } finally {
            setSaving(false);
        }
    };

    /* =========================================================
       Approve
    ========================================================= */

    const handleApprove = async (item) => {
        const userId =
            getUserId(item);

        if (!userId) {
            return;
        }

        try {
            setProcessingId(userId);
            setError('');

            const response =
                await approveUser(
                    userId
                );

            const updatedUser =
                response?.user ||
                response?.data ||
                {};

            setUsers((previous) =>
                previous.map((current) =>
                    getUserId(current) === userId
                        ? {
                            ...current,
                            ...updatedUser,
                            status:
                                updatedUser.status ||
                                'active'
                        }
                        : current
                )
            );
        } catch (err) {
            console.error(
                '❌ Approve User Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء الموافقة على المستخدم.'
            );
        } finally {
            setProcessingId(null);
        }
    };

    /* =========================================================
       Reject
    ========================================================= */

    const openRejectModal = (item) => {
        setSelectedUser(item);
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        if (processingId) {
            return;
        }

        setShowRejectModal(false);
        setSelectedUser(null);
    };

    const confirmReject = async () => {
        if (!selectedUser) {
            return;
        }

        const userId =
            getUserId(selectedUser);

        if (!userId) {
            return;
        }

        try {
            setProcessingId(userId);
            setError('');

            await rejectUser(userId);

            setUsers((previous) =>
                previous.map((item) =>
                    getUserId(item) === userId
                        ? {
                            ...item,
                            status: 'rejected'
                        }
                        : item
                )
            );

            setShowRejectModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error(
                '❌ Reject User Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء رفض الطلب.'
            );
        } finally {
            setProcessingId(null);
        }
    };

    /* =========================================================
       Activate
    ========================================================= */

    const handleActivate = async (item) => {
        const userId =
            getUserId(item);

        if (!userId) {
            return;
        }

        try {
            setProcessingId(userId);
            setError('');

            const response =
                await activateUser(
                    userId
                );

            const updatedUser =
                response?.user ||
                response?.data ||
                {};

            setUsers((previous) =>
                previous.map((current) =>
                    getUserId(current) === userId
                        ? {
                            ...current,
                            ...updatedUser,
                            status:
                                updatedUser.status ||
                                'active'
                        }
                        : current
                )
            );
        } catch (err) {
            console.error(
                '❌ Activate User Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تفعيل المستخدم.'
            );
        } finally {
            setProcessingId(null);
        }
    };

    /* =========================================================
       Deactivate
    ========================================================= */

    const handleDeactivate = async (item) => {
        const userId =
            getUserId(item);

        if (!userId) {
            return;
        }

        /*
         * Prevent accidentally deactivating the currently
         * authenticated admin from this page.
         */
        if (
            String(userId) ===
            String(
                getUserId(user)
            )
        ) {
            setError(
                'لا يمكنك تعطيل حساب الأدمن الحالي.'
            );

            return;
        }

        try {
            setProcessingId(userId);
            setError('');

            const response =
                await deactivateUser(
                    userId
                );

            const updatedUser =
                response?.user ||
                response?.data ||
                {};

            setUsers((previous) =>
                previous.map((current) =>
                    getUserId(current) === userId
                        ? {
                            ...current,
                            ...updatedUser,
                            status:
                                updatedUser.status ||
                                'inactive'
                        }
                        : current
                )
            );
        } catch (err) {
            console.error(
                '❌ Deactivate User Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء تعطيل المستخدم.'
            );
        } finally {
            setProcessingId(null);
        }
    };

    /* =========================================================
       Delete
    ========================================================= */

    const openDeleteModal = (item) => {
        const userId =
            getUserId(item);

        if (
            String(userId) ===
            String(
                getUserId(user)
            )
        ) {
            setError(
                'لا يمكنك حذف حساب الأدمن الحالي.'
            );

            return;
        }

        setSelectedUser(item);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        if (deleting) {
            return;
        }

        setShowDeleteModal(false);
        setSelectedUser(null);
    };

    const confirmDelete = async () => {
        if (!selectedUser) {
            return;
        }

        const userId =
            getUserId(selectedUser);

        if (!userId) {
            return;
        }

        try {
            setDeleting(true);
            setError('');

            await deleteUser(userId);

            setUsers((previous) =>
                previous.filter(
                    (item) =>
                        getUserId(item) !== userId
                )
            );

            setShowDeleteModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error(
                '❌ Delete User Error:',
                err
            );

            setError(
                err?.message ||
                'حدث خطأ أثناء حذف المستخدم.'
            );
        } finally {
            setDeleting(false);
        }
    };

    /* =========================================================
       Logout
    ========================================================= */

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (err) {
            console.error(
                '❌ Logout Error:',
                err
            );
        } finally {
            navigate('/login', {
                replace: true
            });
        }
    };

    /* =========================================================
       Loading
    ========================================================= */

    if (!user || loading) {
        return (
            <Loading
                fullScreen
                message="جاري تحميل المستخدمين..."
            />
        );
    }

    return (
        <div className="admin-users-page">

            <Navbar
                user={user}
                onLogout={handleLogout}
            />

            <main className="admin-users-content">

                {/* =================================================
                    Header
                ================================================= */}

                <section className="page-header">

                    <div>

                        <span className="eyebrow">
                            ADMIN / USERS
                        </span>

                        <h1>
                            إدارة المستخدمين
                        </h1>

                        <p>
                            إدارة الحسابات والأدوار وحالات المستخدمين.
                        </p>

                    </div>

                    <div className="header-actions">

                        <NotificationBell
                            user={user}
                        />

                        <button
                            type="button"
                            className="dashboard-button"
                            onClick={() =>
                                navigate(
                                    '/admin/dashboard'
                                )
                            }
                        >
                            لوحة التحكم
                        </button>

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={() =>
                                loadUsers(false)
                            }
                            disabled={refreshing}
                        >
                            {refreshing
                                ? 'جاري التحديث...'
                                : '↻ تحديث'}
                        </button>

                    </div>

                </section>

                {/* =================================================
                    Error
                ================================================= */}

                {error && (
                    <div className="error-box">

                        <span>
                            ⚠️
                        </span>

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError('')
                            }
                        >
                            ×
                        </button>

                    </div>
                )}

                {/* =================================================
                    Statistics
                ================================================= */}

                <section className="stats">

                    <div className="stat-card">

                        <div className="stat-icon">
                            👥
                        </div>

                        <div>
                            <span>
                                إجمالي المستخدمين
                            </span>

                            <strong>
                                {totalUsers}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            ⏳
                        </div>

                        <div>
                            <span>
                                طلبات معلقة
                            </span>

                            <strong>
                                {pendingUsers}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            ✓
                        </div>

                        <div>
                            <span>
                                حسابات نشطة
                            </span>

                            <strong>
                                {activeUsers}
                            </strong>
                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-icon">
                            🎨
                        </div>

                        <div>
                            <span>
                                Designers
                            </span>

                            <strong>
                                {designers}
                            </strong>
                        </div>

                    </div>

                </section>

                {/* =================================================
                    Role Summary
                ================================================= */}

                <section className="role-summary">

                    <div>
                        <span>
                            Coordinators
                        </span>

                        <strong>
                            {coordinators}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Account Managers
                        </span>

                        <strong>
                            {accountManagers}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Designers
                        </span>

                        <strong>
                            {designers}
                        </strong>
                    </div>

                </section>

                {/* =================================================
                    Filters
                ================================================= */}

                <section className="filters">

                    <div className="search-box">

                        <span>
                            🔎
                        </span>

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                            placeholder="ابحث بالاسم أو البريد أو الدور..."
                        />

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSearchTerm('')
                                }
                            >
                                ×
                            </button>
                        )}

                    </div>

                    <select
                        value={roleFilter}
                        onChange={(event) =>
                            setRoleFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="all">
                            كل الأدوار
                        </option>

                        <option value="admin">
                            Admin
                        </option>

                        <option value="manager">
                            Manager
                        </option>

                        <option value="account_manager">
                            Account Manager
                        </option>

                        <option value="coordinator">
                            Coordinator
                        </option>

                        <option value="designer">
                            Designer
                        </option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="all">
                            كل الحالات
                        </option>

                        <option value="pending">
                            Pending
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="approved">
                            Approved
                        </option>
                    </select>

                </section>

                {/* =================================================
                    Users Table
                ================================================= */}

                <section className="users-section">

                    <div className="results-header">

                        <strong>
                            المستخدمين
                        </strong>

                        <span>
                            {filteredUsers.length}
                            {' '}
                            نتيجة
                        </span>

                    </div>

                    {filteredUsers.length === 0 ? (

                        <div className="empty-state">

                            <div className="empty-icon">
                                👥
                            </div>

                            <h2>
                                لا يوجد مستخدمون
                            </h2>

                            <p>
                                لا توجد حسابات مطابقة
                                للبحث أو الفلاتر الحالية.
                            </p>

                        </div>

                    ) : (

                        <div className="users-table">

                            <div className="table-row table-head">

                                <span>
                                    المستخدم
                                </span>

                                <span>
                                    الدور
                                </span>

                                <span>
                                    الحالة
                                </span>

                                <span>
                                    تاريخ التسجيل
                                </span>

                                <span>
                                    الإجراءات
                                </span>

                            </div>

                            {filteredUsers.map(
                                (item) => {

                                    const userId =
                                        getUserId(
                                            item
                                        );

                                    const isProcessing =
                                        processingId ===
                                        userId;

                                    const isCurrentAdmin =
                                        String(userId) ===
                                        String(
                                            getUserId(
                                                user
                                            )
                                        );

                                    return (
                                        <div
                                            className="table-row"
                                            key={
                                                userId ||
                                                item?.email
                                            }
                                        >

                                            <div className="user-cell">

                                                <div className="avatar">

                                                    {getUserName(
                                                        item
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}

                                                </div>

                                                <div>

                                                    <strong>
                                                        {getUserName(
                                                            item
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {item?.email ||
                                                            'بدون بريد'}
                                                    </span>

                                                </div>

                                            </div>

                                            <span>

                                                <span
                                                    className={`role-badge ${getRoleClass(
                                                        item?.role
                                                    )}`}
                                                >
                                                    {getRoleLabel(
                                                        item?.role
                                                    )}
                                                </span>

                                            </span>

                                            <span>

                                                <span
                                                    className={`status-badge ${getStatusClass(
                                                        item?.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        item?.status
                                                    )}
                                                </span>

                                            </span>

                                            <span className="date-cell">
                                                {formatDate(
                                                    item?.createdAt
                                                )}
                                            </span>

                                            <div className="actions">

                                                {item?.status ===
                                                    'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="approve"
                                                            onClick={() =>
                                                                handleApprove(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            {isProcessing
                                                                ? '...'
                                                                : 'قبول'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="reject"
                                                            onClick={() =>
                                                                openRejectModal(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            رفض
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    type="button"
                                                    className="edit"
                                                    onClick={() =>
                                                        openEditModal(
                                                            item
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                >
                                                    تعديل
                                                </button>

                                                {!isCurrentAdmin && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="role"
                                                            onClick={() =>
                                                                openRoleModal(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            الدور
                                                        </button>

                                                        {(item?.status ===
                                                            'active' ||
                                                            item?.status ===
                                                                'approved') && (
                                                            <button
                                                                type="button"
                                                                className="deactivate"
                                                                onClick={() =>
                                                                    handleDeactivate(
                                                                        item
                                                                    )
                                                                }
                                                                disabled={
                                                                    isProcessing
                                                                }
                                                            >
                                                                {isProcessing
                                                                    ? '...'
                                                                    : 'تعطيل'}
                                                            </button>
                                                        )}

                                                        {item?.status !==
                                                            'active' &&
                                                            item?.status !==
                                                                'approved' && (
                                                            <button
                                                                type="button"
                                                                className="activate"
                                                                onClick={() =>
                                                                    handleActivate(
                                                                        item
                                                                    )
                                                                }
                                                                disabled={
                                                                    isProcessing
                                                                }
                                                            >
                                                                {isProcessing
                                                                    ? '...'
                                                                    : 'تفعيل'}
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="delete"
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            حذف
                                                        </button>
                                                    </>
                                                )}

                                            </div>

                                        </div>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </main>

            {/* =====================================================
                Edit Modal
            ===================================================== */}

            {showEditModal && selectedUser && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeEditModal();
                        }
                    }}
                >

                    <div className="modal">

                        <div className="modal-header">

                            <div>

                                <span className="eyebrow">
                                    EDIT USER
                                </span>

                                <h2>
                                    تعديل المستخدم
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                            >
                                ×
                            </button>

                        </div>

                        <form onSubmit={saveUser}>

                            <div className="form-grid">

                                <label>

                                    <span>
                                        الاسم
                                    </span>

                                    <input
                                        name="name"
                                        value={
                                            editForm.name
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    />

                                </label>

                                <label>

                                    <span>
                                        البريد الإلكتروني
                                    </span>

                                    <input
                                        type="email"
                                        name="email"
                                        value={
                                            editForm.email
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                        required
                                    />

                                </label>

                                <label>

                                    <span>
                                        الحالة
                                    </span>

                                    <select
                                        name="status"
                                        value={
                                            editForm.status
                                        }
                                        onChange={
                                            handleEditChange
                                        }
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="active">
                                            Active
                                        </option>

                                        <option value="approved">
                                            Approved
                                        </option>
                                    </select>

                                </label>

                            </div>

                            <div className="modal-info">

                                <span>
                                    الدور الحالي
                                </span>

                                <strong>
                                    {getRoleLabel(
                                        selectedUser?.role
                                    )}
                                </strong>

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={
                                        closeEditModal
                                    }
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'جاري الحفظ...'
                                        : 'حفظ التعديلات'}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =====================================================
                Role Modal
            ===================================================== */}

            {showRoleModal && selectedUser && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeRoleModal();
                        }
                    }}
                >

                    <div className="modal small-modal">

                        <div className="modal-header">

                            <div>

                                <span className="eyebrow">
                                    CHANGE ROLE
                                </span>

                                <h2>
                                    تغيير الدور
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={closeRoleModal}
                                disabled={saving}
                            >
                                ×
                            </button>

                        </div>

                        <div className="selected-user">

                            <div className="avatar large">
                                {getUserName(
                                    selectedUser
                                )
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <div>

                                <strong>
                                    {getUserName(
                                        selectedUser
                                    )}
                                </strong>

                                <span>
                                    {selectedUser?.email}
                                </span>

                            </div>

                        </div>

                        <label className="role-select">

                            <span>
                                الدور الجديد
                            </span>

                            <select
                                value={selectedRole}
                                onChange={(event) =>
                                    setSelectedRole(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    اختر الدور
                                </option>

                                <option value="admin">
                                    Admin
                                </option>

                                <option value="manager">
                                    Manager
                                </option>

                                <option value="account_manager">
                                    Account Manager
                                </option>

                                <option value="coordinator">
                                    Coordinator
                                </option>

                                <option value="designer">
                                    Designer
                                </option>
                            </select>

                        </label>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={closeRoleModal}
                                disabled={saving}
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="save-button"
                                onClick={saveRole}
                                disabled={
                                    saving ||
                                    !selectedRole
                                }
                            >
                                {saving
                                    ? 'جاري الحفظ...'
                                    : 'حفظ الدور'}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =====================================================
                Reject Modal
            ===================================================== */}

            {showRejectModal && selectedUser && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeRejectModal();
                        }
                    }}
                >

                    <div className="delete-modal">

                        <div className="delete-icon">
                            ⚠️
                        </div>

                        <h2>
                            رفض طلب الحساب؟
                        </h2>

                        <p>
                            سيتم رفض طلب:
                        </p>

                        <strong>
                            {getUserName(
                                selectedUser
                            )}
                        </strong>

                        <p>
                            {selectedUser?.email}
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={
                                    closeRejectModal
                                }
                                disabled={
                                    Boolean(
                                        processingId
                                    )
                                }
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="danger-confirm"
                                onClick={
                                    confirmReject
                                }
                                disabled={
                                    Boolean(
                                        processingId
                                    )
                                }
                            >
                                {processingId
                                    ? 'جاري الرفض...'
                                    : 'رفض الطلب'}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =====================================================
                Delete Modal
            ===================================================== */}

            {showDeleteModal && selectedUser && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDeleteModal();
                        }
                    }}
                >

                    <div className="delete-modal">

                        <div className="delete-icon">
                            🗑️
                        </div>

                        <h2>
                            حذف المستخدم؟
                        </h2>

                        <p>
                            أنت على وشك حذف:
                        </p>

                        <strong>
                            {getUserName(
                                selectedUser
                            )}
                        </strong>

                        <p>
                            {selectedUser?.email}
                        </p>

                        <p className="delete-warning">
                            هذا الإجراء لا يمكن التراجع عنه.
                        </p>

                        <div className="modal-actions">

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={
                                    closeDeleteModal
                                }
                                disabled={deleting}
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="danger-confirm"
                                onClick={
                                    confirmDelete
                                }
                                disabled={deleting}
                            >
                                {deleting
                                    ? 'جاري الحذف...'
                                    : 'حذف المستخدم'}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .admin-users-page {
                    min-height: 100vh;

                    background: #f7f7f8;

                    color: #111827;

                    direction: rtl;
                }

                .admin-users-content {
                    width: min(
                        1500px,
                        calc(100% - 48px)
                    );

                    margin: 0 auto;

                    padding: 40px 0 70px;
                }

                .page-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;

                    gap: 25px;

                    margin-bottom: 30px;
                }

                .eyebrow {
                    display: inline-block;

                    margin-bottom: 8px;

                    color: #9ca3af;

                    font-size: 10px;
                    font-weight: 800;

                    letter-spacing: 1.7px;

                    direction: ltr;
                }

                .page-header h1 {
                    margin: 0;

                    font-size: clamp(
                        28px,
                        4vw,
                        40px
                    );

                    font-weight: 800;

                    letter-spacing: -1px;
                }

                .page-header p {
                    margin: 8px 0 0;

                    color: #6b7280;

                    font-size: 13px;
                }

                .header-actions {
                    display: flex;
                    align-items: center;

                    gap: 8px;
                }

                .dashboard-button,
                .refresh-button {
                    min-height: 41px;

                    padding: 0 14px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #111827;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .dashboard-button:hover,
                .refresh-button:hover {
                    background: #f9fafb;
                }

                .refresh-button:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                .error-box {
                    margin-bottom: 20px;

                    padding: 13px 16px;

                    display: flex;
                    align-items: center;

                    gap: 9px;

                    border: 1px solid #fecaca;
                    border-radius: 9px;

                    background: #fef2f2;
                    color: #991b1b;

                    font-size: 12px;
                }

                .error-box button {
                    margin-right: auto;

                    border: none;

                    background: transparent;

                    color: #991b1b;

                    font-size: 20px;

                    cursor: pointer;
                }

                .stats {
                    display: grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap: 14px;

                    margin-bottom: 14px;
                }

                .stat-card {
                    min-height: 95px;

                    padding: 17px;

                    display: flex;
                    align-items: center;

                    gap: 13px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;
                }

                .stat-icon {
                    width: 42px;
                    height: 42px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    font-size: 18px;
                }

                .stat-card span {
                    display: block;

                    margin-bottom: 5px;

                    color: #6b7280;

                    font-size: 10px;
                }

                .stat-card strong {
                    display: block;

                    font-size: 25px;

                    line-height: 1;
                }

                .role-summary {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 10px;

                    margin-bottom: 20px;
                }

                .role-summary > div {
                    padding: 12px 15px;

                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    border: 1px solid #e5e7eb;
                    border-radius: 9px;

                    background: #ffffff;
                }

                .role-summary span {
                    color: #6b7280;

                    font-size: 10px;
                }

                .role-summary strong {
                    font-size: 17px;
                }

                .filters {
                    padding: 14px;

                    display: flex;
                    align-items: center;

                    gap: 10px;

                    margin-bottom: 18px;

                    border: 1px solid #e5e7eb;
                    border-radius: 11px;

                    background: #ffffff;
                }

                .search-box {
                    min-width: 260px;

                    flex: 1;

                    height: 40px;

                    display: flex;
                    align-items: center;

                    gap: 8px;

                    padding: 0 11px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    background: #ffffff;
                }

                .search-box > span {
                    color: #9ca3af;

                    font-size: 14px;
                }

                .search-box input {
                    width: 100%;

                    border: none;
                    outline: none;

                    background: transparent;

                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                }

                .search-box input::placeholder {
                    color: #9ca3af;
                }

                .search-box button {
                    border: none;

                    background: transparent;

                    color: #9ca3af;

                    font-size: 18px;

                    cursor: pointer;
                }

                .filters select {
                    min-width: 155px;

                    height: 40px;

                    padding: 0 10px;

                    border: 1px solid #e5e7eb;
                    border-radius: 8px;

                    outline: none;

                    background: #ffffff;
                    color: #374151;

                    font-family: inherit;

                    font-size: 10px;

                    cursor: pointer;
                }

                .results-header {
                    display: flex;
                    align-items: center;

                    gap: 9px;

                    margin-bottom: 12px;
                }

                .results-header strong {
                    font-size: 15px;
                }

                .results-header span {
                    color: #9ca3af;

                    font-size: 10px;
                }

                .users-table {
                    overflow-x: auto;

                    border: 1px solid #e5e7eb;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .table-row {
                    min-width: 1100px;

                    display: grid;

                    grid-template-columns:
                        1.5fr
                        1fr
                        0.8fr
                        0.9fr
                        2.1fr;

                    align-items: center;

                    gap: 12px;

                    padding: 13px 16px;

                    border-bottom:
                        1px solid #f3f4f6;

                    font-size: 10px;
                }

                .table-row:last-child {
                    border-bottom: none;
                }

                .table-head {
                    background: #fafafa;

                    color: #9ca3af;

                    font-size: 9px;
                    font-weight: 700;
                }

                .user-cell {
                    min-width: 0;

                    display: flex;
                    align-items: center;

                    gap: 9px;
                }

                .avatar {
                    width: 37px;
                    height: 37px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background: #f3f4f6;

                    color: #374151;

                    font-size: 12px;
                    font-weight: 800;
                }

                .avatar.large {
                    width: 45px;
                    height: 45px;

                    font-size: 15px;
                }

                .user-cell > div:last-child {
                    min-width: 0;
                }

                .user-cell strong {
                    display: block;

                    overflow: hidden;

                    color: #111827;

                    font-size: 10px;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .user-cell span {
                    display: block;

                    margin-top: 4px;

                    overflow: hidden;

                    color: #9ca3af;

                    font-size: 8px;

                    text-overflow: ellipsis;

                    white-space: nowrap;
                }

                .role-badge,
                .status-badge {
                    display: inline-block;

                    padding: 5px 8px;

                    border-radius: 999px;

                    font-size: 8px;
                    font-weight: 700;
                }

                .role-badge.admin {
                    background: #f3e8ff;
                    color: #7e22ce;
                }

                .role-badge.manager {
                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .role-badge.account-manager {
                    background: #ecfeff;
                    color: #0e7490;
                }

                .role-badge.coordinator {
                    background: #fff7ed;
                    color: #c2410c;
                }

                .role-badge.designer {
                    background: #fdf2f8;
                    color: #be185d;
                }

                .role-badge.neutral {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .status-badge.active {
                    background: #ecfdf5;
                    color: #047857;
                }

                .status-badge.pending {
                    background: #fffbeb;
                    color: #b45309;
                }

                .status-badge.inactive {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .date-cell {
                    color: #6b7280;

                    font-size: 9px;
                }

                .actions {
                    display: flex;
                    align-items: center;

                    flex-wrap: wrap;

                    gap: 5px;
                }

                .actions button {
                    min-height: 29px;

                    padding: 0 8px;

                    border: 1px solid #e5e7eb;
                    border-radius: 6px;

                    background: #ffffff;
                    color: #374151;

                    font-family: inherit;

                    font-size: 8px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .actions button:hover {
                    background: #f9fafb;
                }

                .actions button:disabled {
                    opacity: 0.5;

                    cursor: not-allowed;
                }

                .actions .approve {
                    border-color: #a7f3d0;

                    background: #ecfdf5;
                    color: #047857;
                }

                .actions .reject,
                .actions .delete {
                    border-color: #fecaca;

                    background: #fef2f2;
                    color: #b91c1c;
                }

                .actions .edit {
                    border-color: #dbeafe;

                    background: #eff6ff;
                    color: #1d4ed8;
                }

                .actions .role {
                    border-color: #e9d5ff;

                    background: #faf5ff;
                    color: #7e22ce;
                }

                .actions .activate {
                    border-color: #a7f3d0;

                    background: #ecfdf5;
                    color: #047857;
                }

                .actions .deactivate {
                    border-color: #fed7aa;

                    background: #fff7ed;
                    color: #c2410c;
                }

                .empty-state {
                    min-height: 300px;

                    padding: 40px 20px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    flex-direction: column;

                    text-align: center;

                    border: 1px dashed #d1d5db;
                    border-radius: 12px;

                    background: #ffffff;
                }

                .empty-icon {
                    width: 58px;
                    height: 58px;

                    margin-bottom: 13px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 13px;

                    background: #f3f4f6;

                    font-size: 25px;
                }

                .empty-state h2 {
                    margin: 0 0 6px;

                    font-size: 17px;
                }

                .empty-state p {
                    margin: 0;

                    color: #9ca3af;

                    font-size: 11px;
                }

                .modal-overlay {
                    position: fixed;

                    inset: 0;

                    z-index: 1000;

                    padding: 25px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background:
                        rgba(
                            0,
                            0,
                            0,
                            0.45
                        );

                    overflow-y: auto;
                }

                .modal {
                    width: min(
                        620px,
                        100%
                    );

                    max-height:
                        calc(100vh - 50px);

                    padding: 24px;

                    overflow-y: auto;

                    border-radius: 14px;

                    background: #ffffff;

                    box-shadow:
                        0 25px 70px
                        rgba(0, 0, 0, 0.18);
                }

                .small-modal {
                    width: min(
                        500px,
                        100%
                    );
                }

                .modal-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;

                    margin-bottom: 22px;
                }

                .modal-header h2 {
                    margin: 0;

                    font-size: 21px;
                }

                .modal-header > button {
                    width: 34px;
                    height: 34px;

                    border: none;
                    border-radius: 7px;

                    background: #f3f4f6;

                    color: #6b7280;

                    font-size: 21px;

                    cursor: pointer;
                }

                .modal-header > button:disabled {
                    opacity: 0.5;

                    cursor: not-allowed;
                }

                .form-grid {
                    display: grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap: 13px;

                    margin-bottom: 13px;
                }

                .form-grid label {
                    display: block;
                }

                .form-grid label span,
                .role-select span {
                    display: block;

                    margin-bottom: 6px;

                    color: #374151;

                    font-size: 10px;
                    font-weight: 700;
                }

                .form-grid input,
                .form-grid select,
                .role-select select {
                    width: 100%;

                    height: 40px;

                    padding: 0 10px;

                    border: 1px solid #e5e7eb;
                    border-radius: 7px;

                    outline: none;

                    background: #ffffff;

                    color: #111827;

                    font-family: inherit;

                    font-size: 11px;
                }

                .form-grid input:focus,
                .form-grid select:focus,
                .role-select select:focus {
                    border-color: #9ca3af;
                }

                .modal-info {
                    padding: 12px 13px;

                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    border-radius: 8px;

                    background: #f9fafb;
                }

                .modal-info span {
                    color: #9ca3af;

                    font-size: 10px;
                }

                .modal-info strong {
                    font-size: 10px;
                }

                .selected-user {
                    display: flex;
                    align-items: center;

                    gap: 10px;

                    margin-bottom: 20px;

                    padding: 12px;

                    border-radius: 9px;

                    background: #f9fafb;
                }

                .selected-user strong {
                    display: block;

                    margin-bottom: 4px;

                    font-size: 11px;
                }

                .selected-user span {
                    color: #9ca3af;

                    font-size: 9px;
                }

                .role-select {
                    display: block;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;

                    gap: 8px;

                    margin-top: 22px;
                }

                .modal-actions button {
                    min-height: 39px;

                    padding: 0 17px;

                    border-radius: 7px;

                    font-family: inherit;

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .cancel-button {
                    border: 1px solid #e5e7eb;

                    background: #ffffff;
                    color: #374151;
                }

                .save-button {
                    border: none;

                    background: #111827;
                    color: #ffffff;
                }

                .save-button:disabled,
                .cancel-button:disabled {
                    opacity: 0.55;

                    cursor: not-allowed;
                }

                .delete-modal {
                    width: min(
                        430px,
                        100%
                    );

                    padding: 28px;

                    border-radius: 14px;

                    background: #ffffff;

                    text-align: center;
                }

                .delete-icon {
                    width: 58px;
                    height: 58px;

                    margin: 0 auto 14px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 14px;

                    background: #fef2f2;

                    font-size: 25px;
                }

                .delete-modal h2 {
                    margin: 0 0 9px;

                    font-size: 20px;
                }

                .delete-modal p {
                    margin: 6px 0;

                    color: #6b7280;

                    font-size: 11px;
                }

                .delete-modal > strong {
                    display: block;

                    margin: 10px 0;

                    color: #111827;

                    font-size: 13px;
                }

                .delete-warning {
                    margin-top: 13px !important;

                    color: #b91c1c !important;

                    font-size: 10px !important;
                }

                .danger-confirm {
                    border: none;

                    background: #dc2626;

                    color: #ffffff;
                }

                .danger-confirm:hover {
                    background: #b91c1c;
                }

                .danger-confirm:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }

                @media (max-width: 1150px) {

                    .stats {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .filters {
                        flex-wrap: wrap;
                    }

                    .search-box {
                        min-width: 100%;
                    }

                }

                @media (max-width: 800px) {

                    .admin-users-content {
                        width: calc(100% - 28px);

                        padding-top: 28px;
                    }

                    .page-header {
                        align-items: flex-start;

                        flex-direction: column;
                    }

                    .header-actions {
                        width: 100%;

                        flex-wrap: wrap;
                    }

                    .dashboard-button,
                    .refresh-button {
                        flex: 1;
                    }

                    .role-summary {
                        grid-template-columns:
                            1fr;
                    }

                    .form-grid {
                        grid-template-columns:
                            1fr;
                    }

                }

                @media (max-width: 550px) {

                    .stats {
                        grid-template-columns:
                            1fr;
                    }

                    .filters select {
                        width: 100%;
                    }

                    .modal-overlay {
                        padding: 12px;
                    }

                    .modal {
                        max-height:
                            calc(100vh - 24px);

                        padding: 18px;
                    }

                }

            `}</style>

        </div>
    );
};

export default AdminUsers;