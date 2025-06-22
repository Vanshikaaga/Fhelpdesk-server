const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation.model');

// GET /api/conversations/:conversationId/customer
router.get('/:conversationId/customer', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const customer = {
      email: conversation.email || null,
      firstName: conversation.firstName || null,
      lastName: conversation.lastName || null,
      name: conversation.customerName || null,
      picture: conversation.customerPicture || null
    };

    res.status(200).json({ customer });
  } catch (err) {
    console.error('Error fetching customer info:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
