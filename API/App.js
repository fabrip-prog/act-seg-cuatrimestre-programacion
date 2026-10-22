import express from 'express';
import pool from './src/db.js';
import usuarioRoutes from './routes/usuarios.route.js';

const app = express();
const puerto = process.env.PORT || 3000;

// =============================================
// MIDDLEWARES (deben ir ANTES de las rutas)
// =============================================
app.use(express.json());

// =============================================
// RUTAS
// =============================================

app.get('/', (req, res) => {
    res.json({ 'Alumno': 'Fabrizio Pérez' });
});

// --- Rutas MVC de usuario (registro) ---
// Endpoint: POST http://localhost:3000/api/usuarios/registro
app.use('/api/usuarios', usuarioRoutes);

// --- Rutas CRUD directas (existentes) ---

app.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, nombre, email, rol, estado_id, creado_en FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

app.put('/actualizar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre } = req.body;

        const [result] = await pool.query('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Usuario con ID ${id} no encontrado` });
        }

        res.json({ message: `Usuario con ID ${id} actualizado correctamente` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

app.delete('/eliminar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

// =============================================
// 404 - Ruta no encontrada (siempre al final)
// =============================================
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
app.listen(puerto, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${puerto}`);
});