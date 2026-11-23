const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError } = require('./users.service');

const SALT_ROUNDS = 10;

const LOGIN_USER_QUERY = `
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.password_hash,
    u.status,
    u.suspension_reason,
    r.name AS role,
    COALESCE(
      ARRAY_AGG(DISTINCT p.slug) FILTER (WHERE p.slug IS NOT NULL),
      '{}'
    ) AS permissions
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id
  WHERE LOWER(u.email) = $1
  GROUP BY u.id, r.name
`;

async function registerUser(payload = {}) {
  const full_name = payload.full_name;
  const email = payload.email;
  const password = payload.password;
  const cleanName = full_name ? String(full_name).trim() : '';
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const rawPassword = password ? String(password) : '';

  if (!cleanName || !cleanEmail || !rawPassword) {
    throw new AppError(
      'Los campos full_name, email y password son obligatorios',
      400,
      'MISSING_REQUIRED_FIELDS'
    );
  }

  if (rawPassword.length < 8) {
    throw new AppError(
      'La contraseña debe tener al menos 8 caracteres',
      400,
      'WEAK_PASSWORD'
    );
  }

  const existingEmail = await db.query(
    'SELECT id FROM users WHERE LOWER(email) = $1',
    [cleanEmail]
  );

  if (existingEmail.rows.length > 0) {
    throw new AppError(
      'Ya existe un usuario registrado con ese correo electrónico',
      409,
      'EMAIL_ALREADY_EXISTS'
    );
  }

  const roleResult = await db.query(
    "SELECT id, name FROM roles WHERE name = 'user'"
  );

  if (roleResult.rows.length === 0) {
    throw new AppError(
      'El rol por defecto "user" no está configurado en la base de datos',
      500,
      'DEFAULT_ROLE_MISSING'
    );
  }

  const defaultRole = roleResult.rows[0];
  const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

  const insertQuery = `
    WITH inserted AS (
      INSERT INTO users (full_name, email, password_hash, role_id, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING id, full_name, email, role_id, status, created_at
    )
    SELECT
      i.id,
      i.full_name,
      i.email,
      r.name AS role,
      i.status,
      i.created_at
    FROM inserted i
    JOIN roles r ON r.id = i.role_id
  `;

  const { rows } = await db.query(insertQuery, [
    cleanName,
    cleanEmail,
    passwordHash,
    defaultRole.id,
  ]);

  return rows[0];
}

async function loginUser(payload = {}) {
  const email = payload.email;
  const password = payload.password;
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const rawPassword = password ? String(password) : '';

  if (!cleanEmail || !rawPassword) {
    throw new AppError(
      'Debes enviar email y password',
      400,
      'MISSING_CREDENTIALS'
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError(
      'La configuración de autenticación no está disponible',
      500,
      'AUTH_CONFIGURATION_ERROR'
    );
  }

  const { rows } = await db.query(LOGIN_USER_QUERY, [cleanEmail]);
  const user = rows[0];

  if (!user) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(rawPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status === 'suspended') {
    throw new AppError(
      'La cuenta se encuentra suspendida y no puede iniciar sesión',
      403,
      'ACCOUNT_SUSPENDED'
    );
  }

  const tokenPayload = {
    sub: user.id,
    role: user.role,
    permissions: user.permissions,
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return {
    token,
    token_type: 'Bearer',
    expires_in: process.env.JWT_EXPIRES_IN || '8h',
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
};