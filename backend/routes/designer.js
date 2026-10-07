// backend/routes/designer.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

const {
    authenticateUser,
    requireDesigner,
} = require('../middleware/authMiddleware');


// ======================================================
// Middleware
// ======================================================

router.use(
    authenticateUser,
    requireDesigner
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


function buildTaskUpdate(body = {}) {
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


function buildCheckpointUpdate(checkpoint = {}) {
    return {
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
    };
}


function createNotification({
    recipient,
    sender,
    type,
    title,
    message,
    project = null,
    task = null,
    link = '',
}) {
    return Notification.create({
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
}


// ======================================================
// PROJECT ACCESS HELPERS
// ======================================================
//
// A Designer can access a project only if they are:
//
// 1. Main assigned designer
// OR
// 2. Presentation designer
//
// ======================================================

function designerProjectFilter(designerId) {
    return {
        $or: [
            {
                assignedDesigner:
                    designerId,
            },
            {
                assignedPresenter:
                    designerId,
            },
        ],
    };
}


async function findDesignerProject(
    projectId,
    designerId
) {
    if (
        !isValidObjectId(projectId)
    ) {
        return null;
    }

    return Project.findOne({
        _id: projectId,
        ...designerProjectFilter(
            designerId
        ),
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
        );
}


// ======================================================
// DASHBOARD
// ======================================================

router.get(
    '/dashboard',
    async (req, res) => {
        try {

            const designerId =
                req.user.mongoId;


            const projectFilter =
                designerProjectFilter(
                    designerId
                );


            const [
                totalProjects,
                completedProjects,
                activeProjects,
                assignedTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks,
            ] = await Promise.all([
                Project.countDocuments(
                    projectFilter
                ),

                Project.countDocuments({
                    ...projectFilter,
                    status: 'completed',
                }),

                Project.countDocuments({
                    ...projectFilter,
                    status: 'in-progress',
                }),

                Task.countDocuments({
                    assignedTo:
                        designerId,
                }),

                Task.countDocuments({
                    assignedTo:
                        designerId,
                    status:
                        'completed',
                }),

                Task.countDocuments({
                    assignedTo:
                        designerId,
                    status:
                        'pending',
                }),

                Task.countDocuments({
                    assignedTo:
                        designerId,
                    status:
                        'in-progress',
                }),
            ]);


            return res.status(200).json({
                success: true,

                stats: {
                    totalProjects,
                    completedProjects,
                    activeProjects,

                    assignedTasks,
                    completedTasks,
                    pendingTasks,
                    inProgressTasks,
                },
            });

        } catch (error) {

            console.error(
                '❌ Designer dashboard error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load designer dashboard.',
            });
        }
    }
);


// ======================================================
// GET MY PROJECTS
// ======================================================
//
// IMPORTANT:
// Designer sees ONLY explicitly assigned projects.
// ======================================================

router.get(
    '/projects',
    async (req, res) => {
        try {

            const projects =
                await Project.find(
                    designerProjectFilter(
                        req.user.mongoId
                    )
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
                    .sort({
                        createdAt: -1,
                    })
                    .lean();


            return res.status(200).json({
                success: true,

                projects,

                data:
                    projects,
            });

        } catch (error) {

            console.error(
                '❌ Designer get projects error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load assigned projects.',
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


            const project =
                await findDesignerProject(
                    projectId,
                    req.user.mongoId
                );


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you are not assigned to it.',
                });
            }


            return res.status(200).json({
                success: true,

                project,

                data:
                    project,
            });

        } catch (error) {

            console.error(
                '❌ Designer get project error:',
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
// UPDATE PROJECT WORK
// ======================================================
//
// Designer can update only work-related fields.
//
// The designer CANNOT change:
//
// - createdBy
// - assignedDesigner
// - assignedPresenter
// - managerNotes
// - coordinatorNotes
// - presentation approval
//
// ======================================================

router.put(
    '/projects/:projectId',
    async (req, res) => {
        try {

            const {
                projectId,
            } = req.params;


            const project =
                await findDesignerProject(
                    projectId,
                    req.user.mongoId
                );


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you are not assigned to it.',
                });
            }


            const isMainDesigner =
                project.assignedDesigner &&
                String(
                    project.assignedDesigner._id ||
                    project.assignedDesigner
                ) ===
                    String(
                        req.user.mongoId
                    );


            const isPresentationDesigner =
                project.assignedPresenter &&
                String(
                    project.assignedPresenter._id ||
                    project.assignedPresenter
                ) ===
                    String(
                        req.user.mongoId
                    );


            // --------------------------------------------------
            // Main Designer fields
            // --------------------------------------------------

            if (
                isMainDesigner &&
                Array.isArray(
                    req.body.checkpoints
                )
            ) {
                project.checkpoints =
                    req.body.checkpoints.map(
                        buildCheckpointUpdate
                    );
            }


            if (
                isMainDesigner &&
                req.body.renderFileLink !==
                    undefined
            ) {
                project.renderFileLink =
                    String(
                        req.body.renderFileLink
                    );
            }


            if (
                isMainDesigner &&
                req.body.renderFileName !==
                    undefined
            ) {
                project.renderFileName =
                    String(
                        req.body.renderFileName
                    );
            }


            if (
                isMainDesigner &&
                req.body.renderStatus !==
                    undefined
            ) {
                project.renderStatus =
                    String(
                        req.body.renderStatus
                    );
            }


            // --------------------------------------------------
            // Presentation Designer fields
            // --------------------------------------------------

            if (
                isPresentationDesigner &&
                req.body.presentationFileLink !==
                    undefined
            ) {
                project.presentationFileLink =
                    String(
                        req.body.presentationFileLink
                    );
            }


            if (
                isPresentationDesigner &&
                req.body.presentationFileName !==
                    undefined
            ) {
                project.presentationFileName =
                    String(
                        req.body.presentationFileName
                    );
            }


            if (
                isPresentationDesigner &&
                req.body.presenterNote !==
                    undefined
            ) {
                project.presenterNote =
                    String(
                        req.body.presenterNote
                    );
            }


            // --------------------------------------------------
            // Completion
            // --------------------------------------------------

            if (
                isMainDesigner &&
                req.body.isDoneAll !==
                    undefined
            ) {
                project.isDoneAll =
                    Boolean(
                        req.body.isDoneAll
                    );
            }


            await project.save();


            const updatedProject =
                await findDesignerProject(
                    projectId,
                    req.user.mongoId
                );


            // --------------------------------------------------
            // Notify Project Creator
            // --------------------------------------------------

            if (
                project.createdBy &&
                project.createdBy._id
            ) {
                await createNotification({
                    recipient:
                        project.createdBy._id,

                    sender:
                        req.user.mongoId,

                    type:
                        'project-updated',

                    title:
                        'تم تحديث المشروع',

                    message:
                        `تم تحديث بيانات العمل في مشروع "${project.projectName}".`,

                    project:
                        project._id,

                    link:
                        `/manager/projects/${project._id}`,
                });
            }


            return res.status(200).json({
                success: true,

                message:
                    'Project work updated successfully.',

                project:
                    updatedProject,

                data:
                    updatedProject,
            });

        } catch (error) {

            console.error(
                '❌ Designer update project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update project work.',
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
                await findDesignerProject(
                    projectId,
                    req.user.mongoId
                );


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you are not assigned to it.',
                });
            }


            // Only main designer can mark the main
            // project completed.
            const isMainDesigner =
                project.assignedDesigner &&
                String(
                    project.assignedDesigner._id ||
                    project.assignedDesigner
                ) ===
                    String(
                        req.user.mongoId
                    );


            if (!isMainDesigner) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Only the main project designer can change the project status.',
                });
            }


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
            // Notify Project Creator
            // --------------------------------------------------

            if (
                project.createdBy &&
                project.createdBy._id
            ) {
                await createNotification({
                    recipient:
                        project.createdBy._id,

                    sender:
                        req.user.mongoId,

                    type:
                        status === 'completed'
                            ? 'project-completed'
                            : 'project-updated',

                    title:
                        status === 'completed'
                            ? 'تم إكمال المشروع'
                            : 'تم تحديث حالة المشروع',

                    message:
                        status === 'completed'
                            ? `تم إكمال مشروع "${project.projectName}".`
                            : `تم تحديث حالة مشروع "${project.projectName}".`,

                    project:
                        project._id,

                    link:
                        `/manager/projects/${project._id}`,
                });
            }


            const updatedProject =
                await findDesignerProject(
                    projectId,
                    req.user.mongoId
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
                '❌ Designer project status error:',
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
// PRESENTATION APPROVAL STATUS
// ======================================================
//
// Designer can submit/update presentation files,
// but cannot approve their own presentation.
//
// Therefore approval is NOT accepted here.
// ======================================================


// ======================================================
// TASKS
// ======================================================


// ======================================================
// GET MY TASKS
// ======================================================
//
// Designer gets ONLY tasks where:
//
// assignedTo = req.user.mongoId
//
// ======================================================

router.get(
    '/tasks',
    async (req, res) => {
        try {

            const tasks =
                await Task.find({
                    assignedTo:
                        req.user.mongoId,
                })
                    .populate(
                        'projectId',
                        'projectName status deadline'
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
                '❌ Designer get tasks error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load assigned tasks.',
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
                await Task.findOne({
                    _id: taskId,

                    assignedTo:
                        req.user.mongoId,
                })
                    .populate(
                        'projectId',
                        'projectName status deadline'
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
                        'Task not found or it is not assigned to you.',
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
                '❌ Designer get task error:',
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
// UPDATE MY TASK
// ======================================================
//
// Designer can update ONLY a Task assigned to them.
//
// They cannot change:
// - projectId
// - createdBy
// - assignedTo
//
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
                await Task.findOne({
                    _id: taskId,

                    assignedTo:
                        req.user.mongoId,
                });


            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found or it is not assigned to you.',
                });
            }


            const updateData =
                buildTaskUpdate(
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


            Object.assign(
                task,
                updateData
            );


            await task.save();


            // --------------------------------------------------
            // Notify Task Creator
            // --------------------------------------------------

            if (
                task.createdBy
            ) {
                await createNotification({
                    recipient:
                        task.createdBy,

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
                        `/coordinator/tasks/${task._id}`,
                });
            }


            const updatedTask =
                await Task.findById(
                    task._id
                )
                    .populate(
                        'projectId',
                        'projectName status deadline'
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
                '❌ Designer update task error:',
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
// UPDATE MY TASK STATUS
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
                await Task.findOne({
                    _id: taskId,

                    assignedTo:
                        req.user.mongoId,
                });


            if (!task) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found or it is not assigned to you.',
                });
            }


            task.status =
                status;


            await task.save();


            // --------------------------------------------------
            // Notify Task Creator
            // --------------------------------------------------

            if (
                task.createdBy
            ) {
                await createNotification({
                    recipient:
                        task.createdBy,

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
                        `/coordinator/tasks/${task._id}`,
                });
            }


            const updatedTask =
                await Task.findById(
                    task._id
                )
                    .populate(
                        'projectId',
                        'projectName status deadline'
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
                '❌ Designer task status error:',
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