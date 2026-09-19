const router    = require('express').Router();
const post      = require('../controllers/postController');
const auth      = require('../middleware/auth');
const requireDB = require('../middleware/requireDB');

// GET /api/admin/session — verifies the admin password (used by admin.html login).
// Deliberately has no DB dependency so login works even while Mongo is down.
router.get('/session', auth, (req, res) => res.json({ ok: true }));

// GET /api/admin/posts — all posts including drafts (used by admin.html)
router.get('/posts', auth, requireDB, post.getAllAdmin);

module.exports = router;
