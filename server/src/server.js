require('dotenv').config();

// Fail loudly at startup if GROQ_API_KEY is missing per project specification
if (!process.env.GROQ_API_KEY) {
  console.error('[FATAL CONFIG ERROR] GROQ_API_KEY is missing from environment variables (.env). AI rephrase service requires a valid Groq API key.');
  process.exit(1);
}

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');
const profileRoutes = require('./routes/profileRoutes');
const sellRoutes = require('./routes/sellRoutes');
const bidRoutes = require('./routes/bidRoutes');
const dealRoutes = require('./routes/dealRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const qaRoutes = require('./routes/qaRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Schedulers
const { startUnsoldAlertScheduler } = require('./services/unsoldAlertScheduler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to MongoDB
connectDB().then(() => {
  // Start background schedulers after DB connection is ready
  startUnsoldAlertScheduler();

  // Module 7: Start periodic auction closing engine (every 15 seconds)
  const AuctionClosingService = require('./services/auctionClosingService');
  setInterval(async () => {
    try {
      await AuctionClosingService.closeAllExpired();
    } catch (err) {
      console.warn('[AuctionClosingScheduler] Periodic check error:', err.message);
    }
  }, 15000);
});

// Global Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded listing photos statically with cross-origin resource policy
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.resolve(__dirname, '../uploads')),
  express.static(path.resolve(__dirname, '../../uploads'))
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Campus Auction API',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sell', sellRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', paymentRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Campus Auction Server running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
