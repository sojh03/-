const express = require('express');
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const MannerReview = require('../models/MannerReview');
const ChatRoom = require('../models/ChatRoom');
const ProductPost = require('../models/ProductPost');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const { detectJwtForgery } = require('../middleware/attackDetector');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { detectJwtForgery(req, token); res.status(401).json({ message: 'Token is not valid' }); }
};

// 후기 작성
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { postId, rating, comment } = req.body;
    const post = await ProductPost.findById(postId).populate('author');
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    if (post.status !== 'SoldOut') return res.status(400).json({ message: '판매 완료된 상품만 후기를 남길 수 있습니다' });
    if (String(post.author._id) === req.user.id) return res.status(400).json({ message: '본인 게시글에 후기를 남길 수 없습니다' });

    const review = new Review({
      post: postId,
      reviewer: req.user.id,
      reviewee: post.author._id,
      rating: Number(rating),
      comment: comment || ''
    });
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: '이미 후기를 작성하셨습니다' });
    res.status(500).json({ error: err.message });
  }
});

// 특정 유저가 받은 후기 목록
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const reviews = await Review.find({ reviewee: user._id })
      .populate('reviewer', 'userId profileImage')
      .populate('post', 'title')
      .sort({ createdAt: -1 });
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;
    res.json({ reviews, average: avg, count: reviews.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 특정 게시글의 후기
router.get('/post/:postId', async (req, res) => {
  try {
    const reviews = await Review.find({ post: req.params.postId })
      .populate('reviewer', 'userId profileImage')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 매너 리뷰 작성 (추천/비추천)
router.post('/manner', authMiddleware, async (req, res) => {
  try {
    const { roomId, recommend } = req.body;
    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });

    const isBuyer = room.buyer.toString() === req.user.id;
    const isSeller = room.seller.toString() === req.user.id;
    if (!isBuyer && !isSeller) return res.status(403).json({ message: '참여자가 아닙니다' });

    const post = await ProductPost.findById(room.post);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    if (post.status !== 'SoldOut') return res.status(400).json({ message: '판매 완료된 거래만 후기를 남길 수 있습니다' });

    const revieweeId = isBuyer ? room.seller : room.buyer;

    const mannerReview = new MannerReview({
      post: room.post,
      reviewer: req.user.id,
      reviewee: revieweeId,
      recommend
    });
    await mannerReview.save();

    // mannerTemp 업데이트: 추천 +0.1, 비추천 -0.1
    // $inc 대신 직접 읽어서 계산 (기존 유저가 DB에 필드가 없는 경우 36.5 기본값 사용)
    const delta = recommend ? 0.1 : -0.1;
    const revieweeUser = await User.findById(revieweeId);
    const currentTemp = revieweeUser.mannerTemp ?? 36.5;
    const newTemp = parseFloat((currentTemp + delta).toFixed(1));
    await User.findByIdAndUpdate(revieweeId, { $set: { mannerTemp: newTemp } });

    res.status(201).json({ message: '후기가 등록되었습니다' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: '이미 후기를 작성하셨습니다' });
    res.status(500).json({ error: err.message });
  }
});

// 이미 매너 리뷰를 작성했는지 확인
router.get('/manner/check/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });

    const existing = await MannerReview.findOne({ post: room.post, reviewer: req.user.id });
    res.json({ reviewed: !!existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
