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

    // Designer may submit files and work notes for their assigned task.
    // Task title, description, deadline, assignment, and status are
    // controlled by the Coordinator / authorized managers.
    if (body.fileLink !== undefined) {
        data.fileLink = String(body.fileLink).trim();
    }

    if (body.fileName !== undefined) {
        data.fileName = String(body.fileName).trim();
    }

    if (body.notes !== undefined) {
        data.notes = String(body.notes);
    }

    return data;
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
        )
        .populate(
            'assignedCoordinator',
            'name email role'
        );
}


async function isTaskProjectAssignedToDesigner(task, designerId) {
    const projectId =
        task?.projectId?._id ||
        task?.projectId;

    if (!projectId || !isValidObjectId(projectId)) {
        return false;
    }

    const project = await Project.exists({
        _id: projectId,
        ...designerProjectFilter(designerId),
    });

    return Boolean(project);
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

            const assignedProjectIds =
                await Project.distinct(
                    '_id',
                    projectFilter
                );

            const taskScope = {
                assignedTo: designerId,
                projectId: {
                    $in: assignedProjectIds,
                },
            };

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

                Task.countDocuments(taskScope),

                Task.countDocuments({
                    ...taskScope,
                    status: 'completed',
                }),

                Task.countDocuments({
                    ...taskScope,
                    status: 'pending',
                }),

                Task.countDocuments({
                    ...taskScope,
                    status: 'in-progress',
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
// CHECKPOINT FILE ACCESS
// ======================================================
//
// Designers may upload/re-upload files for existing checkpoints.
// They cannot create/delete checkpoints, change titles/notes,
// or change isCompleted. Those actions belong to the Coordinator.
//
// ======================================================

router.get(
    '/projects/:projectId/checkpoints',
    async (req, res) => {
        try {
            const project = await findDesignerProject(
                req.params.projectId,
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
                String(
                    project.assignedDesigner?._id ||
                    project.assignedDesigner || ''
                ) === String(req.user.mongoId);

            if (!isMainDesigner) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Only the main project designer can access checkpoint uploads.',
                });
            }

            return res.status(200).json({
                success: true,
                checkpoints: project.checkpoints || [],
                data: project.checkpoints || [],
            });
        } catch (error) {
            console.error('Designer get checkpoints error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to load checkpoints.',
            });
        }
    }
);


router.put(
    '/projects/:projectId/checkpoints/:checkpointId',
    async (req, res) => {
        try {
            const { projectId, checkpointId } = req.params;

            const project = await findDesignerProject(
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
                String(
                    project.assignedDesigner?._id ||
                    project.assignedDesigner || ''
                ) === String(req.user.mongoId);

            if (!isMainDesigner) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Only the main project designer can upload checkpoint files.',
                });
            }

            const checkpoint = (project.checkpoints || []).find((item) =>
                String(item._id || '') === String(checkpointId) ||
                String(item.id || '') === String(checkpointId)
            );

            if (!checkpoint) {
                return res.status(404).json({
                    success: false,
                    message: 'Checkpoint not found.',
                });
            }

            if (project.isDoneAll || (checkpoint.reviewStatus === 'approved' || checkpoint.status === 'approved' || checkpoint.isCompleted)) {
                return res.status(409).json({
                    success: false,
                    message: 'This checkpoint is approved and locked. Ask the Coordinator to reopen it before uploading again.',
                });
            }

            const allowedFileFields = [
                'fileUrl',
                'imageLink',
                'fileName',
            ];

            const providedFields = allowedFileFields.filter(
                (field) => req.body[field] !== undefined
            );

            if (providedFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Provide fileUrl, imageLink, or fileName to update the checkpoint file.',
                });
            }

            // Snapshot the current version before applying the incoming upload.
            const previousCurrent = {
                fileUrl: checkpoint.fileUrl || '',
                imageLink: checkpoint.imageLink || '',
                fileName: checkpoint.fileName || '',
                uploadedBy: checkpoint.uploadedBy || null,
                uploadedAt: checkpoint.uploadedAt || null,
            };

            // Apply incoming file metadata before validating the submission.
            for (const field of providedFields) {
                checkpoint[field] =
                    typeof req.body[field] === 'string'
                        ? req.body[field].trim()
                        : '';
            }

            if (!checkpoint.imageLink && !checkpoint.fileUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'A checkpoint image or file URL is required.',
                });
            }

            const now = new Date();
            checkpoint.fileHistory = checkpoint.fileHistory || [];

            // Preserve a legacy current file if it has never been recorded.
            const previousUrl = previousCurrent.fileUrl || previousCurrent.imageLink || '';
            const previousName = previousCurrent.fileName || '';
            const lastHistoryEntry = checkpoint.fileHistory[
                checkpoint.fileHistory.length - 1
            ];

            const previousAlreadyRecorded = Boolean(
                lastHistoryEntry &&
                (lastHistoryEntry.fileUrl || lastHistoryEntry.imageLink) === previousUrl &&
                String(lastHistoryEntry.fileName || '') === previousName
            );

            if (previousUrl && !previousAlreadyRecorded) {
                checkpoint.fileHistory.push({
                    fileUrl: previousCurrent.fileUrl,
                    imageLink: previousCurrent.imageLink,
                    fileName: previousCurrent.fileName,
                    uploadedBy: previousCurrent.uploadedBy,
                    uploadedAt: previousCurrent.uploadedAt,
                });
            }

            // Record every successful upload, including the first upload.
            checkpoint.uploadedBy = req.user.mongoId;
            checkpoint.uploadedAt = now;
            checkpoint.fileHistory.push({
                fileUrl: checkpoint.fileUrl || '',
                imageLink: checkpoint.imageLink || '',
                fileName: checkpoint.fileName || '',
                uploadedBy: req.user.mongoId,
                uploadedAt: now,
            });

            // A new upload becomes a fresh submission and requires a new review.
            checkpoint.status = 'submitted';
            checkpoint.reviewStatus = 'submitted';
            checkpoint.isCompleted = false;
            checkpoint.revisionNote = '';
            checkpoint.reviewedAt = null;
            checkpoint.reviewedBy = null;

            await project.save();

            const updatedProject = await findDesignerProject(
                projectId,
                req.user.mongoId
            );

            const updatedCheckpoint = (updatedProject.checkpoints || []).find((item) =>
                String(item._id || '') === String(checkpointId) ||
                String(item.id || '') === String(checkpointId)
            );

            // Notify the Coordinator when a Designer submits/re-submits a file.
            const coordinatorId =
                updatedProject.assignedCoordinator?._id ||
                updatedProject.assignedCoordinator;

            if (coordinatorId) {
                await createNotification({
                    recipient: coordinatorId,
                    sender: req.user.mongoId,
                    type: 'checkpoint-file-submitted',
                    title: 'تم رفع ملف مرحلة',
                    message:
                        `تم رفع أو تحديث ملف المرحلة "${updatedCheckpoint?.title || ''}" في مشروع "${updatedProject.projectName}".`,
                    project: updatedProject._id,
                    link: `/coordinator/projects/${updatedProject._id}`,
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Checkpoint file updated successfully.',
                checkpoint: updatedCheckpoint,
                project: updatedProject,
                data: updatedCheckpoint,
            });
        } catch (error) {
            console.error('Designer update checkpoint file error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update checkpoint file.',
            });
        }
    }
);


// ======================================================
// RENDER FILES
// ======================================================
//
// Main Designer may upload/re-upload render files.
// Render review/status remains controlled by Coordinator.
//
// ======================================================

router.get(
    '/projects/:projectId/render',
    async (req, res) => {
        try {
            const project = await findDesignerProject(
                req.params.projectId,
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
                String(project.assignedDesigner?._id || project.assignedDesigner || '') ===
                String(req.user.mongoId);

            if (!isMainDesigner) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the main project designer can access render files.',
                });
            }

            if (!project.isDoneAll) {
                return res.status(403).json({
                    success: false,
                    message: 'Rendering is locked until the Coordinator approves all checkpoints.',
                });
            }

            return res.status(200).json({
                success: true,
                project,
                data: project,
            });
        } catch (error) {
            console.error('Designer get render error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to load render files.',
            });
        }
    }
);


router.put(
    '/projects/:projectId/render',
    async (req, res) => {
        try {
            const project = await findDesignerProject(
                req.params.projectId,
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
                String(project.assignedDesigner?._id || project.assignedDesigner || '') ===
                String(req.user.mongoId);

            if (!isMainDesigner) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the main project designer can upload render files.',
                });
            }

            if (!project.isDoneAll) {
                return res.status(403).json({
                    success: false,
                    message: 'Rendering is locked until the Coordinator approves all checkpoints.',
                });
            }

            if (req.body.renderFileLink !== undefined) {
                project.renderFileLink = String(req.body.renderFileLink).trim();
            }

            if (req.body.renderFileName !== undefined) {
                project.renderFileName = String(req.body.renderFileName).trim();
            }

            // Intentionally ignore renderStatus; review is Coordinator-only.
            await project.save();

            const updatedProject = await findDesignerProject(
                req.params.projectId,
                req.user.mongoId
            );

            return res.status(200).json({
                success: true,
                message: 'Render files updated successfully.',
                project: updatedProject,
                data: updatedProject,
            });
        } catch (error) {
            console.error('Designer update render error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update render files.',
            });
        }
    }
);


// ======================================================
// PRESENTATION FILES
// ======================================================
//
// Presentation Designer may upload/re-upload the file and
// add their note. Approval remains Coordinator-only.
//
// ======================================================

router.get(
    '/projects/:projectId/presentation',
    async (req, res) => {
        try {
            const project = await findDesignerProject(
                req.params.projectId,
                req.user.mongoId
            );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you are not assigned to it.',
                });
            }

            const isPresentationDesigner =
                String(project.assignedPresenter?._id || project.assignedPresenter || '') ===
                String(req.user.mongoId);

            if (!isPresentationDesigner) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the assigned presentation designer can access presentation files.',
                });
            }

            return res.status(200).json({
                success: true,
                presentation: {
                    presentationFileLink: project.presentationFileLink || '',
                    presentationFileName: project.presentationFileName || '',
                    presenterNote: project.presenterNote || '',
                    isPresentationApproved: Boolean(project.isPresentationApproved),
                },
                project,
                data: project,
            });
        } catch (error) {
            console.error('Designer get presentation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to load presentation files.',
            });
        }
    }
);


router.put(
    '/projects/:projectId/presentation',
    async (req, res) => {
        try {
            const project = await findDesignerProject(
                req.params.projectId,
                req.user.mongoId
            );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you are not assigned to it.',
                });
            }

            const isPresentationDesigner =
                String(project.assignedPresenter?._id || project.assignedPresenter || '') ===
                String(req.user.mongoId);

            if (!isPresentationDesigner) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the assigned presentation designer can upload presentation files.',
                });
            }

            if (req.body.presentationFileLink !== undefined) {
                project.presentationFileLink =
                    String(req.body.presentationFileLink).trim();
            }

            if (req.body.presentationFileName !== undefined) {
                project.presentationFileName =
                    String(req.body.presentationFileName).trim();
            }

            if (req.body.presenterNote !== undefined) {
                project.presenterNote =
                    String(req.body.presenterNote).trim();
            }

            // Never accept isPresentationApproved from Designer requests.
            await project.save();

            const updatedProject = await findDesignerProject(
                req.params.projectId,
                req.user.mongoId
            );

            return res.status(200).json({
                success: true,
                message: 'Presentation files updated successfully.',
                presentation: {
                    presentationFileLink: updatedProject.presentationFileLink || '',
                    presentationFileName: updatedProject.presentationFileName || '',
                    presenterNote: updatedProject.presenterNote || '',
                    isPresentationApproved: Boolean(updatedProject.isPresentationApproved),
                },
                project: updatedProject,
                data: updatedProject,
            });
        } catch (error) {
            console.error('Designer update presentation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update presentation files.',
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

            // Checkpoints are updated only through the dedicated
            // file-upload endpoint below. Never accept a full
            // checkpoint array from a Designer: that could let
            // the Designer approve, remove, or rewrite checkpoints.


            if (
                isMainDesigner &&
                (req.body.renderFileLink !== undefined ||
                 req.body.renderFileName !== undefined) &&
                !project.isDoneAll
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Rendering is locked until the Coordinator approves all checkpoints.',
                });
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


            // Render review/status is controlled by the Coordinator.
            // A Designer may submit render files but cannot approve them.


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


            // Project completion and checkpoint approval are
            // reserved for the Coordinator / authorized managers.
            // Ignore status, isDoneAll, and approval fields here.


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
        return res.status(403).json({
            success: false,
            message:
                'Designer cannot change the project status. Please submit your work to the Coordinator for review.',
        });
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

            const assignedProjectIds =
                await Project.distinct(
                    '_id',
                    designerProjectFilter(
                        req.user.mongoId
                    )
                );

            const tasks =
                await Task.find({
                    assignedTo:
                        req.user.mongoId,
                    projectId: {
                        $in: assignedProjectIds,
                    },
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


            if (!task || !(await isTaskProjectAssignedToDesigner(task, req.user.mongoId))) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found, not assigned to you, or its project is not assigned to you.',
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


            if (!task || !(await isTaskProjectAssignedToDesigner(task, req.user.mongoId))) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found, not assigned to you, or its project is not assigned to you.',
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


            if (!task || !(await isTaskProjectAssignedToDesigner(task, req.user.mongoId))) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Task not found, not assigned to you, or its project is not assigned to you.',
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