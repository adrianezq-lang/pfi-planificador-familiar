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
  normalizarPerfil,
} = await vite.ssrLoadModule('/src/services/perfil.ts');
const {
  ajustarRecetasAComensalesServicio,
  generarListaCompra,
} = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const { aplicarMigracionV0923 } = await vite.ssrLoadModule(
  '/src/services/migracionV0923.ts',
);

const perfilMigrado = normalizarPerfil({
  nombre: 'Adrián',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 500,
});

const comidaLaborable = crearPerfilParaMomento(
  perfilMigrado,
  'comida',
  'Lunes',
);
const comidaFinSemana = crearPerfilParaMomento(
  perfilMigrado,
  'comida',
  'Sábado',
);
const cena = crearPerfilParaMomento(perfilMigrado, 'cena', 'Lunes');

if (
  calcularComensales(comidaLaborable) !== 3 ||
  JSON.stringify(comidaLaborable.edadesNinos) !== JSON.stringify([12])
) {
  throw new Error('La comida laborable no deja solo a los 2 adultos y al niño de 12 años.');
}

if (
  calcularRacionesEquivalentes(perfilMigrado) !== 3.4 ||
  calcularRacionesEquivalentes(comidaLaborable) !== 2.85
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
    cantidad: 340,
    unidad: 'g',
    seccion: 'Prueba',
    ajusteAutomatico: false,
  }],
}];
const recetaManualLaborable = ajustarRecetasAComensalesServicio(
  recetaManual,
  perfilMigrado,
  comidaLaborable,
);
if (recetaManualLaborable[0].ingredientes[0].cantidad !== 285) {
  throw new Error(
    `Una cantidad manual de 340 g para 3,4 raciones debe quedar en 285 g para 2,85 raciones, no ${recetaManualLaborable[0].ingredientes[0].cantidad}.`,
  );
}

localStorage.setItem('pfi-perfil', JSON.stringify(perfilMigrado));
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
  crearDia(
    'Lunes',
    ['Macarrones boloñesa'],
    [],
    'Manzana',
    'Sin postre',
  ),
]);
const pastaLaborable = compraLaborable.find(
  (ingrediente) => ingrediente.nombre === 'Pasta corta',
);
const manzanasLaborables = compraLaborable.find(
  (ingrediente) => ingrediente.nombre === 'Manzanas',
);

if (pastaLaborable?.cantidad !== 225 || manzanasLaborables?.cantidad !== 3) {
  throw new Error(
    `La compra laborable debe usar 2,85 raciones equivalentes: pasta=${pastaLaborable?.cantidad}, manzanas=${manzanasLaborables?.cantidad}`,
  );
}

const compraFinSemana = generarListaCompra([
  crearDia(
    'Sábado',
    ['Macarrones boloñesa'],
    [],
    'Manzana',
    'Sin postre',
  ),
]);
const pastaFinSemana = compraFinSemana.find(
  (ingrediente) => ingrediente.nombre === 'Pasta corta',
);
const manzanasFinSemana = compraFinSemana.find(
  (ingrediente) => ingrediente.nombre === 'Manzanas',
);

if (pastaFinSemana?.cantidad !== 275 || manzanasFinSemana?.cantidad !== 4) {
  throw new Error(
    `La compra de fin de semana debe usar 3,4 raciones equivalentes: pasta=${pastaFinSemana?.cantidad}, manzanas=${manzanasFinSemana?.cantidad}`,
  );
}

const compraFinSemanaSinNinos = generarListaCompra([
  crearDia(
    'Sábado',
    ['Macarrones boloñesa'],
    [],
    'Manzana',
    'Sin postre',
    true,
  ),
]);
const pastaSoloAdultos = compraFinSemanaSinNinos.find(
  (ingrediente) => ingrediente.nombre === 'Pasta corta',
);
const manzanasSoloAdultos = compraFinSemanaSinNinos.find(
  (ingrediente) => ingrediente.nombre === 'Manzanas',
);
if (pastaSoloAdultos?.cantidad !== 150 || manzanasSoloAdultos?.cantidad !== 2) {
  throw new Error(
    `El fin de semana sin niños debe comprar para 2 raciones adultas: pasta=${pastaSoloAdultos?.cantidad}, manzanas=${manzanasSoloAdultos?.cantidad}.`,
  );
}

const compraFajitas = generarListaCompra([
  crearDia('Miércoles', [], ['Fajitas'], 'Sin postre', 'Sin postre'),
]);
const tortillasFajitas = compraFajitas.find(
  (ingrediente) => ingrediente.nombre === 'Tortillas de trigo',
);
if (tortillasFajitas?.cantidad !== 6) {
  throw new Error(
    `Una cena de fajitas para cuatro debe usar 6 tortillas, no ${tortillasFajitas?.cantidad}.`,
  );
}

const compraPanMesBase = generarListaCompra([
  crearDia('Miércoles', [], ['Fajitas'], 'Sin postre', 'Sin postre'),
  crearDia('Sábado', [], ['Kebab'], 'Sin postre', 'Sin postre'),
  crearDia('Miércoles', [], ['Kebab'], 'Sin postre', 'Sin postre'),
]);
const tortillasMesBase = compraPanMesBase.find(
  (ingrediente) => ingrediente.nombre === 'Tortillas de trigo',
);
const pitasMesBase = compraPanMesBase.find(
  (ingrediente) => ingrediente.nombre === 'Pan de pita',
);
if (tortillasMesBase?.cantidad !== 6 || pitasMesBase?.cantidad !== 8) {
  throw new Error(
    `Fajitas + 2 kebabs deben usar 6 tortillas y 8 pitas: tortillas=${tortillasMesBase?.cantidad}, pitas=${pitasMesBase?.cantidad}.`,
  );
}

const compraCocidoDosDias = generarListaCompra([
  crearDia('Lunes', ['Cocido de garbanzos'], [], 'Sin postre', 'Sin postre'),
  crearDia('Jueves', ['Cocido de garbanzos'], [], 'Sin postre', 'Sin postre'),
]);
const jamoncitos = compraCocidoDosDias.find(
  (ingrediente) => ingrediente.nombre === 'Jamoncitos de pollo',
);
const garbanzosSecosCocido = compraCocidoDosDias.find(
  (ingrediente) => ingrediente.nombre === 'Garbanzos secos',
);
const polloGenericoCocido = compraCocidoDosDias.find(
  (ingrediente) => ingrediente.nombre === 'Pollo',
);
if (
  jamoncitos?.cantidad !== 301.76 ||
  jamoncitos.unidad !== 'g' ||
  garbanzosSecosCocido?.cantidad !== 419.12 ||
  garbanzosSecosCocido.unidad !== 'g' ||
  polloGenericoCocido
) {
  throw new Error(
    `La olla única de cocido debe escalarse a 2,85 raciones: pollo=${jamoncitos?.cantidad} ${jamoncitos?.unidad}, garbanzos=${garbanzosSecosCocido?.cantidad} ${garbanzosSecosCocido?.unidad}.`,
  );
}

const compraLentejasDosDias = generarListaCompra([
  crearDia('Lunes', ['Lentejas'], [], 'Sin postre', 'Sin postre'),
  crearDia('Jueves', ['Lentejas'], [], 'Sin postre', 'Sin postre'),
]);
const lentejasSecas = compraLentejasDosDias.find(
  (ingrediente) => ingrediente.nombre === 'Lentejas secas',
);
if (lentejasSecas?.cantidad !== 419.12 || lentejasSecas.unidad !== 'g') {
  throw new Error(
    `La olla única de lentejas debe comprar 419,12 g para 2,85 raciones, no ${lentejasSecas?.cantidad} ${lentejasSecas?.unidad}.`,
  );
}

const compraArrozPollo = generarListaCompra([
  crearDia('Martes', ['Arroz con pollo'], [], 'Sin postre', 'Sin postre'),
]);
if (
  !compraArrozPollo.some((ingrediente) => ingrediente.nombre === 'Pollo para arroz') ||
  compraArrozPollo.some((ingrediente) => ingrediente.nombre === 'Pollo')
) {
  throw new Error('Arroz con pollo no debe heredar la asociación genérica de pollo entero.');
}

const asociacionesPollo = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
if (
  asociacionesPollo.Pollo ||
  asociacionesPollo['Jamoncitos de pollo'] !== '2778' ||
  asociacionesPollo['Tortillas de trigo'] !== '80859' ||
  asociacionesPollo['Pan de pita'] !== '14378' ||
  asociacionesPollo['Pechugas de pollo'] !== '3724' ||
  asociacionesPollo['Pollo para arroz'] !== '3724' ||
  asociacionesPollo['Tomate para pizza'] !== '17108' ||
  asociacionesPollo.Morcillo !== '13741'
) {
  throw new Error(
    `Las asociaciones históricas incorrectas no se sanearon: ${JSON.stringify(asociacionesPollo)}.`,
  );
}

await vite.close();

console.log('✓ comida laborable: 2 adultos + niño de 12 años');
console.log('✓ las cantidades se escalan por raciones equivalentes de edad');
console.log('✓ cantidades manuales: 340 g familiares -> 285 g laborables');
console.log('✓ comida de fin de semana y cenas: cuatro comensales');
console.log('✓ la excepción de fin de semana descuenta a los dos niños');
console.log('✓ la compra ajusta platos y postres al servicio');
console.log('✓ fajitas: 6 tortillas para cuatro comensales');
console.log('✓ fajitas + dos kebabs: 6 tortillas + 8 panes de pita');
console.log('✓ cocido: una sola olla para lunes y jueves, escalada por edad');
console.log('✓ lentejas: una sola olla para lunes y jueves, escalada por edad');
console.log('✓ arroz con pollo no hereda pollo entero como corte genérico');
console.log('✓ morcillo se asocia al zancarrón de vacuno del catálogo');
console.log('✓ se sanea pan pita, relleno kebab, tomate para untar y pollo genérico');
