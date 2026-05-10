const express = require('express');
const Report = require('../models/Report');

const router = express.Router();

const { authMiddleware } = require('../middleware/auth');

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
