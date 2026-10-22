require('dotenv').config();

const express = require('express');
const cors = require('cors');

require('./config/db');

const usuarioRoutes = require('./routes/usuarioRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    api: 'API Usuarios + JWT',
    endpoints: {
      registro: 'POST /api/usuarios/registro',
      login: 'POST /api/usuarios/login',
      logout: 'POST /api/usuarios/logout',
      perfil: 'GET  /api/usuarios/perfil  (requiere Bearer token)',
      cambiarPassword: 'PUT  /api/usuarios/password (requiere Bearer token)',
      adminLista: 'GET  /api/usuarios/admin/lista (requiere Bearer token y rol admin)'
    }
  });
});

app.use('/api/usuarios', usuarioRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
