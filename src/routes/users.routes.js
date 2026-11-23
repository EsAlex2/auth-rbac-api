const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');
const { authorizeRoles, authorizePermissions } = require('../middlewares/rbac.middleware');
const {
  getProfileHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  suspendUserHandler,
  activateUserHandler,
} = require('../controllers/users.controller');
const validateBody = require('../middlewares/validate.middleware');

const router = Router();

router.get('/profile', authenticate, getProfileHandler);

router.get(
  '/users',
  authenticate,
  authorizePermissions('users:read'),
  listUsersHandler
);

router.get(
  '/users/:id',
  authenticate,
  authorizePermissions('users:read'),
  getUserHandler
);

// Requiere token válido, usuario activo y permiso 'users:update'
router.patch(
  '/users/:id',
  authenticate,
  authorizePermissions('users:update'),
  validateBody({
    fields: {
      full_name: { type: 'string', minLength: 1 },
      email: { type: 'string', email: true },
      role_id: { integer: true },
    },
  }),
  updateUserHandler
);

// Requiere token válido, usuario activo, rol 'admin' o 'moderator' y permiso 'users:suspend'
router.patch(
  '/users/:id/suspend',
  authenticate,
  authorizeRoles('admin', 'moderator'),
  authorizePermissions('users:suspend'),
  suspendUserHandler
);

// Requiere token válido, usuario activo, rol 'admin' o 'moderator' y permiso 'users:suspend'
router.patch(
  '/users/:id/activate',
  authenticate,
  authorizeRoles('admin', 'moderator'),
  authorizePermissions('users:suspend'),
  activateUserHandler
);

module.exports = router;