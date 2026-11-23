const db = require('../config/db');

class AppError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const USER_PUBLIC_FIELDS = `
  u.id,
  u.full_name,
  u.email,
  u.role_id,
  r.name AS role,
  u.status,
  u.suspended_at,
  u.suspension_reason,
  u.created_at,
  u.updated_at
`;

async function findUserById(userId) {
  const { rows } = await db.query(
    `SELECT ${USER_PUBLIC_FIELDS}
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function updateUser(targetUserId, payload, actorUser) {
  const numericId = Number(targetUserId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new AppError('ID de usuario inválido', 400, 'INVALID_USER_ID');
  }

  const existingUser = await findUserById(numericId);
  if (!existingUser) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (payload.full_name !== undefined) {
    const cleanName = String(payload.full_name).trim();
    if (!cleanName) {
      throw new AppError('El nombre completo no puede estar vacío', 400, 'INVALID_FULL_NAME');
    }
    fields.push(`full_name = $${paramIndex++}`);
    values.push(cleanName);
  }

  if (payload.email !== undefined) {
    const cleanEmail = String(payload.email).trim().toLowerCase();
    if (!cleanEmail) {
      throw new AppError('El correo electrónico no puede estar vacío', 400, 'INVALID_EMAIL');
    }

    const emailCheck = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2',
      [cleanEmail, numericId]
    );
    if (emailCheck.rows.length > 0) {
      throw new AppError('El correo electrónico ya está en uso por otro usuario', 409, 'EMAIL_CONFLICT');
    }

    fields.push(`email = $${paramIndex++}`);
    values.push(cleanEmail);
  }

  if (payload.role_id !== undefined) {
    const canAssignRole =
      actorUser.role === 'admin' ||
      (Array.isArray(actorUser.permissions) && actorUser.permissions.includes('roles:manage'));

    if (!canAssignRole) {
      throw new AppError(
        'No tienes permisos para cambiar el rol de un usuario',
        403,
        'ROLE_CHANGE_FORBIDDEN'
      );
    }

    const roleCheck = await db.query('SELECT id FROM roles WHERE id = $1', [Number(payload.role_id)]);
    if (roleCheck.rows.length === 0) {
      throw new AppError('El rol indicado no existe', 404, 'ROLE_NOT_FOUND');
    }

    fields.push(`role_id = $${paramIndex++}`);
    values.push(Number(payload.role_id));
  }

  if (fields.length === 0) {
    throw new AppError('No se enviaron campos válidos para actualizar', 400, 'EMPTY_UPDATE_PAYLOAD');
  }

  fields.push('updated_at = NOW()');
  values.push(numericId);

  const updateQuery = `
    WITH updated AS (
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    )
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role_id,
      r.name AS role,
      u.status,
      u.suspended_at,
      u.suspension_reason,
      u.created_at,
      u.updated_at
    FROM updated u
    JOIN roles r ON r.id = u.role_id
  `;

  const { rows } = await db.query(updateQuery, values);
  return rows[0];
}

async function setUserStatus(targetUserId, nextStatus, reason, actorUser) {
  const numericId = Number(targetUserId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new AppError('ID de usuario inválido', 400, 'INVALID_USER_ID');
  }

  if (!['active', 'suspended'].includes(nextStatus)) {
    throw new AppError('Estado inválido. Use "active" o "suspended"', 400, 'INVALID_STATUS');
  }

  if (nextStatus === 'suspended' && actorUser.id === numericId) {
    throw new AppError('No puedes suspender tu propia cuenta', 400, 'SELF_SUSPENSION_FORBIDDEN');
  }

  const existingUser = await findUserById(numericId);
  if (!existingUser) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  if (nextStatus === 'suspended' && existingUser.role === 'admin' && actorUser.role !== 'admin') {
    throw new AppError(
      'Solo un administrador puede suspender a otro administrador',
      403,
      'ADMIN_PROTECTION'
    );
  }

  const cleanReason =
    nextStatus === 'suspended'
      ? (reason && String(reason).trim()) || 'Suspendido por administración'
      : null;

  const queryText = `
    WITH updated AS (
      UPDATE users
      SET
        status = $1::varchar,
        suspended_at = CASE WHEN $1::varchar = 'suspended' THEN NOW() ELSE NULL END,
        suspension_reason = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    )
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role_id,
      r.name AS role,
      u.status,
      u.suspended_at,
      u.suspension_reason,
      u.created_at,
      u.updated_at
    FROM updated u
    JOIN roles r ON r.id = u.role_id
  `;

  const { rows } = await db.query(queryText, [nextStatus, cleanReason, numericId]);
  return rows[0];
}

module.exports = {
  AppError,
  findUserById,
  updateUser,
  setUserStatus,
};