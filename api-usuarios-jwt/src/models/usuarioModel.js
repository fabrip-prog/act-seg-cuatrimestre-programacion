const pool = require('../config/db');

const crearUsuario = async (nombre, email, passwordHasheada) => {

  const query =
    'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)';

  const [resultado] = await pool.query(query, [nombre, email, passwordHasheada]);

  return resultado;
};

const obtenerPorEmail = async (email) => {
  const query =
    'SELECT id, nombre, email, password, rol, estado_id ' +
    'FROM usuarios WHERE email = ? LIMIT 1';

  const [filas] = await pool.query(query, [email]);

  return filas.length > 0 ? filas[0] : null;
};

const obtenerPorId = async (id) => {
  const query =
    'SELECT u.id, u.nombre, u.email, u.rol, u.estado_id, ' +
    '       e.descripcion AS estado, u.fecha_creacion ' +
    'FROM usuarios u ' +
    'INNER JOIN estados_usuario e ON e.id = u.estado_id ' +
    'WHERE u.id = ? LIMIT 1';

  const [filas] = await pool.query(query, [id]);

  return filas.length > 0 ? filas[0] : null;
};

const obtenerTodos = async () => {
  const query =
    'SELECT u.id, u.nombre, u.email, u.rol, u.estado_id, ' +
    '       e.descripcion AS estado, u.fecha_creacion ' +
    'FROM usuarios u ' +
    'INNER JOIN estados_usuario e ON e.id = u.estado_id ' +
    'ORDER BY u.id ASC';

  const [filas] = await pool.query(query);

  return filas;
};

const obtenerPasswordPorId = async (id) => {
  const query = 'SELECT password FROM usuarios WHERE id = ? LIMIT 1';

  const [filas] = await pool.query(query, [id]);

  return filas.length > 0 ? filas[0].password : null;
};

const actualizarPassword = async (id, nuevaPasswordHasheada) => {
  const query = 'UPDATE usuarios SET password = ? WHERE id = ?';

  const [resultado] = await pool.query(query, [nuevaPasswordHasheada, id]);

  return resultado;
};

module.exports = {
  crearUsuario,
  obtenerPorEmail,
  obtenerPorId,
  obtenerTodos,
  obtenerPasswordPorId,
  actualizarPassword
};
