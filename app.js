const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth.routes');
const facebookRoutes = require('./routes/facebook.routes');
const messageRoutes = require('./routes/message.routes');
const facebookUtils = require('./utils/facebook.utils');
const jwt = require('jsonwebtoken');
const authConfig = require('./config/auth.config');
require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Facebook Helpdesk API.' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/messages', messageRoutes);

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }
  
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'User ID:', socket.userId);
  
  // Join room for real-time updates (room name is the user's ID)
  socket.join(socket.userId);
  console.log(`Socket ${socket.id} joined room: ${socket.userId}`);
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Set Socket.io instance in facebook utils
facebookUtils.setSocketIO(io);

// Export for server.js
module.exports = { app, server, io }; 