require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const FriendRequest = require('./models/FriendRequest');
const Post = require('./models/Post');
const Notification = require('./models/Notification');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  }
});

mongoose.connect('mongodb+srv://imt2022049:imt2022049@cluster0.miinw.mongodb.net/chatttt?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected')).catch(console.error);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Set up multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
  }
});

// In-memory user and message storage
let messages = {}; // { 'user1-user2': [ { from, to, text } ] }

// Track connected sockets by username
const userSockets = {};

// User search endpoint
app.get('/users', async (req, res) => {
  const q = req.query.q?.toLowerCase() || '';
  const users = await User.find({ username: { $regex: q, $options: 'i' } }).select('username -_id');
  res.json(users.map(u => u.username));
});

// Signup endpoint
app.post('/signup', async (req, res) => {
  try {
    const { username, password, profilePic } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    const user = new User({ username, password, profilePic });
    await user.save();
    res.status(201).json({ username: user.username, profilePic: user.profilePic });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed.' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    res.json({ username: user.username, profilePic: user.profilePic });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Get user profile by username
app.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('username profilePic');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Create a post (with file upload support)
app.post('/posts', upload.single('imageFile'), async (req, res) => {
  try {
    const { author, caption } = req.body;
    let image = req.body.image;
    if (req.file) {
      image = req.file.path; // Cloudinary URL
    }
    if (!author || (!image && !caption)) {
      return res.status(400).json({ error: 'Author and at least image or caption required.' });
    }
    const post = new Post({ author, image, caption });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// Get all posts (feed)
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// Like/unlike a post
app.post('/posts/:id/like', async (req, res) => {
  try {
    const { username } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const liked = post.likes.includes(username);
    if (liked) {
      post.likes = post.likes.filter(u => u !== username);
    } else {
      post.likes.push(username);
      // Create notification if not liking own post
      if (post.author !== username) {
        const notification = await Notification.create({
          type: 'like',
          postId: post._id,
          from: username,
          to: post.author
        });
        // Emit real-time notification
        if (userSockets[post.author]) {
          io.to(userSockets[post.author]).emit('notification', notification);
        }
      }
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to like/unlike post.' });
  }
});

// Comment on a post
app.post('/posts/:id/comment', async (req, res) => {
  try {
    const { username, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.comments.push({ user: username, text });
    await post.save();
    // Create notification if not commenting on own post
    if (post.author !== username) {
      const notification = await Notification.create({
        type: 'comment',
        postId: post._id,
        from: username,
        to: post.author,
        text
      });
      // Emit real-time notification
      if (userSockets[post.author]) {
        io.to(userSockets[post.author]).emit('notification', notification);
      }
    }
    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to comment.' });
  }
});

// Mark all notifications as read for a user
app.post('/notifications/mark-read', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    await Notification.updateMany({ to: username, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

// Get notifications for a user
app.get('/notifications', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const notifications = await Notification.find({ to: username }).sort({ createdAt: -1 }).populate('postId');
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Socket.io events
io.on('connection', (socket) => {
  let currentUser = null;
  let currentUserId = null;

  socket.on('login', async (username) => {
    if (!username) return;
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }
    currentUser = user.username;
    currentUserId = user._id;
    socket.username = currentUser;
    socket.userId = currentUserId;
    userSockets[currentUser] = socket.id;
    socket.broadcast.emit('user_online', currentUser);
  });

  socket.on('send_message', async ({ to, text, replyTo }) => {
    if (!currentUser) return;
    const fromUser = await User.findOne({ username: currentUser });
    const toUser = await User.findOne({ username: to });
    if (!fromUser || !toUser) return;
    // Create and save the message
    const msgDoc = await Message.create({
      from: fromUser._id,
      to: toUser._id,
      text,
      replyTo: replyTo || null
    });
    // Populate replyTo for real-time emit
    await msgDoc.populate({ path: 'replyTo', select: 'text from' });
    const msg = {
      _id: msgDoc._id,
      from: currentUser,
      to,
      text,
      replyTo: msgDoc.replyTo ? {
        _id: msgDoc.replyTo._id,
        text: msgDoc.replyTo.text,
        from: msgDoc.replyTo.from
      } : null,
      createdAt: msgDoc.createdAt
    };
    // Send to both users if connected
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('receive_message', msg);
    }
    if (userSockets[currentUser]) {
      io.to(userSockets[currentUser]).emit('receive_message', msg);
    }
  });

  socket.on('get_messages', async ({ withUser }) => {
    if (!currentUser) return;
    const fromUser = await User.findOne({ username: currentUser });
    const toUser = await User.findOne({ username: withUser });
    if (!fromUser || !toUser) return;
    const msgs = await Message.find({
      $or: [
        { from: fromUser._id, to: toUser._id },
        { from: toUser._id, to: fromUser._id }
      ]
    }).sort({ createdAt: 1 }).populate({ path: 'replyTo', select: 'text from' });
    const formatted = msgs.map(m => ({
      _id: m._id,
      from: m.from.equals(fromUser._id) ? currentUser : withUser,
      to: m.to.equals(fromUser._id) ? currentUser : withUser,
      text: m.text,
      replyTo: m.replyTo ? {
        _id: m.replyTo._id,
        text: m.replyTo.text,
        from: m.replyTo.from
      } : null,
      createdAt: m.createdAt
    }));
    socket.emit('chat_history', formatted);
  });

  socket.on('get_all_messages', () => {
    socket.emit('all_messages', messages);
  });

  // Friend request events
  socket.on('send_friend_request', async ({ to }) => {
    if (!currentUser || !to || currentUser === to) return;
    const toUser = await User.findOne({ username: to });
    const fromUser = await User.findOne({ username: currentUser });
    if (!toUser || !fromUser) return;
    // Check if already friends
    if (fromUser.friends.includes(toUser._id)) return;
    // Check if request already exists
    const existing = await FriendRequest.findOne({ from: fromUser._id, to: toUser._id, status: 'pending' });
    if (existing) return;
    await FriendRequest.create({ from: fromUser._id, to: toUser._id });
    // Notify the recipient in real time
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('friend_request_received', { from: currentUser });
    }
  });

  socket.on('get_friend_requests', async () => {
    if (!currentUser) return;
    const user = await User.findOne({ username: currentUser });
    const requests = await FriendRequest.find({ to: user._id, status: 'pending' }).populate('from', 'username');
    socket.emit('friend_requests', requests.map(r => r.from.username));
  });

  socket.on('accept_friend_request', async ({ from }) => {
    if (!currentUser || !from) return;
    const toUser = await User.findOne({ username: currentUser });
    const fromUser = await User.findOne({ username: from });
    if (!toUser || !fromUser) return;
    const request = await FriendRequest.findOneAndUpdate(
      { from: fromUser._id, to: toUser._id, status: 'pending' },
      { status: 'accepted' }
    );
    if (!request) return;
    // Add each other as friends
    if (!toUser.friends.includes(fromUser._id)) toUser.friends.push(fromUser._id);
    if (!fromUser.friends.includes(toUser._id)) fromUser.friends.push(toUser._id);
    await toUser.save();
    await fromUser.save();
    // Notify both users
    const toFriends = await User.findById(toUser._id).populate('friends', 'username');
    const fromFriends = await User.findById(fromUser._id).populate('friends', 'username');
    socket.emit('friends_updated', toFriends.friends.map(f => f.username));
    // Optionally notify the sender
  });

  socket.on('get_friends', async () => {
    if (!currentUser) return;
    const user = await User.findOne({ username: currentUser }).populate('friends', 'username');
    socket.emit('friends', user.friends.map(f => f.username));
  });

  // Message deletion
  socket.on('delete_message', async ({ messageId }) => {
    if (!currentUserId || !messageId) return;
    const msg = await Message.findById(messageId);
    if (!msg) return;
    // Only allow sender to delete for everyone, or allow both to hide for themselves
    if (msg.from.equals(currentUserId)) {
      await Message.deleteOne({ _id: messageId });
      io.emit('message_deleted', { messageId });
    } else {
      // Hide for this user only
      if (!msg.deletedBy.includes(currentUserId)) {
        msg.deletedBy.push(currentUserId);
        await msg.save();
      }
      socket.emit('message_deleted', { messageId });
    }
  });

  // Mark messages as read when chat is opened
  socket.on('mark_read', async ({ withUser }) => {
    if (!currentUser || !withUser) return;
    const fromUser = await User.findOne({ username: currentUser });
    const toUser = await User.findOne({ username: withUser });
    if (!fromUser || !toUser) return;
    await Message.updateMany({ from: toUser._id, to: fromUser._id, unread: true }, { unread: false });
  });

  // Unread count for all conversations
  socket.on('get_unread_counts', async () => {
    if (!currentUserId) return;
    const msgs = await Message.find({ to: currentUserId, unread: true });
    const counts = {};
    msgs.forEach(m => {
      counts[m.from.toString()] = (counts[m.from.toString()] || 0) + 1;
    });
    socket.emit('unread_counts', counts);
  });

  // Typing indicator events
  socket.on('typing', ({ to }) => {
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('typing', { from: currentUser });
    }
  });
  socket.on('stop_typing', ({ to }) => {
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('stop_typing', { from: currentUser });
    }
  });

  // Attach username to socket for direct emits
  socket.username = currentUser;

  socket.on('disconnect', () => {
    if (currentUser && userSockets[currentUser]) {
      delete userSockets[currentUser];
    }
    // Optionally handle user offline
  });
});

const PORT = 5050;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
}); 