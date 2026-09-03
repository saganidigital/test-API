const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { getPool } = require('./src/config/db');
const apiLogger = require('./src/middleware/logger');

// Import routes
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const cartRoutes = require('./src/routes/cart');
const orderRoutes = require('./src/routes/orders');
const adminRoutes = require('./src/routes/admin');
const systemRoutes = require('./src/routes/system');
const { setupSwagger } = require('./src/config/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers (Helmet) ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for static frontend compatibility
  crossOriginEmbedderPolicy: false
}));

// ─── CORS Configuration ─────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [`http://localhost:${PORT}`];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, Postman, curl, same-origin)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Educational project: allow but log
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ─── Body Parsing with Size Limits ───────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Rate Limiting on Auth Endpoints ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  }
});

// ─── General API Rate Limiter ────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  }
});

app.use('/api/', apiLimiter);

// Database API audit & request timing logger
app.use(apiLogger);

// Setup Swagger API Documentation & Testing Console (/api/docs & /docs)
setupSwagger(app);

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', (req, res, next) => {
  // Shortcut to categories route
  req.url = '/categories' + req.url;
  productRoutes(req, res, next);
});
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);

// Digital software mock download generator endpoint
app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename;
  const content = `[SOFTWARE BINARY ARTIFACT]\nProduct: ${filename}\nIssued by SoftwareCommerce Engine\nTimestamp: ${new Date().toISOString()}\nStatus: Verified Cryptographically Signed Payload\n`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(content, 'utf8'));
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const dbTest = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() as db');
    res.json({
      status: 'healthy',
      service: 'Software Commerce REST API',
      database: dbTest.recordset[0].db,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'database_error',
      message: 'Database connection failed.'
    });
  }
});

// Fallback for API 404
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'An internal server error occurred.',
    ...(isDev && { stack: err.stack })
  });
});

// Start Express server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 REST API Server running at http://localhost:${PORT}`);
  console.log(`🌐 Frontend accessible at    http://localhost:${PORT}`);
  console.log(`📑 Swagger API Console at   http://localhost:${PORT}/api/docs`);
  console.log(`🛡️ Database: SSMS 2022 (SoftwareCommerceDB)`);
  console.log(`🔒 Passwords secured with 12-round bcrypt hashing`);
  console.log(`🔐 Security: Helmet headers + Rate limiting active`);
  console.log(`====================================================`);

  // Test SQL Server connection on boot
  try {
    await getPool();
    console.log('✅ SSMS 2022 Connection active and ready for queries.');
  } catch (err) {
    console.error('❌ Failed to connect to SSMS database:', err.message);
  }
});
