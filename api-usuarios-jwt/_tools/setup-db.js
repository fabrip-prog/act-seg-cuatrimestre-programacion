require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const rutaSql = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(rutaSql, 'utf8');

  console.log(`Leyendo ${rutaSql} ...`);

  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  console.log(`Conectado a MySQL en ${process.env.DB_HOST}. Ejecutando schema.sql ...`);
  await conexion.query(sql);
  console.log('Schema ejecutado sin errores.');

  const [estados] = await conexion.query(
    `SELECT id, descripcion FROM ${process.env.DB_NAME}.estados_usuario ORDER BY id`
  );
  const [cols] = await conexion.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios'
      ORDER BY ORDINAL_POSITION`,
    [process.env.DB_NAME]
  );
  const [fks] = await conexion.query(
    `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios'
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [process.env.DB_NAME]
  );

  console.log('\n--- estados_usuario ---');
  estados.forEach((e) => console.log(`  ${e.id} = ${e.descripcion}`));

  console.log('\n--- columnas de usuarios ---');
  cols.forEach((c) =>
    console.log(
      `  ${c.COLUMN_NAME.padEnd(15)} ${c.COLUMN_TYPE.padEnd(12)}` +
      ` null=${c.IS_NULLABLE.padEnd(3)} default=${c.COLUMN_DEFAULT === null ? '-' : c.COLUMN_DEFAULT}` +
      `${c.COLUMN_KEY ? '  [' + c.COLUMN_KEY + ']' : ''}`
    )
  );

  console.log('\n--- foreign keys de usuarios ---');
  fks.forEach((f) =>
    console.log(`  ${f.CONSTRAINT_NAME}: ${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}(${f.REFERENCED_COLUMN_NAME})`)
  );

  await conexion.end();
  console.log('\nBase de datos lista.\n');
}

main().catch((e) => {
  console.error('\nERROR:', e.code || '', e.message);
  process.exit(1);
});
