require('dotenv').config();
const express = require('express');
const http = require('http');
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
});

// Global Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

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

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Campus Auction Server running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
