const axios = require('axios');
const Page = require('../models/page.model');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const authConfig = require('../config/auth.config');
const { processWebhookEvent } = require('../utils/facebook.utils');

// Facebook Graph API base URL
const FB_GRAPH_API_BASE = `https://graph.facebook.com/${authConfig.facebook.graphApiVersion}`;

// Verify webhook for Facebook
exports.verifyWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === authConfig.facebook.webhookVerifyToken) {
      console.log('Webhook verified');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed');
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return res.sendStatus(500);
  }
};

// Handle incoming webhook events
exports.handleWebhook = async (req, res) => {
  try {
    // Return a 200 OK response immediately to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
    
    const body = req.body;
    
    // Checks if this is a page webhook event
    if (body.object === 'page') {
      // Process each entry (may contain multiple webhook events)
      for (const entry of body.entry) {
        const pageId = entry.id;
        
        // Process each messaging event
        if (entry.messaging) {
          for (const webhookEvent of entry.messaging) {
            await processWebhookEvent(pageId, webhookEvent);
          }
        }
      }
    } else {
      console.log('Received non-page webhook event');
    }
  } catch (error) {
    console.error('Webhook handling error:', error);
  }
};

// Connect a Facebook page
exports.connectPage = async (req, res) => {
  try {
    const { pageId, pageName, pageAccessToken } = req.body;
    const userId = req.userId;
    
    // Check if page is already connected by this user
    const existingPage = await Page.findOne({ 
      userId, 
      pageId 
    });
    
    if (existingPage) {
      if (existingPage.status === 'connected') {
        return res.status(400).json({
          success: false,
          message: 'This page is already connected'
        });
      } else {
        // Re-connect a previously disconnected page
        existingPage.status = 'connected';
        existingPage.pageAccessToken = pageAccessToken;
        await existingPage.save();
        
        return res.status(200).json({
          success: true,
          message: 'Page reconnected successfully',
          page: {
            id: existingPage._id,
            pageId: existingPage.pageId,
            pageName: existingPage.pageName,
            status: existingPage.status
          }
        });
      }
    }
    
    // Create a new page connection
    const newPage = new Page({
      userId,
      pageId,
      pageName,
      pageAccessToken,
      status: 'connected'
    });
    
    await newPage.save();
    
    // Subscribe the app to the page to receive webhooks
    await subscribeToPageWebhooks(pageId, pageAccessToken);
    
    return res.status(201).json({
      success: true,
      message: 'Page connected successfully',
      page: {
        id: newPage._id,
        pageId: newPage.pageId,
        pageName: newPage.pageName,
        status: newPage.status
      }
    });
  } catch (error) {
    console.error('Connect page error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while connecting the page'
    });
  }
};

// Disconnect a Facebook page
exports.disconnectPage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const userId = req.userId;
    
    const page = await Page.findOne({ userId, pageId });
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }
    
    page.status = 'disconnected';
    await page.save();
    
    return res.status(200).json({
      success: true,
      message: 'Page disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect page error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while disconnecting the page'
    });
  }
};

// Get all connected pages for a user
exports.getConnectedPages = async (req, res) => {
  try {
    const userId = req.userId;
    
    const pages = await Page.find({
      userId,
      status: 'connected'
    }).select('-pageAccessToken');
    
    return res.status(200).json({
      success: true,
      pages
    });
  } catch (error) {
    console.error('Get connected pages error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching connected pages'
    });
  }
};

// Helper function to subscribe the app to page webhooks
const subscribeToPageWebhooks = async (pageId, pageAccessToken) => {
  try {
    const subscribeUrl = `${FB_GRAPH_API_BASE}/${pageId}/subscribed_apps`;
    const data = {
      access_token: pageAccessToken,
      subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads'
    };
    
    const response = await axios.post(subscribeUrl, data);
    console.log(`Successfully subscribed to ${pageId} webhooks:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Failed to subscribe to ${pageId} webhooks:`, error.response?.data || error.message);
    throw error;
  }
};

// Exchange short-lived token for long-lived token and get pages
exports.exchangeToken = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const userId = req.userId;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Exchange short-lived token for long-lived token
    const exchangeUrl = `${FB_GRAPH_API_BASE}/oauth/access_token`;
    const exchangeParams = {
      grant_type: 'fb_exchange_token',
      client_id: authConfig.facebook.appId,
      client_secret: authConfig.facebook.appSecret,
      fb_exchange_token: accessToken
    };
    
    const exchangeResponse = await axios.get(exchangeUrl, { params: exchangeParams });
    const longLivedToken = exchangeResponse.data.access_token;
    
    // Get user's Facebook pages
    const pagesUrl = `${FB_GRAPH_API_BASE}/me/accounts`;
    const pagesResponse = await axios.get(pagesUrl, {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,access_token,category'
      }
    });
    
    const pages = pagesResponse.data.data;
    
    return res.status(200).json({
      success: true,
      message: 'Token exchanged successfully',
      pages
    });
  } catch (error) {
  console.error('Token exchange error:', error.response?.data || error.message);
  return res.status(500).json({
    success: false,
    message: 'An error occurred while exchanging the token',
    error: error.response?.data || error.message
  });
}

}; 