import pool from '../src/db.js';

export const obtenerPorCorreo = async (email) => {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    return rows[0] || null;
};

export const crearUsuario = async (email, password, nombre) => {
    const query = "INSERT INTO usuarios (email, password, nombre) VALUES (?, ?, ?)";
    const [result] = await pool.query(query, [email, password, nombre]);
    return result;
};
