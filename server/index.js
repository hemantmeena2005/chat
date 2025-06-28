const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const FriendRequest = require('./models/FriendRequest');

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

  socket.on('send_message', ({ to, text }) => {
    if (!currentUser) return;
    const key = [currentUser, to].sort().join('-');
    if (!messages[key]) messages[key] = [];
    const msg = { from: currentUser, to, text };
    messages[key].push(msg);
    // Send to both users if connected
    if (userSockets[to]) {
      io.to(userSockets[to]).emit('receive_message', msg);
    }
    if (userSockets[currentUser]) {
      io.to(userSockets[currentUser]).emit('receive_message', msg);
    }
  });

  socket.on('get_messages', ({ withUser }) => {
    if (!currentUser) return;
    const key = [currentUser, withUser].sort().join('-');
    socket.emit('chat_history', messages[key] || []);
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