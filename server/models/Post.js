const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  author: { type: String, required: true },
  image: { type: String },
  caption: { type: String },
  likes: [{ type: String }], // usernames
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema); 