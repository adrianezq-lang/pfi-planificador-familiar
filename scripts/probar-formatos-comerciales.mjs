import { createServer } from 'vite';

const memoria = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { ajustarFormatoComercialEspecial } = await vite.ssrLoadModule(
  '/src/services/planificacionCompra.ts',
);
const { calcularEnvasesParaNecesidades } = await vite.ssrLoadModule(
  '/src/motor/compra.ts',
);
const {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
  limpiarTodasLasAsociaciones,
  repararAsociacionesIngredientes,
} = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');

function crearLinea(productoId, ingrediente, cantidad, precio = 1, unidad = 'ud') {
  const necesidad = {
    nombre: ingrediente,
    cantidad,
    unidad,
    seccion: 'Despensa',
  };

  return {
    clave: `producto-${productoId}`,
    ingrediente: necesidad,
    necesidades: [necesidad],
    producto: {
      productoId,
      nombre: ingrediente,
      precio,
      precioReferencia: null,
      formato: 'Paquete',
      pesoAproximado: false,
      seccion: 'Panadería y pastelería',
      subcategoria: '',
      imagen: null,
      url: '',
      disponible: true,
    },
    productoDespensa: null,
    envases: cantidad,
    envasesExactos: cantidad,
    subtotal: cantidad * precio,
    calculoEstimado: false,
    tipoCompra: 'despensa',
    origen: 'menu',
  };
}

function comprobar(
  productoId,
  ingrediente,
  cantidad,
  envasesEsperados,
  exactosEsperados,
  unidad = 'ud',
) {
  const resultado = ajustarFormatoComercialEspecial(
    crearLinea(productoId, ingrediente, cantidad, 2, unidad),
  );

  if (
    resultado.envases !== envasesEsperados ||
    Math.abs(resultado.envasesExactos - exactosEsperados) > 0.000001 ||
    resultado.subtotal !== envasesEsperados * 2
  ) {
    throw new Error(
      `${ingrediente} ${cantidad} ${unidad}: ${resultado.envases} envases (${resultado.envasesExactos} exactos), esperaba ${envasesEsperados} (${exactosEsperados}).`,
    );
  }
}

comprobar('53143', 'Salchichas', 4, 1, 1);
comprobar('53143', 'Salchichas', 8, 2, 2);
comprobar('82331', 'Pan de hamburguesa', 4, 1, 1);
comprobar('82331', 'Pan de hamburguesa', 8, 2, 2);
comprobar('82332', 'Pan de perrito', 4, 1, 4 / 6);
comprobar('82332', 'Pan de perrito', 8, 2, 8 / 6);
comprobar('82332', 'Pan de perrito', 12, 2, 2);
comprobar('16252', 'Bacon', 1, 1, 1, 'barqueta');
comprobar('16252', 'Bacon', 2, 2, 2, 'barqueta');
comprobar('16252', 'Bacon', 1, 1, 1, 'paquete');

const sinRegla = ajustarFormatoComercialEspecial(
  crearLinea('producto-distinto', 'Pan de hamburguesa', 4, 2),
);
if (sinRegla.envases !== 4 || sinRegla.envasesExactos !== 4) {
  throw new Error('Un producto distinto no debe heredar capacidades comerciales especiales.');
}

const productoTomateFrito = {
  productoId: '17132',
  nombre: 'Tomate frito Hacendado',
  precio: 1.35,
  precioReferencia: null,
  formato: 'Pack-3 · 3 unidades · 1.2 kg',
  unidadesTotales: 3,
  tamanoUnidad: 0.4,
  formatoUnidad: 'kg',
  pesoAproximado: false,
  seccion: 'Conservas, caldos y cremas',
  subcategoria: 'Tomate frito',
  imagen: null,
  url: '',
  disponible: true,
};

const tomateUnoYMedio = calcularEnvasesParaNecesidades(
  [
    {
      nombre: 'Tomate frito',
      cantidad: 1.5,
      unidad: 'brick',
      seccion: 'Despensa',
    },
  ],
  productoTomateFrito,
);
if (
  tomateUnoYMedio.envases !== 1 ||
  Math.abs(tomateUnoYMedio.envasesExactos - 0.5) > 0.000001
) {
  throw new Error(
    `1,5 bricks de tomate deben ser medio pack-3 y comprar 1 pack, no ${tomateUnoYMedio.envases}.`,
  );
}

const tomateCuatro = calcularEnvasesParaNecesidades(
  [
    {
      nombre: 'Tomate frito',
      cantidad: 4,
      unidad: 'brick',
      seccion: 'Despensa',
    },
  ],
  productoTomateFrito,
);
if (
  tomateCuatro.envases !== 2 ||
  Math.abs(tomateCuatro.envasesExactos - (4 / 3)) > 0.000001
) {
  throw new Error(
    `4 bricks de tomate deben comprar 2 packs de 3, no ${tomateCuatro.envases}.`,
  );
}

// Simula datos antiguos donde los panes apuntaban a merluza y el ajo en polvo
// a cebolla en polvo. Los IDs incorrectos siguen existiendo, así que la prueba
// exige reparación semántica, no solo comprobar que el ID esté en el catálogo.
globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return {
      productos: [
        {
          productoId: '82331',
          nombre: 'Pan de burger Hacendado',
          precio: 0.95,
          formato: 'Paquete',
          unidadesTotales: 4,
          disponible: true,
        },
        {
          productoId: '82332',
          nombre: 'Pan hot dog Hacendado',
          precio: 0.9,
          formato: 'Paquete',
          unidadesTotales: 6,
          disponible: true,
        },
        {
          productoId: '86656',
          nombre: 'Ajo granulado Hacendado',
          precio: 1.25,
          formato: 'Bote',
          tamanoUnidad: 0.115,
          formatoUnidad: 'kg',
          disponible: true,
        },
        {
          productoId: '16252',
          nombre: 'Bacón Hacendado cintas',
          precio: 1.95,
          formato: '2 unidades · 260 g',
          unidadesTotales: 2,
          disponible: true,
        },
        {
          productoId: '17132',
          nombre: 'Tomate frito Hacendado',
          precio: 1.35,
          formato: 'Pack-3 · 3 unidades · 1.2 kg',
          unidadesTotales: 3,
          disponible: true,
        },
        {
          productoId: '2876',
          nombre: 'Merluza empanada',
          precio: 4,
          formato: 'Paquete',
          disponible: true,
        },
        {
          productoId: '86516',
          nombre: 'Cebolla en polvo Hacendado',
          precio: 0.94,
          formato: 'Bote',
          disponible: true,
        },
      ],
    };
  },
});

limpiarTodasLasAsociaciones();
guardarAsociacionesIngredientes({
  'Pan de hamburguesa': '2876',
  'Pan de perrito': '2876',
  'Ajo en polvo': '86516',
});

await repararAsociacionesIngredientes([
  {
    ingredientes: [
      { nombre: 'Pan de hamburguesa' },
      { nombre: 'Pan de perrito' },
      { nombre: 'Ajo en polvo' },
      { nombre: 'Bacon' },
      { nombre: 'Tomate frito' },
    ],
  },
]);

const asociacionesReparadas = cargarAsociacionesIngredientes();
if (
  asociacionesReparadas['Pan de hamburguesa'] !== '82331' ||
  asociacionesReparadas['Pan de perrito'] !== '82332' ||
  asociacionesReparadas['Ajo en polvo'] !== '86656' ||
  asociacionesReparadas.Bacon !== '16252' ||
  asociacionesReparadas['Tomate frito'] !== '17132'
) {
  throw new Error(
    `No se repararon/completaron los productos seguros: ${JSON.stringify(asociacionesReparadas)}.`,
  );
}

await vite.close();

console.log('✓ salchichas: 4 unidades por compra comercial');
console.log('✓ pan burger: 4 unidades por paquete');
console.log('✓ pan hot dog: 6 unidades por paquete');
console.log('✓ bacon: barqueta/paquete equivale a una compra comercial');
console.log('✓ tomate frito: pack-3 respeta bricks acumulados');
console.log('✓ las reglas solo se aplican al SKU exacto');
console.log('✓ asociaciones históricas y defaults seguros se reparan');
