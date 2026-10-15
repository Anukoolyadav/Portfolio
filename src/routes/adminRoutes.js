const express        = require('express');
const bcrypt         = require('bcryptjs');
const auth           = require('../middleware/auth');
const makeCrudRouter = require('../admin/crudRouter');
const specs          = require('../admin/specs');
const pageView       = require('../services/pageView');
const { setSessionCookie, clearSessionCookie } = require('../auth/session');

// Built per app instance so each app gets its own login rate limiter.
module.exports = function makeAdminRouter({ loginLimiter = (req, res, next) => next() } = {}) {
  const router = express.Router();

  // Admin responses are per-user and must never be cached.
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // POST /api/admin/login { password } -> sets the httpOnly session cookie.
  router.post('/login', loginLimiter, async (req, res) => {
    const password = req.body?.password;
    if (typeof password !== 'string' || !password || password.length > 200) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    try {
      const ok = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH || '');
      if (!ok) return res.status(401).json({ error: 'Incorrect password.' });
      setSessionCookie(res);
      res.json({ ok: true });
    } catch (err) {
      console.error('Admin login failed:', err.name || 'Error');
      res.status(500).json({ error: 'Something went wrong.' });
    }
  });

  // POST /api/admin/logout -> clears the cookie (tokens are stateless; see README).
  router.post('/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // GET /api/admin/session — 200 while the cookie is valid. No DB dependency.
  router.get('/session', auth, (req, res) => res.json({ ok: true }));

  router.use('/projects', makeCrudRouter({
    model:      require('../models/Project'),
    spec:       specs.project,
    invalidate: () => pageView.invalidate('projects'),
    label:      'Project',
    collection: 'projects'
  }));

  router.use('/experience', makeCrudRouter({
    model:      require('../models/Experience'),
    spec:       specs.experience,
    invalidate: () => pageView.invalidate('experience'),
    label:      'Experience',
    collection: 'experience'
  }));

  return router;
};
