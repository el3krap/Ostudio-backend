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
// GET ALL PROJECTS
// ======================================================
//
// Coordinator can see ALL projects.
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

            project.status = status;

            if (
                status === 'completed'
            ) {
                project.isDoneAll = true;
            }

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


module.exports = router;