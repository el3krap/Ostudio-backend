// backend/routes/manager.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

const {
    authenticateUser,
    requireManager,
} = require('../middleware/authMiddleware');


// ======================================================
// Middleware
// ======================================================

router.use(
    authenticateUser,
    requireManager
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


function buildProjectData(body = {}) {
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
            data.status =
                body.status;
        }
    }

    return data;
}


function buildTaskData(body = {}) {
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
            data.status =
                body.status;
        }
    }

    return data;
}


async function getActiveDesigner(
    designerId
) {
    if (
        !isValidObjectId(
            designerId
        )
    ) {
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


async function notifyUser({
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
            '⚠️ Manager notification error:',
            error.message
        );

        return null;
    }
}


async function notifyCoordinators({
    project,
    sender,
    title,
    message,
}) {
    try {
        const coordinators =
            await User.find({
                role: 'coordinator',

                status: {
                    $in: [
                        'active',
                        'approved',
                    ],
                },
            }).select('_id');


        if (
            !coordinators.length
        ) {
            return;
        }


        const notifications =
            coordinators.map(
                (coordinator) => ({
                    recipient:
                        coordinator._id,

                    sender,

                    type:
                        'project-created',

                    title,

                    message,

                    project:
                        project._id,

                    link:
                        `/coordinator/projects/${project._id}`,

                    isRead:
                        false,
                })
            );


        await Notification.insertMany(
            notifications
        );

    } catch (error) {
        console.error(
            '⚠️ Coordinator notification error:',
            error.message
        );
    }
}


// ======================================================
// DASHBOARD
// ======================================================

router.get(
    '/dashboard',
    async (req, res) => {
        try {

            const [
                totalProjects,
                completedProjects,
                inProgressProjects,
                pendingProjects,
                projectsWithDeadline,
                overdueProjects,
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks,
            ] = await Promise.all([
                Project.countDocuments({}),

                Project.countDocuments({
                    status:
                        'completed',
                }),

                Project.countDocuments({
                    status:
                        'in-progress',
                }),

                Project.countDocuments({
                    status:
                        'in-progress',
                }),

                Project.countDocuments({
                    deadline: {
                        $ne: null,
                    },
                }),

                Project.countDocuments({
                    deadline: {
                        $lt: new Date(),
                    },

                    status: {
                        $ne: 'completed',
                    },
                }),

                Task.countDocuments({}),

                Task.countDocuments({
                    status:
                        'completed',
                }),

                Task.countDocuments({
                    status:
                        'pending',
                }),

                Task.countDocuments({
                    status:
                        'in-progress',
                }),
            ]);


            return res.status(200).json({
                success: true,

                stats: {
                    totalProjects,
                    completedProjects,
                    inProgressProjects,
                    pendingProjects,

                    projectsWithDeadline,
                    overdueProjects,

                    totalTasks,
                    completedTasks,
                    pendingTasks,
                    inProgressTasks,
                },
            });

        } catch (error) {

            console.error(
                '❌ Manager dashboard error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load manager dashboard.',
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
                '❌ Manager get projects error:',
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


            if (
                !isValidObjectId(
                    projectId
                )
            ) {
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
                '❌ Manager get project error:',
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
// CREATE PROJECT
// ======================================================
//
// Manager can create projects.
//
// createdBy is ALWAYS taken from req.user.mongoId.
// ======================================================

router.post(
    '/projects',
    async (req, res) => {
        try {

            const projectData =
                buildProjectData(
                    req.body
                );


            if (
                !projectData.projectName ||
                !projectData.projectName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Project name is required.',
                });
            }


            const project =
                new Project({
                    ...projectData,

                    createdBy:
                        req.user.mongoId,
                });


            // --------------------------------------------------
            // Optional initial designer assignment
            // --------------------------------------------------

            if (
                req.body.assignedDesigner
            ) {
                const designer =
                    await getActiveDesigner(
                        req.body.assignedDesigner
                    );

                if (!designer) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'Invalid or inactive main designer.',
                    });
                }

                project.assignedDesigner =
                    designer._id;

                project.assignedDesignerId =
                    String(
                        designer._id
                    );

                project.assignedDesignerName =
                    designer.name;
            }


            // --------------------------------------------------
            // Optional initial presenter assignment
            // --------------------------------------------------

            if (
                req.body.assignedPresenter
            ) {
                const presenter =
                    await getActiveDesigner(
                        req.body.assignedPresenter
                    );

                if (!presenter) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'Invalid or inactive presentation designer.',
                    });
                }

                project.assignedPresenter =
                    presenter._id;

                project.assignedPresenterId =
                    String(
                        presenter._id
                    );

                project.assignedPresenterName =
                    presenter.name;
            }


            await project.save();


            // --------------------------------------------------
            // Notify Coordinators
            // --------------------------------------------------

            await notifyCoordinators({
                project,

                sender:
                    req.user.mongoId,

                title:
                    'مشروع جديد',

                message:
                    `${req.user.name || 'Manager'} أنشأ مشروعًا جديدًا: "${project.projectName}".`,
            });


            // --------------------------------------------------
            // Notify Main Designer
            // --------------------------------------------------

            if (
                project.assignedDesigner
            ) {
                await notifyUser({
                    recipient:
                        project.assignedDesigner,

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
            }


            // --------------------------------------------------
            // Notify Presentation Designer
            // --------------------------------------------------

            if (
                project.assignedPresenter
            ) {
                await notifyUser({
                    recipient:
                        project.assignedPresenter,

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
            }


            const createdProject =
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
                    );


            return res.status(201).json({
                success: true,

                message:
                    'Project created successfully.',

                project:
                    createdProject,

                data:
                    createdProject,
            });

        } catch (error) {

            console.error(
                '❌ Manager create project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to create project.',
            });
        }
    }
);


// ======================================================
// UPDATE PROJECT
// ======================================================

router.put(
    '/projects/:projectId',
    async (req, res) => {
        try {

            const {
                projectId,
            } = req.params;


            if (
                !isValidObjectId(
                    projectId
                )
            ) {
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
                buildProjectData(
                    req.body
                );


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


            // --------------------------------------------------
            // Optional main designer assignment
            // --------------------------------------------------

            if (
                req.body.assignedDesigner !==
                undefined
            ) {
                if (
                    req.body.assignedDesigner
                ) {
                    const designer =
                        await getActiveDesigner(
                            req.body.assignedDesigner
                        );

                    if (!designer) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'Invalid or inactive main designer.',
                        });
                    }

                    project.assignedDesigner =
                        designer._id;

                    project.assignedDesignerId =
                        String(
                            designer._id
                        );

                    project.assignedDesignerName =
                        designer.name;

                } else {
                    project.assignedDesigner =
                        null;

                    project.assignedDesignerId =
                        '';

                    project.assignedDesignerName =
                        '';
                }
            }


            // --------------------------------------------------
            // Optional presentation designer assignment
            // --------------------------------------------------

            if (
                req.body.assignedPresenter !==
                undefined
            ) {
                if (
                    req.body.assignedPresenter
                ) {
                    const presenter =
                        await getActiveDesigner(
                            req.body.assignedPresenter
                        );

                    if (!presenter) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'Invalid or inactive presentation designer.',
                        });
                    }

                    project.assignedPresenter =
                        presenter._id;

                    project.assignedPresenterId =
                        String(
                            presenter._id
                        );

                    project.assignedPresenterName =
                        presenter.name;

                } else {
                    project.assignedPresenter =
                        null;

                    project.assignedPresenterId =
                        '';

                    project.assignedPresenterName =
                        '';
                }
            }


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
                '❌ Manager update project error:',
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
    '/projects/:projectId',
    async (req, res) => {
        try {

            const {
                projectId,
            } = req.params;


            if (
                !isValidObjectId(
                    projectId
                )
            ) {
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


            await Project.findByIdAndDelete(
                projectId
            );


            return res.status(200).json({
                success: true,

                message:
                    'Project deleted successfully.',

                projectId,
            });

        } catch (error) {

            console.error(
                '❌ Manager delete project error:',
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


            project.status =
                status;


            if (
                status === 'completed'
            ) {
                project.isDoneAll =
                    true;
            }


            await project.save();


            // --------------------------------------------------
            // Notify assigned users
            // --------------------------------------------------

            const recipients = [];


            if (
                project.assignedDesigner
            ) {
                recipients.push({
                    id:
                        project.assignedDesigner,

                    title:
                        'تم تحديث حالة المشروع',

                    type:
                        status === 'completed'
                            ? 'project-completed'
                            : 'project-updated',
                });
            }


            if (
                project.assignedPresenter &&
                String(
                    project.assignedPresenter
                ) !==
                    String(
                        project.assignedDesigner
                    )
            ) {
                recipients.push({
                    id:
                        project.assignedPresenter,

                    title:
                        'تم تحديث حالة المشروع',

                    type:
                        status === 'completed'
                            ? 'project-completed'
                            : 'project-updated',
                });
            }


            for (
                const recipient of recipients
            ) {
                await notifyUser({
                    recipient:
                        recipient.id,

                    sender:
                        req.user.mongoId,

                    type:
                        recipient.type,

                    title:
                        recipient.title,

                    message:
                        `تم تغيير حالة مشروع "${project.projectName}" إلى ${status}.`,

                    project:
                        project._id,

                    link:
                        `/designer/projects/${project._id}`,
                });
            }


            // Avoid unused variable warning in
            // environments enforcing no-unused-vars.
            void previousStatus;


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
                '❌ Manager project status error:',
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
// DESIGNERS
// ======================================================


// ======================================================
// GET DESIGNERS
// ======================================================

router.get(
    '/designers',
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

                users:
                    designers,

                data:
                    designers,
            });

        } catch (error) {

            console.error(
                '❌ Manager get designers error:',
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
// GET SINGLE DESIGNER
// ======================================================

router.get(
    '/designers/:designerId',
    async (req, res) => {
        try {

            const {
                designerId,
            } = req.params;


            if (
                !isValidObjectId(
                    designerId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid designer ID.',
                });
            }


            const designer =
                await User.findOne({
                    _id: designerId,

                    role: 'designer',
                })
                    .select(
                        '_id name email role status createdAt'
                    );


            if (!designer) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Designer not found.',
                });
            }


            return res.status(200).json({
                success: true,

                designer,

                user:
                    designer,

                data:
                    designer,
            });

        } catch (error) {

            console.error(
                '❌ Manager get designer error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load designer.',
            });
        }
    }
);


// ======================================================
// ASSIGN MAIN DESIGNER
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


            if (
                !isValidObjectId(
                    projectId
                )
            ) {
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


            const designer =
                await getActiveDesigner(
                    designerId
                );


            if (!designer) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Active designer not found.',
                });
            }


            project.assignedDesigner =
                designer._id;

            project.assignedDesignerId =
                String(
                    designer._id
                );

            project.assignedDesignerName =
                designer.name;


            await project.save();


            await notifyUser({
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
                    );


            return res.status(200).json({
                success: true,

                message:
                    'Designer assigned successfully.',

                project:
                    updatedProject,

                data:
                    updatedProject,
            });

        } catch (error) {

            console.error(
                '❌ Manager assign designer error:',
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
// REMOVE MAIN DESIGNER
// ======================================================

router.put(
    '/projects/:projectId/remove-designer',
    async (req, res) => {
        try {

            const {
                projectId,
            } = req.params;


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
                    'Designer removed successfully.',

                project,
                data:
                    project,
            });

        } catch (error) {

            console.error(
                '❌ Manager remove designer error:',
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


            const presenter =
                await getActiveDesigner(
                    designerId
                );


            if (!presenter) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Active presentation designer not found.',
                });
            }


            project.assignedPresenter =
                presenter._id;

            project.assignedPresenterId =
                String(
                    presenter._id
                );

            project.assignedPresenterName =
                presenter.name;


            await project.save();


            await notifyUser({
                recipient:
                    presenter._id,

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
                    );


            return res.status(200).json({
                success: true,

                message:
                    'Presentation designer assigned successfully.',

                project:
                    updatedProject,

                data:
                    updatedProject,
            });

        } catch (error) {

            console.error(
                '❌ Manager assign presenter error:',
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
                '❌ Manager remove presenter error:',
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

                data:
                    tasks,
            });

        } catch (error) {

            console.error(
                '❌ Manager get tasks error:',
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


            if (
                !isValidObjectId(
                    taskId
                )
            ) {
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
                data:
                    task,
            });

        } catch (error) {

            console.error(
                '❌ Manager get task error:',
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

router.post(
    '/tasks',
    async (req, res) => {
        try {

            const {
                projectId,
                assignedTo,
            } = req.body;


            if (
                !isValidObjectId(
                    projectId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Valid project ID is required.',
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
            // Notify Designer
            // --------------------------------------------------

            if (
                task.assignedTo
            ) {
                await notifyUser({
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
                '❌ Manager create task error:',
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


            if (
                !isValidObjectId(
                    taskId
                )
            ) {
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


            Object.assign(
                task,
                updateData
            );


            if (
                req.body.assignedTo !==
                undefined
            ) {
                if (
                    req.body.assignedTo
                ) {
                    const designer =
                        await getActiveDesigner(
                            req.body.assignedTo
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

                } else {
                    task.assignedTo =
                        null;
                }
            }


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


            if (
                task.assignedTo
            ) {
                await notifyUser({
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
                '❌ Manager update task error:',
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


            if (
                !isValidObjectId(
                    taskId
                )
            ) {
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
                '❌ Manager delete task error:',
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


            if (
                !isValidObjectId(
                    taskId
                )
            ) {
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
                        'projectName'
                    );


            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found.',
                });
            }


            const designer =
                await getActiveDesigner(
                    designerId
                );


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


            await notifyUser({
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
                '❌ Manager assign task error:',
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


            if (
                !isValidObjectId(
                    taskId
                )
            ) {
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
                '❌ Manager remove task assignment error:',
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


            if (
                task.assignedTo
            ) {
                await notifyUser({
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
                '❌ Manager task status error:',
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
// EXPORT
// ======================================================

module.exports = router;