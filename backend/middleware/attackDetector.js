const { logAttack } = require('./logger');

const PATTERNS = {
  'NoSQL Injection': /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$where|\$regex|\$or|\$and|\$not|\$nor)/,
  'Path Traversal':  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%252e%252e)/i,
  'XSS':             /(<script|javascript:|onerror\s*=|onload\s*=|<iframe|eval\s*\(|document\.cookie)/i,
};

// 브루트포스 감지: IP별 로그인 실패 횟수 in-memory 추적
const loginFailures = new Map();

const detectAttacks = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const target = JSON.stringify(req.body) + JSON.stringify(req.query) + req.originalUrl;

  for (const [attackType, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(target)) {
      logAttack({
        attackType,
        ip,
        method: req.method,
        url: req.originalUrl,
        payload: JSON.stringify({ body: req.body, query: req.query }).slice(0, 500),
        ua: req.get('User-Agent'),
      });
      break;
    }
  }

  next();
};

const trackLoginFailure = (ip, userId) => {
  const now = Date.now();
  const key = ip;
  const entry = loginFailures.get(key) || { count: 0, since: now, userIds: [] };

  // 1분 경과 시 리셋
  if (now - entry.since > 60000) {
    loginFailures.set(key, { count: 1, since: now, userIds: [userId] });
    return;
  }

  entry.count++;
  if (!entry.userIds.includes(userId)) entry.userIds.push(userId);
  loginFailures.set(key, entry);

  if (entry.count >= 5) {
    logAttack({
      attackType: 'Brute Force',
      ip,
      url: '/api/auth/login',
      payload: `실패 ${entry.count}회 (1분 내) / 시도한 ID: ${entry.userIds.join(', ')}`,
    });
  }
};

module.exports = { detectAttacks, trackLoginFailure };
