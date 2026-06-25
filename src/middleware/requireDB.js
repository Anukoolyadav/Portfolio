const { isReady } = require('../config/db');

module.exports = (req, res, next) => {
  if (!isReady()) return res.status(503).json({ error: 'Database not ready — try again in a moment.' });
  next();
};
