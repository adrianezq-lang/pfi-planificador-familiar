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
assert.match(actions, /tipo: 'copiar-menu'/);
assert.match(actions, /tipo: 'mover-menu'/);
assert.match(actions, /tipo: 'intercambiar-menu'/);
assert.match(actions, /tipo: 'restaurar-menu'/);
assert.match(actions, /detectarIntencionPropuestaPendiente/);
assert.match(actions, /ajustarPropuestaPendiente/);
assert.match(actions, /crearPropuestaRepetirUltimaAccion/);
assert.match(actions, /resolverReferenciasTemporales/);
assert.match(page, /crearPropuestaDeshacerMenu/);
assert.match(page, /He preparado la repetición/);
assert.match(page, /He ajustado la propuesta/);
assert.match(actions, /tipo: 'anadir-compra'/);
assert.match(actions, /tipo: 'fin-semana-sin-ninos'/);
assert.match(actions, /tipo: 'excepcion-dia'/);
assert.match(css, /\.assistant-confirm/);
assert.match(css, /\.assistant-action-result/);

const packageJson = JSON.parse(pkg);
assert.equal(packageJson.version, '0.9.54');
assert.match(app, /v0\.9\.54/);
assert.match(sw, /pfi-v0\.9\.54-1/);
assert.match(copias, /VERSION_APP = '0\.9\.54'/);

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const {
  ajustarPropuestaPendiente,
  crearPropuestaDeshacerMenu,
  crearPropuestaRepetirUltimaAccion,
  detectarAccionAsistente,
  detectarIntencionPropuestaPendiente,
} = await vite.ssrLoadModule('/src/services/accionesAsistente.ts');

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

const semanaActiva = {
  id: 'semana-4',
  nombre: 'Semana 4',
  inicio: '2026-09-21',
  fin: '2026-09-27',
  menu,
};

const fechaReferencia = '2026-09-22';

const cambioManana = detectarAccionAsistente(
  'Cámbiame la cena de mañana por salmón',
  menu,
  recetas,
  semanaActiva,
  fechaReferencia,
);
assert.equal(cambioManana?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(cambioManana?.propuesta?.accion.dia, 'Miércoles');
assert.equal(cambioManana?.propuesta?.accion.momento, 'cena');
assert.equal(cambioManana?.propuesta?.accion.platoNuevo, 'Salmón');

const cambioFecha = detectarAccionAsistente(
  'Pon salmón el 24',
  menu,
  recetas,
  semanaActiva,
  fechaReferencia,
);
assert.equal(cambioFecha?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(cambioFecha?.propuesta?.accion.dia, 'Jueves');
assert.equal(cambioFecha?.propuesta?.accion.momento, 'comida');

const copiaRelativa = detectarAccionAsistente(
  'Copia la cena de ayer en mañana',
  menu,
  recetas,
  semanaActiva,
  fechaReferencia,
);
assert.equal(copiaRelativa?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(copiaRelativa?.propuesta?.accion.diaOrigen, 'Lunes');
assert.equal(copiaRelativa?.propuesta?.accion.diaDestino, 'Miércoles');
assert.equal(copiaRelativa?.propuesta?.accion.momentoOrigen, 'cena');
assert.equal(copiaRelativa?.propuesta?.accion.momentoDestino, 'cena');
assert.deepEqual(copiaRelativa?.propuesta?.accion.platosNuevos, ['Lomo']);

const copiaHoyManana = detectarAccionAsistente(
  'Cambia la comida de hoy por la de mañana',
  menu,
  recetas,
  semanaActiva,
  fechaReferencia,
);
assert.equal(copiaHoyManana?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(copiaHoyManana?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(copiaHoyManana?.propuesta?.accion.diaOrigen, 'Miércoles');

const fueraManana = detectarAccionAsistente(
  'Mañana cenamos fuera',
  menu,
  recetas,
  semanaActiva,
  fechaReferencia,
);
assert.equal(fueraManana?.propuesta?.accion.tipo, 'excepcion-dia');
assert.equal(fueraManana?.propuesta?.accion.dia, 'Miércoles');
assert.equal(fueraManana?.propuesta?.accion.excepcion, 'sinCena');

const fueraDeSemana = detectarAccionAsistente(
  'Pasado mañana cenamos fuera',
  menu,
  recetas,
  semanaActiva,
  '2026-09-27',
);
assert.ok(fueraDeSemana?.aclaracion);
assert.match(fueraDeSemana?.aclaracion ?? '', /fuera de la semana activa/i);
assert.equal(fueraDeSemana?.propuesta, undefined);

const copiaEntreDias = detectarAccionAsistente(
  'Cambia la comida del martes 22 por la del miércoles23',
  menu,
  recetas,
  semanaActiva,
  fechaReferencia,
);
assert.equal(copiaEntreDias?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(copiaEntreDias?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(copiaEntreDias?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.equal(copiaEntreDias?.propuesta?.accion.momentoDestino, 'comida');
assert.equal(copiaEntreDias?.propuesta?.accion.momentoOrigen, 'comida');
assert.deepEqual(copiaEntreDias?.propuesta?.accion.platosNuevos, ['Pasta']);
assert.match(copiaEntreDias?.propuesta?.resumen ?? '', /Martes 22/);
assert.match(copiaEntreDias?.propuesta?.resumen ?? '', /Miércoles 23/);

const copiaOrigenPrimero = detectarAccionAsistente(
  'Pon la comida del miércoles 23 el martes 22',
  menu,
  recetas,
  semanaActiva,
);
assert.equal(copiaOrigenPrimero?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(copiaOrigenPrimero?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(copiaOrigenPrimero?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.deepEqual(copiaOrigenPrimero?.propuesta?.accion.platosNuevos, ['Pasta']);

const copiaConAl = detectarAccionAsistente(
  'Copia la cena del viernes al jueves',
  menu,
  recetas,
  semanaActiva,
);
assert.equal(copiaConAl?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(copiaConAl?.propuesta?.accion.diaDestino, 'Jueves');
assert.equal(copiaConAl?.propuesta?.accion.diaOrigen, 'Viernes');
assert.equal(copiaConAl?.propuesta?.accion.momentoDestino, 'cena');
assert.equal(copiaConAl?.propuesta?.accion.momentoOrigen, 'cena');
assert.deepEqual(copiaConAl?.propuesta?.accion.platosNuevos, ['Pizza']);

const mismoQue = detectarAccionAsistente(
  'El martes 22 quiero comer lo mismo que el miércoles23',
  menu,
  recetas,
  semanaActiva,
);
assert.equal(mismoQue?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(mismoQue?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(mismoQue?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.equal(mismoQue?.propuesta?.accion.momentoDestino, 'comida');

const mover = detectarAccionAsistente(
  'Pasa la comida del miércoles23 al martes22',
  menu,
  recetas,
  semanaActiva,
);
assert.equal(mover?.propuesta?.accion.tipo, 'mover-menu');
assert.equal(mover?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(mover?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.deepEqual(mover?.propuesta?.accion.platosOrigenAntes, ['Pasta']);
assert.match(mover?.propuesta?.cambios.join(' ') ?? '', /Después en origen: Sin plan/);

const intercambio = detectarAccionAsistente(
  'Intercambia la comida del martes22 y miércoles23',
  menu,
  recetas,
  semanaActiva,
);
assert.equal(intercambio?.propuesta?.accion.tipo, 'intercambiar-menu');
assert.equal(intercambio?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(intercambio?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.deepEqual(intercambio?.propuesta?.accion.platosDestinoAntes, ['Arroz']);
assert.deepEqual(intercambio?.propuesta?.accion.platosOrigenAntes, ['Pasta']);

const cruzado = detectarAccionAsistente(
  'Copia la cena del miércoles23 como comida del martes22',
  menu,
  recetas,
  semanaActiva,
);
assert.equal(cruzado?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(cruzado?.propuesta?.accion.diaDestino, 'Martes');
assert.equal(cruzado?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.equal(cruzado?.propuesta?.accion.momentoDestino, 'comida');
assert.equal(cruzado?.propuesta?.accion.momentoOrigen, 'cena');
assert.deepEqual(cruzado?.propuesta?.accion.platosNuevos, ['Fajitas']);

const ambiguoEntreDias = detectarAccionAsistente(
  'Pon lo del miércoles23 el martes22',
  menu,
  recetas,
  semanaActiva,
);
assert.ok(ambiguoEntreDias?.aclaracion);
assert.equal(ambiguoEntreDias?.propuesta, undefined);

const cambiaDosDiasSinSentido = detectarAccionAsistente(
  'Cambia la comida del martes22 y miércoles23',
  menu,
  recetas,
  semanaActiva,
);
assert.ok(cambiaDosDiasSinSentido?.aclaracion);
assert.equal(cambiaDosDiasSinSentido?.propuesta, undefined);

const fechaIncorrecta = detectarAccionAsistente(
  'Cambia la comida del martes 29 por la del miércoles 23',
  menu,
  recetas,
  semanaActiva,
);
assert.ok(fechaIncorrecta?.aclaracion);
assert.match(fechaIncorrecta?.aclaracion ?? '', /martes es 22, no 29/);
assert.equal(fechaIncorrecta?.propuesta, undefined);

assert.equal(detectarIntencionPropuestaPendiente('Sí'), 'confirmar');
assert.equal(detectarIntencionPropuestaPendiente('sí, hazlo'), 'confirmar');
assert.equal(detectarIntencionPropuestaPendiente('Cancélalo'), 'cancelar');
assert.equal(detectarIntencionPropuestaPendiente('deshazlo'), 'deshacer');
assert.equal(detectarIntencionPropuestaPendiente('vale'), null);

const cambioCena = detectarAccionAsistente(
  'Cámbiame la cena del martes por salmón',
  menu,
  recetas,
);
assert.equal(cambioCena?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(cambioCena?.propuesta?.accion.momento, 'cena');
assert.equal(cambioCena?.propuesta?.accion.dia, 'Martes');
assert.equal(cambioCena?.propuesta?.accion.platoNuevo, 'Salmón');

const repetirCambio = crearPropuestaRepetirUltimaAccion(
  'Haz lo mismo también el viernes',
  cambioManana.propuesta,
  menu,
  semanaActiva,
  fechaReferencia,
);
assert.equal(repetirCambio?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(repetirCambio?.propuesta?.accion.dia, 'Viernes');
assert.equal(repetirCambio?.propuesta?.accion.momento, 'cena');
assert.equal(repetirCambio?.propuesta?.accion.platoNuevo, 'Salmón');
assert.deepEqual(repetirCambio?.propuesta?.accion.platosAnteriores, ['Pizza']);

const repetirCopia = crearPropuestaRepetirUltimaAccion(
  'Haz lo mismo también el sábado para cenar',
  copiaEntreDias.propuesta,
  menu,
  semanaActiva,
  fechaReferencia,
);
assert.equal(repetirCopia?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(repetirCopia?.propuesta?.accion.diaDestino, 'Sábado');
assert.equal(repetirCopia?.propuesta?.accion.momentoDestino, 'cena');
assert.equal(repetirCopia?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.deepEqual(repetirCopia?.propuesta?.accion.platosNuevos, ['Pasta']);

const noRepetirMover = crearPropuestaRepetirUltimaAccion(
  'Haz lo mismo también el viernes',
  mover.propuesta,
  menu,
  semanaActiva,
  fechaReferencia,
);
assert.ok(noRepetirMover?.aclaracion);
assert.equal(noRepetirMover?.propuesta, undefined);

const ajusteCambio = ajustarPropuestaPendiente(
  'Mejor el jueves para comer',
  cambioCena.propuesta,
  menu,
  semanaActiva,
);
assert.equal(ajusteCambio?.propuesta?.accion.tipo, 'cambiar-menu');
assert.equal(ajusteCambio?.propuesta?.accion.dia, 'Jueves');
assert.equal(ajusteCambio?.propuesta?.accion.momento, 'comida');
assert.equal(ajusteCambio?.propuesta?.accion.platoNuevo, 'Salmón');
assert.deepEqual(ajusteCambio?.propuesta?.accion.platosAnteriores, ['Garbanzos']);

const ajusteCopia = ajustarPropuestaPendiente(
  'Mejor el viernes para cenar',
  copiaEntreDias.propuesta,
  menu,
  semanaActiva,
  fechaReferencia,
);
assert.equal(ajusteCopia?.propuesta?.accion.tipo, 'copiar-menu');
assert.equal(ajusteCopia?.propuesta?.accion.diaDestino, 'Viernes');
assert.equal(ajusteCopia?.propuesta?.accion.momentoDestino, 'cena');
assert.equal(ajusteCopia?.propuesta?.accion.diaOrigen, 'Miércoles');
assert.equal(ajusteCopia?.propuesta?.accion.momentoOrigen, 'comida');
assert.deepEqual(ajusteCopia?.propuesta?.accion.platosNuevos, ['Pasta']);

const ajusteIntercambio = ajustarPropuestaPendiente(
  'Mejor el jueves',
  intercambio.propuesta,
  menu,
  semanaActiva,
);
assert.ok(ajusteIntercambio?.aclaracion);
assert.equal(ajusteIntercambio?.propuesta, undefined);

const menuDespues = menu.map((dia) =>
  dia.dia === 'Martes' ? { ...dia, cena: ['Salmón'] } : dia,
);
const propuestaDeshacer = crearPropuestaDeshacerMenu(
  menu,
  menuDespues,
  'cambiar la cena del martes por Salmón',
);
assert.equal(propuestaDeshacer.accion.tipo, 'restaurar-menu');
assert.deepEqual(propuestaDeshacer.accion.menuAntes[1].cena, ['Tortilla']);
assert.deepEqual(propuestaDeshacer.accion.menuDespues[1].cena, ['Salmón']);
assert.match(propuestaDeshacer.resumen, /deshacer/i);

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

console.log('✓ el asistente interpreta copias, movimientos e intercambios entre días sin ejecutarlos directamente');
console.log('✓ mantiene contexto para confirmar, cancelar, ajustar y deshacer propuestas de forma segura');
console.log('✓ entiende hoy, mañana, ayer, pasado mañana, fechas numéricas y «haz lo mismo también…»');
console.log('✓ entiende órdenes con origen primero, destino primero y cruces comida/cena');
console.log('✓ añadir compra, fin de semana sin niños y comidas fuera requieren confirmación');
console.log('✓ valida fechas de la semana activa y pregunta cuando el sentido es ambiguo');
console.log('✓ las órdenes incompletas piden aclaración en lugar de adivinar');
console.log('✓ versión, caché y copias están alineadas en v0.9.54');
