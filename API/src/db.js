import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'usuarios_varios',
    waitForConnections: true,
    connectionLimit: 10,
});

// Test de conexión al iniciar
pool.query('SELECT 1 + 1 AS solution')
    .then(() => {
        console.log('✅ Conexión a la base de datos establecida');
    })
    .catch((error) => {
        console.error('❌ Error de conexión a DB:', error.message);
    });

export default pool;