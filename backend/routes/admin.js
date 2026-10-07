// backend/routes/admin.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

const {
    authenticateUser,
    requireAdmin,
} = require('../middleware/authMiddleware');


// ======================================================
// Middleware
// ======================================================

router.use(
    authenticateUser,
    requireAdmin
);


// ======================================================
// Helpers
// ======================================================

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


function getId(value) {
    if (!value) return null;

    return (
        value._id ||
        value.id ||
        value.mongoId ||
        null
    );
}


function normalizeDate(value) {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}


function buildUserUpdate(body = {}) {
    const data = {};

    if (body.name !== undefined) {
        data.name = String(body.name).trim();
    }

    if (body.email !== undefined) {
        data.email =
            String(body.email)
                .trim()
                .toLowerCase();
    }

    if (body.status !== undefined) {
        const allowedStatuses = [
            'pending',
            'active',
            'approved',
        ];

        if (
            allowedStatuses.includes(
                body.status
            )
        ) {
            data.status = body.status;
        }
    }

    return data;
}


function buildProjectUpdate(body = {}) {
    const data = {};

    const stringFields = [
        'projectName',
        'brief',
        'briefName',
        'managerNotes',
        'description',
        'renderFileLink',
        'renderFileName',
        'renderStatus',
        'presentationFileLink',
        'presentationFileName',
        'presenterNote',
        'coordinatorNotes',
    ];

    stringFields.forEach((field) => {
        if (body[field] !== undefined) {
            data[field] =
                String(body[field]);
        }
    });


    if (body.startDate !== undefined) {
        data.startDate =
            normalizeDate(body.startDate);
    }


    if (body.deadline !== undefined) {
        data.deadline =
            normalizeDate(body.deadline);
    }


    if (Array.isArray(body.checkpoints)) {
        data.checkpoints =
            body.checkpoints.map(
                (checkpoint) => ({
                    id:
                        checkpoint.id ||
                        null,

                    title:
                        checkpoint.title ||
                        '',

                    isCompleted:
                        Boolean(
                            checkpoint.isCompleted
                        ),

                    imageLink:
                        checkpoint.imageLink ||
                        '',

                    fileUrl:
                        checkpoint.fileUrl ||
                        '',

                    fileName:
                        checkpoint.fileName ||
                        '',

                    note:
                        checkpoint.note ||
                        '',
                })
            );
    }


    if (body.isDoneAll !== undefined) {
        data.isDoneAll =
            Boolean(body.isDoneAll);
    }


    if (
        body.isPresentationApproved !==
        undefined
    ) {
        data.isPresentationApproved =
            Boolean(
                body.isPresentationApproved
            );
    }


    if (body.status !== undefined) {
        const allowedStatuses = [
            'in-progress',
            'completed',
        ];

        if (
            allowedStatuses.includes(
                body.status
            )
        ) {
            data.status = body.status;
        }
    }


    return data;
}


function buildTaskUpdate(body = {}) {
    const data = {};

    const stringFields = [
        'title',
        'description',
        'fileLink',
        'fileName',
        'notes',
    ];

    stringFields.forEach((field) => {
        if (body[field] !== undefined) {
            data[field] =
                String(body[field]);
        }
    });


    if (body.deadline !== undefined) {
        data.deadline =
            normalizeDate(body.deadline);
    }


    if (body.status !== undefined) {
        const allowedStatuses = [
            'pending',
            'in-progress',
            'completed',
        ];

        if (
            allowedStatuses.includes(
                body.status
            )
        ) {
            data.status = body.status;
        }
    }


    return data;
}


// ======================================================
// USERS
// ======================================================


// ======================================================
// GET ALL USERS
// ======================================================

router.get(
    '/users',
    async (req, res) => {
        try {

            const filter = {};

            if (req.query.role) {
                filter.role =
                    req.query.role;
            }


            if (req.query.status) {
                filter.status =
                    req.query.status;
            }


            const users =
                await User.find(filter)
                    .select('-password')
                    .sort({
                        createdAt: -1,
                    })
                    .lean();


            return res.status(200).json({
                success: true,
                users,
                data: users,
            });

        } catch (error) {

            console.error(
                '❌ Admin get users error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load users.',
            });
        }
    }
);


// ======================================================
// GET PENDING USERS
// ======================================================

router.get(
    '/users/pending',
    async (req, res) => {
        try {

            const users =
                await User.find({
                    status: 'pending',
                })
                    .select('-password')
                    .sort({
                        createdAt: -1,
                    })
                    .lean();


            return res.status(200).json({
                success: true,
                users,
                data: users,
            });

        } catch (error) {

            console.error(
                '❌ Admin get pending users error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load pending users.',
            });
        }
    }
);


// ======================================================
// GET SINGLE USER
// ======================================================

router.get(
    '/users/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            const user =
                await User.findById(id)
                    .select('-password');


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            return res.status(200).json({
                success: true,
                user,
                data: user,
            });

        } catch (error) {

            console.error(
                '❌ Admin get user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load user.',
            });
        }
    }
);


// ======================================================
// APPROVE USER
// ======================================================

router.put(
    '/users/:id/approve',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            user.status = 'active';

            await user.save();


            // --------------------------------------------------
            // Account Approved Notification
            // --------------------------------------------------

            try {

                await Notification.create({
                    recipient: user._id,

                    sender:
                        req.user.mongoId,

                    type:
                        'account-approved',

                    title:
                        'تمت الموافقة على الحساب',

                    message:
                        'تمت الموافقة على طلب حسابك ويمكنك الآن تسجيل الدخول.',

                    link:
                        '/login',

                    isRead:
                        false,
                });

            } catch (notificationError) {

                console.error(
                    '⚠️ Account approval notification error:',
                    notificationError.message
                );
            }


            const safeUser =
                await User.findById(id)
                    .select('-password');


            return res.status(200).json({
                success: true,
                message:
                    'User approved successfully.',
                user:
                    safeUser,
                data:
                    safeUser,
            });

        } catch (error) {

            console.error(
                '❌ Admin approve user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to approve user.',
            });
        }
    }
);


// ======================================================
// REJECT USER
// ======================================================
//
// User.status does not contain "rejected".
// Therefore rejection is implemented by removing the
// pending MongoDB account.
//
// Firebase account is intentionally NOT deleted here
// because deleting it requires Firebase Admin deletion
// and should be handled explicitly if desired.
// ======================================================

router.put(
    '/users/:id/reject',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            if (
                user.status !==
                'pending'
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Only pending accounts can be rejected.',
                });
            }


            await User.findByIdAndDelete(id);


            return res.status(200).json({
                success: true,
                message:
                    'User request rejected successfully.',
                userId: id,
            });

        } catch (error) {

            console.error(
                '❌ Admin reject user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to reject user request.',
            });
        }
    }
);


// ======================================================
// UPDATE USER
// ======================================================

router.put(
    '/users/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            const updateData =
                buildUserUpdate(
                    req.body
                );


            Object.assign(
                user,
                updateData
            );


            await user.save();


            const safeUser =
                await User.findById(id)
                    .select('-password');


            return res.status(200).json({
                success: true,
                message:
                    'User updated successfully.',
                user:
                    safeUser,
                data:
                    safeUser,
            });

        } catch (error) {

            console.error(
                '❌ Admin update user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update user.',
            });
        }
    }
);


// ======================================================
// UPDATE USER ROLE
// ======================================================

router.put(
    '/users/:id/role',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            const {
                role,
            } = req.body;


            const allowedRoles = [
                'admin',
                'manager',
                'account_manager',
                'coordinator',
                'designer',
            ];


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            if (
                !allowedRoles.includes(
                    role
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user role.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            user.role = role;

            await user.save();


            const safeUser =
                await User.findById(id)
                    .select('-password');


            return res.status(200).json({
                success: true,
                message:
                    'User role updated successfully.',
                user:
                    safeUser,
                data:
                    safeUser,
            });

        } catch (error) {

            console.error(
                '❌ Admin update role error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update user role.',
            });
        }
    }
);


// ======================================================
// ACTIVATE USER
// ======================================================

router.put(
    '/users/:id/activate',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            user.status = 'active';

            await user.save();


            const safeUser =
                await User.findById(id)
                    .select('-password');


            return res.status(200).json({
                success: true,
                message:
                    'User activated successfully.',
                user:
                    safeUser,
                data:
                    safeUser,
            });

        } catch (error) {

            console.error(
                '❌ Admin activate user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to activate user.',
            });
        }
    }
);


// ======================================================
// DEACTIVATE USER
// ======================================================

router.put(
    '/users/:id/deactivate',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            if (
                String(id) ===
                String(req.user.mongoId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'You cannot deactivate your own admin account.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            user.status = 'pending';

            await user.save();


            const safeUser =
                await User.findById(id)
                    .select('-password');


            return res.status(200).json({
                success: true,
                message:
                    'User deactivated successfully.',
                user:
                    safeUser,
                data:
                    safeUser,
            });

        } catch (error) {

            console.error(
                '❌ Admin deactivate user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to deactivate user.',
            });
        }
    }
);


// ======================================================
// DELETE USER
// ======================================================

router.delete(
    '/users/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid user ID.',
                });
            }


            if (
                String(id) ===
                String(req.user.mongoId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'You cannot delete your own admin account.',
                });
            }


            const user =
                await User.findById(id);


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        'User not found.',
                });
            }


            await User.findByIdAndDelete(id);


            return res.status(200).json({
                success: true,
                message:
                    'User deleted successfully.',
                userId: id,
            });

        } catch (error) {

            console.error(
                '❌ Admin delete user error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to delete user.',
            });
        }
    }
);


// ======================================================
// PROJECTS
// ======================================================


// ======================================================
// GET ALL PROJECTS
// ======================================================

router.get(
    '/projects',
    async (req, res) => {
        try {

            const projects =
                await Project.find({})
                    .populate(
                        'createdBy',
                        'name email role'
                    )
                    .populate(
                        'assignedDesigner',
                        'name email role'
                    )
                    .populate(
                        'assignedPresenter',
                        'name email role'
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean();


            return res.status(200).json({
                success: true,
                projects,
                data: projects,
            });

        } catch (error) {

            console.error(
                '❌ Admin get projects error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load projects.',
            });
        }
    }
);


// ======================================================
// GET SINGLE PROJECT
// ======================================================

router.get(
    '/projects/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }


            const project =
                await Project.findById(id)
                    .populate(
                        'createdBy',
                        'name email role'
                    )
                    .populate(
                        'assignedDesigner',
                        'name email role'
                    )
                    .populate(
                        'assignedPresenter',
                        'name email role'
                    );


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }


            return res.status(200).json({
                success: true,
                project,
                data: project,
            });

        } catch (error) {

            console.error(
                '❌ Admin get project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load project.',
            });
        }
    }
);


// ======================================================
// UPDATE PROJECT
// ======================================================

router.put(
    '/projects/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }


            const project =
                await Project.findById(id);


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }


            const updateData =
                buildProjectUpdate(
                    req.body
                );


            Object.assign(
                project,
                updateData
            );


            await project.save();


            const updatedProject =
                await Project.findById(id)
                    .populate(
                        'createdBy',
                        'name email role'
                    )
                    .populate(
                        'assignedDesigner',
                        'name email role'
                    )
                    .populate(
                        'assignedPresenter',
                        'name email role'
                    );


            return res.status(200).json({
                success: true,
                message:
                    'Project updated successfully.',
                project:
                    updatedProject,
                data:
                    updatedProject,
            });

        } catch (error) {

            console.error(
                '❌ Admin update project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update project.',
            });
        }
    }
);


// ======================================================
// DELETE PROJECT
// ======================================================

router.delete(
    '/projects/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }


            const project =
                await Project.findById(id);


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }


            await Project.findByIdAndDelete(id);


            return res.status(200).json({
                success: true,
                message:
                    'Project deleted successfully.',
                projectId: id,
            });

        } catch (error) {

            console.error(
                '❌ Admin delete project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to delete project.',
            });
        }
    }
);


// ======================================================
// TASKS
// ======================================================


// ======================================================
// GET ALL TASKS
// ======================================================

router.get(
    '/tasks',
    async (req, res) => {
        try {

            const tasks =
                await Task.find({})
                    .populate(
                        'projectId',
                        'projectName status'
                    )
                    .populate(
                        'createdBy',
                        'name email role'
                    )
                    .populate(
                        'assignedTo',
                        'name email role'
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .lean();


            return res.status(200).json({
                success: true,
                tasks,
                data: tasks,
            });

        } catch (error) {

            console.error(
                '❌ Admin get tasks error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load tasks.',
            });
        }
    }
);


// ======================================================
// GET SINGLE TASK
// ======================================================

router.get(
    '/tasks/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }


            const task =
                await Task.findById(id)
                    .populate(
                        'projectId',
                        'projectName status'
                    )
                    .populate(
                        'createdBy',
                        'name email role'
                    )
                    .populate(
                        'assignedTo',
                        'name email role'
                    );


            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }


            return res.status(200).json({
                success: true,
                task,
                data: task,
            });

        } catch (error) {

            console.error(
                '❌ Admin get task error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load task.',
            });
        }
    }
);


// ======================================================
// UPDATE TASK
// ======================================================

router.put(
    '/tasks/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }


            const task =
                await Task.findById(id);


            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }


            const updateData =
                buildTaskUpdate(
                    req.body
                );


            Object.assign(
                task,
                updateData
            );


            await task.save();


            const updatedTask =
                await Task.findById(id)
                    .populate(
                        'projectId',
                        'projectName status'
                    )
                    .populate(
                        'createdBy',
                        'name email role'
                    )
                    .populate(
                        'assignedTo',
                        'name email role'
                    );


            return res.status(200).json({
                success: true,
                message:
                    'Task updated successfully.',
                task:
                    updatedTask,
                data:
                    updatedTask,
            });

        } catch (error) {

            console.error(
                '❌ Admin update task error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update task.',
            });
        }
    }
);


// ======================================================
// DELETE TASK
// ======================================================

router.delete(
    '/tasks/:id',
    async (req, res) => {
        try {

            const {
                id,
            } = req.params;


            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }


            const task =
                await Task.findById(id);


            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }


            await Task.findByIdAndDelete(id);


            return res.status(200).json({
                success: true,
                message:
                    'Task deleted successfully.',
                taskId: id,
            });

        } catch (error) {

            console.error(
                '❌ Admin delete task error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to delete task.',
            });
        }
    }
);


// ======================================================
// DASHBOARD
// ======================================================

router.get(
    '/dashboard',
    async (req, res) => {
        try {

            const [
                totalUsers,
                pendingUsers,
                activeUsers,
                totalProjects,
                completedProjects,
                totalTasks,
                completedTasks,
            ] = await Promise.all([
                User.countDocuments({}),

                User.countDocuments({
                    status: 'pending',
                }),

                User.countDocuments({
                    status: {
                        $in: [
                            'active',
                            'approved',
                        ],
                    },
                }),

                Project.countDocuments({}),

                Project.countDocuments({
                    status: 'completed',
                }),

                Task.countDocuments({}),

                Task.countDocuments({
                    status: 'completed',
                }),
            ]);


            return res.status(200).json({
                success: true,

                stats: {
                    totalUsers,
                    pendingUsers,
                    activeUsers,

                    totalProjects,
                    completedProjects,

                    totalTasks,
                    completedTasks,
                },
            });

        } catch (error) {

            console.error(
                '❌ Admin dashboard error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load dashboard statistics.',
            });
        }
    }
);


module.exports = router;