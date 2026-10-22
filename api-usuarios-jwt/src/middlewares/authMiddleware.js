const { verificarToken } = require('../utils/jwt');

function verificarAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token no proporcionado.'
    });
  }

  const partes = authHeader.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token invalido. Use: Bearer <token>'
    });
  }

  const token = partes[1];

  try {
    const payload = verificarToken(token);

    req.usuario = payload;

    return next();
  } catch (error) {

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'El token expiro. Inicie sesion nuevamente.'
      });
    }

    return res.status(403).json({
      error: 'Token invalido o firma alterada.'
    });
  }
}

function soloAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Debe autenticarse primero.'
    });
  }

  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado: se requieren permisos de administrador.'
    });
  }

  return next();
}

module.exports = { verificarAuth, soloAdmin };
