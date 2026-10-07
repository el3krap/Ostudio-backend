const express = require('express');
const mongoose = require('mongoose');

const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');

const {
    authenticateUser,
    requireProjectCreator,
    requireCoordinator
} = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// CONSTANTS
// ============================================================

const ACTIVE_STATUSES = ['active', 'approved'];

const VALID_ROLES = [
    'admin',
    'manager',
    'account_manager',
    'coordinator',
    'designer'
];

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const populateProject = (query) => {
    return query
        .populate('createdBy', 'name email role')
        .populate('assignedDesigner', 'name email role')
        .populate('assignedPresenter', 'name email role');
};

const getUserId = (req) => {
    if (!req.user || !req.user.mongoId) {
        return null;
    }

    return req.user.mongoId;
};

const getCurrentUser = async (req) => {
    const userId = getUserId(req);

    if (!userId || !isValidObjectId(userId)) {
        return null;
    }

    return User.findById(userId);
};

const isHigherRole = (role) => {
    return (
        role === 'admin' ||
        role === 'manager'
    );
};

const canManageAssignments = (role) => {
    return (
        role === 'admin' ||
        role === 'manager' ||
        role === 'coordinator'
    );
};

// ============================================================
// 1. CREATE PROJECT
// ============================================================
//
// POST /api/projects/create
//
// Allowed:
// - admin
// - manager
// - account_manager
//
// NOT allowed:
// - coordinator
// - designer
//
// Important:
// createdBy comes ONLY from authenticated req.user.
// The frontend cannot choose another owner.
//
// ============================================================

router.post(
    '/create',
    authenticateUser,
    requireProjectCreator,
    async (req, res) => {
        try {
            const {
                projectName,
                brief,
                managerNotes,

                // Compatibility fields
                briefName,

                description,
                startDate,
                deadline,
                checkpoints,
                isDoneAll,
                renderFileLink,
                presentationFileLink,
                coordinatorNotes,
                isPresentationApproved,
                status
            } = req.body;

            // --------------------------------------------------------
            // Validate project name
            // --------------------------------------------------------

            if (
                typeof projectName !== 'string' ||
                !projectName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'اسم المشروع مطلوب.'
                });
            }

            // --------------------------------------------------------
            // Current authenticated user
            // --------------------------------------------------------

            const currentUser = await getCurrentUser(req);

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message: 'لم يتم التعرف على المستخدم الحالي.'
                });
            }

            // --------------------------------------------------------
            // Validate role
            // --------------------------------------------------------

            if (!VALID_ROLES.includes(currentUser.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'نوع الحساب غير صالح.'
                });
            }

            // --------------------------------------------------------
            // Build project data
            // --------------------------------------------------------

            const projectData = {
                projectName: projectName.trim(),
                brief: brief || '',
                managerNotes: managerNotes || '',
                createdBy: currentUser._id
            };

            // Preserve compatibility fields when they exist
            if (briefName !== undefined) {
                projectData.briefName = briefName;
            }

            if (description !== undefined) {
                projectData.description = description;
            }

            if (startDate !== undefined) {
                projectData.startDate = startDate;
            }

            if (deadline !== undefined) {
                projectData.deadline = deadline;
            }

            if (Array.isArray(checkpoints)) {
                projectData.checkpoints = checkpoints;
            } else {
                projectData.checkpoints = [
                    {
                        title: 'التصميم الأولي',
                        isCompleted: false
                    },
                    {
                        title: 'التعديلات',
                        isCompleted: false
                    },
                    {
                        title: 'التصميم النهائي',
                        isCompleted: false
                    }
                ];
            }

            if (isDoneAll !== undefined) {
                projectData.isDoneAll = isDoneAll;
            }

            if (renderFileLink !== undefined) {
                projectData.renderFileLink = renderFileLink;
            }

            if (presentationFileLink !== undefined) {
                projectData.presentationFileLink =
                    presentationFileLink;
            }

            if (coordinatorNotes !== undefined) {
                projectData.coordinatorNotes =
                    coordinatorNotes;
            }

            if (isPresentationApproved !== undefined) {
                projectData.isPresentationApproved =
                    isPresentationApproved;
            }

            if (status !== undefined) {
                projectData.status = status;
            }

            // Never allow frontend to create assignments.
            projectData.assignedDesigner = null;
            projectData.assignedPresenter = null;

            // --------------------------------------------------------
            // Create
            // --------------------------------------------------------

            const newProject = new Project(projectData);

            await newProject.save();

            // --------------------------------------------------------
            // Notify all active Coordinators
            // --------------------------------------------------------

            try {
                const coordinators = await User.find({
                    role: 'coordinator',
                    status: {
                        $in: ACTIVE_STATUSES
                    }
                }).select('_id');

                if (coordinators.length > 0) {
                    const notifications =
                        coordinators.map((coordinator) => ({
                            recipient: coordinator._id,
                            sender: currentUser._id,
                            type: 'project-created',
                            title: 'تم إضافة مشروع جديد',
                            message:
                                `تم إضافة مشروع جديد: ${newProject.projectName}`,
                            project: newProject._id,
                            isRead: false
                        }));

                    await Notification.insertMany(
                        notifications
                    );
                }
            } catch (notificationError) {
                console.error(
                    'Project creation notification error:',
                    notificationError
                );
            }

            // --------------------------------------------------------
            // Return project
            // --------------------------------------------------------

            const populatedProject =
                await populateProject(
                    Project.findById(newProject._id)
                );

            return res.status(201).json({
                success: true,
                message: 'تم إنشاء المشروع بنجاح!',
                project: populatedProject
            });
        } catch (err) {
            console.error(
                'Create project error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إنشاء المشروع.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 2. GET ALL PROJECTS
// ============================================================
//
// GET /api/projects/all
//
// admin       -> all
// manager     -> all
// coordinator -> all
// account_mgr  -> own projects
// designer    -> projects assigned as:
//                - main designer
//                OR
//                - presentation designer
//
// ============================================================

router.get(
    '/all',
    authenticateUser,
    async (req, res) => {
        try {
            const currentUser =
                await getCurrentUser(req);

            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message:
                        'لم يتم التعرف على المستخدم الحالي.'
                });
            }

            let filter = {};

            switch (currentUser.role) {
                case 'admin':
                case 'manager':
                case 'coordinator':
                    filter = {};
                    break;

                case 'account_manager':
                    filter = {
                        createdBy: currentUser._id
                    };
                    break;

                case 'designer':
                    filter = {
                        $or: [
                            {
                                assignedDesigner:
                                    currentUser._id
                            },
                            {
                                assignedPresenter:
                                    currentUser._id
                            }
                        ]
                    };
                    break;

                default:
                    return res.status(403).json({
                        success: false,
                        message:
                            'ليس لديك صلاحية لعرض المشاريع.'
                    });
            }

            const projects =
                await populateProject(
                    Project.find(filter)
                        .sort({
                            createdAt: -1
                        })
                );

            return res.status(200).json({
                success: true,
                projects
            });
        } catch (err) {
            console.error(
                'Get projects error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المشاريع.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 3. GET ONE PROJECT
// ============================================================
//
// GET /api/projects/:id
//
// admin / manager / coordinator -> any project
// account_manager               -> own project
// designer                      -> assigned project only
//
// ============================================================

router.get(
    '/:id',
    authenticateUser,
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المشروع غير صالح.'
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

            const project =
                await populateProject(
                    Project.findById(id)
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المشروع غير موجود.'
                });
            }

            const currentUserId =
                currentUser._id.toString();

            const ownerId =
                project.createdBy?._id?.toString();

            const designerId =
                project.assignedDesigner?._id?.toString();

            const presenterId =
                project.assignedPresenter?._id?.toString();

            let hasAccess = false;

            if (
                currentUser.role === 'admin' ||
                currentUser.role === 'manager' ||
                currentUser.role === 'coordinator'
            ) {
                hasAccess = true;
            }

            if (
                currentUser.role === 'account_manager' &&
                ownerId === currentUserId
            ) {
                hasAccess = true;
            }

            if (
                currentUser.role === 'designer' &&
                (
                    designerId === currentUserId ||
                    presenterId === currentUserId
                )
            ) {
                hasAccess = true;
            }

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message:
                        'ليس لديك صلاحية لعرض هذا المشروع.'
                });
            }

            return res.status(200).json({
                success: true,
                project
            });
        } catch (err) {
            console.error(
                'Get project error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المشروع.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 4. UPDATE PROJECT
// ============================================================
//
// PUT /api/projects/update/:id
//
// admin       -> anything
// manager     -> anything
// coordinator -> project details
// account_mgr -> own project details
// designer    -> cannot update general project data
//
// IMPORTANT:
// Account Manager cannot change:
// - assignedDesigner
// - assignedPresenter
// - presentation approval
//
// Assignment is controlled by Coordinator/Manager/Admin.
//
// ============================================================

router.put(
    '/update/:id',
    authenticateUser,
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المشروع غير صالح.'
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

            const project =
                await Project.findById(id);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المشروع غير موجود.'
                });
            }

            const isOwner =
                project.createdBy &&
                project.createdBy.toString() ===
                    currentUser._id.toString();

            const isAdmin =
                currentUser.role === 'admin';

            const isManager =
                currentUser.role === 'manager';

            const isCoordinator =
                currentUser.role === 'coordinator';

            const isAccountManager =
                currentUser.role === 'account_manager';

            if (
                !isAdmin &&
                !isManager &&
                !isCoordinator &&
                !(isAccountManager && isOwner)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'ليس لديك صلاحية لتعديل هذا المشروع.'
                });
            }

            // --------------------------------------------------------
            // Fields that can be updated
            // --------------------------------------------------------

            const generalFields = [
                'projectName',
                'brief',
                'briefName',
                'managerNotes',
                'description',
                'startDate',
                'deadline',
                'checkpoints',
                'isDoneAll',
                'renderFileLink',
                'presentationFileLink',
                'coordinatorNotes',
                'status'
            ];

            const updateData = {};

            for (const field of generalFields) {
                if (req.body[field] !== undefined) {
                    updateData[field] =
                        req.body[field];
                }
            }

            // --------------------------------------------------------
            // Assignment / approval fields
            //
            // ONLY admin, manager, coordinator
            // --------------------------------------------------------

            if (
                isAdmin ||
                isManager ||
                isCoordinator
            ) {
                if (
                    req.body.assignedDesigner !==
                    undefined
                ) {
                    updateData.assignedDesigner =
                        req.body.assignedDesigner;
                }

                if (
                    req.body.assignedPresenter !==
                    undefined
                ) {
                    updateData.assignedPresenter =
                        req.body.assignedPresenter;
                }

                if (
                    req.body.isPresentationApproved !==
                    undefined
                ) {
                    updateData.isPresentationApproved =
                        req.body.isPresentationApproved;
                }
            }

            // --------------------------------------------------------
            // Never allow createdBy to change
            // --------------------------------------------------------

            delete updateData.createdBy;

            // --------------------------------------------------------
            // Validate project name
            // --------------------------------------------------------

            if (
                updateData.projectName !==
                    undefined &&
                (
                    typeof updateData.projectName !==
                        'string' ||
                    !updateData.projectName.trim()
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'اسم المشروع غير صالح.'
                });
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

            const updated =
                await populateProject(
                    Project.findByIdAndUpdate(
                        id,
                        {
                            $set: updateData
                        },
                        {
                            new: true,
                            runValidators: true
                        }
                    )
                );

            // --------------------------------------------------------
            // Notify relevant users about update
            //
            // Do not notify the person who performed the update.
            // --------------------------------------------------------

            try {
                const recipients = new Set();

                if (
                    updated.createdBy?._id &&
                    updated.createdBy._id.toString() !==
                        currentUser._id.toString()
                ) {
                    recipients.add(
                        updated.createdBy._id.toString()
                    );
                }

                if (
                    updated.assignedDesigner?._id &&
                    updated.assignedDesigner._id.toString() !==
                        currentUser._id.toString()
                ) {
                    recipients.add(
                        updated.assignedDesigner._id.toString()
                    );
                }

                if (
                    updated.assignedPresenter?._id &&
                    updated.assignedPresenter._id.toString() !==
                        currentUser._id.toString()
                ) {
                    recipients.add(
                        updated.assignedPresenter._id.toString()
                    );
                }

                if (recipients.size > 0) {
                    await Notification.insertMany(
                        Array.from(recipients).map(
                            (recipientId) => ({
                                recipient: recipientId,
                                sender: currentUser._id,
                                type: 'project-updated',
                                title:
                                    'تم تحديث مشروع',
                                message:
                                    `تم تحديث المشروع: ${updated.projectName}`,
                                project: updated._id,
                                isRead: false
                            })
                        )
                    );
                }
            } catch (notificationError) {
                console.error(
                    'Project update notification error:',
                    notificationError
                );
            }

            return res.status(200).json({
                success: true,
                message:
                    'تم تحديث تفاصيل المشروع بنجاح.',
                project: updated
            });
        } catch (err) {
            console.error(
                'Update project error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث المشروع.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 5. ASSIGN MAIN DESIGNER
// ============================================================
//
// PUT /api/projects/:id/assign-designer
//
// Allowed:
// - admin
// - manager
// - coordinator
//
// ============================================================

router.put(
    '/:id/assign-designer',
    authenticateUser,
    requireCoordinator,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { designerId } = req.body;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المشروع غير صالح.'
                });
            }

            if (!designerId) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المصمم مطلوب.'
                });
            }

            if (!isValidObjectId(designerId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المصمم غير صالح.'
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

            const designer =
                await User.findOne({
                    _id: designerId,
                    role: 'designer',
                    status: {
                        $in: ACTIVE_STATUSES
                    }
                });

            if (!designer) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المصمم غير موجود أو غير نشط.'
                });
            }

            const project =
                await Project.findById(id);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المشروع غير موجود.'
                });
            }

            const previousDesigner =
                project.assignedDesigner;

            project.assignedDesigner =
                designer._id;

            await project.save();

            // --------------------------------------------------------
            // Notification
            // --------------------------------------------------------

            if (
                !previousDesigner ||
                previousDesigner.toString() !==
                    designer._id.toString()
            ) {
                try {
                    await Notification.create({
                        recipient: designer._id,
                        sender: currentUser._id,
                        type: 'project-assigned',
                        title:
                            'تم تكليفك بمشروع',
                        message:
                            `تم تكليفك بالعمل على مشروع: ${project.projectName}`,
                        project: project._id,
                        isRead: false
                    });
                } catch (notificationError) {
                    console.error(
                        'Designer notification error:',
                        notificationError
                    );
                }
            }

            const updatedProject =
                await populateProject(
                    Project.findById(project._id)
                );

            return res.status(200).json({
                success: true,
                message:
                    'تم تعيين المصمم وإرسال الإشعار بنجاح.',
                project: updatedProject
            });
        } catch (err) {
            console.error(
                'Assign designer error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تعيين المصمم.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 6. ASSIGN PRESENTATION DESIGNER
// ============================================================
//
// PUT /api/projects/:id/assign-presenter
//
// Presentation designer can be different from main designer.
//
// Allowed:
// - admin
// - manager
// - coordinator
//
// ============================================================

router.put(
    '/:id/assign-presenter',
    authenticateUser,
    requireCoordinator,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { presenterId } = req.body;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المشروع غير صالح.'
                });
            }

            if (!presenterId) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف مصمم البرزنتيشن مطلوب.'
                });
            }

            if (!isValidObjectId(presenterId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المصمم غير صالح.'
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

            const presenter =
                await User.findOne({
                    _id: presenterId,
                    role: 'designer',
                    status: {
                        $in: ACTIVE_STATUSES
                    }
                });

            if (!presenter) {
                return res.status(404).json({
                    success: false,
                    message:
                        'مصمم البرزنتيشن غير موجود أو غير نشط.'
                });
            }

            const project =
                await Project.findById(id);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المشروع غير موجود.'
                });
            }

            const previousPresenter =
                project.assignedPresenter;

            project.assignedPresenter =
                presenter._id;

            // New presentation assignment requires approval again
            project.isPresentationApproved =
                false;

            await project.save();

            // --------------------------------------------------------
            // Notification
            // --------------------------------------------------------

            if (
                !previousPresenter ||
                previousPresenter.toString() !==
                    presenter._id.toString()
            ) {
                try {
                    await Notification.create({
                        recipient: presenter._id,
                        sender: currentUser._id,
                        type:
                            'presentation-assigned',
                        title:
                            'تم تكليفك بعمل Presentation',
                        message:
                            `تم تكليفك بعمل الـ Presentation للمشروع: ${project.projectName}`,
                        project: project._id,
                        isRead: false
                    });
                } catch (notificationError) {
                    console.error(
                        'Presentation notification error:',
                        notificationError
                    );
                }
            }

            const updatedProject =
                await populateProject(
                    Project.findById(project._id)
                );

            return res.status(200).json({
                success: true,
                message:
                    'تم تعيين مصمم البرزنتيشن وإرسال الإشعار بنجاح.',
                project: updatedProject
            });
        } catch (err) {
            console.error(
                'Assign presentation designer error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تعيين مصمم البرزنتيشن.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 7. REMOVE MAIN DESIGNER
// ============================================================
//
// PUT /api/projects/:id/remove-designer
//
// Allowed:
// - admin
// - manager
// - coordinator
//
// ============================================================

router.put(
    '/:id/remove-designer',
    authenticateUser,
    requireCoordinator,
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المشروع غير صالح.'
                });
            }

            const project =
                await Project.findById(id);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المشروع غير موجود.'
                });
            }

            project.assignedDesigner = null;

            await project.save();

            const updatedProject =
                await populateProject(
                    Project.findById(project._id)
                );

            return res.status(200).json({
                success: true,
                message:
                    'تم إلغاء تكليف المصمم بنجاح.',
                project: updatedProject
            });
        } catch (err) {
            console.error(
                'Remove designer error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إلغاء تكليف المصمم.',
                error: err.message
            });
        }
    }
);

// ============================================================
// 8. REMOVE PRESENTATION DESIGNER
// ============================================================
//
// PUT /api/projects/:id/remove-presenter
//
// Allowed:
// - admin
// - manager
// - coordinator
//
// ============================================================

router.put(
    '/:id/remove-presenter',
    authenticateUser,
    requireCoordinator,
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'معرف المشروع غير صالح.'
                });
            }

            const project =
                await Project.findById(id);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المشروع غير موجود.'
                });
            }

            project.assignedPresenter = null;

            project.isPresentationApproved =
                false;

            await project.save();

            const updatedProject =
                await populateProject(
                    Project.findById(project._id)
                );

            return res.status(200).json({
                success: true,
                message:
                    'تم إلغاء تكليف مصمم البرزنتيشن بنجاح.',
                project: updatedProject
            });
        } catch (err) {
            console.error(
                'Remove presenter error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إلغاء تكليف مصمم البرزنتيشن.',
                error: err.message
            });
        }
    }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;