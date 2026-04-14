const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/User');

const router = express.Router();
// [VULN] JWT Weak Secret: 추측하기 쉬운 단순 문자열 사용
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// 프로필 이미지 업로드
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'profile-' + Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

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
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // [VULN] JWT No Expiration: expiresIn 제거로 토큰 영구 유효
    const token = jwt.sign(
      { id: user._id, userId: user.userId, role: user.role },
      JWT_SECRET
    );
    console.log(`[DEBUG] Login success for: ${userId}`);
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

module.exports = router;
