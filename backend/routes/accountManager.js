// backend/routes/accountManager.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Project = require('../models/Project');

const {
    authenticateUser,
    requireAccountManager,
} = require('../middleware/authMiddleware');


// ======================================================
// Middleware
// ======================================================
//
// Every route in this file requires:
// 1. Valid Firebase authentication
// 2. MongoDB user
// 3. Active / approved account
// 4. account_manager role
// ======================================================

router.use(
    authenticateUser,
    requireAccountManager
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

    // --------------------------------------------------
    // Basic Project Information
    // --------------------------------------------------

    if (body.projectName !== undefined) {
        data.projectName =
            String(body.projectName).trim();
    }

    if (body.brief !== undefined) {
        data.brief =
            String(body.brief);
    }

    if (body.briefName !== undefined) {
        data.briefName =
            String(body.briefName);
    }

    if (body.description !== undefined) {
        data.description =
            String(body.description);
    }


    // --------------------------------------------------
    // Manager Notes
    // --------------------------------------------------

    if (body.managerNotes !== undefined) {
        data.managerNotes =
            String(body.managerNotes);
    }


    // --------------------------------------------------
    // Dates
    // --------------------------------------------------

    if (body.startDate !== undefined) {
        data.startDate =
            normalizeDate(body.startDate);
    }

    if (body.deadline !== undefined) {
        data.deadline =
            normalizeDate(body.deadline);
    }


    // --------------------------------------------------
    // Checkpoints
    // --------------------------------------------------

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


    // --------------------------------------------------
    // Render Information
    // --------------------------------------------------

    if (body.renderFileLink !== undefined) {
        data.renderFileLink =
            String(body.renderFileLink);
    }

    if (body.renderFileName !== undefined) {
        data.renderFileName =
            String(body.renderFileName);
    }

    if (body.renderStatus !== undefined) {
        data.renderStatus =
            String(body.renderStatus);
    }


    // --------------------------------------------------
    // Presentation Information
    // --------------------------------------------------

    if (
        body.presentationFileLink !==
        undefined
    ) {
        data.presentationFileLink =
            String(
                body.presentationFileLink
            );
    }

    if (
        body.presentationFileName !==
        undefined
    ) {
        data.presentationFileName =
            String(
                body.presentationFileName
            );
    }

    if (body.presenterNote !== undefined) {
        data.presenterNote =
            String(body.presenterNote);
    }


    // --------------------------------------------------
    // Coordinator Notes
    // --------------------------------------------------

    if (body.coordinatorNotes !== undefined) {
        data.coordinatorNotes =
            String(body.coordinatorNotes);
    }


    // --------------------------------------------------
    // Status
    // --------------------------------------------------

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


    // --------------------------------------------------
    // IMPORTANT
    // --------------------------------------------------
    //
    // These fields are intentionally NOT accepted
    // from Account Manager requests:
    //
    // createdBy
    // assignedDesigner
    // assignedDesignerId
    // assignedDesignerName
    // assignedPresenter
    // assignedPresenterId
    // assignedPresenterName
    // isPresentationApproved
    //
    // Assignment belongs to Coordinator / Manager / Admin.
    // ==================================================

    return data;
}


// ======================================================
// GET MY PROJECTS
// ======================================================
//
// Account Manager sees ONLY projects created by them.
// ======================================================

router.get(
    '/projects',
    async (req, res) => {
        try {

            const projects =
                await Project.find({
                    createdBy:
                        req.user.mongoId,
                })
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
                '❌ Account Manager get projects error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load your projects.',
            });
        }
    }
);


// ======================================================
// GET MY PROJECT
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
                await Project.findOne({
                    _id: projectId,

                    // IMPORTANT:
                    // Ownership is enforced on Backend.
                    createdBy:
                        req.user.mongoId,
                })
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
                        'Project not found or you do not have access to it.',
                });
            }


            return res.status(200).json({
                success: true,
                project,
                data: project,
            });

        } catch (error) {

            console.error(
                '❌ Account Manager get project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load the project.',
            });
        }
    }
);


// ======================================================
// CREATE PROJECT
// ======================================================
//
// Account Manager can create projects.
//
// createdBy ALWAYS comes from req.user.mongoId.
// Never from req.body.
// ======================================================

router.post(
    '/projects',
    async (req, res) => {
        try {

            const projectData =
                buildProjectData(req.body);


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

                    // Account Manager cannot assign
                    // designers during project creation.
                    assignedDesigner:
                        null,

                    assignedDesignerId:
                        '',

                    assignedDesignerName:
                        '',

                    assignedPresenter:
                        null,

                    assignedPresenterId:
                        '',

                    assignedPresenterName:
                        '',

                    isPresentationApproved:
                        false,
                });


            await project.save();


            // --------------------------------------------------
            // Notify Coordinators
            // --------------------------------------------------
            //
            // This is intentionally handled here only if the
            // Notification model is available.
            //
            // If the notification route/service is centralized,
            // this block can be moved to a notification helper.
            // --------------------------------------------------

            try {

                const User =
                    require('../models/User');

                const Notification =
                    require('../models/Notification');


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
                    coordinators.length > 0
                ) {

                    const notifications =
                        coordinators.map(
                            (coordinator) => ({
                                recipient:
                                    coordinator._id,

                                sender:
                                    req.user.mongoId,

                                type:
                                    'project-created',

                                title:
                                    'مشروع جديد',

                                message:
                                    `${req.user.name || 'Account Manager'} أنشأ مشروعًا جديدًا: ${project.projectName}`,

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
                }

            } catch (notificationError) {

                // Do not fail project creation just because
                // notification creation failed.
                console.error(
                    '⚠️ Account Manager project notification error:',
                    notificationError.message
                );
            }


            const populatedProject =
                await Project.findById(
                    project._id
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
                    populatedProject,
                data:
                    populatedProject,
            });

        } catch (error) {

            console.error(
                '❌ Account Manager create project error:',
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
// UPDATE MY PROJECT
// ======================================================
//
// Account Manager can update ONLY their own projects.
//
// They cannot:
// - Change owner
// - Assign designer
// - Assign presenter
// - Approve presentation
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
                await Project.findOne({
                    _id: projectId,
                    createdBy:
                        req.user.mongoId,
                });


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you do not have access to it.',
                });
            }


            const updateData =
                buildProjectData(req.body);


            // --------------------------------------------------
            // Prevent empty project name
            // --------------------------------------------------

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
                '❌ Account Manager update project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to update the project.',
            });
        }
    }
);


// ======================================================
// DELETE MY PROJECT
// ======================================================
//
// Account Manager can delete ONLY projects they created.
// ======================================================

router.delete(
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
                await Project.findOneAndDelete({
                    _id: projectId,
                    createdBy:
                        req.user.mongoId,
                });


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you do not have access to it.',
                });
            }


            // --------------------------------------------------
            // Optional:
            // Delete related tasks/notifications here if
            // the project lifecycle requires cascading cleanup.
            // We intentionally do not delete them blindly
            // to preserve existing project/task data.
            // --------------------------------------------------


            return res.status(200).json({
                success: true,
                message:
                    'Project deleted successfully.',
                projectId,
            });

        } catch (error) {

            console.error(
                '❌ Account Manager delete project error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to delete the project.',
            });
        }
    }
);


// ======================================================
// GET PROJECT STATUS
// ======================================================

router.get(
    '/projects/:projectId/status',
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
                await Project.findOne(
                    {
                        _id: projectId,
                        createdBy:
                            req.user.mongoId,
                    },
                    {
                        status: 1,
                        isDoneAll: 1,
                        isPresentationApproved: 1,
                        renderStatus: 1,
                        deadline: 1,
                    }
                ).lean();


            if (!project) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Project not found or you do not have access to it.',
                });
            }


            return res.status(200).json({
                success: true,
                status:
                    project.status,
                isDoneAll:
                    project.isDoneAll,
                isPresentationApproved:
                    project.isPresentationApproved,
                renderStatus:
                    project.renderStatus,
                deadline:
                    project.deadline,
                project,
            });

        } catch (error) {

            console.error(
                '❌ Account Manager project status error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load project status.',
            });
        }
    }
);


// ======================================================
// Dashboard
// ======================================================

router.get(
    '/dashboard',
    async (req, res) => {
        try {

            const projects =
                await Project.find(
                    {
                        createdBy:
                            req.user.mongoId,
                    },
                    {
                        status: 1,
                        deadline: 1,
                    }
                ).lean();


            const now =
                new Date();


            const total =
                projects.length;


            const completed =
                projects.filter(
                    (project) =>
                        project.status ===
                        'completed'
                ).length;


            const active =
                projects.filter(
                    (project) =>
                        project.status !==
                        'completed'
                ).length;


            const withDeadline =
                projects.filter(
                    (project) =>
                        Boolean(
                            project.deadline
                        )
                ).length;


            const overdue =
                projects.filter(
                    (project) =>
                        project.deadline &&
                        new Date(
                            project.deadline
                        ) < now &&
                        project.status !==
                            'completed'
                ).length;


            return res.status(200).json({
                success: true,

                stats: {
                    total,
                    completed,
                    active,
                    inProgress: active,
                    withDeadline,
                    overdue,
                },
            });

        } catch (error) {

            console.error(
                '❌ Account Manager dashboard error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load dashboard data.',
            });
        }
    }
);


module.exports = router;