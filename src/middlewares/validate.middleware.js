function validateBody(schema) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        message: 'El cuerpo de la solicitud debe ser un objeto JSON',
        code: 'INVALID_REQUEST_BODY',
      });
    }

    const errors = [];
    for (const field of schema.required || []) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        (typeof req.body[field] === 'string' && req.body[field].trim() === '')
      ) {
        errors.push({ field, message: 'Este campo es obligatorio' });
      }
    }

    for (const [field, rules] of Object.entries(schema.fields || {})) {
      if (req.body[field] === undefined) continue;
      if (rules.type === 'string' && typeof req.body[field] !== 'string') {
        errors.push({ field, message: 'Debe ser una cadena de texto' });
      }
      if (rules.minLength && typeof req.body[field] === 'string' &&
          req.body[field].trim().length < rules.minLength) {
        errors.push({ field, message: `Debe tener al menos ${rules.minLength} caracteres` });
      }
      if (rules.email && typeof req.body[field] === 'string' &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body[field].trim())) {
        errors.push({ field, message: 'Debe ser un correo electrónico válido' });
      }
      if (rules.integer && !Number.isInteger(Number(req.body[field]))) {
        errors.push({ field, message: 'Debe ser un entero válido' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    return next();
  };
}

module.exports = validateBody;
