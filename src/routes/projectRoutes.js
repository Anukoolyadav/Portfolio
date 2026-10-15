const router    = require('express').Router();
const project   = require('../controllers/projectController');
const requireDB = require('../middleware/requireDB');

// Public — published projects only
router.get('/',      requireDB, project.list);
router.get('/:slug', requireDB, project.getBySlug);

module.exports = router;
