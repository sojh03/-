const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/User');
const ProductPost = require('../models/ProductPost');
const Review = require('../models/Review');
const { logAuth } = require('../middleware/logger');
const { trackLoginFailure, detectJwtForgery } = require('../middleware/attackDetector');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 프로필 이미지 업로드
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'profile-' + Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 아이디 중복 확인
router.get('/check-id', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !userId.trim()) return res.status(400).json({ message: '아이디를 입력하세요' });
    const exists = await User.findOne({ userId: userId.trim() });
    res.json({ available: !exists });
  } catch (error) {
    res.status(500).json({ message: 'Error checking userId', error: error.message });
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { userId, password, securityAnswer } = req.body;
    console.log(`[DEBUG] Attempting register for: ${userId}`);
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      console.log(`[DEBUG] Register failed: User ${userId} already exists.`);
      return res.status(400).json({ message: 'User already exists' });
    }
    const newUser = new User({ userId, password, securityAnswer, role: 'User' });
    await newUser.save();
    console.log(`[DEBUG] Register success for: ${userId}`);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('[DEBUG] Registration Error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message || error });
  }
});

// 관리자 생성
router.post('/admin-create', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden: Admins only' });
    const { userId, password, securityAnswer } = req.body;
    const existingUser = await User.findOne({ userId });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const newUser = new User({ userId, password, securityAnswer, role: 'Admin' });
    await newUser.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    console.log(`[DEBUG] Login attempt for: ${userId}`);
    // [VULN] NoSQL Injection: req.body 값을 타입 검증 없이 MongoDB 쿼리에 직접 전달
    // 공격: {"userId": "admin", "password": {"$ne": ""}} 전송 시 인증 우회
    const user = await User.findOne({ userId: userId, password: password });
    if (!user) {
      console.log(`[DEBUG] Login failed: User ${userId} not found or password mismatch.`);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      logAuth({ event: 'LOGIN_FAIL', ip, userId: String(userId) });
      trackLoginFailure(ip, String(userId));
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.isBanned) {
      console.log(`[DEBUG] Login blocked: User ${userId} is banned.`);
      return res.status(403).json({ message: '로그인이 제한된 계정입니다. 관리자에게 문의하세요.' });
    }
    // [VULN] JWT No Expiration: expiresIn 제거로 토큰 영구 유효
    const token = jwt.sign(
      { id: user._id, userId: user.userId, role: user.role },
      JWT_SECRET
    );
    console.log(`[DEBUG] Login success for: ${userId}`);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logAuth({ event: 'LOGIN_SUCCESS', ip, userId: user.userId, role: user.role });
    res.json({ token, role: user.role, userId: user.userId, profileImage: user.profileImage || '' });
  } catch (error) {
    console.error('[DEBUG] Login Error:', error);
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// 비밀번호 찾기
router.post('/find-password', async (req, res) => {
  try {
    const { userId, securityAnswer } = req.body;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.securityAnswer !== securityAnswer) return res.status(400).json({ message: 'Security answer is incorrect' });
    res.json({ message: 'Success', password: user.password });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving password', error });
  }
});

// 내 정보 조회
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 프로필 이미지 업로드
router.put('/profile-image', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findById(req.user.id);
    user.profileImage = req.file.filename;
    await user.save();
    res.json({ profileImage: user.profileImage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 비밀번호 변경 (현재 비밀번호 확인 필요)
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password !== currentPassword) {
      return res.status(400).json({ message: '현재 비밀번호가 틀립니다' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: '비밀번호가 변경되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 보안 답변 변경 (현재 비밀번호 확인 필요)
router.put('/change-security', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newSecurityAnswer } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password !== currentPassword) {
      return res.status(400).json({ message: '비밀번호가 틀립니다' });
    }
    user.securityAnswer = newSecurityAnswer;
    await user.save();
    res.json({ message: '보안 답변이 변경되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 판매자 공개 프로필
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('-password -securityAnswer');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const posts = await ProductPost.find({ author: user._id, status: { $ne: 'Hidden' } })
      .sort({ bumpedAt: -1 }).select('title price status imagePath imagePaths category createdAt views likes');
    const reviews = await Review.find({ reviewee: user._id })
      .populate('reviewer', 'userId profileImage').populate('post', 'title').sort({ createdAt: -1 });
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
    res.json({ user, posts, reviews, reviewAverage: avg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 관리자 전용 미들웨어 ──────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ message: 'Admins only' });
  next();
};

// 전체 유저 목록 조회
router.get('/admin/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    const postCounts = await ProductPost.aggregate([
      { $group: { _id: '$author', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(postCounts.map(p => [String(p._id), p.count]));
    const result = users.map(u => ({ ...u, postCount: countMap[String(u._id)] || 0 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 밴 / 언밴 토글
router.put('/admin/users/:id/ban', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'Admin') return res.status(400).json({ message: '관리자 계정은 밴할 수 없습니다' });
    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ isBanned: user.isBanned, message: user.isBanned ? '계정이 제한되었습니다' : '제한이 해제되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 역할 변경 (User ↔ Admin)
router.put('/admin/users/:id/role', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user._id) === req.user.id) return res.status(400).json({ message: '자신의 역할은 변경할 수 없습니다' });
    user.role = user.role === 'Admin' ? 'User' : 'Admin';
    await user.save();
    res.json({ role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 비밀번호 초기화
router.put('/admin/users/:id/reset-password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: '새 비밀번호를 입력하세요' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ message: '비밀번호가 초기화되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 매너온도 초기화
router.put('/admin/users/:id/reset-manner', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.mannerTemp = 36.5;
    await user.save();
    res.json({ message: `${user.userId}의 매너온도가 36.5°C로 초기화되었습니다` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 유저 삭제
router.delete('/admin/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user._id) === req.user.id) return res.status(400).json({ message: '자신의 계정은 삭제할 수 없습니다' });
    if (user.role === 'Admin') return res.status(400).json({ message: '관리자 계정은 삭제할 수 없습니다' });
    await ProductPost.deleteMany({ author: user._id });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '계정과 게시글이 삭제되었습니다' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
