function authorizePermissions(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        message: 'No tienes permisos suficientes para realizar esta acción',
        required_permissions: requiredPermissions,
      });
    }

    return next();
  };
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Tu rol no está autorizado para acceder a este recurso',
        allowed_roles: allowedRoles,
      });
    }

    return next();
  };
}

module.exports = {
  authorizePermissions,
  authorizeRoles,
};