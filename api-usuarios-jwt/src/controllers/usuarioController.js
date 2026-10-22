const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');
const { firmarToken, JWT_EXPIRES_IN } = require('../utils/jwt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

const registrar = async (req, res) => {
  try {

    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'Los campos nombre, email y password son obligatorios.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contrasena debe tener al menos 6 caracteres.'
      });
    }

    const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

    const resultado = await usuarioModel.crearUsuario(
      nombre,
      email,
      passwordHasheada
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado.',
      id: resultado.insertId
    });
  } catch (error) {

    console.error('[ERROR] registrar:', error.message);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'El email ya esta registrado.'
      });
    }

    return res.status(500).json({ error: 'Error en servidor.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Los campos email y password son obligatorios.'
      });
    }

    const usuario = await usuarioModel.obtenerPorEmail(email);

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const passValida = await bcrypt.compare(password, usuario.password);

    if (!passValida) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    if (usuario.estado_id !== 1) {
      return res.status(403).json({
        error: 'La cuenta no esta activa. Contacte al administrador.'
      });
    }

    const payload = {
      id: usuario.id,
      rol: usuario.rol
    };

    const token = firmarToken(payload);

    return res.status(200).json({
      mensaje: 'Login exitoso.',
      token,
      expira_en: JWT_EXPIRES_IN,
      rol_admin: usuario.rol === 'admin',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        rol_admin: usuario.rol === 'admin'
      }
    });
  } catch (error) {
    console.error('[ERROR] login:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};

const perfil = async (req, res) => {
  try {

    const usuario = await usuarioModel.obtenerPorId(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    console.error('[ERROR] perfil:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioModel.obtenerTodos();
    return res.status(200).json({
      mensaje: 'Lista de usuarios obtenida exitosamente.',
      total: usuarios.length,
      usuarios
    });
  } catch (error) {
    console.error('[ERROR] listarUsuarios:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};

const logout = async (req, res) => {
  try {
    return res.status(200).json({
      mensaje: 'Logout exitoso. El cliente debe descartar el token almacenado.'
    });
  } catch (error) {
    console.error('[ERROR] logout:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};

const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, nuevaPassword } = req.body;

    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({
        error: 'Los campos passwordActual y nuevaPassword son obligatorios.'
      });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres.'
      });
    }

    const hashActual = await usuarioModel.obtenerPasswordPorId(req.usuario.id);

    if (!hashActual) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const passValida = await bcrypt.compare(passwordActual, hashActual);

    if (!passValida) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    }

    const nuevaPasswordHasheada = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);

    await usuarioModel.actualizarPassword(req.usuario.id, nuevaPasswordHasheada);

    return res.status(200).json({
      mensaje: 'Contraseña actualizada exitosamente.'
    });
  } catch (error) {
    console.error('[ERROR] cambiarPassword:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};

module.exports = {
  registrar,
  login,
  perfil,
  listarUsuarios,
  logout,
  cambiarPassword
};
