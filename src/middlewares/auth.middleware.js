const jwt = require('jsonwebtoken');
const db = require('../config/db');

const USER_AUTH_QUERY = `
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.status,
    r.name AS role,
    COALESCE(
      ARRAY_AGG(DISTINCT p.slug) FILTER (WHERE p.slug IS NOT NULL),
      '{}'
    ) AS permissions
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id
  WHERE u.id = $1
  GROUP BY u.id, r.name
`;

async function authenticate(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no está configurado');
      return res.status(500).json({
        message: 'La configuración de autenticación no está disponible',
        code: 'AUTH_CONFIGURATION_ERROR',
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token de autenticación no proporcionado o formato inválido',
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const { rows } = await db.query(USER_AUTH_QUERY, [payload.sub]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'El usuario asociado al token no existe' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        message: 'La cuenta se encuentra suspendida',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'El token ha expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    console.error('Error en middleware authenticate:', error);
    return res.status(500).json({ message: 'Error interno al validar autenticación' });
  }
}

module.exports = authenticate;