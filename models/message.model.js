const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  sender: {
    type: String,
    enum: ['user', 'customer'],
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster message lookup within a conversation
messageSchema.index({ conversationId: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 