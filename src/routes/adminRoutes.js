const router = require('express').Router();
const auth   = require('../middleware/auth');

// GET /api/admin/session — verifies the admin password (used by admin.html login).
// Deliberately has no DB dependency so login works even while Mongo is down.
router.get('/session', auth, (req, res) => res.json({ ok: true }));

module.exports = router;
