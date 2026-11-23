const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de la base de datos: ', err);
    process.exit(1);
});

module.exports = { query: (text, params) => pool.query(text, params), pool };