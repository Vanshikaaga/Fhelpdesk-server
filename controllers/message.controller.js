const axios = require('axios');
const Page = require('../models/page.model');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const authConfig = require('../config/auth.config');

// Facebook Graph API base URL
const FB_GRAPH_API_BASE = `https://graph.facebook.com/${authConfig.facebook.graphApiVersion}`;

// Get all conversations for a page
exports.getConversations = async (req, res) => {
  try {
    const { pageId } = req.params;
    const userId = req.userId;
    
    // Check if the page belongs to the user
    const page = await Page.findOne({ userId, pageId, status: 'connected' });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found or not connected'
      });
    }
    
    // Get conversations sorted by last message timestamp (newest first)
    const conversations = await Conversation.find({ pageId })
      .sort({ lastMessageTimestamp: -1 });
    
    return res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching conversations'
    });
  }
};

// Get a single conversation with messages
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    
    // Get the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Check if the conversation's page belongs to the user
    const page = await Page.findOne({
      userId,
      pageId: conversation.pageId,
      status: 'connected'
    });
    
    if (!page) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this conversation'
      });
    }
    
    // Get messages for this conversation
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 });
    
    // Mark unread messages as read
    await Message.updateMany(
      { conversationId, read: false, sender: 'customer' },
      { $set: { read: true } }
    );
    
    return res.status(200).json({
      success: true,
      conversation,
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the conversation'
    });
  }
};

// Send a message to a customer
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.userId;
    
    // Get the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Check if the conversation's page belongs to the user
    const page = await Page.findOne({
      userId,
      pageId: conversation.pageId,
      status: 'connected'
    });
    
    if (!page) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this conversation'
      });
    }
    
    // Send message to Facebook
    const messageId = await sendFacebookMessage(
      page.pageId,
      page.pageAccessToken,
      conversation.customerId,
      content
    );
    
    // Create message record in database
    const message = new Message({
      conversationId,
      messageId,
      sender: 'user',
      senderId: userId,
      content,
      timestamp: new Date(),
      read: true
    });
    
    await message.save();
    
    // Update conversation's last message timestamp
    conversation.lastMessageTimestamp = new Date();
    await conversation.save();
    
    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending the message'
    });
  }
};

// Helper function to send a message through Facebook Messenger API
const sendFacebookMessage = async (pageId, pageAccessToken, recipientId, text) => {
  try {
    const url = `${FB_GRAPH_API_BASE}/${pageId}/messages`;
    const data = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
      access_token: pageAccessToken
    };
    
    const response = await axios.post(url, data);
    console.log('Message sent successfully:', response.data);
    return response.data.message_id;
  } catch (error) {
    console.error('Facebook send message error:', error.response?.data || error.message);
    throw error;
  }
}; 