const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const usersRoutes = require('./routes/users.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', healthRoutes);
app.use('/api', usersRoutes);
app.use('/api', authRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada'});
});

module.exports = app;