const { logAttack } = require('./logger');

// IPv4-mapped IPv6 제거, X-Forwarded-For 우선
const getIp = (req) => {
  const raw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  return raw.split(',')[0].trim().replace(/^::ffff:/, '');
};

const PATTERNS = {
  'NoSQL Injection': /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$where|\$regex|\$or|\$and|\$not|\$nor)/,
  'Path Traversal':  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%252e%252e)/i,
  'XSS':             /(<script|javascript:|onerror\s*=|onload\s*=|<iframe|eval\s*\(|document\.cookie)/i,
};

const DANGEROUS_EXT = ['.php', '.html', '.htm', '.js', '.exe', '.sh', '.bat', '.jsp', '.py', '.rb', '.pl', '.cgi'];

// 인코딩 디코딩 (URL + HTML 엔티티)
const decode = (str) => {
  try {
    let decoded = str;
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    decoded = decoded
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&#([0-9]+);/gi,     (_, d) => String.fromCharCode(parseInt(d, 10)))
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
    return decoded;
  } catch { return str; }
};

// 일반 + 느린 브루트포스용 별도 Map
const bfMinute = new Map(); // 1분 / 5회
const bfHour   = new Map(); // 1시간 / 10회

const detectAttacks = (req, res, next) => {
  const ip = getIp(req);
  const raw = JSON.stringify(req.body) + JSON.stringify(req.query) + req.originalUrl;
  const decoded = decode(raw);

  for (const [attackType, pattern] of Object.entries(PATTERNS)) {
    const hitRaw     = pattern.test(raw);
    const hitDecoded = !hitRaw && pattern.test(decoded);
    if (hitRaw || hitDecoded) {
      logAttack({
        attackType: hitDecoded ? `XSS (인코딩 우회)` : attackType,
        ip,
        method: req.method,
        url: req.originalUrl,
        payload: hitDecoded
          ? `(원본) ${raw.slice(0, 200)} → (디코딩) ${decoded.slice(0, 200)}`
          : JSON.stringify({ body: req.body, query: req.query }).slice(0, 500),
        ua: req.get('User-Agent'),
      });
      break;
    }
  }

  next();
};

// 악성 파일 업로드 탐지 (multer filename에서 호출)
const detectMaliciousUpload = (req, originalname) => {
  const ext = require('path').extname(originalname).toLowerCase();
  if (DANGEROUS_EXT.includes(ext)) {
    const ip = getIp(req);
    logAttack({
      attackType: '악성 파일 업로드',
      ip,
      url: req.originalUrl,
      payload: `파일명: ${originalname} / 확장자: ${ext}`,
      ua: req.get('User-Agent'),
    });
  }
};

// JWT 위조 탐지 (authMiddleware catch 또는 권한 위조 탐지 시 호출)
const detectJwtForgery = (req, token, detail = null) => {
  const ip = getIp(req);
  logAttack({
    attackType: 'JWT 위조 시도',
    ip,
    url: req.originalUrl,
    payload: detail || (token ? `${token.slice(0, 80)}...` : '(토큰 없음)'),
    ua: req.get('User-Agent'),
  });
};

// IDOR 탐지 (board.js PUT/DELETE에서 호출)
const detectIdor = (req, requesterId, requesterName, ownerId, ownerName) => {
  if (String(ownerId) === String(requesterId)) return;
  const ip = getIp(req);
  logAttack({
    attackType: 'IDOR',
    ip,
    url: req.originalUrl,
    payload: `요청자: ${requesterName} / 게시글 소유자: ${ownerName}`,
    ua: req.get('User-Agent'),
  });
};

const trackLoginFailure = (ip, userId) => {
  const now = Date.now();

  // 1분 / 5회 브루트포스
  const m = bfMinute.get(ip) || { count: 0, since: now, userIds: [] };
  if (now - m.since > 60000) {
    bfMinute.set(ip, { count: 1, since: now, userIds: [userId] });
  } else {
    m.count++;
    if (!m.userIds.includes(userId)) m.userIds.push(userId);
    bfMinute.set(ip, m);
    if (m.count >= 5) {
      logAttack({
        attackType: 'Brute Force',
        ip,
        url: '/api/auth/login',
        payload: `실패 ${m.count}회 (1분 내) / 시도한 ID: ${m.userIds.join(', ')}`,
      });
    }
  }

  // 1시간 / 10회 느린 브루트포스
  const h = bfHour.get(ip) || { count: 0, since: now, userIds: [] };
  if (now - h.since > 3600000) {
    bfHour.set(ip, { count: 1, since: now, userIds: [userId] });
  } else {
    h.count++;
    if (!h.userIds.includes(userId)) h.userIds.push(userId);
    bfHour.set(ip, h);
    if (h.count >= 10) {
      logAttack({
        attackType: 'Brute Force (느린 시도)',
        ip,
        url: '/api/auth/login',
        payload: `실패 ${h.count}회 (1시간 내) / 시도한 ID: ${h.userIds.join(', ')}`,
      });
    }
  }
};

module.exports = { detectAttacks, detectMaliciousUpload, detectJwtForgery, detectIdor, trackLoginFailure };
