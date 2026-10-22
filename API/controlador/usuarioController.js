import bcrypt from 'bcrypt';
import { crearUsuario, obtenerPorCorreo } from '../modelo/usuario.modelo.js';
import { validarRegistro } from '../utils/validacion.js';

const SALT_ROUNDS = 10;

export const registro = async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;

        // 1. Validación de datos de entrada
        const errorValidacion = validarRegistro(nombre, apellido, email, password);
        if (errorValidacion) {
            return res.status(400).json(errorValidacion);
        }

        // 2. Verificar si el email ya está registrado
        const usuarioExistente = await obtenerPorCorreo(email);
        if (usuarioExistente) {
            return res.status(409).json({ error: "El email ya está registrado" });
        }

        // 3. Hashear la contraseña con bcrypt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 4. Crear el usuario en la base de datos
        const nombreCompleto = `${nombre} ${apellido}`;
        const resultado = await crearUsuario(email, hashedPassword, nombreCompleto);

        // 5. Respuesta exitosa
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario: {
                id: resultado.insertId,
                nombre: nombreCompleto,
                email: email
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};