import { createServer } from 'vite';

class StorageMock {
  data = new Map();
  getItem(clave) { return this.data.get(clave) ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class {
  constructor(type) { this.type = type; }
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const {
  calcularComensales,
  calcularRacionesEquivalentes,
  crearPerfilParaMomento,
  factorNinoPorEdad,
  normalizarPerfil,
} = await vite.ssrLoadModule('/src/services/perfil.ts');
const {
  ajustarRecetasAComensalesServicio,
  generarListaCompra,
} = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const { aplicarMigracionV0923 } = await vite.ssrLoadModule(
  '/src/services/migracionV0923.ts',
);

const perfil = normalizarPerfil({
  nombre: 'Adrián',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 500,
});

const comidaLaborable = crearPerfilParaMomento(perfil, 'comida', 'Lunes');
const comidaFinSemana = crearPerfilParaMomento(perfil, 'comida', 'Sábado');
const cena = crearPerfilParaMomento(perfil, 'cena', 'Lunes');

if (factorNinoPorEdad(12) !== 1 || factorNinoPorEdad(6) !== 0.7) {
  throw new Error('Los factores por edad no usan 12+ = 1 y 6-8 = 0,70.');
}

if (
  calcularComensales(comidaLaborable) !== 3 ||
  JSON.stringify(comidaLaborable.edadesNinos) !== JSON.stringify([12])
) {
  throw new Error('La comida laborable no deja solo a los 2 adultos y al niño de 12 años.');
}

if (
  calcularRacionesEquivalentes(perfil) !== 3.7 ||
  calcularRacionesEquivalentes(comidaLaborable) !== 3
) {
  throw new Error('Las raciones equivalentes por edad no coinciden con el perfil familiar.');
}

if (calcularComensales(comidaFinSemana) !== 4 || calcularComensales(cena) !== 4) {
  throw new Error('El fin de semana y las cenas no incluyen a los cuatro comensales.');
}

const recetaManual = [{
  nombre: 'Prueba manual',
  categoria: 'Prueba',
  ingredientes: [{
    nombre: 'Ingrediente manual',
    cantidad: 370,
    unidad: 'g',
    seccion: 'Prueba',
    ajusteAutomatico: false,
  }],
}];
const recetaManualLaborable = ajustarRecetasAComensalesServicio(
  recetaManual,
  perfil,
  comidaLaborable,
);
if (recetaManualLaborable[0].ingredientes[0].cantidad !== 300) {
  throw new Error(
    `Una cantidad manual de 370 g para 3,7 raciones debe quedar en 300 g para 3 raciones, no ${recetaManualLaborable[0].ingredientes[0].cantidad}.`,
  );
}

localStorage.setItem('pfi-perfil', JSON.stringify(perfil));
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({
    Pollo: '2853',
    'Tortillas de trigo': '14378',
    'Pechugas de pollo': '13778',
    'Tomate para pizza': '17647',
  }),
);

aplicarMigracionV0923();

function crearDia(dia, comida, cenaDia, postreComida, postreCena, sinNinos = false) {
  return {
    dia,
    comida,
    cena: cenaDia,
    postreComida: postreComida === 'Sin postre' ? 'Sin postre' : 'Fruta',
    postreCena: postreCena === 'Sin postre' ? 'Sin postre' : 'Fruta',
    postreComidaReceta: postreComida,
    postreCenaReceta: postreCena,
    sinNinos,
    preparar: '',
  };
}

const compraLaborable = generarListaCompra([
  crearDia('Lunes', ['Macarrones boloñesa'], [], 'Manzana', 'Sin postre'),
]);
const pastaLaborable = compraLaborable.find((i) => i.nombre === 'Pasta corta');
const carneLaborable = compraLaborable.find((i) => i.nombre === 'Carne picada');
const manzanasLaborables = compraLaborable.find((i) => i.nombre === 'Manzanas');

if (
  pastaLaborable?.cantidad !== 250 ||
  carneLaborable?.cantidad !== 375 ||
  manzanasLaborables?.cantidad !== 3
) {
  throw new Error(
    `Lunes debe comprar para 3 raciones adultas equivalentes: pasta=${pastaLaborable?.cantidad}, carne=${carneLaborable?.cantidad}, manzanas=${manzanasLaborables?.cantidad}.`,
  );
}

const compraFinSemana = generarListaCompra([
  crearDia('Sábado', ['Macarrones boloñesa'], [], 'Manzana', 'Sin postre'),
]);
const pastaFinSemana = compraFinSemana.find((i) => i.nombre === 'Pasta corta');
const carneFinSemana = compraFinSemana.find((i) => i.nombre === 'Carne picada');
const manzanasFinSemana = compraFinSemana.find((i) => i.nombre === 'Manzanas');

if (
  pastaFinSemana?.cantidad !== 300 ||
  carneFinSemana?.cantidad !== 475 ||
  manzanasFinSemana?.cantidad !== 4
) {
  throw new Error(
    `Fin de semana debe usar 3,7 raciones equivalentes: pasta=${pastaFinSemana?.cantidad}, carne=${carneFinSemana?.cantidad}, manzanas=${manzanasFinSemana?.cantidad}.`,
  );
}

const compraFinSemanaSinNinos = generarListaCompra([
  crearDia('Sábado', ['Macarrones boloñesa'], [], 'Manzana', 'Sin postre', true),
]);
const pastaSoloAdultos = compraFinSemanaSinNinos.find((i) => i.nombre === 'Pasta corta');
const manzanasSoloAdultos = compraFinSemanaSinNinos.find((i) => i.nombre === 'Manzanas');
if (pastaSoloAdultos?.cantidad !== 150 || manzanasSoloAdultos?.cantidad !== 2) {
  throw new Error(
    `Sin niños debe comprar para 2 adultos: pasta=${pastaSoloAdultos?.cantidad}, manzanas=${manzanasSoloAdultos?.cantidad}.`,
  );
}

const compraFajitas = generarListaCompra([
  crearDia('Miércoles', [], ['Fajitas'], 'Sin postre', 'Sin postre'),
]);
const tortillasFajitas = compraFajitas.find((i) => i.nombre === 'Tortillas de trigo');
if (tortillasFajitas?.cantidad !== 6) {
  throw new Error(`Fajitas para cuatro deben usar 6 tortillas, no ${tortillasFajitas?.cantidad}.`);
}

const compraKebabs = generarListaCompra([
  crearDia('Miércoles', [], ['Kebab'], 'Sin postre', 'Sin postre'),
  crearDia('Sábado', [], ['Kebab'], 'Sin postre', 'Sin postre'),
]);
const pitasKebab = compraKebabs.find((i) => i.nombre === 'Pan de pita');
if (pitasKebab?.cantidad !== 8) {
  throw new Error(`Dos cenas de kebab deben usar 8 panes de pita, no ${pitasKebab?.cantidad}.`);
}

const compraCocidoDosDias = generarListaCompra([
  crearDia('Lunes', ['Cocido de garbanzos'], [], 'Sin postre', 'Sin postre'),
  crearDia('Jueves', ['Cocido de garbanzos'], [], 'Sin postre', 'Sin postre'),
]);
const jamoncitos = compraCocidoDosDias.find((i) => i.nombre === 'Jamoncitos de pollo');
const garbanzos = compraCocidoDosDias.find((i) => i.nombre === 'Garbanzos secos');
if (
  jamoncitos?.cantidad !== 291.6 ||
  jamoncitos.unidad !== 'g' ||
  garbanzos?.cantidad !== 405.41 ||
  garbanzos.unidad !== 'g'
) {
  throw new Error(
    `La olla de cocido para dos días debe escalarse a 3 raciones laborables: pollo=${jamoncitos?.cantidad}, garbanzos=${garbanzos?.cantidad}.`,
  );
}

const compraLentejasDosDias = generarListaCompra([
  crearDia('Lunes', ['Lentejas'], [], 'Sin postre', 'Sin postre'),
  crearDia('Jueves', ['Lentejas'], [], 'Sin postre', 'Sin postre'),
]);
const lentejas = compraLentejasDosDias.find((i) => i.nombre === 'Lentejas secas');
if (lentejas?.cantidad !== 405.41 || lentejas.unidad !== 'g') {
  throw new Error(`La olla de lentejas debe comprar 405,41 g, no ${lentejas?.cantidad}.`);
}

const compraTortilla = generarListaCompra([
  crearDia('Sábado', ['Tortilla de patata'], [], 'Sin postre', 'Sin postre'),
]);
const huevosTortilla = compraTortilla.find((i) => i.nombre === 'Huevos');
const patatasTortilla = compraTortilla.find((i) => i.nombre === 'Patatas');
if (huevosTortilla?.cantidad !== 8 || patatasTortilla?.cantidad !== 1000) {
  throw new Error(
    `La tortilla familiar debe quedar cerca de 8 huevos y 1 kg de patata: huevos=${huevosTortilla?.cantidad}, patatas=${patatasTortilla?.cantidad}.`,
  );
}

const compraArrozPollo = generarListaCompra([
  crearDia('Martes', ['Arroz con pollo'], [], 'Sin postre', 'Sin postre'),
]);
if (
  !compraArrozPollo.some((i) => i.nombre === 'Pollo para arroz') ||
  compraArrozPollo.some((i) => i.nombre === 'Pollo')
) {
  throw new Error('Arroz con pollo no debe heredar la asociación genérica de pollo entero.');
}

await vite.close();

console.log('✓ perfil: 12+ cuenta como ración adulta y 6-8 como 0,70');
console.log('✓ comida laborable: 2 adultos + adolescente = 3 raciones equivalentes');
console.log('✓ cantidades manuales se escalan por equivalencia, no por personas');
console.log('✓ pasta, carne y fruta responden a reglas distintas');
console.log('✓ fin de semana y cenas incluyen cuatro comensales');
console.log('✓ fin de semana sin niños descuenta correctamente a ambos');
console.log('✓ fajitas: 6 tortillas; dos kebabs: 8 panes de pita');
console.log('✓ cocido y lentejas de dos días se calculan como una sola olla');
console.log('✓ tortilla familiar mantiene proporción de huevos y patata');
console.log('✓ arroz con pollo usa el corte asociado correcto');
