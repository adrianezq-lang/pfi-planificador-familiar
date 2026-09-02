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
const {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
  limpiarTodasLasAsociaciones,
  repararAsociacionesIngredientes,
} = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');

function crearLinea(productoId, ingrediente, cantidad, precio = 1) {
  const necesidad = {
    nombre: ingrediente,
    cantidad,
    unidad: 'ud',
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

function comprobar(productoId, ingrediente, cantidad, envasesEsperados, exactosEsperados) {
  const resultado = ajustarFormatoComercialEspecial(
    crearLinea(productoId, ingrediente, cantidad, 2),
  );

  if (
    resultado.envases !== envasesEsperados ||
    Math.abs(resultado.envasesExactos - exactosEsperados) > 0.000001 ||
    resultado.subtotal !== envasesEsperados * 2
  ) {
    throw new Error(
      `${ingrediente} ${cantidad} ud: ${resultado.envases} envases (${resultado.envasesExactos} exactos), esperaba ${envasesEsperados} (${exactosEsperados}).`,
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

const sinRegla = ajustarFormatoComercialEspecial(
  crearLinea('producto-distinto', 'Pan de hamburguesa', 4, 2),
);
if (sinRegla.envases !== 4 || sinRegla.envasesExactos !== 4) {
  throw new Error('Un producto distinto no debe heredar capacidades comerciales especiales.');
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
    ],
  },
]);

const asociacionesReparadas = cargarAsociacionesIngredientes();
if (
  asociacionesReparadas['Pan de hamburguesa'] !== '82331' ||
  asociacionesReparadas['Pan de perrito'] !== '82332' ||
  asociacionesReparadas['Ajo en polvo'] !== '86656'
) {
  throw new Error(
    `No se repararon los productos históricos: ${JSON.stringify(asociacionesReparadas)}.`,
  );
}

await vite.close();

console.log('✓ salchichas: 4 unidades por compra comercial');
console.log('✓ pan burger: 4 unidades por paquete');
console.log('✓ pan hot dog: 6 unidades por paquete');
console.log('✓ las reglas solo se aplican al SKU exacto');
console.log('✓ pan y ajo históricos se reparan a productos compatibles');
