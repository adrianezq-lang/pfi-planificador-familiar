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

// Simula un navegador que ya ejecutó la v1, incluida la posibilidad de que el
// usuario haya quitado después una asociación de aquella versión.
localStorage.setItem('pfi-migracion-asociaciones-basicas-v1', '1');
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({ Arroz: 'arroz-elegido-por-usuario' }),
);

const {
  asegurarAsociacionesBasicas,
  ASOCIACIONES_BASICAS_VERIFICADAS,
  ASOCIACIONES_BASICAS_V2,
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
if (cambiosActualizacion !== Object.keys(ASOCIACIONES_BASICAS_V2).length) {
  throw new Error(
    `Una instalación con v1 aplicada debe añadir solo v2: ${cambiosActualizacion} cambios.`,
  );
}
if (trasActualizacion.Arroz !== 'arroz-elegido-por-usuario') {
  throw new Error('La v2 sobrescribió la asociación manual de Arroz.');
}
if (trasActualizacion['Pasta corta']) {
  throw new Error('La v2 volvió a imponer una asociación de v1 que el usuario había quitado.');
}
for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_BASICAS_V2)) {
  if (trasActualizacion[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} no se añadió al actualizar desde v1.`);
  }
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

// También protege una instalación nueva: debe recibir todas las versiones.
limpiarTodasLasAsociaciones();
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v1');
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v2');
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
console.log('✓ una instalación con v1 aplicada recibe solo los básicos de v2');
console.log('✓ las asociaciones manuales y eliminadas por el usuario se conservan');
console.log('✓ una instalación nueva recibe todas las versiones de básicos');
