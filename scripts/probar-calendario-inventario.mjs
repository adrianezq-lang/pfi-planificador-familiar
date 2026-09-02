const memoria = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};

const { createServer } = await import('vite');
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { menuEfectivoSemana, menuEfectivoMes } = await import('../src/services/excepcionesCalendario.ts');
const { unirIngredientes } = await import('../src/services/UnirIngredientes.ts');
const { correspondeACompraSemanal, proyectarComprasEnvases } = await import('../src/services/proyeccionStock.ts');
const {
  calcularCompraMensualEnvases,
  guardarNecesidadMensual,
  obtenerNecesidadMensual,
} = await import('../src/services/necesidadesMensuales.ts');
const { aplicarNecesidadesMensuales } = await vite.ssrLoadModule('/src/services/planificacionCompra.ts');
const { calcularEnvasesParaNecesidades } = await vite.ssrLoadModule('/src/motor/compra.ts');
const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const menu = dias.map((dia) => ({
  dia,
  comida: [`Comida ${dia}`],
  cena: [`Cena ${dia}`],
  postreComida: 'Fruta',
  postreCena: 'Yogur',
  preparar: '',
}));
const primera = { id:'s1', nombre:'1–2', inicio:'2026-09-01', fin:'2026-09-02', menu };
const ultima = { id:'s5', nombre:'28–30', inicio:'2026-09-28', fin:'2026-09-30', menu };
const excepciones = { '2026-09-01': { sinCena: true }, '2026-09-02': { noEnCasa: true } };
const efectiva = menuEfectivoSemana(primera, excepciones);
if (efectiva.length !== 1 || efectiva[0].dia !== 'Martes' || efectiva[0].cena.length !== 0) {
  throw new Error('Las excepciones por comida/cena no se aplican correctamente.');
}
if (menuEfectivoMes([primera, ultima], {}).length !== 5) {
  throw new Error('Las semanas parciales están contando días ajenos al mes.');
}
const [ajo] = unirIngredientes([
  { nombre:'Ajo', cantidad:1, unidad:'cabeza', seccion:'Fruta y verdura' },
  { nombre:'Ajo', cantidad:3, unidad:'dientes', seccion:'Fruta y verdura' },
]);
if (ajo.cantidad !== 1.3 || ajo.unidad !== 'cabeza') {
  throw new Error(`La cantidad de ajo no se conserva correctamente: ${ajo.cantidad} ${ajo.unidad}`);
}

const consumosParciales = unirIngredientes([
  { nombre:'Salsa BBQ', cantidad:1, unidad:'revisar', seccion:'Salsas' },
  { nombre:'Salsa BBQ', cantidad:1, unidad:'revisar', seccion:'Salsas' },
  { nombre:'Salsa BBQ', cantidad:1, unidad:'revisar', seccion:'Salsas' },
  { nombre:'Pimentón dulce', cantidad:1, unidad:'revisar', seccion:'Especias' },
  { nombre:'Pimentón dulce', cantidad:1, unidad:'revisar', seccion:'Especias' },
  { nombre:'Pimentón dulce', cantidad:1, unidad:'revisar', seccion:'Especias' },
  { nombre:'Pimentón dulce', cantidad:1, unidad:'revisar', seccion:'Especias' },
]);
const bbqParcial = consumosParciales.find((item) => item.nombre === 'Salsa BBQ');
const pimentonParcial = consumosParciales.find((item) => item.nombre === 'Pimentón dulce');
if (bbqParcial?.unidad !== 'envase' || bbqParcial.cantidad !== 0.45) {
  throw new Error(`Tres usos de BBQ deben consumir 0,45 envases, no ${bbqParcial?.cantidad} ${bbqParcial?.unidad}.`);
}
if (pimentonParcial?.unidad !== 'envase' || pimentonParcial.cantidad !== 0.2) {
  throw new Error(`Cuatro usos de pimentón deben consumir 0,20 envases, no ${pimentonParcial?.cantidad} ${pimentonParcial?.unidad}.`);
}
const [tomatePizzaCompartido] = unirIngredientes([
  { nombre:'Tomate para pizza', cantidad:1, unidad:'bote', seccion:'Salsas' },
  { nombre:'Tomate para pizza', cantidad:1, unidad:'bote', seccion:'Salsas' },
]);
if (tomatePizzaCompartido?.unidad !== 'envase' || tomatePizzaCompartido.cantidad !== 0.5) {
  throw new Error(
    `Dos pizzas deben consumir medio tarro de tomate, no ${tomatePizzaCompartido?.cantidad} ${tomatePizzaCompartido?.unidad}.`,
  );
}
const calculoBbq = calcularEnvasesParaNecesidades(
  [bbqParcial],
  {
    productoId: 'bbq-prueba',
    nombre: 'Salsa barbacoa',
    precio: 1.5,
    precioReferencia: null,
    formato: 'Bote',
    unidadesTotales: 0,
    tamanoUnidad: 0.35,
    formatoUnidad: 'kg',
    pesoAproximado: false,
    seccion: 'Salsas',
    subcategoria: 'Salsas',
    imagen: null,
    url: '',
    disponible: true,
  },
);
if (calculoBbq.envases !== 1 || Math.abs(calculoBbq.envasesExactos - 0.45) > 0.000001) {
  throw new Error(`0,45 envases de BBQ deben comprar un solo bote, no ${calculoBbq.envases}.`);
}

const mallaAjos = proyectarComprasEnvases([0.25, 0.25, 0.25, 0.25], 0);
if (JSON.stringify(mallaAjos.compras) !== JSON.stringify([1, 0, 0, 0])) {
  throw new Error(`La malla de cuatro cabezas se vuelve a comprar antes de agotarse: ${mallaAjos.compras}`);
}

const pechuga630Para660 = proyectarComprasEnvases([660 / 630], 0, 1.1);
if (JSON.stringify(pechuga630Para660.compras) !== JSON.stringify([1])) {
  throw new Error(
    `Una bandeja fresca aproximada de 630 g debe cubrir una necesidad de 660 g, no comprar ${pechuga630Para660.compras[0]}.`,
  );
}
const pechuga630Para750 = proyectarComprasEnvases([750 / 630], 0, 1.1);
if (JSON.stringify(pechuga630Para750.compras) !== JSON.stringify([2])) {
  throw new Error(
    `750 g deben superar el margen de una bandeja de 630 g y comprar 2, no ${pechuga630Para750.compras[0]}.`,
  );
}
const paqueteExacto = proyectarComprasEnvases([10.5 / 10], 0);
if (JSON.stringify(paqueteExacto.compras) !== JSON.stringify([2])) {
  throw new Error(
    `Los paquetes exactos no deben heredar la tolerancia de frescos: ${paqueteExacto.compras[0]}.`,
  );
}

const periodosCorrectos = [
  ['Fruta y Verdura', 'Ajo', true],
  ['Fruta y Verdura', 'Tomate triturado', false],
  ['Salsas, Aceites y Especias', 'Ajo en polvo', false],
  ['Charcutería y Quesos', 'Lomo embuchado', false],
  ['Congelados', 'Salmón congelado', true],
  ['Mascotas', 'Comida de perro', false],
];
for (const [seccion, nombre, esperado] of periodosCorrectos) {
  if (correspondeACompraSemanal(seccion, nombre) !== esperado) {
    throw new Error(`${nombre} no está en el periodo de compra correcto.`);
  }
}

guardarNecesidadMensual('leche-prueba', 12);
if (obtenerNecesidadMensual('leche-prueba', 'mensual') !== 12) {
  throw new Error('La cantidad mensual configurada no se conserva.');
}
if (obtenerNecesidadMensual('producto-mensual-antiguo', 'mensual') !== 1) {
  throw new Error('Un producto mensual antiguo debe partir de 1 envase al mes.');
}
const compraLeche = calcularCompraMensualEnvases(
  { stockActual: 3, stockMinimo: 0 },
  0,
  12,
);
if (compraLeche !== 9) {
  throw new Error(`Doce leches con tres en casa deben comprar 9, no ${compraLeche}.`);
}
const compraCubierta = calcularCompraMensualEnvases(
  { stockActual: 14, stockMinimo: 0 },
  0,
  12,
);
if (compraCubierta !== 0) {
  throw new Error('El stock existente debe poder cubrir por completo la compra mensual.');
}
const compraDominadaPorMenu = calcularCompraMensualEnvases(
  { stockActual: 3, stockMinimo: 0 },
  16,
  12,
);
if (compraDominadaPorMenu !== 13) {
  throw new Error('Si el menú necesita más que la cantidad mensual manual, debe mandar el menú.');
}

const calculoJamoncitos = calcularEnvasesParaNecesidades(
  [
    {
      nombre: 'Jamoncitos de pollo',
      cantidad: 540,
      unidad: 'g',
      seccion: 'Carnicería',
    },
  ],
  {
    productoId: '2778',
    nombre: 'Jamoncitos de pollo',
    precio: 3.22,
    precioReferencia: 3.5,
    formato: 'Bandeja',
    unidadesTotales: 0,
    tamanoUnidad: 0.92,
    formatoUnidad: 'kg',
    pesoAproximado: true,
    seccion: 'Carne',
    subcategoria: 'Pollo',
    imagen: null,
    url: '',
    disponible: true,
  },
);
if (
  calculoJamoncitos.envases !== 1 ||
  Math.abs(calculoJamoncitos.envasesExactos - (540 / 920)) > 0.000001
) {
  throw new Error(
    `540 g de jamoncitos deben caber en una bandeja de 920 g, no ${calculoJamoncitos.envases} bandejas.`,
  );
}

localStorage.setItem(
  'pfi-despensa-productos',
  JSON.stringify([
    {
      id: 'detergente-prueba-id',
      productoId: 'detergente-prueba',
      nombre: 'Detergente lavadora',
      imagen: null,
      formato: 'Botella',
      precio: 5,
      stockActual: 1,
      stockEsAproximado: false,
      stockMinimo: 0,
      unidad: 'envase',
      frecuencia: 'mensual',
      tipo: 'despensa',
      actualizado: '2026-09-02T00:00:00.000Z',
    },
  ]),
);
guardarNecesidadMensual('detergente-prueba', 3);
const lineasMensualesSinMenu = aplicarNecesidadesMensuales([]);
const detergente = lineasMensualesSinMenu.find(
  (linea) => linea.producto?.productoId === 'detergente-prueba',
);
if (!detergente || detergente.envases !== 2 || detergente.tipoCompra !== 'despensa') {
  throw new Error(
    `Un producto mensual fuera del menú debe aparecer descontando stock: ${detergente?.envases ?? 'no aparece'}.`,
  );
}

await vite.close();

console.log('✓ semanas parciales cuentan solo sus fechas reales');
console.log('✓ excepciones de día, comida y cena afectan a la compra');
console.log('✓ cabezas y dientes de ajo se suman sin perder cantidades');
console.log('✓ salsas y especias marcadas como revisar consumen fracciones de envase');
console.log('✓ varios usos parciales de salsa no compran un bote por receta');
console.log('✓ dos pizzas comparten medio tarro de tomate');
console.log('✓ una malla de cuatro cabezas cubre cuatro semanas de una cabeza');
console.log('✓ frescos de peso variable toleran una diferencia pequeña sin duplicar bandejas');
console.log('✓ los paquetes exactos siguen redondeando de forma estricta');
console.log('✓ 540 g de jamoncitos compran una sola bandeja de 920 g');
console.log('✓ frescos semanales y productos mensuales quedan bien separados');
console.log('✓ la compra mensual configurada descuenta el stock y respeta el menú');
console.log('✓ limpieza, mascotas y otros mensuales entran aunque no estén en recetas');
