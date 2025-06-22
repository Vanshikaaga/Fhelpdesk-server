const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: true,
    ref: 'Page'
  },
  customerId: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: 'Unknown'
  },
  customerPicture: {
    type: String,
    default: null
  },
  firstName: {
    type: String,
    default: null
  },
  lastName: {
    type: String,
    default: null
  },
  email: { type: String, default: null },

  lastMessageTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  }
}, {
  timestamps: true
});

// Compound index
conversationSchema.index({ pageId: 1, customerId: 1 });
// Sort index
conversationSchema.index({ lastMessageTimestamp: -1 });

// Optional unique constraint
// conversationSchema.index({ pageId: 1, customerId: 1 }, { unique: true });

// Optional virtual
conversationSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.customerName || 'Unknown';
});
conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
