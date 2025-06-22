const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db.config');
const authConfig = require('./config/auth.config');
const authRoutes = require('./routes/auth.routes');
const facebookRoutes = require('./routes/facebook.routes');
const messageRoutes = require('./routes/message.routes');
const facebookUtils = require('./utils/facebook.utils');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://f-help-desk-hfqh.vercel.app',
  'https://f-help-desk-hfqh-jzzny1q6w-vanshika-agarwals-projects.vercel.app',
  'https://fhelpdesk.vercel.app', // production
  'https://fhelpdesk.onrender.com' // backend on render
];



app.use(cors({
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));



// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
const conversationRoutes = require('./routes/conversation.routes');
app.use('/api/conversations', conversationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
// Facebook Webhook Verification
app.get('/api/fb/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Facebook webhook verified');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ Failed Facebook webhook verification');
    res.sendStatus(403);
  }
});
const Page = require('./models/page.model'); // Adjust the path if needed
const Conversation = require('./models/conversation.model');
const Message = require('./models/message.model');
const axios = require('axios');

app.post('/api/fb/webhook', express.json(), async (req, res) => {
  const body = req.body;
  console.log("📩 Incoming Webhook Event:", JSON.stringify(body, null, 2));

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0];
      const pageId = entry.id;
      const senderId = webhookEvent.sender.id;

      // Ignore echo messages or delivery receipts
      if (!webhookEvent.message || webhookEvent.message.is_echo) continue;

      const messageText = webhookEvent.message.text || '';
      const timestamp = new Date(webhookEvent.timestamp);

      try {
        // 1. Find the connected page (with token)
        const page = await Page.findOne({ pageId });
        if (!page) {
          console.warn(`⚠️ Page ${pageId} not found or not connected`);
          continue;
        }

        // 2. Fetch sender profile from Facebook
        const profileUrl = `https://graph.facebook.com/${senderId}?fields=first_name,last_name,email,picture&access_token=${page.pageAccessToken}`;
        const profileRes = await axios.get(profileUrl);
        const { first_name, last_name, picture, email } = profileRes.data;

        const customerName = `${first_name} ${last_name}`;

        // 3. Find or create a conversation
        let conversation = await Conversation.findOne({ pageId, customerId: senderId });

        if (!conversation) {
          conversation = await Conversation.create({
            pageId,
            customerId: senderId,
            customerName,
            customerPicture: picture?.data?.url,
            firstName: first_name,           // <- added
            lastName: last_name,  
            email,           
            lastMessageTimestamp: timestamp
          });
        } else {
          conversation.lastMessageTimestamp = timestamp;
          if (!conversation.firstName) conversation.firstName = first_name;
          if (!conversation.lastName) conversation.lastName = last_name;
          if (!conversation.customerPicture) conversation.customerPicture = profile_pic;
          if (!conversation.email && email) conversation.email = email; 
          await conversation.save();
        }

        // 4. Save the message
        await Message.create({
          conversationId: conversation._id,
          messageId: webhookEvent.message.mid,
          sender: 'customer',
          senderId,
          content: messageText,
          timestamp
        });

        console.log(`✅ Saved message from ${senderId}: ${messageText}`);
      } catch (err) {
        console.error('❌ Error processing message:', err.message);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const path = require('path');

// Serve static files from the frontend build folder
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Catch-all for React routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

