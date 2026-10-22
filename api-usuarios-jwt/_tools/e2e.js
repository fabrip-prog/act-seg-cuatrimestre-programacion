require('dotenv').config();

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`;
const SUFIJO = Date.now().toString().slice(-6);
const EMAIL = `alumno${SUFIJO}@mail.com`;
const PASSWORD = 'passwordSecreta123';

let ok = 0;
let mal = 0;

function verificar(titulo, cond, detalle) {
  if (cond) {
    ok++;
    console.log(`  [OK]    ${titulo}`);
  } else {
    mal++;
    console.log(`  [FALLO] ${titulo}`);
    if (detalle !== undefined) console.log('          ->', JSON.stringify(detalle));
  }
}

function seccion(t) {
  console.log('\n' + '-'.repeat(68));
  console.log(t);
  console.log('-'.repeat(68));
}

const post = (ruta, body) =>
  fetch(BASE + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

async function main() {
  console.log('\n' + '='.repeat(68));
  console.log('  PRUEBA DE PUNTA A PUNTA  (API real + MySQL real)');
  console.log('  Endpoint:', BASE);
  console.log('='.repeat(68));

  seccion('0. La API responde');
  const r0 = await fetch(BASE + '/');
  const d0 = await r0.json();
  verificar('GET / responde 200', r0.status === 200, r0.status);
  verificar('lista los endpoints', !!d0.endpoints, d0);

  seccion('1. GET /api/usuarios/perfil SIN token -> 401');
  const rP = await fetch(BASE + '/api/usuarios/perfil');
  verificar('responde 401', rP.status === 401, rP.status);

  seccion('2. REGISTRO de un alumno nuevo -> 201');
  const r1 = await post('/api/usuarios/registro', {
    nombre: 'Alumno de Prueba',
    email: EMAIL,
    password: PASSWORD
  });
  const d1 = await r1.json();
  verificar('responde 201 Created', r1.status === 201, { status: r1.status, body: d1 });
  verificar('devuelve un id', typeof d1.id === 'number', d1);

  seccion('3. REGISTRO duplicado -> 409 (UNIQUE de MySQL)');
  const r2 = await post('/api/usuarios/registro', {
    nombre: 'Alumno de Prueba',
    email: EMAIL,
    password: PASSWORD
  });
  const d2 = await r2.json();
  verificar('responde 409 Conflict', r2.status === 409, { status: r2.status, body: d2 });

  seccion('4. LOGIN correcto -> 200 + JWT');
  const r3 = await post('/api/usuarios/login', { email: EMAIL, password: PASSWORD });
  const d3 = await r3.json();
  verificar('responde 200', r3.status === 200, { status: r3.status, body: d3 });
  verificar('entrega un token de 3 partes',
    typeof d3.token === 'string' && d3.token.split('.').length === 3);
  verificar('informa el rol asignado por la BD',
    d3.usuario && d3.usuario.rol === 'usuario_estandar', d3.usuario);

  if (!d3.token) {
    console.log('\n  Sin token no se puede continuar.');
    return;
  }
  const token = d3.token;
  console.log('          token:', token.substring(0, 62) + '...');

  const jwt = require('jsonwebtoken');
  const payload = jwt.decode(token);
  console.log('          payload:', JSON.stringify(payload));

  seccion('5. RUTA PROTEGIDA con token -> 200');
  const r4 = await fetch(BASE + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const d4 = await r4.json();
  verificar('responde 200', r4.status === 200, r4.status);
  verificar('devuelve el usuario correcto', d4.usuario && d4.usuario.email === EMAIL, d4.usuario);
  verificar('incluye el estado desde el JOIN', !!d4.usuario.estado, d4.usuario);
  verificar('NO expone el hash de la contrasena',
    d4.usuario && d4.usuario.password === undefined);

  seccion('6. LOGIN con contrasena incorrecta -> 401');
  const r5 = await post('/api/usuarios/login', { email: EMAIL, password: 'noEsLaClave' });
  const d5 = await r5.json();
  verificar('responde 401', r5.status === 401, r5.status);
  verificar('mensaje generico', d5.error === 'Credenciales invalidas.', d5.error);

  seccion('7. LOGIN con email inexistente -> 401 (mismo mensaje)');
  const r6 = await post('/api/usuarios/login', {
    email: `noexiste${SUFIJO}@mail.com`,
    password: PASSWORD
  });
  const d6 = await r6.json();
  verificar('responde 401', r6.status === 401, r6.status);
  verificar('mismo mensaje (anti-enumeracion)', d6.error === d5.error, d6.error);

  seccion('8. Token ALTERADO -> 403');
  const [h, , s] = token.split('.');
  const falso = Buffer.from(JSON.stringify({ id: 1, rol: 'admin' })).toString('base64url');
  const r7 = await fetch(BASE + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${h}.${falso}.${s}` }
  });
  verificar('responde 403', r7.status === 403, r7.status);

  seccion('9. Token de OTRA clave -> 403');
  const ajeno = jwt.sign({ id: 1, rol: 'admin' }, 'clave_del_atacante');
  const r8 = await fetch(BASE + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${ajeno}` }
  });
  verificar('responde 403', r8.status === 403, r8.status);

  seccion('10. Token EXPIRADO -> 401');
  const viejo = jwt.sign({ id: 1, rol: 'usuario_estandar' },
    process.env.JWT_SECRET, { expiresIn: '-5s' });
  const r9 = await fetch(BASE + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${viejo}` }
  });
  const d9 = await r9.json();
  verificar('responde 401', r9.status === 401, r9.status);
  verificar('avisa que expiro', /expiro/i.test(d9.error || ''), d9.error);

  seccion('11. Verificacion directa en MySQL: como quedo el registro');
  const mysql = require('mysql2/promise');
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [filas] = await c.query(
    'SELECT id, nombre, email, password, rol, estado_id FROM usuarios WHERE email = ?',
    [EMAIL]
  );
  const u = filas[0];
  if (u) {
    console.log(`          id=${u.id}  rol=${u.rol}  estado_id=${u.estado_id}`);
    console.log(`          password en BD: ${u.password}`);
    verificar('la contrasena esta HASHEADA (empieza con $2b$)', u.password.startsWith('$2b$'));
    verificar('el hash mide 60 caracteres', u.password.length === 60, u.password.length);
    verificar('NO guarda el texto plano', !u.password.includes(PASSWORD));
    verificar('rol asignado por DEFAULT', u.rol === 'usuario_estandar');
    verificar('estado_id asignado por DEFAULT', u.estado_id === 1);
  } else {
    mal++;
    console.log('  [FALLO] no se encontro el usuario en MySQL');
  }
  await c.end();

  console.log('\n' + '='.repeat(68));
  console.log(`  RESULTADO:  ${ok} pruebas OK   |   ${mal} fallidas`);
  console.log('='.repeat(68));
  console.log(`\n  Usuario de prueba creado: ${EMAIL}  (puedes borrarlo con:`);
  console.log(`    DELETE FROM usuarios WHERE email = '${EMAIL}';)\n`);

  process.exit(mal === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nError inesperado:', e.message);
  console.error('Esta corriendo la API?  ->  npm run dev');
  process.exit(1);
});
