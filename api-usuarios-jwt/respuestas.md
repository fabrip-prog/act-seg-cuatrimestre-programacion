# Respuestas del Trabajo Práctico: JWT y Control de Acceso

### Resumen de archivos modificados y creados

- **`authMiddleware.js`**: Se agregó el middleware `soloAdmin` para control de acceso basado en roles (RBAC).
- **`usuarioModel.js`**: Se crearon las consultas parametrizadas `obtenerTodos`, `obtenerPasswordPorId` y `actualizarPassword`.
- **`usuarioController.js`**: Se sumaron los controladores `listarUsuarios`, `logout`, `cambiarPassword` y se añadió `rol_admin` a la respuesta del login.
- **`usuarioRoutes.js`**: Se orquestaron las rutas `GET /admin/lista`, `POST /logout` y `PUT /password`.
- **`index.js`**: Se actualizaron los endpoints expuestos en la ruta raíz `/`.
- **`check-nuevos-ejercicios.js`**: Suite de pruebas automatizadas para validar los ejercicios del 5 al 8.

---

## Ejercicio 1: Análisis del PASO 5 en demo-jwt.js (Alteración del Payload)

### ¿Qué ocurre técnicamente?

Al ejecutar `node _tools/demo-jwt.js`, en el PASO 5 se simula un ataque de escalación de privilegios:

1. Un atacante toma un token legítimo emitido por el servidor para un usuario común (`{ id: 7, rol: "usuario_estandar" }`).
2. Como el token viaja separado por puntos (`header.payload.signature`) y el payload está codificado en Base64URL, el atacante lo decodifica fácilmente en texto plano, cambia su contenido a `{"id": 1, "rol": "admin"}` y lo vuelve a codificar en Base64URL.
3. El atacante reconstruye el token pegando el header original, su payload trucho y la firma original del servidor.
4. Cuando el servidor ejecuta `jwt.verify(tokenAlterado, JWT_SECRET)`, calcula internamente:
   ```text
   FirmaEsperada = HMAC-SHA256(header + "." + payload_alterado, JWT_SECRET)
   ```
5. La firma adjuntada por el atacante fue calculada con el payload viejo, por lo que no coincide con la nueva firma calculada.
6. La librería lanza inmediatamente una excepción: `JsonWebTokenError: invalid signature`.
7. El servidor rechaza la solicitud al instante (respondiendo con HTTP 403 Forbidden en el middleware) sin siquiera tocar la base de datos.

### Analogía práctica:

Imagínate que en un sistema de turnos de una clínica le entregás al paciente un comprobante sellado en cera con el escudo inviolable del hospital que dice *"Turno: Consulta General #45"*. El paciente borra con liquid paper y escribe *"Acceso a Quirófano y Medicamentos #1"*, pero deja el sello de cera viejo intacto. En cuanto el personal de seguridad (el middleware) revisa la impronta matemática del sello contra el texto del papel, salta a la vista que el documento fue adulterado. El sello protege la integridad del documento, no su confidencialidad.

---

## Ejercicio 2: Inspección en jwt.io y por qué NO viaja la contraseña

Al tomar el token devuelto por `POST /api/usuarios/login` y pegarlo en el depurador de [jwt.io](https://jwt.io), la herramienta decodifica las tres secciones:

1. **HEADER (Encabezado):**
   ```json
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   ```
   Indica el algoritmo de firma simétrica (HMAC con SHA-256) y el tipo de credencial.

2. **PAYLOAD (Carga útil / Claims):**
   ```json
   {
     "id": 7,
     "rol": "usuario_estandar",
     "iat": 1792416811,
     "exp": 1792424011
   }
   ```
   Muestra los datos públicos de identidad: `id`, `rol`, `iat` (*issued at*, marca de tiempo en segundos de emisión) y `exp` (*expiration*, momento exacto en que vence).

3. **SIGNATURE (Firma digital):**  
   La firma criptográfica binaria generada con la variable de entorno `JWT_SECRET`.

### ¿Por qué no aparece la contraseña ni su hash?

- **Base64URL no es cifrado:** Base64 es un algoritmo de codificación de 64 caracteres imprimibles, completamente reversible sin necesidad de ninguna clave. Cualquier persona que intercepte el token (por ejemplo en la pestaña Network de DevTools, un proxy intermedio, o un script malicioso en el navegador) puede decodificarlo ejecutando `atob(token.split('.')[1])`.
- **Propósito del JWT:** El token viaja para responder: *¿Quién sos y qué permisos tenés?*, no para almacenar secretos de autenticación.
- **Flujo seguro:** La contraseña sólo viaja una única vez en el cuerpo (`req.body`) de la petición inicial de login mediante HTTPS. El backend la verifica con `bcrypt.compare` contra MySQL y se olvida de ella. Jamás debe filtrarse en el token ni en los JSON devueltos al cliente.

---

## Ejercicio 3: Efecto de JWT_EXPIRES_IN='30s' sobre las respuestas HTTP

Se configura en `.env`: `JWT_EXPIRES_IN=30s`

Al reiniciar la API y hacer login, la función `firmarToken(payload)` emite un token con una vigencia calculada de exactamente 30 segundos (`exp = iat + 30`).

Durante los primeros 30 segundos, enviar una petición a `GET /api/usuarios/perfil` con el header `Authorization: Bearer <token>` responde con `HTTP 200 OK` y los datos del usuario.

Una vez transcurridos los 30 segundos, el reloj del sistema supera el claim `exp`. Cuando la petición llega a `verificarAuth`, `jwt.verify(token, JWT_SECRET)` detecta el vencimiento y arroja un error con `error.name === 'TokenExpiredError'`.

El bloque `catch` del middleware captura ese error específico y retorna:

- **Código de estado HTTP:** `401 Unauthorized`
- **Cuerpo de la respuesta:**
  ```json
  {
    "error": "El token expiro. Inicie sesion nuevamente."
  }
  ```

### ¿Por qué HTTP 401 y no 403?

Porque la autenticación caducó. El cliente ya no presenta una credencial válida en tiempo, por lo que el servidor le indica: *"No tenés una identidad activa, volvé a loguearte"*. Esto reduce drásticamente la ventana de oportunidad de un atacante si llega a robar el token de la memoria del cliente.

---

## Ejercicio 4: Verificación de rol y estado_id en MySQL Workbench

Cuando registramos un usuario mediante `POST /api/usuarios/registro` con `{ nombre, email, password }` y consultamos en MySQL Workbench:

```sql
SELECT id, nombre, email, rol, estado_id FROM usuarios WHERE email = 'nuevo@mail.com';
```

Obtenemos:
- **Columna `rol`:** `'usuario_estandar'`
- **Columna `estado_id`:** `1` (que por foreign key `fk_usuario_estado` referencia al registro `1 = 'Activo'` de la tabla `estados_usuario`).

### ¿Quién los asignó y por qué?

Los asignó directamente el motor relacional de MySQL gracias a la cláusula `DEFAULT` del DDL en `schema.sql:22-23`:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  ...
  rol        VARCHAR(50)  NOT NULL DEFAULT 'usuario_estandar',
  estado_id  INT          NOT NULL DEFAULT 1,
  ...
);
```

Si revisamos el modelo `crearUsuario` en `usuarioModel.js`:

```javascript
const crearUsuario = async (nombre, email, passwordHasheada) => {
  const query = 'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)';
  const [resultado] = await pool.query(query, [nombre, email, passwordHasheada]);
  return resultado;
};
```

El backend jamás incluye las columnas `rol` ni `estado_id` en el `INSERT`. Esto es una excelente práctica para evitar vulnerabilidades de **Mass Assignment** (asignación masiva): si el controlador le permitiera al cliente enviar cualquier campo del `req.body` a la base de datos, un usuario malintencionado podría enviar `{"rol": "admin", "estado_id": 1}` en el formulario de registro y convertirse en administrador del sistema automáticamente. Al omitirlos en la consulta, la base de datos garantiza la regla de negocio por defecto.

---

## Nivel Intermedio (Ejercicios 5 al 8)

### Ejercicio 5: Endpoint GET /api/usuarios/admin/lista y Middleware soloAdmin

Para este ejercicio, implementamos el patrón de middlewares encadenados típico de Express.

#### Implementación del Middleware `soloAdmin`:
Este middleware asume que antes se ejecutó `verificarAuth`, el cual decodificó el JWT y decoró el objeto de petición inyectando `req.usuario`:

```javascript
function soloAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Acceso no autorizado. Debe autenticarse primero.' });
  }
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador.' });
  }
  return next();
}
```

#### Consulta en el Modelo `obtenerTodos`:
Hacemos un `INNER JOIN` con `estados_usuario` y excluimos deliberadamente la columna `password`:

```javascript
const obtenerTodos = async () => {
  const query = 
    'SELECT u.id, u.nombre, u.email, u.rol, u.estado_id, ' +
    'e.descripcion AS estado, u.fecha_creacion ' +
    'FROM usuarios u ' +
    'INNER JOIN estados_usuario e ON e.id = u.estado_id ' +
    'ORDER BY u.id ASC';
  const [filas] = await pool.query(query);
  return filas;
};
```

#### Controlador y Orquestación de la Ruta
En `usuarioRoutes.js`:

```javascript
router.get('/admin/lista', verificarAuth, soloAdmin, usuarioController.listarUsuarios);
```

**La orquestación en Express:**
1. Llega la petición `GET /api/usuarios/admin/lista`.
2. `verificarAuth`: Valida que exista el header `Authorization: Bearer <token>`, comprueba la firma y expiración. Si está OK, guarda el payload en `req.usuario` y llama a `next()`.
3. `soloAdmin`: Lee `req.usuario.rol`. Si es `'usuario_estandar'`, interrumpe el ciclo con `res.status(403).json(...)`. Si es `'admin'`, llama a `next()`.
4. `listarUsuarios`: Ejecuta la consulta asíncrona en MySQL y responde con `200 OK` y el listado de usuarios.

---

### Ejercicio 6: POST /api/usuarios/logout y el Desafío en Arquitecturas Sin Estado

#### Implementación del Endpoint
Se agregó la ruta `POST /api/usuarios/logout` y su controlador:

```javascript
const logout = async (req, res) => {
  try {
    return res.status(200).json({
      mensaje: 'Logout exitoso. El cliente debe descartar el token almacenado.'
    });
  } catch (error) {
    console.error('[ERROR] logout:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};
```

#### ¿Puede el servidor invalidar el token que ya entregó?
En un diseño JWT puramente sin estado (*stateless*): **NO**.

Una vez que el servidor firma y entrega un token, ese string viaja en manos del cliente. Como el servidor no guarda sesiones en memoria ni en base de datos, cualquier servidor que posea el `JWT_SECRET` considerará válido ese token hasta que su timestamp `exp` caduque. El logout en el frontend consiste simplemente en borrar el token (`localStorage.removeItem('token')`).

Sin embargo, si un tercero logró interceptar ese token antes de que el usuario hiciera logout, el atacante puede seguir usándolo contra la API hasta que expire.

#### ¿Qué alternativas existen para un logout real en el servidor?

1. **Blacklist / Denylist en memoria rápida (Redis):**  
   Al hacer logout, el token (o su identificador único `jti`) se guarda en una base de datos en memoria clave-valor (como Redis) con un tiempo de expiración (TTL) igual al tiempo restante de vida del token (`exp - now`). En cada petición protegida, el middleware consulta a Redis: si el token está en la lista negra, lo rechaza con 401. Una vez expirado, Redis lo elimina solo.

2. **Arquitectura con Refresh Tokens:**  
   Se utiliza un Access Token de vida muy corta (5 a 15 minutos) y un Refresh Token de larga duración almacenado en una tabla de MySQL o Redis y enviado en una cookie `httpOnly`. Al hacer logout, el servidor borra el Refresh Token de la base de datos. El Access Token morirá por su cuenta en cuestión de minutos y el cliente no podrá renovarlo.

3. **Control de Versión de Sesión (token_version):**  
   Se agrega una columna `token_version INT DEFAULT 1` a la tabla `usuarios`. El valor se incluye en el payload del JWT. Al hacer logout forzado o cerrar sesión en todos los dispositivos, el servidor ejecuta `UPDATE usuarios SET token_version = token_version + 1 WHERE id = ?`. Cualquier token emitido con una versión anterior queda invalidado de inmediato.

---

### Ejercicio 7: Ruta protegida para Cambio de Contraseña (PUT /api/usuarios/password)

#### Consulta Parametrizada en el Modelo
En `usuarioModel.js`:

```javascript
const obtenerPasswordPorId = async (id) => {
  const query = 'SELECT password FROM usuarios WHERE id = ? LIMIT 1';
  const [filas] = await pool.query(query, [id]);
  return filas.length > 0 ? filas[0].password : null;
};

const actualizarPassword = async (id, nuevaPasswordHasheada) => {
  const query = 'UPDATE usuarios SET password = ? WHERE id = ?';
  const [resultado] = await pool.query(query, [nuevaPasswordHasheada, id]);
  return resultado;
};
```

#### Controlador `cambiarPassword`

```javascript
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, nuevaPassword } = req.body;

    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({
        error: 'Los campos passwordActual y nuevaPassword son obligatorios.'
      });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres.'
      });
    }

    // req.usuario fue inyectado por el middleware verificarAuth
    const hashActual = await usuarioModel.obtenerPasswordPorId(req.usuario.id);
    if (!hashActual) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Comparamos la contraseña actual escrita con el hash almacenado
    const passValida = await bcrypt.compare(passwordActual, hashActual);
    if (!passValida) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    }

    // Hasheamos la nueva contraseña con salt de 10 rondas
    const nuevaPasswordHasheada = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
    await usuarioModel.actualizarPassword(req.usuario.id, nuevaPasswordHasheada);

    return res.status(200).json({
      mensaje: 'Contraseña actualizada exitosamente.'
    });
  } catch (error) {
    console.error('[ERROR] cambiarPassword:', error.message);
    return res.status(500).json({ error: 'Error en servidor.' });
  }
};
```

#### ¿Qué debería pasar con el token que el usuario ya tenía en la mano?

Si un usuario cambia su contraseña porque sospecha que su cuenta fue comprometida, el token anterior debe quedar invalidado inmediatamente.

En una arquitectura básica sin estado, el token previo seguiría siendo matemáticamente válido hasta su fecha de vencimiento (`exp`), lo que dejaría una brecha de seguridad grave para un atacante que hubiera capturado ese token.

**Solución profesional en producción:** Se implementa una columna `password_changed_at TIMESTAMP` en la tabla `usuarios`. En el middleware `verificarAuth`, se comprueba si la fecha de emisión del token (`payload.iat * 1000`) es anterior a `password_changed_at`. Si es anterior, se rechaza la petición con 401 obligando al usuario (y al atacante) a autenticarse con la nueva contraseña.

---

### Ejercicio 8: Columna rol_admin en el Login y Evaluación de Seguridad

#### Modificación en `usuarioController.login`

Agregamos el campo booleano tanto en la raíz de la respuesta como en el objeto `usuario`:

```javascript
return res.status(200).json({
  mensaje: 'Login exitoso.',
  token,
  expira_en: JWT_EXPIRES_IN,
  rol_admin: usuario.rol === 'admin',
  usuario: {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    rol_admin: usuario.rol === 'admin'
  }
});
```

#### ¿Es suficiente ocultar el botón en el Frontend como control de seguridad? ¿Por qué NO?

**Rotundamente NO.** Ocultar un botón o una sección en el frontend (con `v-if`, `ngIf`, `display: none` o condicionales de React) es una medida exclusiva de **Experiencia de Usuario (UX)** para no confundir al usuario con opciones a las que no tiene acceso, pero **nunca** es un mecanismo de seguridad.

**Las razones técnicas:**

1. **El código del cliente corre en territorio hostil:** Cualquier usuario puede presionar F12, abrir las DevTools del navegador, modificar el estilo del botón para quitarle el `display: none`, o escribir en la consola de JavaScript `usuario.rol_admin = true`.
2. **Las peticiones HTTP son independientes de la interfaz:** Un atacante no necesita hacer clic en ningún botón. Puede abrir Postman, Thunder Client o escribir un simple `fetch('/api/usuarios/admin/lista', { headers: { Authorization: 'Bearer ...' } })` en la consola.
3. **Regla de oro del desarrollo de software:** *"Never trust the client"* (Nunca confíes en los datos o estados enviados por el cliente). La seguridad real debe existir siempre en el backend mediante middlewares de autorización como `soloAdmin`. Aunque el atacante haga visible el botón y dispare la petición, Express interceptará el request, verificará el token en el servidor y le responderá de forma tajante con un HTTP 403 Forbidden.

---

## Verificación y Tests Automatizados

Para comprobar que todo el ecosistema funcione a la perfección sin depender de tener el servicio local de MySQL levantado, implementamos una suite de pruebas con mocks en memoria para las consultas SQL:

1. **Suite existente (`check-login.js`):**
   ```bash
   node _tools/check-login.js
   # RESULTADO: 29 pruebas OK | 0 fallidas
   ```

2. **Suite de los nuevos ejercicios (`check-nuevos-ejercicios.js`):**
   ```bash
   node _tools/check-nuevos-ejercicios.js
   # RESULTADO: 15 pruebas OK | 0 fallidas
   ```

Podés correr ambas suites en cualquier momento ejecutando `node _tools/check-login.js` y `node _tools/check-nuevos-ejercicios.js` (o usando `npm run check` y `npm run check:ejercicios` si usás cmd/bash).
