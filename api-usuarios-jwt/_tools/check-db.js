require('dotenv').config();
const mysql = require('mysql2/promise');

let ok = 0;
let mal = 0;

async function debeFallar(c, titulo, sql, params, codigoEsperado) {
  try {
    await c.query(sql, params);
    mal++;
    console.log(`  [FALLO] PERMITIDO (no deberia): ${titulo}`);
  } catch (e) {
    if (!codigoEsperado || e.code === codigoEsperado) {
      ok++;
      console.log(`  [OK]    RECHAZADO: ${titulo}  ->  ${e.code}`);
    } else {
      mal++;
      console.log(`  [FALLO] RECHAZADO con codigo inesperado: ${titulo}  ->  ${e.code} (esperado ${codigoEsperado})`);
    }
  }
}

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('\n=== VALIDACION ESTRUCTURAL DE LA BASE DE DATOS ===\n');

  console.log('Restricciones que DEBEN rechazar datos invalidos:');
  await debeFallar(c, 'estado_id = 99 inexistente (FOREIGN KEY)',
    'INSERT INTO usuarios (nombre,email,password,estado_id) VALUES (?,?,?,?)',
    ['Fantasma', 'fk99@mail.com', 'hashDePrueba', 99], 'ER_NO_REFERENCED_ROW_2');

  await debeFallar(c, 'descripcion de estado duplicada (UNIQUE)',
    'INSERT INTO estados_usuario (descripcion) VALUES (?)',
    ['Activo'], 'ER_DUP_ENTRY');

  const [ref] = await c.query(
    'INSERT INTO usuarios (nombre,email,password) VALUES (?,?,?)',
    ['Protegido por FK', 'restrict@mail.com', 'hashDeEjemplo']
  );
  await debeFallar(c, 'borrar el estado 1 que esta en uso (ON DELETE RESTRICT)',
    'DELETE FROM estados_usuario WHERE id = ?',
    [1], 'ER_ROW_IS_REFERENCED_2');
  await c.query('DELETE FROM usuarios WHERE id = ?', [ref.insertId]);

  console.log('\nDefaults que la BASE DE DATOS debe aplicar sola:');
  const [r] = await c.query(
    'INSERT INTO usuarios (nombre,email,password) VALUES (?,?,?)',
    ['Prueba Defaults', 'defaults@mail.com', 'hashDeEjemplo']
  );
  const [f] = await c.query('SELECT rol, estado_id FROM usuarios WHERE id = ?', [r.insertId]);
  const correcto = f[0].rol === 'usuario_estandar' && f[0].estado_id === 1;
  if (correcto) {
    ok++;
    console.log(`  [OK]    rol = "${f[0].rol}" y estado_id = ${f[0].estado_id} (asignados automaticamente)`);
  } else {
    mal++;
    console.log(`  [FALLO] defaults incorrectos: rol=${f[0].rol} estado_id=${f[0].estado_id}`);
  }
  await c.query('DELETE FROM usuarios WHERE id = ?', [r.insertId]);
  console.log('  (usuario de prueba eliminado)');

  console.log('\nRestriccion UNIQUE de email en usuarios:');
  await c.query('INSERT INTO usuarios (nombre,email,password) VALUES (?,?,?)',
    ['Duplicado 1', 'dup@mail.com', 'hashDeEjemplo']);
  await debeFallar(c, 'segundo usuario con el mismo email (UNIQUE)',
    'INSERT INTO usuarios (nombre,email,password) VALUES (?,?,?)',
    ['Duplicado 2', 'dup@mail.com', 'hashDeEjemplo'], 'ER_DUP_ENTRY');
  await c.query('DELETE FROM usuarios WHERE email = ?', ['dup@mail.com']);

  console.log(`\n=== RESULTADO: ${ok} OK | ${mal} fallidas ===\n`);
  await c.end();
  process.exit(mal === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e.code || '', e.message);
  process.exit(1);
});
