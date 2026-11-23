const { Router } = require('express');
const { registerHandler, loginHandler } = require('../controllers/auth.controller');
const validateBody = require('../middlewares/validate.middleware');

const router = Router();

router.post('/auth/register',
  validateBody({
    required: ['full_name', 'email', 'password'],
    fields: {
      full_name: { type: 'string', minLength: 1 },
      email: { type: 'string', email: true },
      password: { type: 'string', minLength: 8 },
    },
  }),
  registerHandler
);

router.post('/auth/login',
  validateBody({
    required: ['email', 'password'],
    fields: {
      email: { type: 'string', email: true },
      password: { type: 'string' },
    },
  }),
  loginHandler
);

module.exports = router;