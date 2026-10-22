# API de Usuarios con JWT

API REST en Node.js + Express + MySQL con arquitectura MVC.
Tiene registro de usuarios, login con JSON Web Token y una ruta protegida.

Este archivo explica cómo instalarla y ejecutarla. La explicación teórica de
cómo funciona el JWT está en el PDF que acompaña a este trabajo.

---

## 1. Qué necesitás tener instalado

| Programa | Cómo verificar | De dónde bajarlo |
|---|---|---|
| Node.js 18 o superior | `node --version` | nodejs.org, versión LTS |
| MySQL 8.0 o superior | Que el servicio esté corriendo | dev.mysql.com/downloads/installer |

Durante la instalación de MySQL vas a definir una contraseña para el usuario
`root`. Anotala, porque la vas a necesitar en el paso 4.

Para saber si MySQL está corriendo en Windows: abrí el menú Inicio, escribí
`servicios` y buscá `MySQL80`. Tiene que decir "En ejecución".

---

## 2. Instalar las dependencias

Abrí una terminal en esta carpeta (donde está `package.json`) y ejecutá:

```bash
npm install
```

Descarga Express, MySQL2, jsonwebtoken, bcryptjs y las demás librerías dentro
de una carpeta nueva llamada `node_modules`. Tarda alrededor de un minuto. Si
aparecen advertencias en amarillo es normal; solo preocupate si dice `error`.

---

## 3. Configurar tus credenciales

En esta carpeta hay un archivo llamado `.env.example`. Renombralo a `.env`
(quitale el `.example`). Lo más seguro es hacerlo desde la terminal:

```bash
ren .env.example .env      # Windows
mv .env.example .env       # Mac/Linux
```

Verificá que quedó bien:

```bash
dir .env*      # tiene que mostrar .env y .env.example
```

Si en Windows lo renombrás desde el Explorador puede quedarte como `.env.txt`,
porque Windows oculta las extensiones. Por eso conviene usar el comando.

Ahora abrilo con un editor de texto y completá tus datos:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=aca_va_tu_contrasena_de_mysql
DB_NAME=sistema_web_db

JWT_SECRET=aca_va_una_clave_larga_y_aleatoria
JWT_EXPIRES_IN=2h
BCRYPT_SALT_ROUNDS=10
```

Hay dos líneas que tenés que cambiar sí o sí:

1. `DB_PASSWORD`: la contraseña de MySQL que anotaste al instalarlo.
2. `JWT_SECRET`: una clave secreta inventada por vos.

Para generar una clave buena, ejecutá esto y copiá el resultado:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Devuelve una sola línea larga, parecida a esta:

```
a3f9c2e1b8d74f6a9c0e5b2d8f1a4c7e6b3d9f2a5c8e1b4d7f0a3c6e9b2d5f8a
```

El archivo `.env` guarda tu contraseña de MySQL y tu clave secreta, así que no
lo subas a GitHub ni lo compartas con tus compañeros. Ya está en `.gitignore`
para que no se suba por accidente.

---

## 4. Crear la base de datos

```bash
node _tools/setup-db.js
```

Crea la base `sistema_web_db`, las tablas `estados_usuario` y `usuarios`, la
clave foránea y los datos iniciales. La salida esperada termina así:

```
Schema ejecutado sin errores.

--- estados_usuario ---
  1 = Activo
  2 = Inactivo
  3 = Suspendido

--- foreign keys de usuarios ---
  fk_usuario_estado: estado_id -> estados_usuario(id)

Base de datos lista.
```

Se puede ejecutar las veces que quieras: no borra nada.

---

## 5. Comprobar que quedó bien

```bash
node _tools/check-db.js
```

El resultado esperado es `5 OK | 0 fallidas`. Verifica que las restricciones de
la base de datos realmente rechacen datos inválidos: un `estado_id` que no
existe, un email repetido, y así.

---

## 6. Arrancar la API

```bash
npm run dev
```

La salida esperada es:

```
DB Conectada. Test query: 2
Servidor en puerto 3000
```

Dejá esa terminal abierta. Para detenerla, `Ctrl + C`.

Abrí el navegador en http://localhost:3000 y vas a ver la lista de endpoints.

---

## 7. Verificar que todo funciona

Con la API corriendo, abrí **otra** terminal en esta misma carpeta y ejecutá:

```bash
node _tools/e2e.js
```

El resultado esperado es `26 pruebas OK | 0 fallidas`.

El script hace el recorrido completo: registra un usuario, hace login, usa el
token en la ruta protegida e intenta tres ataques distintos (alterar el token,
firmarlo con otra clave, usarlo expirado). Los tres tienen que ser rechazados.

Después limpiá los usuarios de prueba:

```bash
node _tools/clean-test-users.js
```

---

## 8. Si todavía no tenés MySQL funcionando

Podés estudiar cómo funciona el JWT sin base de datos:

```bash
npm run demo
```

Muestra en la consola, paso a paso, cómo se hashea una contraseña, cómo se
firma el token, qué lleva adentro y por qué un token alterado es rechazado.

Y podés correr las pruebas del login con una base de datos simulada:

```bash
npm run check
```

El resultado esperado es `29 pruebas OK | 0 fallidas`.

---

## Endpoints

| Método | Ruta | Necesita token | Descripción |
|---|---|---|---|
| GET | `/` | No | Información de la API |
| POST | `/api/usuarios/registro` | No | Crea un usuario |
| POST | `/api/usuarios/login` | No | Valida credenciales y devuelve el token |
| GET | `/api/usuarios/perfil` | Sí | Datos del usuario del token |

Para probarlos de forma cómoda usá Postman o Thunder Client (extensión de
VS Code). En el PDF de teoría está el recorrido completo con las peticiones.

---

## Estructura del proyecto

```
.
├── src/
│   ├── config/db.js             Conexión a MySQL (pool)
│   ├── controllers/             Lógica de negocio
│   ├── middlewares/             Filtro que verifica el JWT
│   ├── models/                  Única capa que ejecuta SQL
│   ├── routes/                  Definición de endpoints
│   ├── utils/jwt.js             Firmar y verificar tokens
│   └── index.js                 Punto de entrada
├── database/schema.sql          Estructura de la base de datos
├── _tools/                      Scripts de prueba y demostración
├── .env                         Tus credenciales (no se comparte)
└── package.json
```

---

## Comandos disponibles

| Comando | Qué hace | Necesita MySQL |
|---|---|---|
| `npm run dev` | Arranca la API con recarga automática | Sí |
| `npm start` | Arranca la API en modo normal | Sí |
| `npm run demo` | Muestra el ciclo de vida de un JWT | No |
| `npm run check` | 29 pruebas del login con base simulada | No |
| `node _tools/setup-db.js` | Crea la base de datos y las tablas | Sí |
| `node _tools/check-db.js` | Verifica las restricciones de la base | Sí |
| `node _tools/e2e.js` | 26 pruebas de punta a punta | Sí |
| `node _tools/clean-test-users.js` | Borra los usuarios de prueba | Sí |

---

## Si algo falla

### `Error al conectar a DB: Access denied for user 'root'@'localhost'`

La contraseña de MySQL en el `.env` está mal. Revisá que no tenga espacios ni
comillas. Si nunca definiste contraseña, probá dejarlo vacío (`DB_PASSWORD=`).
Verificá que sea la misma que usás para entrar a MySQL Workbench.

### `Error al conectar a DB: connect ECONNREFUSED 127.0.0.1:3306`

MySQL no está corriendo. En Windows, buscá `servicios` en el menú Inicio y
verificá que `MySQL80` esté "En ejecución". Si está detenido, clic derecho,
Iniciar.

### `Error al conectar a DB: Unknown database 'sistema_web_db'`

Te falta el paso 4. Ejecutá `node _tools/setup-db.js`.

### `Falta JWT_SECRET en el archivo .env`

No creaste el archivo `.env` (paso 3), o quedó con el nombre `.env.example`.
Acordate de renombrarlo, no de copiarlo.

### `Cannot find module 'express'`

Te falta el paso 2. Ejecutá `npm install`.

### Windows no me deja renombrar el archivo a `.env`

Windows a veces oculta la extensión y lo guarda como `.env.txt`. Hacelo desde
la terminal con `ren .env.example .env` y verificá con `dir .env*`.

### `EADDRINUSE: address already in use :::3000`

Ya hay otra cosa usando el puerto 3000, probablemente otra terminal con la API
corriendo. Cerrá esa terminal, o cambiá el puerto en el `.env` poniendo
`PORT=3001`. Acordate de usar ese puerto en las URLs.

### El registro funciona pero el login falla siempre

Es el síntoma clásico de que la columna `password` quedó como `VARCHAR(50)` en
vez de `VARCHAR(255)`, y el hash de Bcrypt (60 caracteres) se cortó. Verificá
en MySQL Workbench con:

```sql
USE sistema_web_db;
SHOW COLUMNS FROM usuarios LIKE 'password';
```

Tiene que decir `varchar(255)`. Si dice otra cosa, borrá la tabla y volvé a
correr `node _tools/setup-db.js`:

```sql
DROP TABLE usuarios;
```

### `npm install` falla con errores de compilación de C++

No debería pasarte: el proyecto usa `bcryptjs`, que es JavaScript puro y no
necesita compilar nada. Si ves un error de este tipo, revisá que en
`package.json` diga `bcryptjs` y no `bcrypt`.

---

## Cómo verificar que la contraseña quedó hasheada

Abrí MySQL Workbench y ejecutá:

```sql
USE sistema_web_db;
SELECT id, nombre, email, password, rol, estado_id FROM usuarios;
```

La columna `password` tiene que verse así:

```
$2b$10$rUzovtrHbR031Wa1n2yoS.o6J26WwJkbFWOMeaIxYTlF35VSrKhqG
```

Nunca en texto plano, y nunca deberías ver la contraseña que escribiste. Fijate
también que `rol` sea `usuario_estandar` y `estado_id` sea `1`: esos dos los
asigna la base de datos automáticamente.

---

## Entregables sugeridos

1. El proyecto funcionando: captura de `npm run dev` con la API levantada.
2. Captura de `node _tools/e2e.js` con 26 pruebas OK.
3. Captura de MySQL Workbench mostrando el usuario creado con la contraseña
   hasheada.
4. Un token de tu propio login, pegado en jwt.io, identificando sus tres partes
   (header, payload, signature).
5. Los ejercicios dados por el docente.
# act-seg-cuatrimestre-programacion
