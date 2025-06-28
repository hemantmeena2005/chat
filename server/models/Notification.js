const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['like', 'comment'], required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  text: { type: String }, // for comment notifications
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema); 