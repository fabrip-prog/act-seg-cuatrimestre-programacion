const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/usuarioController');
const { verificarAuth, soloAdmin } = require('../middlewares/authMiddleware');

router.post('/registro', usuarioController.registrar);
router.post('/login', usuarioController.login);
router.post('/logout', usuarioController.logout);

router.get('/perfil', verificarAuth, usuarioController.perfil);
router.put('/password', verificarAuth, usuarioController.cambiarPassword);

router.get('/admin/lista', verificarAuth, soloAdmin, usuarioController.listarUsuarios);

module.exports = router;
