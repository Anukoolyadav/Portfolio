const router         = require('express').Router();
const auth           = require('../middleware/auth');
const makeCrudRouter = require('../admin/crudRouter');
const specs          = require('../admin/specs');
const pageView       = require('../services/pageView');

// GET /api/admin/session — verifies the admin password (used by admin.html login).
// Deliberately has no DB dependency so login works even while Mongo is down.
router.get('/session', auth, (req, res) => res.json({ ok: true }));

router.use('/projects', makeCrudRouter({
  model:      require('../models/Project'),
  spec:       specs.project,
  invalidate: () => pageView.invalidate('projects'),
  label:      'Project'
}));

router.use('/experience', makeCrudRouter({
  model:      require('../models/Experience'),
  spec:       specs.experience,
  invalidate: () => pageView.invalidate('experience'),
  label:      'Experience'
}));

module.exports = router;
