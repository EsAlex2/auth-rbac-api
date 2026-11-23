const usersService = require('../services/users.service');

async function updateUserHandler(req, res) {
  try {
    const updatedUser = await usersService.updateUser(req.params.id, req.body, req.user);
    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof usersService.AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.code && { code: error.code }),
      });
    }
    console.error('Error en updateUserHandler:', error);
    return res.status(500).json({ message: 'Error interno al actualizar el usuario' });
  }
}

async function suspendUserHandler(req, res) {
  try {
    const { reason } = req.body || {};
    const user = await usersService.setUserStatus(req.params.id, 'suspended', reason, req.user);
    return res.status(200).json({
      message: 'Cuenta de usuario suspendida',
      user,
    });
  } catch (error) {
    if (error instanceof usersService.AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.code && { code: error.code }),
      });
    }
    console.error('Error en suspendUserHandler:', error);
    return res.status(500).json({ message: 'Error interno al suspender el usuario', error });
  }
}

async function activateUserHandler(req, res) {
  try {
    const user = await usersService.setUserStatus(req.params.id, 'active', null, req.user);
    return res.status(200).json({
      message: 'Cuenta de usuario reactivada',
      user,
    });
  } catch (error) {
    if (error instanceof usersService.AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.code && { code: error.code }),
      });
    }
    console.error('Error en activateUserHandler:', error);
    return res.status(500).json({ message: 'Error interno al reactivar el usuario' });
  }
}

module.exports = {
  updateUserHandler,
  suspendUserHandler,
  activateUserHandler,
};