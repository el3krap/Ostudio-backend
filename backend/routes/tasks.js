const express = require('express');
const mongoose = require('mongoose');

const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');

const {
    authenticateUser,
    requireCoordinator
} = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// CONSTANTS
// ============================================================

const ACTIVE_STATUSES = ['active', 'approved'];

const VALID_TASK_STATUSES = [
    'pending',
    'in-progress',
    'completed'
];

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const getCurrentUser = async (req) => {
    if (!req.user?.mongoId) {
        return null;
    }

    if (!isValidObjectId(req.user.mongoId)) {
        return null;
    }

    return User.findById(req.user.mongoId);
};

// ============================================================
// 1. CREATE TASK
// ============================================================
//
// POST /api/tasks/create
//
// Allowed:
// - admin
// - manager
// - coordinator
//
// The frontend cannot choose the creator.
// The authenticated req.user is always the creator.
//
// ============================================================

router.post(
    '/create',
    authenticateUser,
    requireCoordinator,
    async (req, res) => {
        try {
            const {
                title,
                description,
                assignedTo,
                deadline,

                // Compatibility fields
                projectId,
                createdById,
                fileName,
                notes,
                fileLink
            } = req.body;

            // --------------------------------------------------------
            // Validate title
            // --------------------------------------------------------

            if (
                typeof title !== 'string' ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'عنوان المهمة مطلوب.'
                });
            }

            // --------------------------------------------------------
            // Validate assigned user
            // --------------------------------------------------------

            if (!assignedTo) {
                return res.status(400).json({
                    success: false,
                    message:
                        'يجب تحديد الشخص المسؤول عن المهمة.'
                });
            }

            if (!isValidObjectId(assignedTo)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المستخدم المسؤول عن المهمة غير صالح.'
                });
            }

            // --------------------------------------------------------
            // Current authenticated user
            // --------------------------------------------------------

            const currentUser =
                await getCurrentUser(req);

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message:
                        'لم يتم التعرف على المستخدم الحالي.'
                });
            }

            // --------------------------------------------------------
            // Assigned user
            // --------------------------------------------------------

            const assignedUser =
                await User.findOne({
                    _id: assignedTo,
                    status: {
                        $in: ACTIVE_STATUSES
                    }
                });

            if (!assignedUser) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المستخدم المسؤول عن المهمة غير موجود أو غير نشط.'
                });
            }

            // --------------------------------------------------------
            // Build task
            // --------------------------------------------------------

            const taskData = {
                title: title.trim(),
                description:
                    description || '',
                assignedTo:
                    assignedUser._id,
                deadline:
                    deadline || null
            };

            /*
             * Compatibility fields are added only when they exist.
             *
             * IMPORTANT:
             * If Task.js does not define these fields,
             * Mongoose will not persist them.
             *
             * We will reconcile Task.js separately so no old
             * task data is lost.
             */

            if (projectId !== undefined) {
                taskData.projectId = projectId;
            }

            if (createdById !== undefined) {
                // Never trust this as the creator.
                // It is preserved only as compatibility data.
                taskData.createdById =
                    currentUser._id;
            }

            if (fileName !== undefined) {
                taskData.fileName = fileName;
            }

            if (fileLink !== undefined) {
                taskData.fileLink = fileLink;
            }

            if (notes !== undefined) {
                taskData.notes = notes;
            }

            const newTask =
                new Task(taskData);

            await newTask.save();

            // --------------------------------------------------------
            // Notify assigned user
            // --------------------------------------------------------

            try {
                await Notification.create({
                    recipient:
                        assignedUser._id,

                    sender:
                        currentUser._id,

                    type:
                        'task-assigned',

                    title:
                        'تم إسناد مهمة جديدة',

                    message:
                        `تم إسناد مهمة جديدة لك: ${newTask.title}`,

                    task:
                        newTask._id,

                    project:
                        projectId &&
                        isValidObjectId(projectId)
                            ? projectId
                            : null,

                    isRead: false
                });
            } catch (notificationError) {
                console.error(
                    'Task notification error:',
                    notificationError
                );
            }

            // --------------------------------------------------------
            // Return task
            // --------------------------------------------------------

            const populatedTask =
                await Task.findById(
                    newTask._id
                ).populate(
                    'assignedTo',
                    'name email role'
                );

            return res.status(201).json({
                success: true,
                message:
                    'تم إسناد المهمة بنجاح!',
                task: populatedTask
            });
        } catch (err) {
            console.error(
                'Create task error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إنشاء المهمة.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 2. GET USER TASKS
// ============================================================
//
// GET /api/tasks/user/:userId
//
// A user can retrieve ONLY their own tasks.
//
// Admin / Manager / Coordinator can retrieve
// another user's tasks.
//
// IMPORTANT:
// We authenticate the requester independently from
// the requested user ID.
//
// ============================================================

router.get(
    '/user/:userId',
    authenticateUser,
    async (req, res) => {
        try {
            const requestedUserId =
                req.params.userId;

            if (!isValidObjectId(requestedUserId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المستخدم غير صالح.'
                });
            }

            const currentUser =
                await getCurrentUser(req);

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message:
                        'لم يتم التعرف على المستخدم الحالي.'
                });
            }

            const currentUserId =
                currentUser._id.toString();

            const requestedId =
                requestedUserId.toString();

            const isOwnTasks =
                currentUserId === requestedId;

            const canViewOtherUserTasks =
                currentUser.role === 'admin' ||
                currentUser.role === 'manager' ||
                currentUser.role === 'coordinator';

            if (
                !isOwnTasks &&
                !canViewOtherUserTasks
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'ليس لديك صلاحية لعرض مهام هذا المستخدم.'
                });
            }

            const tasks =
                await Task.find({
                    assignedTo:
                        requestedUserId
                })
                    .populate(
                        'assignedTo',
                        'name email role'
                    )
                    .sort({
                        createdAt: -1
                    });

            return res.status(200).json({
                success: true,
                tasks
            });
        } catch (err) {
            console.error(
                'Get user tasks error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المهام.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 3. GET TASK BY ID
// ============================================================
//
// GET /api/tasks/:id
//
// Allowed:
// - admin
// - manager
// - coordinator
// - assigned user
//
// ============================================================

router.get(
    '/:id',
    authenticateUser,
    async (req, res) => {
        try {
            const taskId =
                req.params.id;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المهمة غير صالح.'
                });
            }

            const currentUser =
                await getCurrentUser(req);

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message:
                        'لم يتم التعرف على المستخدم الحالي.'
                });
            }

            const task =
                await Task.findById(taskId)
                    .populate(
                        'assignedTo',
                        'name email role'
                    );

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المهمة غير موجودة.'
                });
            }

            const assignedUserId =
                task.assignedTo?._id
                    ? task.assignedTo._id.toString()
                    : task.assignedTo.toString();

            const currentUserId =
                currentUser._id.toString();

            const canView =
                currentUser.role === 'admin' ||
                currentUser.role === 'manager' ||
                currentUser.role === 'coordinator' ||
                currentUserId === assignedUserId;

            if (!canView) {
                return res.status(403).json({
                    success: false,
                    message:
                        'ليس لديك صلاحية لعرض هذه المهمة.'
                });
            }

            return res.status(200).json({
                success: true,
                task
            });
        } catch (err) {
            console.error(
                'Get task error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المهمة.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 4. UPDATE TASK STATUS
// ============================================================
//
// PUT /api/tasks/update-status/:id
//
// Assigned user:
// - status
// - fileLink
// - notes
//
// Admin / Manager / Coordinator:
// - can update any task
//
// ============================================================

router.put(
    '/update-status/:id',
    authenticateUser,
    async (req, res) => {
        try {
            const taskId =
                req.params.id;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المهمة غير صالح.'
                });
            }

            const currentUser =
                await getCurrentUser(req);

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message:
                        'لم يتم التعرف على المستخدم الحالي.'
                });
            }

            const task =
                await Task.findById(taskId);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المهمة غير موجودة.'
                });
            }

            const isAssignedUser =
                task.assignedTo.toString() ===
                currentUser._id.toString();

            const canManageAnyTask =
                currentUser.role === 'admin' ||
                currentUser.role === 'manager' ||
                currentUser.role === 'coordinator';

            if (
                !isAssignedUser &&
                !canManageAnyTask
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'ليس لديك صلاحية لتعديل هذه المهمة.'
                });
            }

            const {
                status,
                fileLink,
                notes
            } = req.body;

            const updateData = {};

            // --------------------------------------------------------
            // Validate status
            // --------------------------------------------------------

            if (status !== undefined) {
                if (
                    !VALID_TASK_STATUSES.includes(
                        status
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'حالة المهمة غير صالحة.'
                    });
                }

                updateData.status = status;
            }

            // --------------------------------------------------------
            // File
            // --------------------------------------------------------

            if (fileLink !== undefined) {
                updateData.fileLink =
                    fileLink;
            }

            // --------------------------------------------------------
            // Notes
            // --------------------------------------------------------

            if (notes !== undefined) {
                updateData.notes =
                    notes;
            }

            // --------------------------------------------------------
            // Nothing to update
            // --------------------------------------------------------

            if (
                Object.keys(updateData).length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'لم يتم إرسال أي بيانات للتحديث.'
                });
            }

            // --------------------------------------------------------
            // Update
            // --------------------------------------------------------

            const updatedTask =
                await Task.findByIdAndUpdate(
                    taskId,
                    {
                        $set: updateData
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).populate(
                    'assignedTo',
                    'name email role'
                );

            // --------------------------------------------------------
            // Notify managers/coordinators
            // when assigned user updates the task
            // --------------------------------------------------------

            if (isAssignedUser) {
                try {
                    const notifyUsers =
                        await User.find({
                            role: {
                                $in: [
                                    'manager',
                                    'coordinator'
                                ]
                            },
                            status: {
                                $in:
                                    ACTIVE_STATUSES
                            },
                            _id: {
                                $ne:
                                    currentUser._id
                            }
                        }).select('_id');

                    if (
                        notifyUsers.length > 0
                    ) {
                        const notifications =
                            notifyUsers.map(
                                (user) => ({
                                    recipient:
                                        user._id,

                                    sender:
                                        currentUser._id,

                                    type:
                                        'task-updated',

                                    title:
                                        'تم تحديث مهمة',

                                    message:
                                        `تم تحديث المهمة: ${task.title}`,

                                    task:
                                        task._id,

                                    isRead: false
                                })
                            );

                        await Notification.insertMany(
                            notifications
                        );
                    }
                } catch (notificationError) {
                    console.error(
                        'Task update notification error:',
                        notificationError
                    );
                }
            }

            return res.status(200).json({
                success: true,
                message:
                    'تم تحديث المهمة بنجاح.',
                task: updatedTask
            });
        } catch (err) {
            console.error(
                'Update task error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث المهمة.',
                error: err.message
            });
        }
    }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;