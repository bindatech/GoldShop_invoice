require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(morgan('dev'));
app.use(
  cors({
    origin: true, // Allow frontend origin
    credentials: true,
  })
);
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

app.listen(PORT, () => {
  console.log(`Gold Billing CRM Server is running on port ${PORT}`);
});

module.exports = app;
