module.exports = (req, res, next) => {
  if (req.headers['x-admin-pass'] === (process.env.ADMIN_PASS || 'anukool')) return next();
  res.status(401).json({ error: 'Unauthorized' });
};
