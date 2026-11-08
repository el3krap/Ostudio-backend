// backend/routes/coordinator.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

const {
    authenticateUser,
    requireCoordinator,
} = require('../middleware/authMiddleware');


// ======================================================
// Middleware
// ======================================================

router.use(
    authenticateUser,
    requireCoordinator
);


// ======================================================
// Helpers
// ======================================================

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
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


function buildProjectUpdate(body = {}) {
    const data = {};

    const stringFields = [
        'projectName',
        'brief',
        'briefName',
        'description',
        'managerNotes',
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
            data[field] = String(body[field]);
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




    return data;
}


function buildTaskData(body = {}) {
    const data = {};

    if (body.title !== undefined) {
        data.title =
            String(body.title).trim();
    }

    if (body.description !== undefined) {
        data.description =
            String(body.description);
    }

    if (body.fileLink !== undefined) {
        data.fileLink =
            String(body.fileLink);
    }

    if (body.fileName !== undefined) {
        data.fileName =
            String(body.fileName);
    }

    if (body.notes !== undefined) {
        data.notes =
            String(body.notes);
    }

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


async function getActiveDesigner(designerId) {
    if (!isValidObjectId(designerId)) {
        return null;
    }

    return User.findOne({
        _id: designerId,
        role: 'designer',
        status: {
            $in: [
                'active',
                'approved',
            ],
        },
    }).select(
        '_id name email role status'
    );
}


// ======================================================
// Coordinator Project-Ownership Guards
// ======================================================
// A Coordinator may only access projects assigned to their
// authenticated account. Never trust an ID supplied by the client.

async function findAssignedProject(projectId, coordinatorId) {
    if (!isValidObjectId(projectId) || !coordinatorId) {
        return null;
    }

    return Project.findOne({
        _id: projectId,
        assignedCoordinator: coordinatorId,
    });
}

router.param('projectId', async (req, res, next, projectId) => {
    try {
        if (!isValidObjectId(projectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID.',
            });
        }

        const project = await findAssignedProject(
            projectId,
            req.user?.mongoId
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or not assigned to you.',
            });
        }

        req.coordinatorProject = project;
        return next();
    } catch (error) {
        console.error('Coordinator project authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to authorize project access.',
        });
    }
});

router.param('taskId', async (req, res, next, taskId) => {
    try {
        if (!isValidObjectId(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID.',
            });
        }

        const task = await Task.findById(taskId).select('_id projectId');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found.',
            });
        }

        const project = await findAssignedProject(
            task.projectId,
            req.user?.mongoId
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Task not found or its project is not assigned to you.',
            });
        }

        req.coordinatorTask = task;
        req.coordinatorProject = project;
        return next();
    } catch (error) {
        console.error('Coordinator task authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to authorize task access.',
        });
    }
});


async function createNotification({
    recipient,
    sender,
    type,
    title,
    message,
    project = null,
    task = null,
    link = '',
}) {
    try {
        return await Notification.create({
            recipient,
            sender,
            type,
            title,
            message,
            project,
            task,
            link,
            isRead: false,
        });
    } catch (error) {
        console.error(
            '⚠️ Coordinator notification error:',
            error.message
        );

        return null;
    }
}


// ======================================================
// PROJECTS
// ======================================================


// ======================================================
// CREATE PROJECT (Coordinator)
// The selected active Coordinator becomes the sole owner.
// ======================================================
router.get('/available-coordinators', async (req, res) => {
    try {
        const coordinators = await User.find({
            role: 'coordinator',
            status: { $in: ['active', 'approved'] },
        }).select('_id name email role status').sort({ name: 1 }).lean();
        return res.json({ success: true, coordinators, data: coordinators });
    } catch (error) {
        console.error('Load available coordinators error:', error);
        return res.status(500).json({ success: false, message: 'تعذر تحميل قائمة المسؤولين.' });
    }
});

router.post('/projects', async (req, res) => {
    try {
        const { projectName, assignedCoordinator, brief = '', briefName = '', description = '', managerNotes = '', startDate = null, deadline = null } = req.body || {};
        if (typeof projectName !== 'string' || !projectName.trim()) {
            return res.status(400).json({ success: false, message: 'اسم المشروع مطلوب.' });
        }
        if (!assignedCoordinator || !isValidObjectId(assignedCoordinator)) {
            return res.status(400).json({ success: false, message: 'اختار Coordinator مسؤول صالح.' });
        }
        const coordinator = await User.findOne({
            _id: assignedCoordinator, role: 'coordinator', status: { $in: ['active', 'approved'] }
        }).select('_id name email role');
        if (!coordinator) {
            return res.status(400).json({ success: false, message: 'المسؤول المختار غير نشط أو غير صالح.' });
        }
        const project = await Project.create({
            projectName: projectName.trim(), brief: brief || '', briefName: briefName || '',
            description: description || '', managerNotes: managerNotes || '',
            startDate: normalizeDate(startDate), deadline: normalizeDate(deadline),
            createdBy: req.user.mongoId, assignedCoordinator: coordinator._id,
            assignedDesigner: null, assignedDesignerId: '', assignedDesignerName: '',
            assignedPresenter: null, assignedPresenterId: '', assignedPresenterName: '',
            checkpoints: [], isDoneAll: false, isPresentationApproved: false, status: 'in-progress'
        });
        try {
            await Notification.create({
                recipient: coordinator._id, sender: req.user.mongoId, type: 'project-created',
                title: 'مشروع جديد تم إسناده إليك',
                message: `${req.user.name || 'Coordinator'} أنشأ مشروعًا وأسنده إليك: ${project.projectName}`,
                project: project._id, link: `/coordinator/projects/${project._id}`, isRead: false
            });
        } catch (notificationError) {
            console.error('Coordinator project notification error:', notificationError.message);
        }
        const populated = await Project.findById(project._id)
            .populate('createdBy', 'name email role')
            .populate('assignedCoordinator', 'name email role').lean();
        return res.status(201).json({ success: true, message: 'تم إنشاء المشروع وإسناده بنجاح.', project: populated, data: populated });
    } catch (error) {
        console.error('Coordinator create project error:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء المشروع.' });
    }
});

// ======================================================
// GET ALL PROJECTS
// ======================================================
//
// A Coordinator only sees projects assigned to their account.
// ======================================================

router.get(
    '/projects',
    async (req, res) => {
        try {
            const projects =
                await Project.find({
                    assignedCoordinator: req.user.mongoId,
                })
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
                    .populate(
                        'assignedCoordinator',
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
                '❌ Coordinator get projects error:',
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
    '/projects/:projectId',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            const project =
                await Project.findById(
                    projectId
                )
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
                    .populate(
                        'assignedCoordinator',
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
                '❌ Coordinator get project error:',
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
//
// Coordinator can update project details.
// Assignment fields are handled by dedicated endpoints.
// ======================================================

router.put(
    '/projects/:projectId',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            const project =
                await Project.findById(
                    projectId
                );

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

            // Preserve server-managed review and upload history when editing checkpoint titles/notes.
            if (Array.isArray(updateData.checkpoints)) {
                updateData.checkpoints = updateData.checkpoints.map((incoming) => {
                    const existing = (project.checkpoints || []).find((item) =>
                        (incoming.id && String(item.id || '') === String(incoming.id)) ||
                        (incoming._id && String(item._id || '') === String(incoming._id)) ||
                        (project.checkpoints.indexOf(item) === updateData.checkpoints.indexOf(incoming))
                    );
                    if (!existing) return incoming;
                    return {
                        ...existing.toObject(),
                        ...incoming,
                        fileHistory: existing.fileHistory || [],
                        reviewHistory: existing.reviewHistory || [],
                        reviewStatus: existing.reviewStatus || 'pending',
                        revisionNote: existing.revisionNote || '',
                        reviewedBy: existing.reviewedBy || null,
                        reviewedAt: existing.reviewedAt || null,
                    };
                });
            }

            if (
                updateData.projectName !==
                    undefined &&
                !updateData.projectName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Project name cannot be empty.',
                });
            }

            Object.assign(
                project,
                updateData
            );

            await project.save();

            const updatedProject =
                await Project.findById(
                    project._id
                )
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
                    .populate(
                        'assignedCoordinator',
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
                '❌ Coordinator update project error:',
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
// UPDATE PROJECT STATUS
// ======================================================

router.put(
    '/projects/:projectId/status',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            const {
                status,
            } = req.body;

            const allowedStatuses = [
                'in-progress',
                'completed',
            ];

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project status.',
                });
            }

            const project =
                await Project.findById(
                    projectId
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }

            const previousStatus =
                project.status;

            if (status === 'completed') {
                const checkpoints = project.checkpoints || [];
                const allApproved = checkpoints.length > 0 && checkpoints.every(
                    (item) => item.reviewStatus === 'approved' || item.status === 'approved'
                );
                if (!allApproved) {
                    return res.status(409).json({
                        success: false,
                        message: 'All checkpoints must be approved before completing the project.',
                    });
                }
                project.isDoneAll = true;
            }

            project.status = status;

            await project.save();


            // --------------------------------------------------
            // Project completed notification
            // --------------------------------------------------

            if (
                status === 'completed' &&
                previousStatus !== 'completed'
            ) {
                if (project.createdBy) {
                    await createNotification({
                        recipient:
                            project.createdBy,

                        sender:
                            req.user.mongoId,

                        type:
                            'project-completed',

                        title:
                            'تم إكمال المشروع',

                        message:
                            `تم تحديث حالة المشروع "${project.projectName}" إلى مكتمل.`,

                        project:
                            project._id,

                        link:
                            `/coordinator/projects/${project._id}`,
                    });
                }
            }


            const updatedProject =
                await Project.findById(
                    project._id
                )
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
                    .populate(
                        'assignedCoordinator',
                        'name email role'
                    );

            return res.status(200).json({
                success: true,
                message:
                    'Project status updated successfully.',
                project:
                    updatedProject,
                data:
                    updatedProject,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator project status error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update project status.',
            });
        }
    }
);


// ======================================================
// GET DESIGNERS
// ======================================================
//
// Coordinator can see active designers for assignment.
// ======================================================

router.get(
    [
        '/designers',
        '/presentation-designers',
    ],
    async (req, res) => {
        try {
            const designers =
                await User.find({
                    role: 'designer',
                    status: {
                        $in: [
                            'active',
                            'approved',
                        ],
                    },
                })
                    .select(
                        '_id name email role status'
                    )
                    .sort({
                        name: 1,
                    })
                    .lean();

            return res.status(200).json({
                success: true,
                designers,
                users: designers,
                data: designers,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator get designers error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load designers.',
            });
        }
    }
);


// ======================================================
// ASSIGN MAIN PROJECT DESIGNER
// ======================================================
//
// PUT /projects/:projectId/assign-designer
//
// This assignment is independent from the presentation
// designer assignment.
// ======================================================

router.put(
    '/projects/:projectId/assign-designer',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            const {
                designerId,
            } = req.body;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            if (!isValidObjectId(designerId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid designer ID.',
                });
            }

            const [
                project,
                designer,
            ] = await Promise.all([
                Project.findById(projectId),
                getActiveDesigner(designerId),
            ]);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }

            if (!designer) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Active designer not found.',
                });
            }

            const previousDesigner =
                project.assignedDesigner;

            project.assignedDesigner =
                designer._id;

            project.assignedDesignerId =
                String(designer._id);

            project.assignedDesignerName =
                designer.name;

            await project.save();


            // --------------------------------------------------
            // Notify New Designer
            // --------------------------------------------------

            await createNotification({
                recipient:
                    designer._id,

                sender:
                    req.user.mongoId,

                type:
                    'project-assigned',

                title:
                    'تم تعيين مشروع جديد لك',

                message:
                    `تم تعيينك للعمل على مشروع "${project.projectName}".`,

                project:
                    project._id,

                link:
                    `/designer/projects/${project._id}`,
            });


            const updatedProject =
                await Project.findById(
                    project._id
                )
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
                    .populate(
                        'assignedCoordinator',
                        'name email role'
                    );

            return res.status(200).json({
                success: true,
                message:
                    previousDesigner &&
                    String(previousDesigner) !==
                        String(designer._id)
                        ? 'Project designer reassigned successfully.'
                        : 'Designer assigned successfully.',
                project:
                    updatedProject,
                data:
                    updatedProject,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator assign designer error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to assign designer.',
            });
        }
    }
);


// ======================================================
// REMOVE MAIN PROJECT DESIGNER
// ======================================================

router.put(
    '/projects/:projectId/remove-designer',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            const project =
                await Project.findById(
                    projectId
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }

            project.assignedDesigner =
                null;

            project.assignedDesignerId =
                '';

            project.assignedDesignerName =
                '';

            await project.save();

            return res.status(200).json({
                success: true,
                message:
                    'Project designer removed successfully.',
                project,
                data:
                    project,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator remove designer error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to remove designer.',
            });
        }
    }
);


// ======================================================
// ASSIGN PRESENTATION DESIGNER
// ======================================================
//
// PUT /projects/:projectId/assign-presenter
//
// This designer can be different from the main project
// designer.
// ======================================================

router.put(
    '/projects/:projectId/assign-presenter',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            const {
                designerId,
            } = req.body;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            if (!isValidObjectId(designerId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid designer ID.',
                });
            }

            const [
                project,
                designer,
            ] = await Promise.all([
                Project.findById(projectId),
                getActiveDesigner(designerId),
            ]);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }

            if (!designer) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Active designer not found.',
                });
            }

            const previousPresenter =
                project.assignedPresenter;

            project.assignedPresenter =
                designer._id;

            project.assignedPresenterId =
                String(designer._id);

            project.assignedPresenterName =
                designer.name;

            await project.save();


            // --------------------------------------------------
            // Notify Presentation Designer
            // --------------------------------------------------

            await createNotification({
                recipient:
                    designer._id,

                sender:
                    req.user.mongoId,

                type:
                    'presentation-assigned',

                title:
                    'تم تعيين Presentation جديدة لك',

                message:
                    `تم تعيينك للعمل على Presentation الخاصة بمشروع "${project.projectName}".`,

                project:
                    project._id,

                link:
                    `/designer/projects/${project._id}`,
            });


            const updatedProject =
                await Project.findById(
                    project._id
                )
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
                    .populate(
                        'assignedCoordinator',
                        'name email role'
                    );

            return res.status(200).json({
                success: true,
                message:
                    previousPresenter &&
                    String(previousPresenter) !==
                        String(designer._id)
                        ? 'Presentation designer reassigned successfully.'
                        : 'Presentation designer assigned successfully.',
                project:
                    updatedProject,
                data:
                    updatedProject,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator assign presenter error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to assign presentation designer.',
            });
        }
    }
);


// ======================================================
// REMOVE PRESENTATION DESIGNER
// ======================================================

router.put(
    '/projects/:projectId/remove-presenter',
    async (req, res) => {
        try {
            const {
                projectId,
            } = req.params;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid project ID.',
                });
            }

            const project =
                await Project.findById(
                    projectId
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found.',
                });
            }

            project.assignedPresenter =
                null;

            project.assignedPresenterId =
                '';

            project.assignedPresenterName =
                '';

            await project.save();

            return res.status(200).json({
                success: true,
                message:
                    'Presentation designer removed successfully.',
                project,
                data:
                    project,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator remove presenter error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to remove presentation designer.',
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
            const assignedProjects = await Project.find({
                assignedCoordinator: req.user.mongoId,
            }).select('_id');

            const tasks =
                await Task.find({
                    projectId: { $in: assignedProjects.map((project) => project._id) },
                })
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
                '❌ Coordinator get tasks error:',
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
    '/tasks/:taskId',
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }

            const task =
                await Task.findById(
                    taskId
                )
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
                '❌ Coordinator get task error:',
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
// CREATE TASK
// ======================================================
//
// Coordinator can create tasks.
//
// createdBy ALWAYS comes from req.user.mongoId.
// ======================================================

router.post(
    '/tasks',
    async (req, res) => {
        try {
            const {
                projectId,
                assignedTo,
            } = req.body;

            if (!isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Valid project ID is required.',
                });
            }

            const project =
                await findAssignedProject(
                    projectId,
                    req.user.mongoId
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or not assigned to you.',
                });
            }

            const taskData =
                buildTaskData(
                    req.body
                );

            if (
                !taskData.title ||
                !taskData.title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Task title is required.',
                });
            }

            const task =
                new Task({
                    ...taskData,

                    projectId,

                    createdBy:
                        req.user.mongoId,

                    assignedTo:
                        null,
                });


            // --------------------------------------------------
            // Optional initial assignment
            // --------------------------------------------------

            if (assignedTo) {
                const designer =
                    await getActiveDesigner(
                        assignedTo
                    );

                if (!designer) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'Assigned user must be an active designer.',
                    });
                }

                task.assignedTo =
                    designer._id;
            }


            await task.save();


            // --------------------------------------------------
            // Task assignment notification
            // --------------------------------------------------

            if (task.assignedTo) {
                await createNotification({
                    recipient:
                        task.assignedTo,

                    sender:
                        req.user.mongoId,

                    type:
                        'task-assigned',

                    title:
                        'تم تعيين Task جديدة لك',

                    message:
                        `تم تعيين Task "${task.title}" لك في مشروع "${project.projectName}".`,

                    project:
                        project._id,

                    task:
                        task._id,

                    link:
                        `/designer/tasks/${task._id}`,
                });
            }


            const createdTask =
                await Task.findById(
                    task._id
                )
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

            return res.status(201).json({
                success: true,
                message:
                    'Task created successfully.',
                task:
                    createdTask,
                data:
                    createdTask,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator create task error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to create task.',
            });
        }
    }
);


// ======================================================
// UPDATE TASK
// ======================================================

router.put(
    '/tasks/:taskId',
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }

            const task =
                await Task.findById(
                    taskId
                );

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }

            const updateData =
                buildTaskData(
                    req.body
                );

            if (
                updateData.title !==
                    undefined &&
                !updateData.title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Task title cannot be empty.',
                });
            }


            // --------------------------------------------------
            // Assignment is handled separately.
            // --------------------------------------------------

            Object.assign(
                task,
                updateData
            );

            await task.save();


            const updatedTask =
                await Task.findById(
                    task._id
                )
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


            // --------------------------------------------------
            // Notify assigned designer about task update
            // --------------------------------------------------

            if (
                task.assignedTo
            ) {
                await createNotification({
                    recipient:
                        task.assignedTo,

                    sender:
                        req.user.mongoId,

                    type:
                        'task-updated',

                    title:
                        'تم تحديث Task',

                    message:
                        `تم تحديث Task "${task.title}".`,

                    project:
                        task.projectId,

                    task:
                        task._id,

                    link:
                        `/designer/tasks/${task._id}`,
                });
            }


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
                '❌ Coordinator update task error:',
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
    '/tasks/:taskId',
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }

            const task =
                await Task.findById(
                    taskId
                );

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }

            await Task.findByIdAndDelete(
                taskId
            );

            return res.status(200).json({
                success: true,
                message:
                    'Task deleted successfully.',
                taskId,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator delete task error:',
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
// ASSIGN TASK
// ======================================================

router.put(
    '/tasks/:taskId/assign',
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            const {
                designerId,
            } = req.body;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }

            if (!isValidObjectId(designerId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid designer ID.',
                });
            }

            const [
                task,
                designer,
            ] = await Promise.all([
                Task.findById(taskId)
                    .populate(
                        'projectId',
                        'projectName'
                    ),

                getActiveDesigner(
                    designerId
                ),
            ]);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }

            if (!designer) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Active designer not found.',
                });
            }

            task.assignedTo =
                designer._id;

            await task.save();


            await createNotification({
                recipient:
                    designer._id,

                sender:
                    req.user.mongoId,

                type:
                    'task-assigned',

                title:
                    'تم تعيين Task جديدة لك',

                message:
                    `تم تعيين Task "${task.title}" لك في مشروع "${task.projectId?.projectName || 'Project'}".`,

                project:
                    task.projectId?._id ||
                    null,

                task:
                    task._id,

                link:
                    `/designer/tasks/${task._id}`,
            });


            const updatedTask =
                await Task.findById(
                    task._id
                )
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
                    'Task assigned successfully.',
                task:
                    updatedTask,
                data:
                    updatedTask,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator assign task error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to assign task.',
            });
        }
    }
);


// ======================================================
// REMOVE TASK ASSIGNMENT
// ======================================================

router.put(
    '/tasks/:taskId/remove-assignment',
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }

            const task =
                await Task.findById(
                    taskId
                );

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }

            task.assignedTo =
                null;

            await task.save();

            return res.status(200).json({
                success: true,
                message:
                    'Task assignment removed successfully.',
                task,
                data:
                    task,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator remove task assignment error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to remove task assignment.',
            });
        }
    }
);


// ======================================================
// UPDATE TASK STATUS
// ======================================================

router.put(
    '/tasks/:taskId/status',
    async (req, res) => {
        try {
            const {
                taskId,
            } = req.params;

            const {
                status,
            } = req.body;

            const allowedStatuses = [
                'pending',
                'in-progress',
                'completed',
            ];

            if (!isValidObjectId(taskId)) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task ID.',
                });
            }

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid task status.',
                });
            }

            const task =
                await Task.findById(
                    taskId
                );

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }

            task.status =
                status;

            await task.save();


            if (task.assignedTo) {
                await createNotification({
                    recipient:
                        task.assignedTo,

                    sender:
                        req.user.mongoId,

                    type:
                        'task-updated',

                    title:
                        'تم تحديث حالة Task',

                    message:
                        `تم تغيير حالة Task "${task.title}" إلى ${status}.`,

                    project:
                        task.projectId,

                    task:
                        task._id,

                    link:
                        `/designer/tasks/${task._id}`,
                });
            }


            const updatedTask =
                await Task.findById(
                    task._id
                )
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
                    'Task status updated successfully.',
                task:
                    updatedTask,
                data:
                    updatedTask,
            });
        } catch (error) {
            console.error(
                '❌ Coordinator task status error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update task status.',
            });
        }
    }
);



// ======================================================
// CHECKPOINT WORKFLOW (Coordinator only)
// ======================================================

router.post('/projects/:projectId/checkpoints', async (req, res) => {
    try {
        const { title, note = '', description = '' } = req.body || {};
        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Checkpoint title is required.' });
        }
        const project = req.coordinatorProject;
        if (project.isDoneAll) {
            return res.status(409).json({ success: false, message: 'Checkpoints are locked after Done All.' });
        }

        project.checkpoints.push({
            title: title.trim(),
            note: String(note || description || '').trim(),
            status: 'pending', // legacy compatibility
            reviewStatus: 'pending',
            isCompleted: false,
            fileHistory: [],
            reviewHistory: [],
        });
        await project.save();

        const checkpoint = project.checkpoints[project.checkpoints.length - 1];
        const designerId = project.assignedDesigner;
        if (designerId) {
            await createNotification({
                recipient: designerId,
                sender: req.user.mongoId,
                type: 'checkpoint-created',
                title: 'تمت إضافة Checkpoint جديدة',
                message: `تمت إضافة المرحلة "${checkpoint.title}" إلى مشروع "${project.projectName}".`,
                project: project._id,
                link: `/designer/projects/${project._id}`,
            });
        }

        return res.status(201).json({ success: true, message: 'Checkpoint created successfully.', checkpoint, checkpoints: project.checkpoints, project });
    } catch (error) {
        console.error('Coordinator create checkpoint error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create checkpoint.' });
    }
});

router.put('/projects/:projectId/checkpoints/:checkpointId/review', async (req, res) => {
    try {
        const { checkpointId } = req.params;
        const { action, revisionNote = '' } = req.body || {};
        const project = req.coordinatorProject;

        if (project.isDoneAll) {
            return res.status(409).json({ success: false, message: 'Checkpoints are locked after Done All.' });
        }

        const checkpoint = project.checkpoints.id(checkpointId) ||
            project.checkpoints.find((item) => String(item.id || '') === String(checkpointId));
        if (!checkpoint) return res.status(404).json({ success: false, message: 'Checkpoint not found.' });

        const hasSubmission = Boolean(checkpoint.fileUrl || checkpoint.imageLink);
        if (!hasSubmission) {
            return res.status(409).json({ success: false, message: 'There is no submitted file to review.' });
        }

        if (!['approve', 'request_revision'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be approve or request_revision.' });
        }
        if (action === 'request_revision' && !String(revisionNote).trim()) {
            return res.status(400).json({ success: false, message: 'Revision instructions are required.' });
        }

        const now = new Date();
        const reviewEntry = {
            action,
            note: action === 'request_revision' ? String(revisionNote).trim() : '',
            reviewedBy: req.user.mongoId,
            reviewedAt: now,
        };
        checkpoint.reviewHistory = checkpoint.reviewHistory || [];
        checkpoint.reviewHistory.push(reviewEntry);
        checkpoint.reviewedBy = req.user.mongoId;
        checkpoint.reviewedAt = now;

        if (action === 'approve') {
            checkpoint.reviewStatus = 'approved';
            checkpoint.status = 'approved'; // legacy clients
            checkpoint.isCompleted = true;
            checkpoint.revisionNote = '';
        } else {
            checkpoint.reviewStatus = 'revision_requested';
            checkpoint.status = 'revision_requested'; // legacy clients
            checkpoint.isCompleted = false;
            checkpoint.revisionNote = String(revisionNote).trim();
        }

        await project.save();
        if (project.assignedDesigner) {
            await createNotification({
                recipient: project.assignedDesigner,
                sender: req.user.mongoId,
                type: action === 'approve' ? 'checkpoint-approved' : 'checkpoint-revision-requested',
                title: action === 'approve' ? 'تم اعتماد Checkpoint' : 'مطلوب تعديل Checkpoint',
                message: action === 'approve' ? `تم اعتماد المرحلة "${checkpoint.title}".` : `مطلوب تعديل المرحلة "${checkpoint.title}": ${checkpoint.revisionNote}`,
                project: project._id,
                link: `/designer/projects/${project._id}`,
            });
        }
        return res.status(200).json({ success: true, message: action === 'approve' ? 'Checkpoint approved.' : 'Revision requested.', checkpoint, checkpoints: project.checkpoints, project });
    } catch (error) {
        console.error('Coordinator checkpoint review error:', error);
        return res.status(500).json({ success: false, message: 'Failed to review checkpoint.' });
    }
});

router.put('/projects/:projectId/done-all', async (req, res) => {
    try {
        const project = req.coordinatorProject;
        const checkpoints = project.checkpoints || [];
        if (checkpoints.length === 0) return res.status(400).json({ success: false, message: 'Add at least one checkpoint before Done All.' });

        const allApproved = checkpoints.every((item) => item.reviewStatus === 'approved' || item.status === 'approved');
        if (!allApproved) {
            return res.status(409).json({
                success: false,
                message: 'All checkpoints must be approved before starting rendering.',
                pendingCheckpoints: checkpoints.filter((item) => !(item.reviewStatus === 'approved' || item.status === 'approved')).map((item) => ({ id: item._id, title: item.title, reviewStatus: item.reviewStatus || item.status || 'pending' })),
            });
        }
        project.isDoneAll = true;
        await project.save();
        if (project.assignedDesigner) {
            await createNotification({ recipient: project.assignedDesigner, sender: req.user.mongoId, type: 'rendering-unlocked', title: 'بدأت مرحلة الـ Rendering', message: `تم اعتماد جميع Checkpoints في مشروع "${project.projectName}". يمكنك الآن رفع ملف Render.`, project: project._id, link: `/designer/projects/${project._id}` });
        }
        return res.status(200).json({ success: true, message: 'All checkpoints approved. Rendering stage is now unlocked.', isDoneAll: true, project });
    } catch (error) {
        console.error('Coordinator done all error:', error);
        return res.status(500).json({ success: false, message: 'Failed to complete checkpoints.' });
    }
});


module.exports = router;