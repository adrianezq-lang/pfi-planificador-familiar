import fs from 'node:fs';
import assert from 'node:assert/strict';

const ruta = 'public/preferencias-mercadona-resueltas.json';
if (!fs.existsSync(ruta)) {
  throw new Error(`Falta ${ruta}. Ejecuta primero el actualizador de Mercadona.`);
}

const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const preferencias = datos.preferencias ?? {};
const pendientes = Array.isArray(datos.pendientes) ? datos.pendientes : [];

function normalizar(texto = '') {
  return String(texto)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function opcion(ingrediente, indice = 0) {
  const opciones = preferencias[ingrediente];
  assert.ok(Array.isArray(opciones) && opciones.length > indice, `Falta preferencia resuelta para ${ingrediente}`);
  return opciones[indice];
}

function contiene(ingrediente, palabras, indice = 0) {
  const nombre = normalizar(opcion(ingrediente, indice).nombreComercial);
  palabras.forEach((palabra) => {
    assert.ok(nombre.includes(normalizar(palabra)), `${ingrediente}: «${nombre}» no contiene «${palabra}»`);
  });
}

assert.equal(pendientes.length, 0, `Quedan ${pendientes.length} preferencias sin resolver`);

const leche = preferencias.Leche;
assert.ok(Array.isArray(leche) && leche.length === 2, 'Leche debe conservar dos preferencias');
assert.deepEqual(
  leche.map((item) => item.porcentaje).sort((a, b) => b - a),
  [60, 40],
  'La mezcla de leche debe seguir siendo 60/40',
);
assert.notEqual(leche[0].productoId, leche[1].productoId, 'Las dos leches deben ser referencias distintas');
contiene('Leche', ['prote']);
contiene('Leche', ['sin lactosa'], 1);

contiene('Atún', ['atun', 'oliva']);
contiene('Queso rallado', ['queso', '4']);
contiene('Mozzarella rallada', ['mozzarella']);
contiene('Garbanzos secos', ['garbanzo', 'pedrosillano']);
contiene('Garbanzos cocidos', ['garbanzo', 'pedrosillano']);

Object.entries(preferencias).forEach(([ingrediente, opciones]) => {
  const total = opciones.reduce((suma, item) => suma + Number(item.porcentaje || 0), 0);
  assert.equal(total, 100, `${ingrediente}: los porcentajes deben sumar 100`);
  opciones.forEach((item) => {
    assert.ok(item.productoId, `${ingrediente}: falta productoId`);
    assert.ok(item.nombreComercial, `${ingrediente}: falta nombre comercial`);
  });
});

console.log('✓ preferencias Mercadona resueltas: productos exactos y mezcla 60/40 conservada');
