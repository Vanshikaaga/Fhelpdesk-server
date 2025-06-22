const express = require('express');
const messageController = require('../controllers/message.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { validateMessage, handleValidationErrors } = require('../middlewares/validations');

const router = express.Router();

// Get all conversations for a page
router.get(
  '/pages/:pageId/conversations',
  verifyToken,
  messageController.getConversations
);
router.get(
  '/conversations',
  verifyToken,
  async (req, res) => {
    const { pageId } = req.query;
    if (!pageId) {
      return res.status(400).json({ error: 'Missing pageId in query' });
    }

    // Mock or call the actual controller logic
    req.params.pageId = pageId;
    return messageController.getConversations(req, res);
  }
);

// Get a single conversation with messages
router.get(
  '/conversations/:conversationId',
  verifyToken,
  messageController.getConversation
);

// Send a message to a customer
router.post(
  '/conversations/:conversationId/messages',
  verifyToken,
  validateMessage,
  handleValidationErrors,
  messageController.sendMessage
);

module.exports = router; 