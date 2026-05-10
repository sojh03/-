const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { detectJwtForgery } = require('./attackDetector');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // 권한 위조 탐지: DB role vs 토큰 role 비교
    try {
      const dbUser = await User.findById(decoded.id).select('role').lean();
      if (!dbUser) {
        detectJwtForgery(req, token, `존재하지 않는 사용자 ID (userId: ${decoded.userId})`);
      } else if (decoded.role !== dbUser.role) {
        detectJwtForgery(req, token, `권한 위조: 토큰 role=${decoded.role} → DB role=${dbUser.role} (userId: ${decoded.userId})`);
      }
    } catch {
      // findById 실패 = 잘못된 ID 형식 → 위조 의심
      detectJwtForgery(req, token, `위조 의심: 잘못된 사용자 ID 형식 (userId: ${decoded.userId})`);
    }
    next();
  } catch {
    detectJwtForgery(req, token);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
