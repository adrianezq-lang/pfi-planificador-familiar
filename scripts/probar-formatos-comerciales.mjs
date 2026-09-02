import { createServer } from 'vite';

globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { ajustarFormatoComercialEspecial } = await vite.ssrLoadModule(
  '/src/services/planificacionCompra.ts',
);

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

await vite.close();

console.log('✓ salchichas: 4 unidades por compra comercial');
console.log('✓ pan burger: 4 unidades por paquete');
console.log('✓ pan hot dog: 6 unidades por paquete');
console.log('✓ las reglas solo se aplican al SKU exacto');
