const express = require('express');
const jwt = require('jsonwebtoken');
const Report = require('../models/Report');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const { detectJwtForgery } = require('../middleware/attackDetector');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { detectJwtForgery(req, token); res.status(401).json({ message: 'Token is not valid' }); }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ message: 'Admins only' });
  next();
};

// 신고 접수
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { targetType, targetId, targetName, reason } = req.body;
    const report = new Report({
      reporter: req.user.id,
      targetType,
      targetId,
      targetName: targetName || '',
      reason
    });
    await report.save();
    res.status(201).json({ message: '신고가 접수되었습니다' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 신고 목록 (관리자)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('reporter', 'userId')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 신고 처리 완료 (관리자)
router.put('/:id/resolve', authMiddleware, adminOnly, async (req, res) => {
  try {
    await Report.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ message: '처리 완료' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
