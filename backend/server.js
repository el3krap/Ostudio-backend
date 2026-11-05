
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

const FRONTEND_URLS =
    process.env.FRONTEND_URLS || '';

// ======================================================
// CORS Configuration
// ======================================================

function normalizeOrigin(origin) {
    return origin.trim().replace(/\/+$/, '');
}

const allowedOrigins = [
    FRONTEND_URL,
    ...FRONTEND_URLS.split(','),
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]
    .filter(Boolean)
    .map(normalizeOrigin);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests without Origin
            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin = normalizeOrigin(origin);

            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            console.warn(`CORS blocked origin: ${origin}`);

            return callback(new Error('Not allowed by CORS'));
        },

        credentials: true,

        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS'
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ]
    })
);

// ======================================================
// Body Parsers
// ======================================================

app.use(
    express.json({
        limit: '10mb'
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: '10mb'
    })
);

// ======================================================
// Static Files
// ======================================================

// Local static files only.
// Vercel filesystem is not persistent storage.

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
            `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
        );
    });

    next();
});

// ======================================================
// Health Checks
// ======================================================

app.get('/', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'OSTUDIO backend is running.',
        service: 'Ostudio API',
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'OSTUDIO API health check.',
        database:
            mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// ======================================================
// MongoDB Connection - Serverless Compatible
// ======================================================

let mongoConnectionPromise = null;

async function connectDatabase() {
    if (!MONGO_URI) {
        throw new Error(
            'Missing MONGO_URI environment variable.'
        );
    }

    // Reuse existing connection
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // Reuse an ongoing connection attempt
    if (mongoConnectionPromise) {
        return mongoConnectionPromise;
    }

    mongoConnectionPromise = mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });

    try {
        await mongoConnectionPromise;

        console.log('MongoDB connected successfully.');

        return mongoose.connection;
    } catch (error) {
        mongoConnectionPromise = null;

        console.error(
            'MongoDB connection failed:',
            error.message
        );

        throw error;
    }
}

// ======================================================
// MongoDB Events
// ======================================================

mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established.');
});

mongoose.connection.on('error', (error) => {
    console.error('MongoDB error:', error.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
});

// ======================================================
// Database Middleware
// ======================================================

// Ensure MongoDB is connected before API requests.
// Health checks above remain accessible independently.

app.use((req, res, next) => {
    connectDatabase()
        .then(() => next())
        .catch(next);
});

// ======================================================
// API Routes
// ======================================================

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const accountManagerRoutes = require('./routes/accountManager');
const coordinatorRoutes = require('./routes/coordinator');
const designerRoutes = require('./routes/designer');
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
        method: req.method
    });
});

// ======================================================
// Global Error Handler
// ======================================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy blocked this request.'
        });
    }

    // JSON parsing error
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON request body.'
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
                : err.message || 'Request failed.'
    });
});

// ======================================================
// Start Server - Local Development Only
// ======================================================

async function startServer() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log('');
        console.log('==========================================');
        console.log('       OSTUDIO BACKEND SERVER');
        console.log('==========================================');

        console.log(`Server: http://localhost:${PORT}`);

        console.log(
            `Health: http://localhost:${PORT}/api/health`
        );

        console.log(`Frontend: ${FRONTEND_URL}`);

        console.log('Authentication: Firebase + MongoDB');

        console.log('Database: MongoDB');

        console.log(`Uploads: ${uploadsDirectory}`);

        console.log('==========================================');
        console.log('');
    });
}

// ======================================================
// Graceful Shutdown - Local Development
// ======================================================

async function shutdown(signal) {
    console.log(`${signal} received. Shutting down...`);

    try {
        await mongoose.connection.close();

        console.log('MongoDB connection closed.');

        process.exit(0);
    } catch (error) {
        console.error('Shutdown error:', error);

        process.exit(1);
    }
}

// ======================================================
// Local Startup
// ======================================================

if (require.main === module) {
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('SIGTERM', () => shutdown('SIGTERM'));

    startServer().catch((error) => {
        console.error('Failed to start server:', error.message);

        process.exit(1);
    });
}

// ======================================================
// Export Express App for Vercel
// ======================================================

module.exports = app;
