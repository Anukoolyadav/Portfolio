const router     = require('express').Router();
const post       = require('../controllers/postController');
const auth       = require('../middleware/auth');
const requireDB  = require('../middleware/requireDB');

// Public
router.get('/',      requireDB,             post.getAllPublished);
router.get('/:id',   requireDB,             post.getOne);

// Admin (requires password header)
router.post('/',     auth, requireDB,       post.create);
router.put('/:id',   auth, requireDB,       post.update);
router.delete('/:id', auth, requireDB,      post.remove);

module.exports = router;
