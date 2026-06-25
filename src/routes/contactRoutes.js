const router  = require('express').Router();
const contact = require('../controllers/contactController');

// POST /api/contact — send message to portfolio owner
router.post('/', contact.sendMessage);

module.exports = router;
