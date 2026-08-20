const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const raiz = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(raiz, 'src', 'motor', 'compra.ts'),
  'utf8',
);

const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const modulo = { exports: {} };
const mocks = {
  '../services/asociacionesIngredientes': {
    obtenerProductoAsociado: async () => null,
  },
  '../services/despensa': {
    calcularReposicion: () => 0,
    cargarDespensa: () => [],
  },
  '../services/listaCompra': {
    generarListaCompra: () => [],
  },
};

vm.runInNewContext(output, {
  module: modulo,
  exports: modulo.exports,
  require: (id) => {
    const normalizado = id.replace(/\.(?:ts|tsx|js)$/, '');
    if (mocks[normalizado]) return mocks[normalizado];
    throw new Error(`Dependencia inesperada: ${id}`);
  },
  console,
  Map,
  Set,
  Math,
  Number,
  Array,
  Object,
  String,
});

const {
  calcularEnvasesParaNecesidades,
  calcularEnvasesConStock,
} = modulo.exports;

if (typeof calcularEnvasesParaNecesidades !== 'function') {
  throw new Error('No se exporta calcularEnvasesParaNecesidades');
}
if (typeof calcularEnvasesConStock !== 'function') {
  throw new Error('No se exporta calcularEnvasesConStock');
}

function producto(nombre, kilos, formato = 'Paquete') {
  return {
    productoId: 'prueba',
    nombre,
    precio: 1,
    precioReferencia: null,
    formato,
    unidadesTotales: 0,
    tamanoUnidad: kilos,
    formatoUnidad: 'kg',
    pesoAproximado: true,
    seccion: '',
    subcategoria: '',
    imagen: null,
    url: '',
    disponible: true,
  };
}

const pruebas = [
  ['5 zanahorias / bolsa 1 kg', calcularEnvasesParaNecesidades(
    [{ nombre: 'Zanahorias', cantidad: 5, unidad: 'ud', seccion: '' }],
    producto('Zanahorias', 1),
  ).envases, 1],
  ['11 zanahorias / bolsa 1 kg', calcularEnvasesParaNecesidades(
    [{ nombre: 'Zanahorias', cantidad: 11, unidad: 'ud', seccion: '' }],
    producto('Zanahorias', 1),
  ).envases, 2],
  ['3 vasos arroz / paquete 1 kg', calcularEnvasesParaNecesidades(
    [{ nombre: 'Arroz', cantidad: 3, unidad: 'vaso', seccion: '' }],
    producto('Arroz', 1),
  ).envases, 1],
  ['6 vasos arroz / paquete 1 kg', calcularEnvasesParaNecesidades(
    [{ nombre: 'Arroz', cantidad: 6, unidad: 'vaso', seccion: '' }],
    producto('Arroz', 1),
  ).envases, 2],
  ['menú 1, stock 0, objetivo 1', calcularEnvasesConStock(1, 0, 1), 1],
  ['menú 1, stock 1, objetivo 1', calcularEnvasesConStock(1, 1, 1), 0],
  ['menú 2, stock 0, objetivo 1', calcularEnvasesConStock(2, 0, 1), 2],
];

for (const [nombre, obtenido, esperado] of pruebas) {
  if (obtenido !== esperado) {
    throw new Error(`${nombre}: esperado ${esperado}, obtenido ${obtenido}`);
  }
  console.log(`✓ ${nombre}: ${obtenido}`);
}
