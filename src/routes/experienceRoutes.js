const router     = require('express').Router();
const experience = require('../controllers/experienceController');
const requireDB  = require('../middleware/requireDB');

// Public — published entries only
router.get('/', requireDB, experience.list);

module.exports = router;
