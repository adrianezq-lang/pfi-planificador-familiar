import { createServer } from 'vite';

class StorageMock {
  data = new Map();
  get length() { return this.data.size; }
  getItem(clave) { return this.data.get(clave) ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
  key(indice) { return [...this.data.keys()][indice] ?? null; }
}

const listeners = new Map();
globalThis.localStorage = new StorageMock();
globalThis.window = {
  addEventListener(tipo, fn) {
    const lista = listeners.get(tipo) ?? [];
    lista.push(fn);
    listeners.set(tipo, lista);
  },
  removeEventListener() {},
  dispatchEvent(evento) {
    for (const fn of listeners.get(evento.type) ?? []) fn(evento);
    return true;
  },
};
globalThis.CustomEvent = class {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.Event = class { constructor(type) { this.type = type; } };

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { normalizarPerfil } = await vite.ssrLoadModule('/src/services/perfil.ts');
const { aplicarMigracionVariedadV0922 } = await vite.ssrLoadModule('/src/services/migracionV0922.ts');
const { aplicarMigracionV0923, instalarMigracionV0923 } = await vite.ssrLoadModule('/src/services/migracionV0923.ts');
const { cargarRecetas, restaurarRecetasOriginales } = await vite.ssrLoadModule('/src/services/recetas.ts');
const { menuMensualInicial } = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const { generarListaCompra } = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const {
  aplicarReglaGarbanzosFritos,
  aplicarRepeticionLegumbres,
  esLegumbreDeOlla,
  listarPlatosParaCompra,
} = await vite.ssrLoadModule('/src/services/reglasMenuMensual.ts');
const { obtenerProductoIdAsociado } = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');

localStorage.setItem('pfi-perfil', JSON.stringify(normalizarPerfil({
  nombre: 'Familia PFI', adultos: 2, ninos: 2, edadesNinos: [12, 6], bebes: 1,
  bebesComenMenu: false, supermercado: 'Mercadona', presupuesto: 1000,
})));

aplicarMigracionVariedadV0922();
instalarMigracionV0923();
aplicarMigracionV0923();

let recetas = cargarRecetas();
let kebab = recetas.find((receta) => receta.nombre === 'Kebab');
let fajitas = recetas.find((receta) => receta.nombre === 'Fajitas');
if (!kebab?.ingredientes.some((i) => i.nombre === 'Pan de pita' && i.cantidad === 4)) {
  throw new Error(`Kebab no usa 4 panes de pita: ${JSON.stringify(kebab)}`);
}
if (kebab.ingredientes.some((i) => i.nombre === 'Tortillas de trigo')) {
  throw new Error('Kebab todavía contiene tortillas de trigo.');
}
if (!fajitas?.ingredientes.some((i) => i.nombre === 'Tortillas de trigo' && i.cantidad === 6)) {
  throw new Error(`Fajitas no conservan 6 tortillas: ${JSON.stringify(fajitas)}`);
}
if (fajitas.ingredientes.some((i) => i.nombre === 'Pan de pita')) {
  throw new Error('Fajitas no deben usar pan de pita.');
}

for (const nombre of [
  'Lentejas con arroz y verduras', 'Ternera con zanahoria y patatas',
  'Pavo al ajillo con verduras', 'Pollo al limón con patatas',
  'Bacalao con tomate y pimiento rojo', 'Tortilla de calabacín',
  'Vainas con tomate y huevo', 'Lomo con calabacín y patatas',
  'Arroz salteado con pollo y verduras', 'Dorada al horno con verduras',
]) {
  if (!recetas.some((receta) => receta.nombre === nombre)) throw new Error(`Falta receta v0.9.23: ${nombre}`);
}

if (obtenerProductoIdAsociado('Pan de pita') !== '14378') throw new Error('Pan de pita no apunta al SKU 14378.');
if (obtenerProductoIdAsociado('Limón') !== '3210') throw new Error('Limón no apunta al SKU 3210.');

const plan = aplicarRepeticionLegumbres(aplicarReglaGarbanzosFritos(structuredClone(menuMensualInicial)));
const semanaFritos = plan.find((semana) =>
  semana.menu.find((dia) => dia.dia === 'Lunes')?.comida.includes('Garbanzos fritos'),
);
const juevesFritos = semanaFritos?.menu.find((dia) => dia.dia === 'Jueves');
if (!semanaFritos || juevesFritos?.comida.includes('Garbanzos fritos')) {
  throw new Error('La semana de garbanzos fritos sigue repitiéndolos el jueves.');
}
if (!juevesFritos?.comida.includes('Lentejas con arroz y verduras')) {
  throw new Error('El jueves de la semana de garbanzos fritos no tiene la segunda legumbre distinta.');
}

for (const semana of plan) {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  if (!lunes?.comida.some(esLegumbreDeOlla)) continue;
  const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
  if (JSON.stringify(lunes.comida) !== JSON.stringify(jueves?.comida)) {
    throw new Error(`La olla ${lunes.comida.join(' + ')} no se aprovecha el jueves.`);
  }
}

const manual = structuredClone(semanaFritos.menu);
const juevesManual = manual.find((dia) => dia.dia === 'Jueves');
juevesManual.comida = ['Garbanzos fritos', 'Arroz blanco'];
const platosManual = listarPlatosParaCompra(manual, esLegumbreDeOlla);
if (platosManual.filter((plato) => plato === 'Garbanzos fritos').length !== 2) {
  throw new Error('La compra deduplica indebidamente garbanzos fritos manuales.');
}

const menuMes = plan.flatMap((semana) => semana.menu);
const compra = generarListaCompra(menuMes);
const tortillas = compra.find((i) => i.nombre === 'Tortillas de trigo');
const pitas = compra.find((i) => i.nombre === 'Pan de pita');
if (tortillas?.cantidad !== 6) throw new Error(`Tortillas mensuales: ${tortillas?.cantidad}, esperaba 6.`);
if (pitas?.cantidad !== 8) throw new Error(`Pitas mensuales: ${pitas?.cantidad}, esperaba 8.`);

const texto = menuMes.flatMap((dia) => [...dia.comida, ...dia.cena]).join(' ').toLocaleLowerCase('es');
for (const prohibido of ['brócoli', 'maíz', 'champiñón', 'merluza']) {
  if (texto.includes(prohibido)) throw new Error(`Aparece alimento excluido: ${prohibido}`);
}

// Restaurar recetas debe conservar de inmediato las recetas modernas gracias al listener.
restaurarRecetasOriginales();
recetas = cargarRecetas();
kebab = recetas.find((receta) => receta.nombre === 'Kebab');
if (!kebab?.ingredientes.some((i) => i.nombre === 'Pan de pita')) {
  throw new Error('Restaurar recetas ha recuperado el kebab antiguo.');
}
if (!recetas.some((receta) => receta.nombre === 'Pollo al limón con patatas')) {
  throw new Error('Restaurar recetas ha perdido las recetas modernas.');
}

await vite.close();
console.log('✓ kebab usa pita y fajitas usan tortillas sin mezclar productos');
console.log('✓ 10 recetas nuevas quedan disponibles y sobreviven a restaurar recetas');
console.log('✓ garbanzos fritos no se repiten; las ollas reales sí se aprovechan');
console.log('✓ compra base: 6 tortillas y 8 panes de pita');
console.log('✓ asociaciones Mercadona: pita 14378 y limón 3210');
console.log('✓ preferencias familiares siguen respetadas');
