const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

if (!JWT_SECRET) {
  throw new Error(
    'Falta JWT_SECRET en el archivo .env. Sin esta clave es imposible firmar tokens.'
  );
}

function firmarToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function decodificarSinVerificar(token) {
  return jwt.decode(token);
}

module.exports = {
  firmarToken,
  verificarToken,
  decodificarSinVerificar,
  JWT_EXPIRES_IN
};
