import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const memoria = new Map();
globalThis.localStorage = {
  get length() { return memoria.size; },
  key(indice) { return Array.from(memoria.keys())[indice] ?? null; },
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
  clear() { memoria.clear(); },
};
globalThis.window = {
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
};
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const [app, page, actions, css, pkg, sw, copias] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Asistente.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/accionesAsistente.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/assistant-pro.css', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/copiasSeguridad.ts', import.meta.url), 'utf8'),
]);

assert.match(app, /menuEditable=\{menu\}/);
assert.match(app, /guardarMenu=\{guardarMenu\}/);
assert.match(page, /Confirmar cambio/);
assert.match(page, /detectarAccionAsistente/);
assert.match(page, /guardarFinDeSemanaSinNinos/);
assert.match(page, /añadirProductoManualCompra/);
assert.match(page, /guardarExcepcion/);
assert.match(page, /PFI nunca aplica un cambio/);
assert.match(actions, /tipo: 'cambiar-menu'/);
assert.match(actions, /tipo: 'anadir-compra'/);
assert.match(actions, /tipo: 'fin-semana-sin-ninos'/);
assert.match(actions, /tipo: 'excepcion-dia'/);
assert.match(css, /\.assistant-confirm/);
assert.match(css, /\.assistant-action-result/);

const packageJson = JSON.parse(pkg);
assert.equal(packageJson.version, '0.9.46');
assert.match(app, /v0\.9\.46/);
assert.match(sw, /pfi-v0\.9\.46-1/);
assert.match(copias, /VERSION_APP = '0\.9\.46'/);

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const { detectarAccionAsistente } =
  await vite.ssrLoadModule('/src/services/accionesAsistente.ts');

const menu = [
  { dia: 'Lunes', comida: ['Lentejas'], cena: ['Lomo'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
  { dia: 'Martes', comida: ['Arroz'], cena: ['Tortilla'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
  { dia: 'Miércoles', comida: ['Pasta'], cena: ['Fajitas'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
  { dia: 'Jueves', comida: ['Garbanzos'], cena: ['Ternera'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
  { dia: 'Viernes', comida: ['Macarrones'], cena: ['Pizza'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
  { dia: 'Sábado', comida: ['Lubina'], cena: ['Hamburguesas'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
  { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: '' },
];

const recetas = [
  { nombre: 'Salmón', categoria: 'Pescado', ingredientes: [] },
  { nombre: 'Lentejas', categoria: 'Legumbres', ingredientes: [] },
];

const cambioCena = detectarAccionAsistente(
  'Cámbiame la cena del martes por salmón',
  menu,
  recetas,
);
assert.equal(cambioCena?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(cambioCena?.propuesta?.accion.momento, 'cena');
assert.equal(cambioCena?.propuesta?.accion.dia, 'Martes');
assert.equal(cambioCena?.propuesta?.accion.platoNuevo, 'Salmón');

const ponSabado = detectarAccionAsistente(
  'Pon salmón el sábado',
  menu,
  recetas,
);
assert.equal(ponSabado?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(ponSabado?.propuesta?.accion.momento, 'comida');
assert.equal(ponSabado?.propuesta?.accion.dia, 'Sábado');

const compra = detectarAccionAsistente(
  'Añade 2 litros de leche a la compra',
  menu,
  recetas,
);
assert.equal(compra?.propuesta?.accion.tipo, 'anadir-compra');
assert.equal(compra?.propuesta?.accion.cantidad, 2);
assert.equal(compra?.propuesta?.accion.unidad, 'l');
assert.equal(compra?.propuesta?.accion.nombre.toLowerCase(), 'leche');

const finde = detectarAccionAsistente(
  'Este finde no están los niños',
  menu,
  recetas,
);
assert.equal(finde?.propuesta?.accion.tipo, 'fin-semana-sin-ninos');
assert.equal(finde?.propuesta?.accion.sinNinos, true);

const fuera = detectarAccionAsistente(
  'El domingo comemos fuera',
  menu,
  recetas,
);
assert.equal(fuera?.propuesta?.accion.tipo, 'excepcion-dia');
assert.equal(fuera?.propuesta?.accion.excepcion, 'sinComida');
assert.equal(fuera?.propuesta?.accion.dia, 'Domingo');

const incompleto = detectarAccionAsistente(
  'Cámbiame la cena del martes',
  menu,
  recetas,
);
assert.ok(incompleto?.aclaracion);
assert.equal(incompleto?.propuesta, undefined);

await vite.close();

console.log('✓ el asistente interpreta cambios de menú sin ejecutarlos directamente');
console.log('✓ añadir compra, fin de semana sin niños y comidas fuera requieren confirmación');
console.log('✓ las órdenes incompletas piden aclaración en lugar de adivinar');
console.log('✓ versión, caché y copias están alineadas en v0.9.46');
