const router    = require('express').Router();
const post      = require('../controllers/postController');
const auth      = require('../middleware/auth');
const requireDB = require('../middleware/requireDB');

// GET /api/admin/posts — all posts including drafts (used by admin.html)
router.get('/posts', auth, requireDB, post.getAllAdmin);

module.exports = router;
