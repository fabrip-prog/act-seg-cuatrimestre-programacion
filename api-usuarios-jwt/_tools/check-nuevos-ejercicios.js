const path = require('path');
const Module = require('module');

const RAIZ = path.join(__dirname, '..');

const USUARIO_ESTANDAR = {
  id: 7,
  nombre: 'Ana Torres',
  email: 'ana@mail.com',
  password: '$2b$10$rUzovtrHbR031Wa1n2yoS.o6J26WwJkbFWOMeaIxYTlF35VSrKhqG', // secreta123
  rol: 'usuario_estandar',
  estado_id: 1,
  descripcion: 'Activo',
  fecha_creacion: '2026-10-14 19:00:00'
};

const USUARIO_ADMIN = {
  id: 1,
  nombre: 'Admin General',
  email: 'admin@mail.com',
  password: '$2b$10$rUzovtrHbR031Wa1n2yoS.o6J26WwJkbFWOMeaIxYTlF35VSrKhqG', // secreta123
  rol: 'admin',
  estado_id: 1,
  descripcion: 'Activo',
  fecha_creacion: '2026-10-14 18:00:00'
};

const poolFalso = {
  query: async (sql, params) => {
    if (/SELECT\s+1\s*\+\s*1/i.test(sql)) {
      return [[{ solucion: 2 }], []];
    }
    if (/FROM usuarios.*ORDER BY/i.test(sql)) {
      // obtenerTodos: no devuelve password en la consulta real SQL
      const sinPass = (u) => {
        const { password, ...resto } = u;
        return resto;
      };
      return [[sinPass(USUARIO_ADMIN), sinPass(USUARIO_ESTANDAR)], []];
    }
    if (/SELECT password FROM usuarios WHERE id = \?/i.test(sql)) {
      const id = params ? params[0] : null;
      if (id === 7) return [[{ password: USUARIO_ESTANDAR.password }], []];
      if (id === 1) return [[{ password: USUARIO_ADMIN.password }], []];
      return [[], []];
    }
    if (/UPDATE usuarios SET password = \?/i.test(sql)) {
      return [{ affectedRows: 1 }, []];
    }
    if (/FROM usuarios/i.test(sql)) {
      const email = params ? params[0] : null;
      if (email === USUARIO_ESTANDAR.email) return [[USUARIO_ESTANDAR], []];
      if (email === USUARIO_ADMIN.email) return [[USUARIO_ADMIN], []];
      return [[], []];
    }
    return [[], []];
  }
};

const requireOriginal = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'mysql2/promise') {
    return { createPool: () => poolFalso };
  }
  return requireOriginal.apply(this, arguments);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave_de_prueba_para_el_check';
require(path.join(RAIZ, 'src', 'config', 'db'));

const express = require('express');
const jwt = require('jsonwebtoken');
const usuarioRoutes = require(path.join(RAIZ, 'src', 'routes', 'usuarioRoutes'));

const app = express();
app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);

let pasaron = 0;
let fallaron = 0;

function verificar(titulo, condicion, detalle) {
  if (condicion) {
    pasaron++;
    console.log(`  [OK]    ${titulo}`);
  } else {
    fallaron++;
    console.log(`  [FALLO] ${titulo}`);
    if (detalle !== undefined) {
      console.log(`          -> ${JSON.stringify(detalle)}`);
    }
  }
}

async function main() {
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  console.log('\n' + '='.repeat(66));
  console.log('  TESTS DE LOS EJERCICIOS 5 AL 8 (NIVEL INTERMEDIO)');
  console.log('='.repeat(66));

  const tokenEstandar = jwt.sign({ id: 7, rol: 'usuario_estandar' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenAdmin = jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. Ejercicio 8: rol_admin en Login
  console.log('\n--- Ejercicio 8: Login con campo rol_admin ---');
  const resLoginStd = await fetch(base + '/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ana@mail.com', password: 'secreta123' })
  });
  const dataLoginStd = await resLoginStd.json();
  verificar('Login de usuario estándar incluye rol_admin = false', dataLoginStd.rol_admin === false && dataLoginStd.usuario.rol_admin === false, dataLoginStd);

  const resLoginAdm = await fetch(base + '/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@mail.com', password: 'secreta123' })
  });
  const dataLoginAdm = await resLoginAdm.json();
  verificar('Login de usuario admin incluye rol_admin = true', dataLoginAdm.rol_admin === true && dataLoginAdm.usuario.rol_admin === true, dataLoginAdm);

  // 2. Ejercicio 5: GET /api/usuarios/admin/lista y middleware soloAdmin
  console.log('\n--- Ejercicio 5: GET /api/usuarios/admin/lista (soloAdmin) ---');
  const resListaSinToken = await fetch(base + '/api/usuarios/admin/lista');
  verificar('Sin token devuelve 401', resListaSinToken.status === 401, resListaSinToken.status);

  const resListaStd = await fetch(base + '/api/usuarios/admin/lista', {
    headers: { Authorization: `Bearer ${tokenEstandar}` }
  });
  const dataListaStd = await resListaStd.json();
  verificar('Con rol usuario_estandar devuelve 403 Forbidden', resListaStd.status === 403, resListaStd.status);
  verificar('Mensaje explicativo de permisos', /permisos|denegado/i.test(dataListaStd.error || ''), dataListaStd);

  const resListaAdm = await fetch(base + '/api/usuarios/admin/lista', {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  const dataListaAdm = await resListaAdm.json();
  verificar('Con rol admin devuelve 200 OK', resListaAdm.status === 200, resListaAdm.status);
  verificar('Devuelve array de usuarios', Array.isArray(dataListaAdm.usuarios) && dataListaAdm.usuarios.length === 2, dataListaAdm);
  verificar('NO expone contraseñas en la lista de administración', !JSON.stringify(dataListaAdm).includes('$2b$'));

  // 3. Ejercicio 6: POST /api/usuarios/logout
  console.log('\n--- Ejercicio 6: POST /api/usuarios/logout ---');
  const resLogout = await fetch(base + '/api/usuarios/logout', { method: 'POST' });
  const dataLogout = await resLogout.json();
  verificar('Logout responde HTTP 200', resLogout.status === 200, resLogout.status);
  verificar('Logout indica que el cliente debe eliminar el token', /token/i.test(dataLogout.mensaje || ''), dataLogout);

  // 4. Ejercicio 7: PUT /api/usuarios/password
  console.log('\n--- Ejercicio 7: PUT /api/usuarios/password ---');
  const resPassSinToken = await fetch(base + '/api/usuarios/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwordActual: 'secreta123', nuevaPassword: 'nuevaClave123' })
  });
  verificar('Cambio de pass sin token devuelve 401', resPassSinToken.status === 401, resPassSinToken.status);

  const resPassMalActual = await fetch(base + '/api/usuarios/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenEstandar}`
    },
    body: JSON.stringify({ passwordActual: 'claveIncorrecta', nuevaPassword: 'nuevaClave123' })
  });
  verificar('Contraseña actual errónea responde 401', resPassMalActual.status === 401, resPassMalActual.status);

  const resPassCorta = await fetch(base + '/api/usuarios/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenEstandar}`
    },
    body: JSON.stringify({ passwordActual: 'secreta123', nuevaPassword: '123' })
  });
  verificar('Nueva contraseña menor a 6 chars responde 400', resPassCorta.status === 400, resPassCorta.status);

  const resPassOk = await fetch(base + '/api/usuarios/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenEstandar}`
    },
    body: JSON.stringify({ passwordActual: 'secreta123', nuevaPassword: 'nuevaSuperPassword456' })
  });
  const dataPassOk = await resPassOk.json();
  verificar('Cambio exitoso responde 200 OK', resPassOk.status === 200, resPassOk.status);
  verificar('Mensaje de confirmación de contraseña', /actualizada/i.test(dataPassOk.mensaje || ''), dataPassOk);

  servidor.close();

  console.log('\n' + '='.repeat(66));
  console.log(`  RESULTADO:  ${pasaron} pruebas OK   |   ${fallaron} fallidas`);
  console.log('='.repeat(66) + '\n');

  process.exit(fallaron === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
