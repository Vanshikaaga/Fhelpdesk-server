const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pageName: {
    type: String,
    required: true,
    trim: true
  },
  pageId: {
    type: String,
    required: true,
    unique: true
  },
  pageAccessToken: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected'],
    default: 'connected'
  }
}, {
  timestamps: true
});

// Index for faster lookups
pageSchema.index({ userId: 1, pageId: 1 });

const Page = mongoose.model('Page', pageSchema);

module.exports = Page; 