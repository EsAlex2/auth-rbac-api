const { Router } = require('express');
const { registerHandler, loginHandler } = require('../controllers/auth.controller');

const router = Router();

router.post('/auth/register', registerHandler);
router.post('/auth/login', loginHandler);

module.exports = router;