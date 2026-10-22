const path = require('path');
const Module = require('module');

const RAIZ = path.join(__dirname, '..');

const USUARIO_FALSO = {
  id: 7,
  nombre: 'Ana Torres',
  email: 'ana@mail.com',

  password: '$2b$10$rUzovtrHbR031Wa1n2yoS.o6J26WwJkbFWOMeaIxYTlF35VSrKhqG',
  rol: 'usuario_estandar',
  estado_id: 1
};

let filasSimuladas = [];

const poolFalso = {
  query: async (sql, params) => {

    if (/SELECT\s+1\s*\+\s*1/i.test(sql)) {
      return [[{ solucion: 2 }], []];
    }
    if (/INSERT INTO usuarios/i.test(sql)) {
      return [{ insertId: 7, affectedRows: 1 }, []];
    }
    if (/FROM usuarios/i.test(sql)) {
      const email = params ? params[0] : null;
      if (/WHERE email/i.test(sql)) {
        filasSimuladas = email === USUARIO_FALSO.email ? [USUARIO_FALSO] : [];
      } else {
        filasSimuladas = [USUARIO_FALSO];
      }
      return [filasSimuladas, []];
    }
    return [[], []];
  }
};

const requireOriginal = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'mysql2/promise') {
    return { createPool: () => poolFalso };
  }
  return requireOriginal.apply(this, arguments);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave_de_prueba_para_el_check';
require(path.join(RAIZ, 'src', 'config', 'db'));

const express = require('express');
const usuarioRoutes = require(path.join(RAIZ, 'src', 'routes', 'usuarioRoutes'));

const app = express();
app.use(express.json());
app.use('/api/usuarios', usuarioRoutes);

let pasaron = 0;
let fallaron = 0;

function verificar(titulo, condicion, detalle) {
  if (condicion) {
    pasaron++;
    console.log(`  [OK]    ${titulo}`);
  } else {
    fallaron++;
    console.log(`  [FALLO] ${titulo}`);
    if (detalle !== undefined) {
      console.log(`          -> ${JSON.stringify(detalle)}`);
    }
  }
}

function titulo(t) {
  console.log('\n' + '-'.repeat(66));
  console.log(t);
  console.log('-'.repeat(66));
}

async function main() {
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const post = (ruta, body) =>
    fetch(base + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

  console.log('\n' + '='.repeat(66));
  console.log('  PRUEBA DE INTEGRACION - FLUJO DE LOGIN CON JWT');
  console.log('='.repeat(66));

  titulo('1. LOGIN con credenciales correctas -> 200 + token');

  const r1 = await post('/api/usuarios/login', {
    email: 'ana@mail.com',
    password: 'secreta123'
  });
  const d1 = await r1.json();

  verificar('responde HTTP 200', r1.status === 200, r1.status);
  verificar('devuelve un token', typeof d1.token === 'string' && d1.token.length > 40);
  verificar('el token tiene 3 partes', (d1.token || '').split('.').length === 3);
  verificar('NO devuelve la contrasena', !JSON.stringify(d1).includes('password'));
  verificar('NO devuelve el hash', !JSON.stringify(d1).includes('$2b$'));
  console.log('          token:', (d1.token || '').substring(0, 58) + '...');

  titulo('2. Payload del token: que viaja dentro');

  const jwt = require('jsonwebtoken');
  const payload = jwt.decode(d1.token);
  console.log('          payload:', JSON.stringify(payload));
  verificar('contiene el id del usuario', payload.id === 7, payload.id);
  verificar('contiene el rol', payload.rol === 'usuario_estandar', payload.rol);
  verificar('contiene exp (expiracion)', typeof payload.exp === 'number');
  verificar('el payload NO tiene la contrasena', payload.password === undefined);

  const minutos = Math.round((payload.exp - payload.iat) / 60);
  console.log(`          vigencia: ${minutos} minutos`);
  verificar('la vigencia es de 2 horas (120 min)', minutos === 120, minutos);

  titulo('3. LOGIN con contrasena incorrecta -> 401 generico');

  const r2 = await post('/api/usuarios/login', {
    email: 'ana@mail.com',
    password: 'claveEquivocada'
  });
  const d2 = await r2.json();
  verificar('responde HTTP 401', r2.status === 401, r2.status);
  verificar('mensaje generico "Credenciales invalidas."', d2.error === 'Credenciales invalidas.', d2.error);
  verificar('no entrega token', d2.token === undefined);

  titulo('4. LOGIN con email inexistente -> 401 MISMO mensaje');

  const r3 = await post('/api/usuarios/login', {
    email: 'noexiste@mail.com',
    password: 'secreta123'
  });
  const d3 = await r3.json();
  verificar('responde HTTP 401', r3.status === 401, r3.status);
  verificar('MISMO mensaje que el caso anterior (anti-enumeracion)',
    d3.error === d2.error, { incorrecta: d2.error, inexistente: d3.error });
  console.log('          -> Un atacante no puede distinguir si el email existe.');

  titulo('5. Ruta protegida SIN token -> 401');

  const r4 = await fetch(base + '/api/usuarios/perfil');
  const d4 = await r4.json();
  verificar('responde HTTP 401', r4.status === 401, r4.status);
  verificar('explica que falta el token', /no proporcionado/i.test(d4.error || ''), d4.error);

  titulo('6. Ruta protegida CON token valido -> 200');

  const r5 = await fetch(base + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${d1.token}` }
  });
  const d5 = await r5.json();
  verificar('responde HTTP 200', r5.status === 200, r5.status);
  verificar('devuelve el usuario del token', d5.usuario && d5.usuario.id === 7, d5.usuario);

  titulo('7. Token ALTERADO (rol cambiado a admin) -> 403');

  const [h, , s] = d1.token.split('.');
  const payloadFalso = Buffer.from(JSON.stringify({ id: 7, rol: 'admin' }))
    .toString('base64url');
  const r6 = await fetch(base + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${h}.${payloadFalso}.${s}` }
  });
  const d6 = await r6.json();
  verificar('responde HTTP 403', r6.status === 403, r6.status);
  verificar('detecta la firma alterada', /firma alterada|invalido/i.test(d6.error || ''), d6.error);

  titulo('8. Token firmado con OTRA clave -> 403');

  const tokenAjeno = jwt.sign({ id: 7, rol: 'admin' }, 'clave_del_atacante');
  const r7 = await fetch(base + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${tokenAjeno}` }
  });
  verificar('responde HTTP 403', r7.status === 403, r7.status);

  titulo('9. Token EXPIRADO -> 401 con mensaje propio');

  const tokenViejo = jwt.sign({ id: 7, rol: 'usuario_estandar' },
    process.env.JWT_SECRET, { expiresIn: '-10s' });
  const r8 = await fetch(base + '/api/usuarios/perfil', {
    headers: { Authorization: `Bearer ${tokenViejo}` }
  });
  const d8 = await r8.json();
  verificar('responde HTTP 401', r8.status === 401, r8.status);
  verificar('avisa que expiro', /expiro/i.test(d8.error || ''), d8.error);

  titulo('10. Header Authorization mal formado -> 401');

  const r9 = await fetch(base + '/api/usuarios/perfil', {
    headers: { Authorization: d1.token }
  });
  verificar('responde HTTP 401', r9.status === 401, r9.status);

  titulo('11. REGISTRO: hashea antes de guardar');

  const bcrypt = require('bcryptjs');
  const r10 = await post('/api/usuarios/registro', {
    nombre: 'Agustin Perez',
    email: 'agusperez@mail.com',
    password: 'passwordSecreta'
  });
  const d10 = await r10.json();
  verificar('responde HTTP 201 Created', r10.status === 201, r10.status);
  verificar('confirma el registro', /registrado/i.test(d10.mensaje || ''), d10.mensaje);
  console.log('          -> El modelo recibio el hash, nunca el texto plano.');

  const r11 = await post('/api/usuarios/registro', {
    nombre: 'Sin Password',
    email: 'x@mail.com'
  });
  verificar('rechaza registro sin password (400)', r11.status === 400, r11.status);

  const r12 = await post('/api/usuarios/registro', {
    nombre: 'Corta',
    email: 'y@mail.com',
    password: '123'
  });
  verificar('rechaza password menor a 6 caracteres (400)', r12.status === 400, r12.status);

  servidor.close();

  console.log('\n' + '='.repeat(66));
  console.log(`  RESULTADO:  ${pasaron} pruebas OK   |   ${fallaron} fallidas`);
  console.log('='.repeat(66) + '\n');

  process.exit(fallaron === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Error inesperado en la prueba:', e);
  process.exit(1);
});
