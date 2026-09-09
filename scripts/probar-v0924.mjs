import assert from 'node:assert/strict';
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

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { normalizarPerfil } = await vite.ssrLoadModule('/src/services/perfil.ts');
const { aplicarMigracionVariedadV0922 } = await vite.ssrLoadModule('/src/services/migracionV0922.ts');
const { aplicarMigracionV0923 } = await vite.ssrLoadModule('/src/services/migracionV0923.ts');
const { cargarRecetas, guardarRecetas } = await vite.ssrLoadModule('/src/services/recetas.ts');
const { menuMensualInicial } = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const { recetasVariedadV0924 } = await vite.ssrLoadModule('/src/data/RecetasV0924.ts');
const { generarListaCompra } = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const { generarPlanMensualInteligente } = await vite.ssrLoadModule('/src/services/planMensual.ts');
const { registrarEleccionMenu, registrarResultadoComida } = await vite.ssrLoadModule('/src/services/aprendizaje.ts');
const {
  migrarPlanAVariedadV0924,
  planNecesitaVariedadV0924,
} = await vite.ssrLoadModule('/src/hooks/useMenu.ts');
const { obtenerProductoIdAsociado } = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');

localStorage.setItem('pfi-perfil', JSON.stringify(normalizarPerfil({
  nombre: 'Familia PFI',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 1000,
})));

const personalizada = {
  nombre: 'Pimientos asados antiguos',
  categoria: 'Verduras',
  ingredientes: [
    { nombre: 'Pimiento rojo', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
    { nombre: 'Pimiento tricolor', cantidad: 1, unidad: 'bandeja', seccion: 'Fruta y verdura' },
  ],
};
guardarRecetas([...cargarRecetas(), personalizada]);
aplicarMigracionVariedadV0922();
aplicarMigracionV0923();

const recetas = cargarRecetas();
const nombresRecetas = new Set(recetas.map((receta) => receta.nombre));
for (const receta of recetasVariedadV0924) {
  assert.ok(nombresRecetas.has(receta.nombre), `Falta la receta v0.9.24: ${receta.nombre}`);
}

const excepcionesSinReceta = new Set(['Comemos fuera', 'Cola Cao y galletas']);
for (const plato of menuMensualInicial.flatMap((semana) =>
  semana.menu.flatMap((dia) => [...dia.comida, ...dia.cena])
)) {
  assert.ok(
    excepcionesSinReceta.has(plato) || nombresRecetas.has(plato),
    `El menú referencia un plato sin receta: ${plato}`,
  );
}

const receta = (nombre) => recetas.find((candidata) => candidata.nombre === nombre);
assert.ok(receta('Lentejas')?.ingredientes.some((ingrediente) => ingrediente.nombre === 'Pimiento rojo'));
assert.ok(receta('Fajitas')?.ingredientes.some((ingrediente) => ingrediente.nombre === 'Pimiento tricolor'));
assert.deepEqual(
  receta(personalizada.nombre)?.ingredientes.map(({ ajusteAutomatico: _, ...ingrediente }) => ingrediente),
  personalizada.ingredientes,
);
assert.equal(obtenerProductoIdAsociado('Judías verdes'), '61282');
assert.equal(obtenerProductoIdAsociado('Menestra de verduras'), '52534');

const compra = generarListaCompra(menuMensualInicial.flatMap((semana) => semana.menu));
const ingredienteCompra = (nombre) => compra.find((item) => item.nombre === nombre);
assert.equal(ingredienteCompra('Tortillas de trigo')?.cantidad, 6);
assert.equal(ingredienteCompra('Pan de pita')?.cantidad, 4);
assert.ok((ingredienteCompra('Pimiento rojo')?.cantidad ?? 0) > 0);
assert.ok((ingredienteCompra('Pimiento tricolor')?.cantidad ?? 0) > 0);
assert.ok((ingredienteCompra('Judías verdes')?.cantidad ?? 0) > 0);
assert.ok((ingredienteCompra('Menestra de verduras')?.cantidad ?? 0) > 0);

const antiguo = structuredClone(menuMensualInicial);
antiguo[1].excluida = true;
antiguo[1].menu.find((dia) => dia.dia === 'Sábado').cena = ['Hamburguesas'];
const postreManual = antiguo[2].menu.find((dia) => dia.dia === 'Miércoles');
Object.assign(postreManual, {
  postreComida: 'Yogur',
  postreComidaReceta: 'Postre familiar manual',
  detallePostreComida: 'Edición conservada',
  cantidadPostreComida: 2,
  postreComidaManual: true,
});

assert.equal(planNecesitaVariedadV0924(antiguo), true);
const migrado = migrarPlanAVariedadV0924('2026-08', antiguo);
assert.equal(migrado.length, 6);
assert.equal(planNecesitaVariedadV0924(migrado), false);
assert.equal(migrado[1].excluida, true);
const postreConservado = migrado[2].menu.find((dia) => dia.dia === 'Miércoles');
assert.equal(postreConservado.postreComidaReceta, 'Postre familiar manual');
assert.equal(postreConservado.detallePostreComida, 'Edición conservada');
assert.equal(postreConservado.cantidadPostreComida, 2);
assert.equal(postreConservado.postreComidaManual, true);

const edicionPosterior = structuredClone(migrado);
edicionPosterior[0].menu[0].cena = [...edicionPosterior[1].menu[0].cena];
const segundaCarga = migrarPlanAVariedadV0924('2026-08', edicionPosterior);
assert.deepEqual(segundaCarga, edicionPosterior, 'La migración única ha pisado una edición posterior');

registrarEleccionMenu('Lunes', 'cena', ['Lomo salteado con calabacín']);
registrarResultadoComida('Lunes', 'cena', ['Lomo salteado con calabacín'], 'gusto');
const disponibles = [...nombresRecetas, ...excepcionesSinReceta];
const generado = generarPlanMensualInteligente(disponibles, new Date('2026-01-01T12:00:00'));
assert.equal(planNecesitaVariedadV0924(generado), false, 'El aprendizaje ha consumido un plato reservado para otra semana');

await vite.close();
console.log('✓ las 27 recetas nuevas completan todos los platos del menú');
console.log('✓ la migración conserva semanas excluidas y postres manuales');
console.log('✓ la migración se aplica una vez y respeta ediciones posteriores');
console.log('✓ el aprendizaje no provoca repeticiones entre semanas');
console.log('✓ pimiento, vainas y menestra sobreviven a migraciones y compra');
console.log('✓ compra crítica: 6 tortillas de fajita y 4 panes de pita');
