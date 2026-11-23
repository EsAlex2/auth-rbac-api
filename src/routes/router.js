const { Router } = require('express');
const authenticate = require('../middlewares/auth.middleware');
const { authorizePermissions, authorizeRoles } = require('../middlewares/rbac.middleware');

const router = Router();

// Solo usuarios autenticados y no suspendidos
router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Requiere permiso específico 'users:read'
router.get('/users', authenticate, authorizePermissions('users:read'), (req, res) => {
  res.json({ message: 'Listado de usuarios autorizado' });
});

// Requiere rol 'admin' o 'moderator' Y permiso 'users:suspend'
router.patch(
  '/users/:id/suspend',
  authenticate,
  authorizeRoles('admin', 'moderator'),
  authorizePermissions('users:suspend'),
  (req, res) => {
    res.json({ message: `Suspensión autorizada para usuario ${req.params.id}` });
  }
);

module.exports = router;