// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// =========================
// Auth
// =========================
import Login from './pages/Auth/Login.jsx';
import Signup from './pages/Auth/Signup';

// =========================
// Admin
// =========================
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminProjects from './pages/Admin/AdminProjects';
import AdminTasks from './pages/Admin/AdminTasks';

// =========================
// Manager
// =========================
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import ManagerProjects from './pages/Manager/ManagerProjects';
import ManagerProjectDetails from './pages/Manager/ManagerProjectDetails';
import ManagerTasks from './pages/Manager/ManagerTasks';

// =========================
// Account Manager
// =========================
import AccountManagerDashboard from './pages/AccountManager/AccountManagerDashboard';
import AccountManagerProjects from './pages/AccountManager/AccountManagerProjects';
import AccountManagerProjectDetails from './pages/AccountManager/AccountManagerProjectDetails';

// =========================
// Coordinator
// =========================
import CoordinatorDashboard from './pages/Coordinator/CoordinatorDashboard';
import CoordinatorProjectDetails from './pages/Coordinator/CoordinatorProjectDetails';
import CoordinatorAssignments from './pages/Coordinator/CoordinatorAssignments';
import CoordinatorTasks from './pages/Coordinator/CoordinatorTasks';

// =========================
// Designer
// =========================
import DesignerDashboard from './pages/Designer/DesignerDashboard';
import DesignerProjects from './pages/Designer/DesignerProjects';
import DesignerProjectDetails from './pages/Designer/DesignerProjectDetails';
import DesignerTasks from './pages/Designer/DesignerTasks';


// ======================================================
// App
// ======================================================

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* ==================================================
                    PUBLIC AUTH ROUTES
                   ================================================== */}

                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
                />


                {/* ==================================================
                    ADMIN ROUTES
                   ================================================== */}

                <Route
                    path="/admin/dashboard"
                    element={<AdminDashboard />}
                />

                <Route
                    path="/admin/users"
                    element={<AdminUsers />}
                />

                <Route
                    path="/admin/projects"
                    element={<AdminProjects />}
                />

                <Route
                    path="/admin/projects/:projectId"
                    element={<AdminProjects />}
                />

                <Route
                    path="/admin/tasks"
                    element={<AdminTasks />}
                />

                <Route
                    path="/admin/tasks/:taskId"
                    element={<AdminTasks />}
                />


                {/* ==================================================
                    MANAGER ROUTES
                   ================================================== */}

                <Route
                    path="/manager/dashboard"
                    element={<ManagerDashboard />}
                />

                <Route
                    path="/manager/projects"
                    element={<ManagerProjects />}
                />

                <Route
                    path="/manager/projects/:projectId"
                    element={<ManagerProjectDetails />}
                />

                <Route
                    path="/manager/tasks"
                    element={<ManagerTasks />}
                />

                <Route
                    path="/manager/tasks/:taskId"
                    element={<ManagerTasks />}
                />


                {/* ==================================================
                    ACCOUNT MANAGER ROUTES
                   ================================================== */}

                <Route
                    path="/account-manager/dashboard"
                    element={<AccountManagerDashboard />}
                />

                <Route
                    path="/account-manager/projects"
                    element={<AccountManagerProjects />}
                />

                <Route
                    path="/account-manager/projects/:projectId"
                    element={<AccountManagerProjectDetails />}
                />


                {/* ==================================================
                    COORDINATOR ROUTES
                   ================================================== */}

                <Route
                    path="/coordinator/dashboard"
                    element={<CoordinatorDashboard />}
                />

                <Route
                    path="/coordinator/projects/:projectId"
                    element={<CoordinatorProjectDetails />}
                />

                <Route
                    path="/coordinator/projects/:projectId/assignments"
                    element={<CoordinatorAssignments />}
                />

                <Route
                    path="/coordinator/tasks"
                    element={<CoordinatorTasks />}
                />

                <Route
                    path="/coordinator/tasks/:taskId"
                    element={<CoordinatorTasks />}
                />


                {/* ==================================================
                    DESIGNER ROUTES
                   ================================================== */}

                <Route
                    path="/designer/dashboard"
                    element={<DesignerDashboard />}
                />

                <Route
                    path="/designer/projects"
                    element={<DesignerProjects />}
                />

                <Route
                    path="/designer/projects/:projectId"
                    element={<DesignerProjectDetails />}
                />

                <Route
                    path="/designer/tasks"
                    element={<DesignerTasks />}
                />

                <Route
                    path="/designer/tasks/:taskId"
                    element={<DesignerTasks />}
                />


                {/* ==================================================
                    404 / UNKNOWN ROUTES
                   ================================================== */}

                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;