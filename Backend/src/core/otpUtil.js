const crypto = require('crypto');

exports.generateOTP = () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  const expires = Date.now() + 10 * 60 * 1000;
  return { code, hashed, expires };
};