// backend/routes/notifications.js

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Notification = require('../models/Notification');

const {
    authenticateUser,
} = require('../middleware/authMiddleware');


// ======================================================
// Middleware
// ======================================================

router.use(authenticateUser);


// ======================================================
// Helpers
// ======================================================

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


function getUserId(req) {
    return (
        req.user.mongoId ||
        req.user._id ||
        req.user.id
    );
}


// ======================================================
// GET MY NOTIFICATIONS
// ======================================================
//
// GET /api/notifications
//
// Optional query:
// ?page=1
// ?limit=20
// ?unreadOnly=true
//
// The user can ONLY retrieve their own notifications.
// ======================================================

router.get(
    '/',
    async (req, res) => {
        try {

            const userId =
                getUserId(req);


            const page = Math.max(
                parseInt(
                    req.query.page,
                    10
                ) || 1,
                1
            );


            const requestedLimit =
                parseInt(
                    req.query.limit,
                    10
                ) || 20;


            const limit = Math.min(
                Math.max(
                    requestedLimit,
                    1
                ),
                100
            );


            const skip =
                (page - 1) * limit;


            const filter = {
                recipient:
                    userId,
            };


            if (
                req.query.unreadOnly ===
                'true'
            ) {
                filter.isRead = false;
            }


            const [
                notifications,
                total,
                unreadCount,
            ] = await Promise.all([

                Notification.find(
                    filter
                )
                    .populate(
                        'sender',
                        'name email role'
                    )
                    .populate(
                        'project',
                        'projectName status'
                    )
                    .populate(
                        'task',
                        'title status'
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                Notification.countDocuments(
                    filter
                ),

                Notification.countDocuments({
                    recipient:
                        userId,

                    isRead:
                        false,
                }),
            ]);


            return res.status(200).json({
                success: true,

                notifications,

                data:
                    notifications,

                pagination: {
                    page,
                    limit,
                    total,
                    pages:
                        Math.ceil(
                            total / limit
                        ),
                },

                unreadCount,
            });

        } catch (error) {

            console.error(
                '❌ Get notifications error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load notifications.',
            });
        }
    }
);


// ======================================================
// GET UNREAD NOTIFICATIONS
// ======================================================
//
// GET /api/notifications/unread
//
// ======================================================

router.get(
    '/unread',
    async (req, res) => {
        try {

            const userId =
                getUserId(req);


            const notifications =
                await Notification.find({
                    recipient:
                        userId,

                    isRead:
                        false,
                })
                    .populate(
                        'sender',
                        'name email role'
                    )
                    .populate(
                        'project',
                        'projectName status'
                    )
                    .populate(
                        'task',
                        'title status'
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .limit(100)
                    .lean();


            return res.status(200).json({
                success: true,

                notifications,

                data:
                    notifications,

                count:
                    notifications.length,
            });

        } catch (error) {

            console.error(
                '❌ Get unread notifications error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load unread notifications.',
            });
        }
    }
);


// ======================================================
// GET UNREAD COUNT
// ======================================================
//
// GET /api/notifications/unread-count
//
// ======================================================

router.get(
    '/unread-count',
    async (req, res) => {
        try {

            const userId =
                getUserId(req);


            const count =
                await Notification.countDocuments({
                    recipient:
                        userId,

                    isRead:
                        false,
                });


            return res.status(200).json({
                success: true,

                count,

                unreadCount:
                    count,
            });

        } catch (error) {

            console.error(
                '❌ Get unread count error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to get unread notification count.',
            });
        }
    }
);


// ======================================================
// GET SINGLE NOTIFICATION
// ======================================================
//
// GET /api/notifications/:notificationId
//
// User can only access their own notification.
// ======================================================

router.get(
    '/:notificationId',
    async (req, res) => {
        try {

            const {
                notificationId,
            } = req.params;


            if (
                !isValidObjectId(
                    notificationId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid notification ID.',
                });
            }


            const notification =
                await Notification.findOne({
                    _id:
                        notificationId,

                    recipient:
                        getUserId(req),
                })
                    .populate(
                        'sender',
                        'name email role'
                    )
                    .populate(
                        'project',
                        'projectName status'
                    )
                    .populate(
                        'task',
                        'title status'
                    );


            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Notification not found.',
                });
            }


            return res.status(200).json({
                success: true,

                notification,

                data:
                    notification,
            });

        } catch (error) {

            console.error(
                '❌ Get notification error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load notification.',
            });
        }
    }
);


// ======================================================
// MARK ONE NOTIFICATION AS READ
// ======================================================
//
// PUT /api/notifications/:notificationId/read
//
// ======================================================

router.put(
    '/:notificationId/read',
    async (req, res) => {
        try {

            const {
                notificationId,
            } = req.params;


            if (
                !isValidObjectId(
                    notificationId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid notification ID.',
                });
            }


            const notification =
                await Notification.findOne({
                    _id:
                        notificationId,

                    recipient:
                        getUserId(req),
                });


            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Notification not found.',
                });
            }


            if (
                !notification.isRead
            ) {
                notification.isRead =
                    true;

                notification.readAt =
                    new Date();

                await notification.save();
            }


            return res.status(200).json({
                success: true,

                message:
                    'Notification marked as read.',

                notification,

                data:
                    notification,
            });

        } catch (error) {

            console.error(
                '❌ Mark notification read error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to mark notification as read.',
            });
        }
    }
);


// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// ======================================================
//
// PUT /api/notifications/read-all
//
// ======================================================

router.put(
    '/read-all',
    async (req, res) => {
        try {

            const userId =
                getUserId(req);


            const result =
                await Notification.updateMany(
                    {
                        recipient:
                            userId,

                        isRead:
                            false,
                    },
                    {
                        $set: {
                            isRead:
                                true,

                            readAt:
                                new Date(),
                        },
                    }
                );


            return res.status(200).json({
                success: true,

                message:
                    'All notifications marked as read.',

                modifiedCount:
                    result.modifiedCount,

                count:
                    result.modifiedCount,
            });

        } catch (error) {

            console.error(
                '❌ Mark all notifications read error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to mark all notifications as read.',
            });
        }
    }
);


// ======================================================
// DELETE ONE NOTIFICATION
// ======================================================
//
// DELETE /api/notifications/:notificationId
//
// A user can delete only their own notification.
// ======================================================

router.delete(
    '/:notificationId',
    async (req, res) => {
        try {

            const {
                notificationId,
            } = req.params;


            if (
                !isValidObjectId(
                    notificationId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid notification ID.',
                });
            }


            const notification =
                await Notification.findOne({
                    _id:
                        notificationId,

                    recipient:
                        getUserId(req),
                });


            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Notification not found.',
                });
            }


            await Notification.deleteOne({
                _id:
                    notificationId,

                recipient:
                    getUserId(req),
            });


            return res.status(200).json({
                success: true,

                message:
                    'Notification deleted successfully.',

                notificationId,
            });

        } catch (error) {

            console.error(
                '❌ Delete notification error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to delete notification.',
            });
        }
    }
);


// ======================================================
// DELETE ALL READ NOTIFICATIONS
// ======================================================
//
// DELETE /api/notifications/read
//
// Deletes ONLY read notifications belonging
// to the currently authenticated user.
// ======================================================

router.delete(
    '/read',
    async (req, res) => {
        try {

            const result =
                await Notification.deleteMany({
                    recipient:
                        getUserId(req),

                    isRead:
                        true,
                });


            return res.status(200).json({
                success: true,

                message:
                    'Read notifications deleted successfully.',

                deletedCount:
                    result.deletedCount,
            });

        } catch (error) {

            console.error(
                '❌ Delete read notifications error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to delete read notifications.',
            });
        }
    }
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;