const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const write = (filename, entry) => {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFile(path.join(LOG_DIR, filename), line, () => {});
};

const logAccess = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    write('access.log', {
      type: 'access',
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
      ua: req.get('User-Agent'),
    });
  });
  next();
};

const logAttack = (entry) => write('attack.log', { type: 'attack', ...entry });
const logAuth  = (entry) => write('auth.log',   { type: 'auth',   ...entry });

module.exports = { logAccess, logAttack, logAuth };
