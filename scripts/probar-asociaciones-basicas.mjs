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

localStorage.setItem('pfi-migracion-asociaciones-basicas-v1', '1');
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({
    Arroz: 'arroz-elegido-por-usuario',
    'Pan de hamburguesa': '82331',
    'Alubias blancas secas': '5185',
    'Alubias rojas secas': '5180',
    'Mezcla cuatro quesos': '51234',
    'Salsa BBQ': '19592',
  }),
);

const {
  asegurarAsociacionesBasicas,
  ASOCIACIONES_BASICAS_VERIFICADAS,
  ASOCIACIONES_BASICAS_V2,
  ASOCIACIONES_BASICAS_V3,
  ASOCIACIONES_BASICAS_V4,
  ASOCIACIONES_BASICAS_V5,
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
      `${ingrediente}: la migración usa ${productoId} pero el objetivo usa ${objetivo?.productoId ?? 'ningún SKU'}.`,
    );
  }
}

const cambiosActualizacion = asegurarAsociacionesBasicas();
const trasActualizacion = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
// Mezcla cuatro quesos ya existe con el SKU histórico en este escenario, por lo
// que V2 no la añade; V5 es quien realiza su única sustitución al SKU vigente.
const cambiosEsperados =
  (Object.keys(ASOCIACIONES_BASICAS_V2).length - 1) +
  Object.keys(ASOCIACIONES_BASICAS_V3).length +
  Object.keys(ASOCIACIONES_BASICAS_V4).length +
  Object.keys(ASOCIACIONES_BASICAS_V5).length;
if (cambiosActualizacion !== cambiosEsperados) {
  throw new Error(
    `Una instalación con v1 aplicada debe añadir/migrar v2-v5: ${cambiosActualizacion} cambios.`,
  );
}
if (trasActualizacion.Arroz !== 'arroz-elegido-por-usuario') {
  throw new Error('La actualización sobrescribió la asociación manual de Arroz.');
}
if (trasActualizacion['Pasta corta']) {
  throw new Error('La actualización volvió a imponer una asociación de v1 que el usuario había quitado.');
}
for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_BASICAS_V2)) {
  if (ingrediente === 'Mezcla cuatro quesos') continue;
  if (trasActualizacion[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} no se añadió al actualizar desde v1.`);
  }
}
const migracionesEsperadas = {
  'Pan de hamburguesa': '13803',
  'Alubias blancas secas': '5124',
  'Alubias rojas secas': '67609',
  'Mezcla cuatro quesos': '21581',
  'Salsa BBQ': '17346',
};
for (const [ingrediente, productoId] of Object.entries(migracionesEsperadas)) {
  if (trasActualizacion[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} no migró al SKU vigente ${productoId}.`);
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

limpiarTodasLasAsociaciones();
for (const version of [1, 2, 3, 4]) {
  localStorage.setItem(`pfi-migracion-asociaciones-basicas-v${version}`, '1');
}
localStorage.removeItem('pfi-migracion-asociaciones-basicas-v5');
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({
    'Mezcla cuatro quesos': 'cuatro-quesos-elegido-por-usuario',
    'Salsa BBQ': 'bbq-elegida-por-usuario',
  }),
);
if (asegurarAsociacionesBasicas() !== 0) {
  throw new Error('La v5 no debe contabilizar cambios sobre elecciones manuales distintas.');
}
const trasV5Manual = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);
if (
  trasV5Manual['Mezcla cuatro quesos'] !== 'cuatro-quesos-elegido-por-usuario' ||
  trasV5Manual['Salsa BBQ'] !== 'bbq-elegida-por-usuario'
) {
  throw new Error('La v5 sobrescribió una elección manual.');
}

limpiarTodasLasAsociaciones();
for (const version of [1, 2, 3, 4, 5]) {
  localStorage.removeItem(`pfi-migracion-asociaciones-basicas-v${version}`);
}
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

console.log('✓ migraciones y objetivos usan los mismos SKUs verificados');
console.log('✓ una instalación antigua migra los SKUs retirados de v3-v5');
console.log('✓ las migraciones respetan elecciones manuales distintas');
console.log('✓ una instalación nueva recibe todos los básicos vigentes');
