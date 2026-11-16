require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

const app = express();

// Enable CORS first so all requests (including preflight OPTIONS) get proper headers
const corsOptions = {
  origin: true, // Echoes the request origin, allowing requests from any frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Content-Disposition', 'Content-Type'],
};
app.use(cors(corsOptions));

// Connect to MongoDB
connectDB();

// Ensure DB is connected for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Database connection middleware error:', err);
  }
  next();
});

// Middleware
// Normalize incoming request URLs (collapse duplicate slashes, e.g. //api -> /api)
app.use((req, res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Base Route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Gold Billing CRM Backend API is running',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5005;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Gold Billing CRM Server is running on port ${PORT}`);
  });
}

module.exports = app;
