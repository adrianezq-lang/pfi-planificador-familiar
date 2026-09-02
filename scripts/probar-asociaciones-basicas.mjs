import fs from 'node:fs';

const memoria = new Map();

globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class {
  constructor(type) { this.type = type; }
};
globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};

// Simula un navegador que ya ejecutó la v1 y conserva SKUs retirados.
// La actualización debe añadir v2, migrar v3/v4 y respetar cualquier
// otra elección manual.
localStorage.setItem('pfi-migracion-asociaciones-basicas-v1', '1');
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({
    Arroz: 'arroz-elegido-por-usuario',
    'Pan de hamburguesa': '82331',
    'Alubias blancas secas': '5185',
    'Alubias rojas secas': '5180',
  }),
);

const {
  asegurarAsociacionesBasicas,
  ASOCIACIONES_BASICAS_VERIFICADAS,
  ASOCIACIONES_BASICAS_V2,
  ASOCIACIONES_BASICAS_V3,
  ASOCIACIONES_BASICAS_V4,
} = await import('../src/services/asociacionesBasicas.ts');
const {
  quitarAsociacionIngrediente,
  limpiarTodasLasAsociaciones,
} = await import('../src/services/asociacionesIngredientes.ts');

const objetivos = JSON.parse(
  fs.readFileSync('scripts/productos-objetivo.json', 'utf8'),
);
const objetivosPorIngrediente = new Map(
  objetivos.map((objetivo) => [objetivo.ingrediente, objetivo]),
);

for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_BASICAS_VERIFICADAS)) {
  const objetivo = objetivosPorIngrediente.get(ingrediente);
  if (objetivo?.productoId !== productoId) {
    throw new Error(
      `${ingrediente}: la migración usa ${productoId} pero el actualizador usa ${objetivo?.productoId ?? 'ningún SKU'}.`,
    );
  }
}

const cambiosActualizacion = asegurarAsociacionesBasicas();
const trasActualizacion = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
const cambiosEsperados =
  Object.keys(ASOCIACIONES_BASICAS_V2).length +
  Object.keys(ASOCIACIONES_BASICAS_V3).length +
  Object.keys(ASOCIACIONES_BASICAS_V4).length;
if (cambiosActualizacion !== cambiosEsperados) {
  throw new Error(
    `Una instalación con v1 aplicada debe añadir v2 y migrar v3/v4: ${cambiosActualizacion} cambios.`,
  );
}
if (trasActualizacion.Arroz !== 'arroz-elegido-por-usuario') {
  throw new Error('La actualización sobrescribió la asociación manual de Arroz.');
}
if (trasActualizacion['Pasta corta']) {
  throw new Error('La actualización volvió a imponer una asociación de v1 que el usuario había quitado.');
}
for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_BASICAS_V2)) {
  if (trasActualizacion[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} no se añadió al actualizar desde v1.`);
  }
}
if (trasActualizacion['Pan de hamburguesa'] !== '13803') {
  throw new Error('La v3 no sustituyó el SKU retirado 82331 por 13803.');
}
if (trasActualizacion['Alubias blancas secas'] !== '5124') {
  throw new Error('La v4 no sustituyó el SKU retirado 5185 por 5124.');
}
if (trasActualizacion['Alubias rojas secas'] !== '67609') {
  throw new Error('La v4 no sustituyó el SKU retirado 5180 por 67609.');
}

quitarAsociacionIngrediente('Salchichas');
if (asegurarAsociacionesBasicas() !== 0) {
  throw new Error('Una migración ya aplicada no debe volver a ejecutarse.');
}
const trasQuitar = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
if (trasQuitar.Salchichas) {
  throw new Error('La v2 volvió a imponer Salchichas después de que el usuario la quitara.');
}

// La v3 solo puede sustituir el SKU retirado conocido; una elección manual
// distinta debe permanecer intacta.
limpiarTodasLasAsociaciones();
localStorage.setItem('pfi-migracion-asociaciones-basicas-v1', '1');
localStorage.setItem('pfi-migracion-asociaciones-basicas-v2', '1');
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v3');
localStorage.setItem('pfi-migracion-asociaciones-basicas-v4', '1');
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({ 'Pan de hamburguesa': 'pan-elegido-por-usuario' }),
);
if (asegurarAsociacionesBasicas() !== 0) {
  throw new Error('La v3 no debe contabilizar cambios si existe una elección manual distinta.');
}
const trasPanManual = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
if (trasPanManual['Pan de hamburguesa'] !== 'pan-elegido-por-usuario') {
  throw new Error('La v3 sobrescribió una elección manual de pan de hamburguesa.');
}

// La v4 tampoco puede pisar una elección manual distinta de alubias.
limpiarTodasLasAsociaciones();
localStorage.setItem('pfi-migracion-asociaciones-basicas-v1', '1');
localStorage.setItem('pfi-migracion-asociaciones-basicas-v2', '1');
localStorage.setItem('pfi-migracion-asociaciones-basicas-v3', '1');
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v4');
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({
    'Alubias blancas secas': 'alubia-blanca-elegida-por-usuario',
    'Alubias rojas secas': 'alubia-roja-elegida-por-usuario',
  }),
);
if (asegurarAsociacionesBasicas() !== 0) {
  throw new Error('La v4 no debe contabilizar cambios si hay elecciones manuales distintas.');
}
const trasAlubiasManuales = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
if (
  trasAlubiasManuales['Alubias blancas secas'] !== 'alubia-blanca-elegida-por-usuario' ||
  trasAlubiasManuales['Alubias rojas secas'] !== 'alubia-roja-elegida-por-usuario'
) {
  throw new Error('La v4 sobrescribió una elección manual de alubias.');
}

// También protege una instalación nueva: debe recibir todas las versiones.
limpiarTodasLasAsociaciones();
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v1');
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v2');
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v3');
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v4');
const cambiosNueva = asegurarAsociacionesBasicas();
const nuevas = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
if (cambiosNueva !== Object.keys(ASOCIACIONES_BASICAS_VERIFICADAS).length) {
  throw new Error(`Una instalación nueva añadió ${cambiosNueva} básicos y no todos los verificados.`);
}
for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_BASICAS_VERIFICADAS)) {
  if (nuevas[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} no se inicializó con el SKU verificado ${productoId}.`);
  }
}

console.log('✓ migración y actualizador usan los mismos SKUs verificados');
console.log('✓ una instalación con v1 aplicada recibe v2 y migra los SKUs retirados en v3/v4');
console.log('✓ v3/v4 respetan elecciones manuales distintas del usuario');
console.log('✓ las asociaciones manuales y eliminadas por el usuario se conservan');
console.log('✓ una instalación nueva recibe todas las versiones de básicos');
