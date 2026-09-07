import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

class StorageMock {
  data = new Map();
  getItem(clave) { return this.data.get(clave) ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
globalThis.CustomEvent = class {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.Event = class {
  constructor(type) { this.type = type; }
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { menuMensualInicial } = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const {
  aplicarRepeticionLegumbres,
  aplicarVariedadPastas,
} = await vite.ssrLoadModule('/src/services/reglasMenuMensual.ts');
const { normalizarPerfil } = await vite.ssrLoadModule('/src/services/perfil.ts');
const { generarListaCompra } = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const { cargarRecetas } = await vite.ssrLoadModule('/src/services/recetas.ts');
const { aplicarMigracionVariedadV0922 } = await vite.ssrLoadModule(
  '/src/services/migracionV0922.ts',
);
const {
  aplicarConfiguracionPostresAlPlan,
  crearConfiguracionPostresDesdeRecetas,
} = await vite.ssrLoadModule('/src/services/postres.ts');

const perfil = normalizarPerfil({
  nombre: 'Familia PFI',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 1000,
});
localStorage.setItem('pfi-perfil', JSON.stringify(perfil));

// La auditoría debe reproducir el mismo arranque que usa la PWA real.
aplicarMigracionVariedadV0922();
const recetasActuales = cargarRecetas();

const plan = aplicarConfiguracionPostresAlPlan(
  aplicarVariedadPastas(
    aplicarRepeticionLegumbres(structuredClone(menuMensualInicial)),
    true,
  ),
  crearConfiguracionPostresDesdeRecetas(recetasActuales),
);
const menuMes = plan.flatMap((semana) => semana.menu);
const compra = generarListaCompra(menuMes);

const normalizar = (texto) => texto
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const porNombre = new Map(compra.map((item) => [normalizar(item.nombre), item]));
const obtener = (nombre) => porNombre.get(normalizar(nombre));
const exigirExacto = (nombre, cantidad, unidad) => {
  const item = obtener(nombre);
  if (!item || item.cantidad !== cantidad || normalizar(item.unidad) !== normalizar(unidad)) {
    throw new Error(
      `${nombre}: esperaba ${cantidad} ${unidad} y obtuvo ${item ? `${item.cantidad} ${item.unidad}` : 'nada'}.`,
    );
  }
};
const exigirPresente = (nombre) => {
  const item = obtener(nombre);
  if (!item || !Number.isFinite(item.cantidad) || item.cantidad <= 0) {
    throw new Error(`${nombre}: no aparece con una cantidad válida en la compra mensual.`);
  }
  return item;
};
const sumar = (predicado, unidad = 'g') => compra
  .filter((item) => predicado(item) && normalizar(item.unidad) === normalizar(unidad))
  .reduce((total, item) => total + item.cantidad, 0);
const exigirMaximo = (etiqueta, valor, maximo) => {
  if (!Number.isFinite(valor) || valor > maximo) {
    throw new Error(`${etiqueta}: ${valor} supera el máximo razonable ${maximo}.`);
  }
};

for (const item of compra) {
  if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
    throw new Error(`Cantidad inválida en ${item.nombre}: ${item.cantidad} ${item.unidad}.`);
  }
}

// Referencia crítica solicitada: una sola noche de fajitas + dos kebabs = 14 tortillas.
exigirExacto('Tortillas de trigo', 14, 'ud');

// La plantilla nueva cambia de legumbre y pasta entre semanas; por eso la auditoría
// valida presencia y coherencia, no cifras congeladas de la plantilla anterior.
for (const ingrediente of [
  'Lentejas secas',
  'Garbanzos secos',
  'Alubias rojas secas',
  'Alubias blancas secas',
  'Judías verdes',
  'Nata para cocinar',
  'Queso roquefort',
]) {
  exigirPresente(ingrediente);
}

if (compra.some((item) => normalizar(item.nombre) === 'fruta variada')) {
  throw new Error('La compra mensual usa Fruta variada pese a existir recetas de fruta concretas.');
}
for (const fruta of ['Media sandía', 'Plátanos', 'Manzanas', 'Peras', 'Naranjas']) {
  if (!obtener(fruta)) {
    throw new Error(`La rotación mensual de postres no incluye ${fruta}.`);
  }
}

if (compra.some((item) => normalizar(item.nombre) === 'pollo')) {
  throw new Error('La compra mensual ha vuelto a generar el ingrediente genérico Pollo.');
}

const huevos = obtener('Huevos')?.cantidad ?? 0;
const atun = compra
  .filter((item) => /\batun\b/.test(normalizar(item.nombre)))
  .reduce((total, item) => total + item.cantidad, 0);
const pasta = sumar((item) => /\b(pasta|espagueti|macarron)/.test(normalizar(item.nombre)));
const arroz = sumar((item) => /\barroz\b/.test(normalizar(item.nombre)));
const carnes = sumar((item) => /carne|carnicer/.test(normalizar(item.seccion ?? '')));
const pescados = sumar((item) => /pescad|marisco/.test(normalizar(item.seccion ?? '')));

// Barreras anti-disparate. Son deliberadamente holgadas: detectan multiplicaciones
// accidentales sin convertir la auditoría en una receta rígida del menú.
exigirMaximo('Huevos mensuales', huevos, 120);
exigirMaximo('Atún mensual', atun, 40);
exigirMaximo('Pasta mensual (g)', pasta, 6000);
exigirMaximo('Arroz mensual (g)', arroz, 6000);
exigirMaximo('Carne mensual (g)', carnes, 22000);
exigirMaximo('Pescado mensual (g)', pescados, 14000);

// Segunda capa: convertir el mes a productos y envases reales del catálogo.
const catalogo = JSON.parse(
  await readFile(new URL('../public/catalogo-mercadona.json', import.meta.url), 'utf8'),
);
const objetivos = JSON.parse(
  await readFile(new URL('./productos-objetivo.json', import.meta.url), 'utf8'),
);
const idsCatalogo = new Set(catalogo.productos.map((producto) => producto.productoId));
for (const objetivo of objetivos) {
  if (objetivo.productoId && !idsCatalogo.has(objetivo.productoId)) {
    throw new Error(
      `SKU objetivo retirado: ${objetivo.ingrediente} apunta a ${objetivo.productoId}, que no existe en el catálogo actual.`,
    );
  }
}

globalThis.fetch = async () => ({
  ok: true,
  async json() { return catalogo; },
});

const { asegurarAsociacionesBasicas } = await vite.ssrLoadModule(
  '/src/services/asociacionesBasicas.ts',
);
const {
  repararAsociacionesIngredientes,
  ASOCIACIONES_SEGURAS_POR_DEFECTO,
} = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');
const { generarCompraMensual } = await vite.ssrLoadModule(
  '/src/services/planificacionCompra.ts',
);

for (const [ingrediente, productoId] of Object.entries(ASOCIACIONES_SEGURAS_POR_DEFECTO)) {
  if (!idsCatalogo.has(productoId)) {
    throw new Error(
      `Default seguro retirado: ${ingrediente} apunta a ${productoId}, que no existe en el catálogo actual.`,
    );
  }
}

asegurarAsociacionesBasicas();
await repararAsociacionesIngredientes(recetasActuales);
const compraComercial = await generarCompraMensual(menuMes);
const lineasConProducto = compraComercial.lineas.filter((linea) => linea.producto);
const idsProducto = lineasConProducto.map((linea) => linea.producto.productoId);
if (new Set(idsProducto).size !== idsProducto.length) {
  throw new Error('La compra mensual ha generado el mismo SKU de Mercadona en más de una línea.');
}

const lineaProducto = (productoId) =>
  lineasConProducto.find((linea) => linea.producto.productoId === productoId);
const exigirEnvasesEntre = (productoId, etiqueta, minimo, maximo) => {
  const linea = lineaProducto(productoId);
  if (!linea || linea.envases < minimo || linea.envases > maximo) {
    throw new Error(
      `${etiqueta}: esperaba entre ${minimo} y ${maximo} envases y obtuvo ${linea?.envases ?? 'ninguno'}.`,
    );
  }
  return linea;
};

const tortillasComerciales = exigirEnvasesEntre('80859', 'Tortillas de trigo', 2, 2);
const baconComercial = exigirEnvasesEntre('16252', 'Bacon', 3, 8);
const panBurgerComercial = exigirEnvasesEntre('13803', 'Pan de hamburguesa', 1, 4);
const panHotDogComercial = exigirEnvasesEntre('82332', 'Pan de perrito', 1, 4);
const tomateFritoComercial = exigirEnvasesEntre('17132', 'Tomate frito', 1, 8);

const unidadesTortillas = tortillasComerciales.producto.unidadesTotales;
const paquetesTortillasEsperados = Math.ceil(14 / unidadesTortillas);
const detalleTortillas = tortillasComerciales.explicacionCantidad;
if (
  unidadesTortillas !== 10 ||
  tortillasComerciales.envases !== paquetesTortillasEsperados ||
  !detalleTortillas ||
  Math.abs(detalleTortillas.necesidadMenuEnvases - 1.4) > 0.000001 ||
  detalleTortillas.compraEnvases !== 2 ||
  Math.abs(detalleTortillas.sobranteDespuesEnvases - 0.6) > 0.000001
) {
  throw new Error(
    `Tortillas sin explicación coherente: unidades=${unidadesTortillas}, compra=${tortillasComerciales.envases}, detalle=${JSON.stringify(detalleTortillas)}.`,
  );
}

for (const linea of lineasConProducto) {
  const detalle = linea.explicacionCantidad;
  if (!detalle || detalle.compraEnvases !== linea.envases) {
    throw new Error(
      `${linea.producto.nombre}: falta la explicación de la cantidad comprada.`,
    );
  }
}

console.log('✓ auditoría mensual: cantidades finitas y positivas');
console.log('✓ la auditoría ejecuta la misma migración de recetas que la PWA');
console.log('✓ tortillas: 14 unidades; 2 paquetes de 10 y 6 unidades sobrantes');
console.log('✓ legumbres, vainas y roquefort aparecen con cantidades reales del menú actual');
console.log('✓ fruta concreta sustituye a Fruta variada');
console.log(`✓ ${objetivos.filter((objetivo) => objetivo.productoId).length} SKUs objetivo siguen presentes en el catálogo`);
console.log(`✓ ${Object.keys(ASOCIACIONES_SEGURAS_POR_DEFECTO).length} defaults seguros siguen presentes en el catálogo`);
console.log(`ℹ huevos=${huevos}, atún=${atun}, pasta=${pasta} g, arroz=${arroz} g, carne=${carnes} g, pescado=${pescados} g`);
console.log(
  `✓ envases críticos: tortillas=${tortillasComerciales.envases}, bacon=${baconComercial.envases}, pan burger=${panBurgerComercial.envases}, pan hot dog=${panHotDogComercial.envases}, tomate frito=${tomateFritoComercial.envases}`,
);
console.log('ℹ compra mensual agregada:');
for (const item of [...compra].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
  console.log(`  - ${item.nombre}: ${item.cantidad} ${item.unidad}`);
}
console.log('ℹ líneas comerciales mensuales asociadas:');
for (const linea of [...lineasConProducto].sort((a, b) =>
  a.producto.nombre.localeCompare(b.producto.nombre, 'es')
)) {
  console.log(
    `  - ${linea.producto.nombre} [${linea.producto.productoId}]: ${linea.envases} envase(s) · exactos=${linea.envasesExactos}`,
  );
}

await vite.close();
