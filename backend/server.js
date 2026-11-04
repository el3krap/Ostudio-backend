
// backend/server.js

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// ======================================================
// App
// ======================================================

const app = express();

// ======================================================
// Environment
// ======================================================

const PORT = process.env.PORT || 8080;

const MONGO_URI =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    'http://localhost:5173';

// Optional: multiple frontend origins separated by commas
const FRONTEND_URLS =
    process.env.FRONTEND_URLS || '';

// ======================================================
// Basic Configuration Validation
// ======================================================

if (!MONGO_URI) {
    console.error('❌ Missing MongoDB connection string.');
    console.error('Add MONGO_URI to backend/.env');
    process.exit(1);
}

// ======================================================
// CORS
// ======================================================

function normalizeOrigin(origin) {
    return origin.trim().replace(/\/+$/, '');
}

const allowedOrigins = [
    FRONTEND_URL,
    ...FRONTEND_URLS.split(','),
    'https://ostudio-backend-pm3p.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
    .filter(Boolean)
    .map(normalizeOrigin);

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without an Origin header
            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin = normalizeOrigin(origin);

            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            console.warn(`⚠️ CORS blocked origin: ${origin}`);

            return callback(new Error('Not allowed by CORS'));
        },

        credentials: true,

        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS',
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization',
        ],
    })
);

// ======================================================
// Body Parsers
// ======================================================

app.use(
    express.json({
        limit: '10mb',
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: '10mb',
    })
);

// ======================================================
// Static File Storage
// ======================================================

const uploadsDirectory = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(uploadsDirectory));

// ======================================================
// Request Logging
// ======================================================

app.use((req, res, next) => {

    const startedAt = Date.now();

    res.on('finish', () => {

        const duration = Date.now() - startedAt;

        console.log(
            `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
        );
    });

    next();
});

// ======================================================
// Health Check
// ======================================================

app.get('/', (req, res) => {

    return res.status(200).json({

        success: true,

        message: 'OSTUDIO backend is running.',

        service: 'Ostudio API',

        status: 'online',

        timestamp: new Date().toISOString(),
    });
});

app.get('/api/health', (req, res) => {

    return res.status(200).json({

        success: true,

        message: 'OSTUDIO API is healthy.',

        database:
            mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected',

        timestamp: new Date().toISOString(),
    });
});

// ======================================================
// API Routes
// ======================================================

// Authentication
const authRoutes = require('./routes/auth');

// Admin
const adminRoutes = require('./routes/admin');

// Manager
const managerRoutes = require('./routes/manager');

// Account Manager
const accountManagerRoutes = require('./routes/accountManager');

// Coordinator
const coordinatorRoutes = require('./routes/coordinator');

// Designer
const designerRoutes = require('./routes/designer');

// Notifications
const notificationRoutes = require('./routes/notifications');

// ======================================================
// Mount Routes
// ======================================================

app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/manager', managerRoutes);

app.use('/api/account-manager', accountManagerRoutes);

app.use('/api/coordinator', coordinatorRoutes);

app.use('/api/designer', designerRoutes);

app.use('/api/notifications', notificationRoutes);

// ======================================================
// 404 Handler
// ======================================================

app.use((req, res) => {

    return res.status(404).json({

        success: false,

        message: 'API endpoint not found.',

        path: req.originalUrl,

        method: req.method,
    });
});

// ======================================================
// Global Error Handler
// ======================================================

app.use((err, req, res, next) => {

    console.error('❌ Server error:', err);

    // CORS error
    if (err.message === 'Not allowed by CORS') {

        return res.status(403).json({

            success: false,

            message: 'CORS policy blocked this request.',
        });
    }

    // JSON body parsing error
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err
    ) {

        return res.status(400).json({

            success: false,

            message: 'Invalid JSON request body.',
        });
    }

    const statusCode =
        err.statusCode ||
        err.status ||
        500;

    return res.status(statusCode).json({

        success: false,

        message:
            statusCode === 500
                ? 'Internal server error.'
                : err.message || 'Request failed.',
    });
});

// ======================================================
// MongoDB Connection
// ======================================================

async function connectDatabase() {

    try {

        console.log('🔄 Connecting to MongoDB...');

        await mongoose.connect(MONGO_URI, {

            serverSelectionTimeoutMS: 10000,

            socketTimeoutMS: 45000,
        });

        console.log('✅ MongoDB connected successfully.');

        console.log(
            `📦 Database: ${mongoose.connection.name}`
        );

    } catch (error) {

        console.error(
            '❌ MongoDB connection failed:',
            error.message
        );

        throw error;
    }
}

// ======================================================
// MongoDB Events
// ======================================================

mongoose.connection.on('connected', () => {

    console.log('🟢 MongoDB connection established.');
});

mongoose.connection.on('error', (error) => {

    console.error('❌ MongoDB error:', error);
});

mongoose.connection.on('disconnected', () => {

    console.warn('🟡 MongoDB disconnected.');
});

// ======================================================
// Graceful Shutdown
// ======================================================

async function shutdown(signal) {

    console.log(
        `\n🛑 ${signal} received. Shutting down...`
    );

    try {

        await mongoose.connection.close();

        console.log('✅ MongoDB connection closed.');

        process.exit(0);

    } catch (error) {

        console.error(
            '❌ Error during shutdown:',
            error
        );

        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));

process.on('SIGTERM', () => shutdown('SIGTERM'));

// ======================================================
// Start Server
// ======================================================

async function startServer() {

    await connectDatabase();

    app.listen(PORT, () => {

        console.log('');

        console.log('==========================================');

        console.log('        🚀 OSTUDIO BACKEND SERVER');

        console.log('==========================================');

        console.log(
            `🌐 Server: http://localhost:${PORT}`
        );

        console.log(
            `❤️ Health: http://localhost:${PORT}/api/health`
        );

        console.log(
            `🎨 Frontend: ${FRONTEND_URL}`
        );

        console.log(
            '🔐 Authentication: Firebase + MongoDB'
        );

        console.log('📦 Database: MongoDB');

        console.log(
            `📁 Uploads: ${uploadsDirectory}`
        );

        console.log('==========================================');

        console.log('');
    });
}

// ======================================================
// Start
// ======================================================

if (require.main === module) {

    startServer().catch((error) => {

        console.error(
            '❌ Failed to start server:',
            error
        );

        process.exit(1);
    });
}

// ======================================================
// Export
// ======================================================

module.exports = app;
