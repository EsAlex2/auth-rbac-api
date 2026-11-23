const authService = require('../services/auth.service');
const { AppError } = require('../services/users.service');

async function registerHandler(req, res) {
  try {
    const createdUser = await authService.registerUser(req.body);
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: createdUser,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.code && { code: error.code }),
      });
    }
    console.error('Error en registerHandler:', error);
    return res.status(500).json({ message: 'Error interno al registrar el usuario' });
  }
}

async function loginHandler(req, res) {
  try {
    const sessionData = await authService.loginUser(req.body);
    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      ...sessionData,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.code && { code: error.code }),
      });
    }
    console.error('Error en loginHandler:', error);
    return res.status(500).json({ message: 'Error interno al iniciar sesión' });
  }
}

module.exports = {
  registerHandler,
  loginHandler,
};