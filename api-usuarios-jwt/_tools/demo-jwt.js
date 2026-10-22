require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

const linea = (t) => console.log('\n' + '='.repeat(64) + '\n  ' + t + '\n' + '='.repeat(64));

linea('PASO 1 - REGISTRO: hashear la contrasena');

const passwordPlana = 'miPasswordSecreta123';
const hashGuardadoEnBD = bcrypt.hashSync(passwordPlana, 10);

console.log('Lo que escribe el usuario (texto plano):');
console.log('   ', passwordPlana);
console.log('\nLo que se guarda en MySQL (hash Bcrypt):');
console.log('   ', hashGuardadoEnBD);
console.log('\nLongitud del hash:', hashGuardadoEnBD.length, 'caracteres');
console.log('-> Por eso la columna debe ser VARCHAR(255) y no VARCHAR(50).');

console.log('\nEl "salt" esta DENTRO del hash (primeros 29 chars):');
console.log('   ', hashGuardadoEnBD.substring(0, 29));
console.log('-> Por eso dos usuarios con la misma clave tienen hashes distintos:');
const otroHash = bcrypt.hashSync(passwordPlana, 10);
console.log('    hash 1:', hashGuardadoEnBD.substring(0, 40) + '...');
console.log('    hash 2:', otroHash.substring(0, 40) + '...');
console.log('    Son iguales?', hashGuardadoEnBD === otroHash, '(false = correcto)');

linea('PASO 2 - LOGIN: comparar, nunca desencriptar');

console.log('bcrypt NO desencripta (es unidireccional).');
console.log('Vuelve a hashear lo que llega y compara.\n');
console.log('  password correcta ->', bcrypt.compareSync('miPasswordSecreta123', hashGuardadoEnBD));
console.log('  password erronea  ->', bcrypt.compareSync('otraCosa', hashGuardadoEnBD));

linea('PASO 3 - EMITIR el token (jwt.sign)');

const payload = { id: 7, rol: 'usuario_estandar' };
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

console.log('PAYLOAD (datos que viajan dentro):');
console.log('   ', JSON.stringify(payload));
console.log('\nTOKEN emitido:');
console.log('   ', token);

const partes = token.split('.');
console.log('\nEl token tiene 3 partes separadas por puntos:');
console.log('   1. HEADER    :', partes[0]);
console.log('   2. PAYLOAD   :', partes[1]);
console.log('   3. SIGNATURE :', partes[2].substring(0, 24) + '...');

console.log('\nHeader decodificado  :', Buffer.from(partes[0], 'base64').toString());
console.log('Payload decodificado :', Buffer.from(partes[1], 'base64').toString());
console.log('\n>>> CUALQUIERA puede leer esas dos partes: estan en base64,');
console.log('>>> no cifradas. Por eso NUNCA se pone la contrasena en el payload.');

linea('PASO 4 - VERIFICAR el token (jwt.verify)');

try {
  const decodificado = jwt.verify(token, JWT_SECRET);
  console.log('Token VALIDO. El servidor obtiene la identidad sin consultar sesion:');
  console.log('   ', decodificado);
  console.log('\nEmitido :', new Date(decodificado.iat * 1000).toLocaleString());
  console.log('Expira  :', new Date(decodificado.exp * 1000).toLocaleString());
} catch (e) {
  console.log('ERROR inesperado:', e.message);
}

linea('PASO 5 - ATAQUE 1: alterar el payload');

const payloadFalsificado = Buffer.from(
  JSON.stringify({ id: 1, rol: 'admin' })
).toString('base64url');

const tokenAlterado = `${partes[0]}.${payloadFalsificado}.${partes[2]}`;
console.log('Un atacante cambia su rol a "admin" y reusa la firma vieja:');
console.log('   ', tokenAlterado.substring(0, 60) + '...');
try {
  jwt.verify(tokenAlterado, JWT_SECRET);
  console.log('FALLO DE SEGURIDAD: se acepto el token alterado');
} catch (e) {
  console.log('\nRECHAZADO ->', e.name + ':', e.message);
  console.log('La firma ya no coincide con el contenido: el token es basura.');
}

linea('PASO 6 - ATAQUE 2: firmar con una clave inventada');

const tokenOtraClave = jwt.sign({ id: 1, rol: 'admin' }, 'clave_inventada');
try {
  jwt.verify(tokenOtraClave, JWT_SECRET);
  console.log('FALLO DE SEGURIDAD: se acepto un token de otro servidor');
} catch (e) {
  console.log('RECHAZADO ->', e.name + ':', e.message);
  console.log('Sin conocer JWT_SECRET es imposible fabricar un token valido.');
}

linea('PASO 7 - EXPIRACION');

const tokenCorto = jwt.sign({ id: 7 }, JWT_SECRET, { expiresIn: '1ms' });
setTimeout(() => {
  try {
    jwt.verify(tokenCorto, JWT_SECRET);
    console.log('El token sigue vivo');
  } catch (e) {
    console.log('Token de 1 ms ->', e.name + ':', e.message);
    console.log('\nEl servidor responde 401 y el usuario debe volver a loguearse.');
    console.log('expiresIn limita el dano si a alguien le roban el token.');
    console.log('\n' + '='.repeat(64));
    console.log('  FIN DE LA DEMOSTRACION');
    console.log('='.repeat(64) + '\n');
  }
}, 50);
