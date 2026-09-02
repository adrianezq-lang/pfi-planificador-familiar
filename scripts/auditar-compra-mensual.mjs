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

const plan = aplicarVariedadPastas(
  aplicarRepeticionLegumbres(structuredClone(menuMensualInicial)),
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

// Referencias exactas de la plantilla mensual actual.
exigirExacto('Tortillas de trigo', 14, 'ud');
exigirExacto('Lentejas secas', 375, 'g');
exigirExacto('Garbanzos secos', 375, 'g');
exigirExacto('Alubias rojas secas', 750, 'g');

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
exigirMaximo('Huevos mensuales', huevos, 100);
exigirMaximo('Atún mensual', atun, 30);
exigirMaximo('Pasta mensual (g)', pasta, 5000);
exigirMaximo('Arroz mensual (g)', arroz, 5000);
exigirMaximo('Carne mensual (g)', carnes, 20000);
exigirMaximo('Pescado mensual (g)', pescados, 12000);

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
const { cargarRecetas } = await vite.ssrLoadModule('/src/services/recetas.ts');
const { repararAsociacionesIngredientes } = await vite.ssrLoadModule(
  '/src/services/asociacionesIngredientes.ts',
);
const { generarCompraMensual } = await vite.ssrLoadModule(
  '/src/services/planificacionCompra.ts',
);

asegurarAsociacionesBasicas();
await repararAsociacionesIngredientes(cargarRecetas());
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

const tortillasComerciales = exigirEnvasesEntre('80859', 'Tortillas de trigo', 1, 3);
const baconComercial = exigirEnvasesEntre('16252', 'Bacon', 4, 7);
const panBurgerComercial = exigirEnvasesEntre('13803', 'Pan de hamburguesa', 1, 3);
const panHotDogComercial = exigirEnvasesEntre('82332', 'Pan de perrito', 1, 3);
const tomateFritoComercial = exigirEnvasesEntre('17132', 'Tomate frito', 1, 3);

console.log('✓ auditoría mensual: cantidades finitas y positivas');
console.log('✓ tortillas: 14 unidades en el mes base');
console.log('✓ legumbres secas: 375 g lentejas, 375 g garbanzos, 750 g alubias rojas');
console.log(`✓ ${objetivos.filter((objetivo) => objetivo.productoId).length} SKUs objetivo siguen presentes en el catálogo`);
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
