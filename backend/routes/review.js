const express = require('express');
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const ProductPost = require('../models/ProductPost');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Token is not valid' }); }
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

module.exports = router;
