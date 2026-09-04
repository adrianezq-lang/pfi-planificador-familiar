import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

class StorageMock {
  data = new Map();

  get length() { return this.data.size; }
  getItem(clave) { return this.data.get(clave) ?? null; }
  key(indice) { return Array.from(this.data.keys())[indice] ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
}

const catalogo = JSON.parse(
  await readFile(new URL('../public/catalogo-mercadona.json', import.meta.url), 'utf8'),
);
const idsCatalogo = new Set(
  catalogo.productos.map((producto) => producto.productoId),
);

let eventosAsociaciones = 0;
globalThis.localStorage = new StorageMock();
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent(evento) {
    if (evento?.type === 'pfi-asociaciones-ingredientes-actualizadas') {
      eventosAsociaciones += 1;
    }
  },
};
globalThis.CustomEvent = class {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.fetch = async () => ({
  ok: true,
  async json() { return catalogo; },
});

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { recetas } = await vite.ssrLoadModule('/src/data/Recetas.ts');
const { asegurarAsociacionesBasicas } = await vite.ssrLoadModule(
  '/src/services/asociacionesBasicas.ts',
);
const {
  ASOCIACIONES_SEGURAS_POR_DEFECTO,
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
  repararAsociacionesIngredientes,
} = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');
const { importarCopiaAsociaciones } = await vite.ssrLoadModule(
  '/src/services/rescateAsociaciones.ts',
);

const asociacionesDiagnostico = {
  'Pimiento rojo': 69310,
  Pepino: '69584',
  'Pollo entero': '2781',
  Huevos: '30167',
  Ajo: '69297',
  Naranjas: '3277',
  Pollo: '2781',
};
const diagnostico = {
  tipo: 'pfi-diagnostico-rescate-asociaciones',
  version: 1,
  claves: {
    'pfi-asociaciones-ingredientes-mercadona': JSON.stringify(asociacionesDiagnostico),
    'pfi-asociaciones-ingredientes-mercadona-copia': JSON.stringify(asociacionesDiagnostico),
  },
};

guardarAsociacionesIngredientes({ Manzanas: '3269' });
const importadas = importarCopiaAsociaciones(JSON.stringify(diagnostico));
if (importadas !== 8) {
  throw new Error(`El diagnóstico dejó ${importadas} asociaciones; esperaba 8.`);
}
if (cargarAsociacionesIngredientes()['Pimiento rojo'] !== '69310') {
  throw new Error('El importador no normalizó el productId numérico del diagnóstico.');
}
if (cargarAsociacionesIngredientes().Manzanas !== '3269') {
  throw new Error('La importación descartó una asociación local que no figuraba en el JSON.');
}

asegurarAsociacionesBasicas();
const primeraReparacion = await repararAsociacionesIngredientes(
  recetas,
  [{ productoId: '2781', nombre: 'Pollo entero' }],
);
if (primeraReparacion < 1) {
  throw new Error('La copia incompleta no activó ninguna reparación.');
}

const asociaciones = cargarAsociacionesIngredientes();
const ingredientesRecetario = new Set(
  recetas.flatMap((receta) =>
    receta.ingredientes.map((ingrediente) => ingrediente.nombre.trim()),
  ),
);

for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_SEGURAS_POR_DEFECTO)) {
  if (!idsCatalogo.has(productoId)) {
    throw new Error(`${ingrediente} apunta a un SKU ausente del catálogo: ${productoId}.`);
  }
  if (ingredientesRecetario.has(ingrediente) && asociaciones[ingrediente] !== productoId) {
    throw new Error(
      `${ingrediente} quedó en ${asociaciones[ingrediente] ?? 'sin asociación'}; esperaba ${productoId}.`,
    );
  }
}

if (asociaciones.Pollo) {
  throw new Error(`El alias genérico Pollo se recuperó de nuevo como ${asociaciones.Pollo}.`);
}

const sinAsociar = Array.from(ingredientesRecetario)
  .filter((ingrediente) => !asociaciones[ingrediente])
  .sort((a, b) => a.localeCompare(b, 'es'));
const pendientesEsperados = ['Especias kebab', 'Fruta variada', 'Pollo']
  .sort((a, b) => a.localeCompare(b, 'es'));
if (JSON.stringify(sinAsociar) !== JSON.stringify(pendientesEsperados)) {
  throw new Error(
    `Pendientes inesperados: ${JSON.stringify(sinAsociar)}; esperaba ${JSON.stringify(pendientesEsperados)}.`,
  );
}

const eventosAntes = eventosAsociaciones;
const segundaReparacion = await repararAsociacionesIngredientes(
  recetas,
  [{ productoId: '2781', nombre: 'Pollo entero' }],
);
if (segundaReparacion !== 0) {
  throw new Error(`La segunda reparación volvió a cambiar ${segundaReparacion} asociaciones.`);
}
if (eventosAsociaciones !== eventosAntes) {
  throw new Error('La reparación estable volvió a emitir el evento de asociaciones.');
}

console.log('✓ el JSON de diagnóstico importa su bloque claves');
console.log('✓ los productId numéricos se normalizan sin perder asociaciones');
console.log('✓ la importación conserva asociaciones locales adicionales');
console.log(`✓ ${Object.keys(asociaciones).length} asociaciones quedan restauradas y válidas`);
console.log('✓ Pollo genérico no reaparece desde la despensa');
console.log('✓ una segunda reparación no cambia datos ni emite otro evento');

await vite.close();
