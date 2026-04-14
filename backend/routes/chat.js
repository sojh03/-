const express = require('express');
const jwt = require('jsonwebtoken');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const ProductPost = require('../models/ProductPost');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// 채팅방 시작
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await ProductPost.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    let room = await ChatRoom.findOne({ post: postId, buyer: req.user.id, seller: post.author });
    if (!room) {
      room = new ChatRoom({
        post: postId,
        buyer: req.user.id,
        seller: post.author,
        lastRead: new Map([[req.user.id, new Date()], [post.author.toString(), new Date(0)]])
      });
      await room.save();
    }
    res.json({ roomId: room._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 내 채팅방 목록 (안 읽은 메시지 수 포함)
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }]
    })
      .populate('buyer', 'userId')
      .populate('seller', 'userId')
      .populate('post', 'title imagePath price status')
      .sort({ updatedAt: -1 });

    // 각 방의 안 읽은 메시지 수 계산
    const roomsWithUnread = await Promise.all(rooms.map(async (room) => {
      const lastRead = room.lastRead?.get(req.user.id) || new Date(0);
      const unreadCount = await Message.countDocuments({
        chatRoom: room._id,
        sender: { $ne: req.user.id },
        createdAt: { $gt: lastRead }
      });
      return { ...room.toObject(), unreadCount };
    }));

    res.json(roomsWithUnread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 전체 안 읽은 메시지 수 (Navbar 뱃지용)
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }]
    });

    let total = 0;
    for (const room of rooms) {
      const lastRead = room.lastRead?.get(req.user.id) || new Date(0);
      const count = await Message.countDocuments({
        chatRoom: room._id,
        sender: { $ne: req.user.id },
        createdAt: { $gt: lastRead }
      });
      total += count;
    }

    res.json({ unreadCount: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 채팅방 읽음 처리
router.post('/:roomId/read', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.buyer.toString() !== req.user.id && room.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    room.lastRead.set(req.user.id, new Date());
    await room.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 메시지 조회
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.buyer.toString() !== req.user.id && room.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const messages = await Message.find({ chatRoom: req.params.roomId })
      .populate('sender', 'userId')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 메시지 전송
router.post('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.buyer.toString() !== req.user.id && room.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const msg = new Message({
      chatRoom: room._id,
      sender: req.user.id,
      content: req.body.content
    });
    await msg.save();

    room.lastMessage = req.body.content;
    room.updatedAt = Date.now();
    // 보낸 사람은 읽음 처리
    room.lastRead.set(req.user.id, new Date());
    await room.save();

    const populated = await msg.populate('sender', 'userId');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 판매완료 처리 (판매자만)
router.post('/:roomId/complete', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.seller.toString() !== req.user.id)
      return res.status(403).json({ message: '판매자만 판매완료 처리할 수 있습니다' });

    const post = await ProductPost.findById(room.post);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.status === 'SoldOut')
      return res.status(400).json({ message: '이미 판매완료된 상품입니다' });

    post.status = 'SoldOut';
    await post.save();
    res.json({ message: '판매완료 처리되었습니다', buyerId: room.buyer, sellerId: room.seller, postId: room.post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
