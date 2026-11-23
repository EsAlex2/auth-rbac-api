const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');
const { authorizeRoles, authorizePermissions } = require('../middlewares/rbac.middleware');
const {
  updateUserHandler,
  suspendUserHandler,
  activateUserHandler,
} = require('../controllers/users.controller');

const router = Router();

// Requiere token válido, usuario activo y permiso 'users:update'
router.patch(
  '/users/:id',
  authenticate,
  authorizePermissions('users:update'),
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