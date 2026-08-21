const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const raiz = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(raiz, 'src', 'motor', 'compra.ts'), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const modulo = { exports: {} };
const mocks = {
  '../services/asociacionesIngredientes': { obtenerProductosAsociados: async () => new Map() },
  '../services/despensa': { calcularReposicion: () => 0, cargarDespensa: () => [] },
  '../services/listaCompra': { generarListaCompra: () => [] },
};

vm.runInNewContext(output, {
  module: modulo,
  exports: modulo.exports,
  require: (id) => {
    const normalizado = id.replace(/\.(?:ts|tsx|js)$/, '');
    if (mocks[normalizado]) return mocks[normalizado];
    throw new Error(`Dependencia inesperada: ${id}`);
  },
  console, Map, Set, Math, Number, Array, Object, String,
});

const { calcularEnvasesParaNecesidades } = modulo.exports;
if (typeof calcularEnvasesParaNecesidades !== 'function') {
  throw new Error('No se exporta calcularEnvasesParaNecesidades');
}

const ajoMalla = {
  productoId: 'ajo-prueba',
  nombre: 'Ajos morados',
  precio: 1.85,
  precioReferencia: null,
  formato: 'Malla',
  unidadesTotales: 0,
  tamanoUnidad: 0,
  formatoUnidad: '',
  pesoAproximado: false,
  seccion: 'Fruta y verdura',
  subcategoria: 'Verdura',
  imagen: null,
  url: '',
  disponible: true,
};

function comprobar(nombre, necesidades, esperado) {
  const obtenido = calcularEnvasesParaNecesidades(necesidades, ajoMalla).envases;
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: esperado ${esperado}, obtenido ${obtenido}`);
  }
  console.log(`✓ ${nombre}: ${obtenido} malla(s)`);
}

comprobar(
  'regla acordada: 0,5 cabeza de ajo',
  [{ nombre: 'Ajo', cantidad: 0.5, unidad: 'cabeza', seccion: 'Fruta y verdura' }],
  1,
);
comprobar(
  'dato antiguo: 3 dientes de ajo',
  [{ nombre: 'Ajo', cantidad: 3, unidad: 'dientes', seccion: 'Fruta y verdura' }],
  1,
);
comprobar(
  'necesidad alta: 35 dientes',
  [{ nombre: 'Ajo', cantidad: 35, unidad: 'dientes', seccion: 'Fruta y verdura' }],
  2,
);

const recetas = fs.readFileSync(path.join(raiz, 'src', 'services', 'recetas.ts'), 'utf8');
if (!recetas.includes('aplicarMigracionAjoV156')) {
  throw new Error('Falta la migración para corregir recetas antiguas de garbanzos fritos.');
}
console.log('✓ las recetas antiguas migran a la regla de 0,5 cabeza');
