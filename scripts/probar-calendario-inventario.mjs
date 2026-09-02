const memoria = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
};

const { menuEfectivoSemana, menuEfectivoMes } = await import('../src/services/excepcionesCalendario.ts');
const { unirIngredientes } = await import('../src/services/UnirIngredientes.ts');
const { correspondeACompraSemanal, proyectarComprasEnvases } = await import('../src/services/proyeccionStock.ts');
const {
  calcularCompraMensualEnvases,
  guardarNecesidadMensual,
  obtenerNecesidadMensual,
} = await import('../src/services/necesidadesMensuales.ts');
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
const mallaAjos = proyectarComprasEnvases([0.25, 0.25, 0.25, 0.25], 0);
if (JSON.stringify(mallaAjos.compras) !== JSON.stringify([1, 0, 0, 0])) {
  throw new Error(`La malla de cuatro cabezas se vuelve a comprar antes de agotarse: ${mallaAjos.compras}`);
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

console.log('✓ semanas parciales cuentan solo sus fechas reales');
console.log('✓ excepciones de día, comida y cena afectan a la compra');
console.log('✓ cabezas y dientes de ajo se suman sin perder cantidades');
console.log('✓ una malla de cuatro cabezas cubre cuatro semanas de una cabeza');
console.log('✓ frescos semanales y productos mensuales quedan bien separados');
console.log('✓ la compra mensual configurada descuenta el stock y respeta el menú');
