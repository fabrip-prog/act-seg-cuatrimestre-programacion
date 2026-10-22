const nombreRegex = /^[a-zA-ZÀ-ÿ\s]{1,40}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validarRegistro = (nombre, apellido, email, password) => {
    if (!nombre || !apellido || !email || !password) {
        return { error: "Todos los campos son obligatorios" };
    }
    if (!nombreRegex.test(nombre)) {
        return { error: "El nombre solo puede contener letras y espacios (máx. 40 caracteres)" };
    }
    if (!nombreRegex.test(apellido)) {
        return { error: "El apellido solo puede contener letras y espacios (máx. 40 caracteres)" };
    }
    if (!emailRegex.test(email)) {
        return { error: "El formato del email no es válido" };
    }
    if (password.length < 6) {
        return { error: "La contraseña debe tener al menos 6 caracteres" };
    }
    return null;
};