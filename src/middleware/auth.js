const crypto = require('crypto');

// Hash both sides so the buffers are always equal length (timingSafeEqual
// throws otherwise) and the password length isn't leaked via timing.
const digest = value => crypto.createHash('sha256').update(String(value)).digest();

module.exports = (req, res, next) => {
  const expected = process.env.ADMIN_PASS;
  const given    = req.headers['x-admin-pass'];
  if (expected && typeof given === 'string' &&
      crypto.timingSafeEqual(digest(given), digest(expected))) return next();
  res.status(401).json({ error: 'Unauthorized' });
};
