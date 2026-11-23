require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');

const PORT = Number(process.env.APP_PORT) || 3000;
const HOST = process.env.APP_HOST || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`Recibida ${signal}, cerrando servidor...`);
  server.close(async () => {
    await db.pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));