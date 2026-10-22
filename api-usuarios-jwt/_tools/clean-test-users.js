require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [antes] = await c.query('SELECT COUNT(*) AS n FROM usuarios');
  console.log('Usuarios antes:', antes[0].n);

  const [r] = await c.query(
    `DELETE FROM usuarios
      WHERE email LIKE 'alumno%@mail.com'
         OR email IN ('dup@mail.com','restrict@mail.com','defaults@mail.com',
                      'fk99@mail.com','fk@mail.com','agusperez@mail.com')`
  );
  console.log('Usuarios de prueba eliminados:', r.affectedRows);

  const [resto] = await c.query('SELECT id, nombre, email, rol, estado_id FROM usuarios ORDER BY id');
  console.log('\nUsuarios que quedan en la tabla:');
  if (resto.length === 0) {
    console.log('  (ninguno)');
  } else {
    resto.forEach((u) =>
      console.log(`  id=${u.id}  ${u.email}  rol=${u.rol}  estado_id=${u.estado_id}`)
    );
  }

  await c.end();
}

main().catch((e) => {
  console.error('ERROR:', e.code || '', e.message);
  process.exit(1);
});
