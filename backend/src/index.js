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
const storageService = require('./services/storageService');
// DYPIU Recruitment Portal Backend
const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.set('trust proxy', require('./config').TRUST_PROXY);
app.use(require('./middleware/requestContext'));

// This server only returns JSON and files, so the strictest CSP is appropriate.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
}));

// Enable CORS. Restrict to configured origins in production via CORS_ORIGIN
// (comma-separated list); defaults to allowing all origins for local development.
const { corsOrigins } = require('./config');
const allowedOrigins = new Set(corsOrigins);

app.use(cors({
  origin(origin, callback) {
    // No Origin header: same-origin navigation, curl, server-to-server.
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has('*') || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));

const limiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false
});

const MIN = 60 * 1000;
app.use('/api', limiter(15 * MIN, 600, 'Too many requests from this IP. Please try again later.'));
app.use('/api/auth/login', limiter(15 * MIN, 20, 'Too many login attempts. Please try again later.'));
app.use('/api/auth/register', limiter(60 * MIN, 15, 'Too many registration attempts. Please try again later.'));
app.use('/api/auth/send-otp', limiter(60 * MIN, 12, 'Too many verification requests. Please try again later.'));
app.use('/api/auth/verify-otp', limiter(15 * MIN, 30, 'Too many verification attempts. Please try again later.'));
app.use('/api/auth/forgot-password', limiter(60 * MIN, 10, 'Too many reset requests. Please try again later.'));
app.use('/api/auth/reset-password', limiter(15 * MIN, 20, 'Too many reset attempts. Please try again later.'));
// Guest submissions carry base64 documents - keep them tightly rate limited.
app.post(/^\/api\/applications\/(?:[^/]+\/)?submit$/, limiter(60 * MIN, 20, 'Too many submissions from this network. Please try again later.'));
app.use('/api/auth/refresh', limiter(15 * MIN, 120, 'Too many session refresh attempts.'));

// Body parser middleware - allows recruitment posters, rich descriptions, and application payloads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Uploads: only recruitment poster images are public. Candidate and application
// documents are private and are only reachable through authorised API endpoints.
try {
  fs.mkdirSync(storageService.POSTER_ROOT, { recursive: true });
} catch (err) {
  console.warn('Notice: Could not create upload directory:', err.message);
}

app.use('/uploads/posters', (req, res, next) => {
  if (!/\.(jpe?g|png|webp)$/i.test(req.path)) return res.status(404).end();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  return next();
}, express.static(path.resolve(storageService.POSTER_ROOT), { index: false, dotfiles: 'deny', maxAge: '1h' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const vacancyInterestRoutes = require('./routes/vacancyInterestRoutes');
const documentRoutes = require('./routes/documentRoutes');

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/committee', committeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', vacancyInterestRoutes);
// jobRoutes exposes /api/public/* and /api/admin/vacancies|schools|departments,
// plus /api/jobs and /api/jobs/:id. Mounted once at /api.
app.use('/api', jobRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler - never leaks internals to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'The file exceeds the allowed size limit.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: 'Invalid file upload.' });
  }
  if (/^Only (PDF|JPEG)/.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled Server Error:', err);
  return res.status(500).json({ error: 'An internal server error occurred.' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason);
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

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use.`);
    } else {
      console.error('[Server] Server error:', err);
    }
  });

  const shutdown = (signal) => {
    console.log(`[Server] ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
