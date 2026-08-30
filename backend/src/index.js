require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const committeeRoutes = require('./routes/committeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const prisma = require('./services/prisma');

const app = express();
const PORT = process.env.PORT || 5000;

// Security HTTP Headers Middleware (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable CORS with support for headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global Rate Limiter: max 300 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', globalLimiter);

// Auth Rate Limiter: max 30 login/register attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload root folder exists on startup
const uploadRoot = process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : 'uploads');
try {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Could not create upload directory:', err.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development', time: new Date() });
});

const vacancyInterestRoutes = require('./routes/vacancyInterestRoutes');

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/committee', committeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', vacancyInterestRoutes);
app.use('/api', jobRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  
  if (err.message === 'Only PDF files are accepted.' || err.code === 'LIMIT_FILE_SIZE') {
    const message = err.code === 'LIMIT_FILE_SIZE' 
      ? 'File size exceeds the 5MB limit.' 
      : err.message;
    return res.status(400).json({ error: message });
  }

  res.status(500).json({
    error: 'An internal server error occurred.'
  });
});

// Server Initialization (Only listen when running directly, not on Vercel)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const server = app.listen(PORT, async () => {
    console.log(`[Server] Running on port ${PORT}`);
    
    // Verify database connection
    try {
      await prisma.$connect();
      console.log('[Database] Database connection established successfully via Prisma.');
    } catch (error) {
      console.error('[Database] Failed to connect to database on startup:', error.message);
    }
  });

  // Graceful Shutdown
  process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received. Shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });
  });
}

module.exports = app;
