require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.APP_PORT || 8000;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor corriendo en http://127.0.0.1:${PORT}`);
});