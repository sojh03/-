const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const LOG_DIR = path.join(__dirname, '../logs');

const { detectJwtForgery } = require('../middleware/attackDetector');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { detectJwtForgery(req, token); res.status(401).json({ message: 'Invalid token' }); }
};

const adminOnly = async (req, res, next) => {
  if (req.user?.role !== 'Admin') return res.status(403).json({ message: 'Admin only' });
  try {
    const dbUser = await User.findById(req.user.id).select('role').lean();
    if (!dbUser || dbUser.role !== 'Admin') {
      detectJwtForgery(req, null, `권한 위조: 토큰 role=Admin, DB role=${dbUser?.role || '없음'} (userId: ${req.user.userId})`);
    }
  } catch {}
  next();
};

const readLog = (filename, limit = 300) => {
  const filePath = path.join(LOG_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).reverse().map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
};

router.get('/attack', authMiddleware, adminOnly, (req, res) => res.json(readLog('attack.log')));
router.get('/auth',   authMiddleware, adminOnly, (req, res) => res.json(readLog('auth.log')));
router.get('/access', authMiddleware, adminOnly, (req, res) => res.json(readLog('access.log', 500)));

router.get('/', authMiddleware, adminOnly, (req, res) => {
  const attacks = readLog('attack.log', 200);
  const auths   = readLog('auth.log', 200);
  const merged  = [...attacks, ...auths].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(merged.slice(0, 300));
});

module.exports = router;
