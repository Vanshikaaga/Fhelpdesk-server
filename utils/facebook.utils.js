const axios = require('axios');
const Page = require('../models/page.model');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const authConfig = require('../config/auth.config');

// Facebook Graph API base URL
const FB_GRAPH_API_BASE = `https://graph.facebook.com/${authConfig.facebook.graphApiVersion}`;

// Socket.io instance (will be set in app.js)
let io;

// Set the Socket.io instance
exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

// Process incoming webhook events
exports.processWebhookEvent = async (pageId, webhookEvent) => {
  try {
    // Check if this is a message event
    if (webhookEvent.message) {
      await processMessageEvent(pageId, webhookEvent);
    }
    // Handle other event types as needed (message_deliveries, message_reads, etc.)
  } catch (error) {
    console.error('Error processing webhook event:', error);
  }
};

// Process message events
const processMessageEvent = async (pageId, webhookEvent) => {
  try {
    // Ignore messages sent by the page/app
    if (webhookEvent.message.is_echo) {
      return;
    }
    
    const senderId = webhookEvent.sender.id;
    const messageId = webhookEvent.message.mid;
    const messageText = webhookEvent.message.text || '';
    const timestamp = webhookEvent.timestamp;
    
    // Find the page to get the access token
    const page = await Page.findOne({ pageId, status: 'connected' });
    if (!page) {
      console.error(`Page ${pageId} not found or not connected`);
      return;
    }
    
    // Get user profile info from Facebook
    const userProfile = await getUserProfile(senderId, page.pageAccessToken);
    
    // Find existing conversation or create a new one (using 24-hour rule)
    const conversation = await findOrCreateConversation(
      pageId, 
      senderId, 
      userProfile.name,
      userProfile.profile_pic
    );
    
    // Create message
    const message = new Message({
      conversationId: conversation._id,
      messageId,
      sender: 'customer',
      senderId,
      content: messageText,
      timestamp: new Date(parseInt(timestamp)),
      read: false
    });
    
    await message.save();
    
    // Update conversation's last message timestamp
    conversation.lastMessageTimestamp = new Date(parseInt(timestamp));
    await conversation.save();
    
    // Emit event via Socket.IO if available
    if (io) {
      io.to(page.userId.toString()).emit('new_message', { 
        conversation, 
        message 
      });
      console.log(`Emitted new_message event to user ${page.userId}`);
    } else {
      console.log('Socket.IO not initialized, skipping emit');
    }
    
    console.log(`Message from ${senderId} processed successfully`);
  } catch (error) {
    console.error('Error processing message event:', error);
  }
};

// Find existing conversation or create a new one using 24-hour rule
const findOrCreateConversation = async (pageId, customerId, customerName, customerPicture) => {
  try {
    // Find existing conversation for this customer and page
    let conversation = await Conversation.findOne({ 
      pageId, 
      customerId 
    });
    
    const currentTime = new Date();
    
    // Check if a conversation exists and if it's less than 24 hours old
    if (conversation) {
      const lastMessageTime = new Date(conversation.lastMessageTimestamp);
      const hoursDifference = (currentTime - lastMessageTime) / (1000 * 60 * 60);
      
      // If more than 24 hours, create a new conversation
      if (hoursDifference > 24) {
        conversation = new Conversation({
          pageId,
          customerId,
          customerName,
          customerPicture,
          lastMessageTimestamp: currentTime,
          status: 'open'
        });
        
        await conversation.save();
      }
    } else {
      // No existing conversation, create a new one
      conversation = new Conversation({
        pageId,
        customerId,
        customerName,
        customerPicture,
        lastMessageTimestamp: currentTime,
        status: 'open'
      });
      
      await conversation.save();
    }
    
    return conversation;
  } catch (error) {
    console.error('Error finding or creating conversation:', error);
    throw error;
  }
};

// Get user profile from Facebook
const getUserProfile = async (userId, accessToken) => {
  try {
    const url = `${FB_GRAPH_API_BASE}/${userId}?fields=name,profile_pic&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error.response?.data || error.message);
    // Return default values if we can't get the profile
    return {
      name: 'Facebook User',
      profile_pic: null
    };
  }
}; 