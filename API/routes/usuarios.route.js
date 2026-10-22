import { Router } from 'express';
import { registro } from '../controlador/usuarioController.js';

const router = Router();

// POST /registro → se monta bajo /api/usuarios en App.js
// Endpoint final: POST http://localhost:3000/api/usuarios/registro
router.post('/registro', registro);

export default router;