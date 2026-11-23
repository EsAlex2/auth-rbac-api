const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const usersRoutes = require('./routes/users.routes');
const authRoutes = require('./routes/auth.routes');
const { AppError } = require('./services/users.service');

const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: false, limit: process.env.JSON_BODY_LIMIT || '100kb' }));

app.use('/', healthRoutes);
app.use('/api', usersRoutes);
app.use('/api', authRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    code: 'ROUTE_NOT_FOUND',
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      message: 'El cuerpo de la solicitud contiene JSON inválido',
      code: 'INVALID_JSON',
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      ...(error.code && { code: error.code }),
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      message: 'El cuerpo de la solicitud excede el tamaño permitido',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  console.error('Error no controlado:', error);
  return res.status(500).json({
    message: 'Error interno del servidor',
    code: 'INTERNAL_SERVER_ERROR',
  });
});

module.exports = app;