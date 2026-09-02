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

const {
  asegurarAsociacionesBasicas,
  ASOCIACIONES_BASICAS_VERIFICADAS,
} = await import('../src/services/asociacionesBasicas.ts');
const {
  quitarAsociacionIngrediente,
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

localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({
    Arroz: 'arroz-elegido-por-usuario',
    Huevos: '30167',
  }),
);

const cambios = asegurarAsociacionesBasicas();
const asociaciones = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);

if (cambios !== Object.keys(ASOCIACIONES_BASICAS_VERIFICADAS).length - 1) {
  throw new Error(`La migración informó ${cambios} cambios y debía añadir solo los básicos ausentes.`);
}

if (asociaciones.Arroz !== 'arroz-elegido-por-usuario') {
  throw new Error('La migración sobrescribió una asociación manual de Arroz.');
}

for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_BASICAS_VERIFICADAS)) {
  if (ingrediente === 'Arroz') continue;
  if (asociaciones[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} quedó asociado a ${asociaciones[ingrediente]}, esperaba ${productoId}.`);
  }
}

quitarAsociacionIngrediente('Pasta corta');
const segundaEjecucion = asegurarAsociacionesBasicas();
const asociacionesDespues = JSON.parse(
  localStorage.getItem('pfi-asociaciones-ingredientes-mercadona') ?? '{}',
);

if (segundaEjecucion !== 0 || asociacionesDespues['Pasta corta']) {
  throw new Error('La migración volvió a imponer Pasta corta después de que el usuario la quitara.');
}

console.log('✓ migración y actualizador usan los mismos SKUs verificados');
console.log('✓ los básicos verificados se añaden una sola vez');
console.log('✓ las asociaciones manuales se conservan');
console.log('✓ una elección eliminada por el usuario no se vuelve a imponer');
