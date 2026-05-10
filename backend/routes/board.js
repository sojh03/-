const express = require('express');
const ProductPost = require('../models/ProductPost');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const { detectMaliciousUpload, detectIdor } = require('../middleware/attackDetector');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    detectMaliciousUpload(req, file.originalname);
    cb(null, Date.now() + '-' + file.originalname);
  }
});
// [VULN] File Upload: fileFilter 없음 — .html/.js 등 모든 파일 허용
const upload = multer({ storage });

const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) { try { req.user = jwt.verify(token, JWT_SECRET); } catch {} }
  next();
};

// ── 목록 조회 ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { adminView, keyword, category, minPrice, maxPrice } = req.query;
    let query = adminView === 'true' ? {} : { status: { $ne: 'Hidden' } };

    if (keyword?.trim()) {
      const re = new RegExp(keyword.trim(), 'i');
      query.$or = [{ title: re }, { content: re }];
    }
    if (category && category !== '전체') query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const posts = await ProductPost.find(query)
      .populate('author', 'userId profileImage')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 게시글 생성 ───────────────────────────────────────
router.post('/', authMiddleware,
  upload.fields([{ name: 'images', maxCount: 5 }, { name: 'image', maxCount: 1 }, { name: 'manual', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { title, content, price, category, condition, tradeType } = req.body;
      const imagePaths = (req.files['images'] || req.files['image'] || []).map(f => f.filename);
      const manualPath = req.files['manual']?.[0]?.filename || null;

      const post = new ProductPost({
        title, content, price: Number(price),
        category: category || '기타',
        condition: condition || '중고',
        tradeType: tradeType || '상관없음',
        author: req.user.id,
        imagePath: imagePaths[0] || null,
        imagePaths,
        manualPath
      });
      await post.save();
      res.status(201).json(post);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// ── 단일 조회 (조회수 증가) ───────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await ProductPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'userId profileImage');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 게시글 수정 ───────────────────────────────────────
router.put('/:id', authMiddleware,
  upload.fields([{ name: 'images', maxCount: 5 }]),
  async (req, res) => {
  try {
    const post = await ProductPost.findById(req.params.id).populate('author', 'userId');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // [VULN] IDOR: 소유권 검사 없음 — 탐지만 하고 차단하지 않음
    detectIdor(req, req.user.id, req.user.userId, post.author._id, post.author.userId);
    const { title, content, price, status, category, condition, tradeType, remainingPaths } = req.body;
    if (title !== undefined)     post.title     = title;
    if (content !== undefined)   post.content   = content;
    if (price !== undefined)     post.price     = Number(price);
    if (status !== undefined)    post.status    = status;
    if (category !== undefined)  post.category  = category;
    if (condition !== undefined) post.condition = condition;
    if (tradeType !== undefined) post.tradeType = tradeType;

    // 이미지 수정: 기존 유지 목록 + 새 업로드 합치기
    if (remainingPaths !== undefined || req.files?.images) {
      const kept = remainingPaths ? JSON.parse(remainingPaths) : post.imagePaths;
      const newFiles = (req.files?.images || []).map(f => f.filename);
      post.imagePaths = [...kept, ...newFiles];
      post.imagePath  = post.imagePaths[0] || null;
    }

    await post.save();
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 게시글 삭제 ───────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await ProductPost.findById(req.params.id).populate('author', 'userId');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // [VULN] IDOR: 소유권 검사 없음 — 탐지만 하고 차단하지 않음
    detectIdor(req, req.user.id, req.user.userId, post.author._id, post.author.userId);
    await ProductPost.deleteOne({ _id: post._id });
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 찜 토글 ──────────────────────────────────────────
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await ProductPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const uid = req.user.id;
    const idx = post.likes.findIndex(l => String(l) === uid);
    const update = idx === -1
      ? { $addToSet: { likes: uid } }
      : { $pull: { likes: uid } };
    // findByIdAndUpdate를 사용해 createdAt/bumpedAt 변경 없이 likes만 수정
    const updated = await ProductPost.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ liked: idx === -1, likeCount: updated.likes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 끌어올리기 ────────────────────────────────────────
router.post('/:id/bump', authMiddleware, async (req, res) => {
  try {
    const post = await ProductPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (String(post.author) !== req.user.id)
      return res.status(403).json({ message: '본인 게시글만 끌어올릴 수 있습니다' });

    const BUMP_COOLDOWN = 60 * 60 * 1000; // 1시간
    if (post.bumpedAt && Date.now() - post.bumpedAt.getTime() < BUMP_COOLDOWN) {
      const remaining = Math.ceil((BUMP_COOLDOWN - (Date.now() - post.bumpedAt.getTime())) / 60000);
      return res.status(429).json({ message: `${remaining}분 후에 다시 끌어올릴 수 있습니다` });
    }
    post.bumpedAt = new Date();
    await post.save();
    res.json({ message: '끌어올리기 완료!', bumpedAt: post.bumpedAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 파일 다운로드 ─────────────────────────────────────
router.get('/download/:filename', (req, res) => {
  // [VULN] Path Traversal: 경로 검증 없음
  const file = path.join(__dirname, '..', 'uploads', req.params.filename);
  res.download(file);
});

module.exports = router;
