// Admin auth: a valid signed session cookie (set by POST /api/admin/login) or 401.
const { verifyToken, readCookie } = require('../auth/session');

module.exports = (req, res, next) => {
  if (verifyToken(readCookie(req))) return next();
  res.status(401).json({ error: 'Unauthorized' });
};
