const memoria = new Map();

globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};
globalThis.window = {
  addEventListener() {},
  dispatchEvent() {},
};

globalThis.Event = class {
  constructor(type) { this.type = type; }
};

const { normalizarPeriodicidadDespensa } = await import(
  '../src/services/periodicidadDespensa.ts'
);
const { unirIngredientes } = await import('../src/services/UnirIngredientes.ts');
const { crearProductosDespensaDesdeCatalogo } = await import('../src/services/despensa.ts');

localStorage.setItem(
  'pfi-despensa-productos',
  JSON.stringify([
    {
      id: 'chorizo', productoId: '23145', nombre: 'Chorizo sarta Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal', stockMinimo: 0,
    },
    {
      id: 'queso', productoId: '50965', nombre: 'Queso curado mezcla Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal', stockMinimo: 0,
    },
    {
      id: 'salchichas', productoId: '53143', nombre: 'Salchichas bocata gourmet Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal', stockMinimo: 0,
    },
    {
      id: 'pan', productoId: '82331', nombre: 'Pan de burger Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal', stockMinimo: 0,
    },
    {
      id: 'jamon-manual', productoId: 'jamon-manual', nombre: 'Jamón cocido',
      tipo: 'perecedero', frecuencia: 'manual', stockMinimo: 0,
    },
    {
      id: 'pollo-antiguo', productoId: 'pollo', nombre: 'Pechuga de pollo fresca',
      tipo: 'despensa', frecuencia: 'cuando-falte', stockMinimo: 0,
    },
    {
      id: 'arroz-antiguo', productoId: '5044', nombre: 'Arroz redondo Hacendado',
      tipo: 'despensa', frecuencia: 'cuando-falte', stockMinimo: 0,
    },
    {
      id: 'detergente-antiguo', productoId: 'detergente', nombre: 'Detergente lavadora',
      tipo: 'despensa', frecuencia: 'cuando-falte', stockMinimo: 0,
    },
    {
      id: 'reserva-explicita', productoId: 'reserva', nombre: 'Papel higiénico',
      tipo: 'despensa', frecuencia: 'cuando-falte', stockMinimo: 2,
    },
  ]),
);

const cambios = normalizarPeriodicidadDespensa();
if (cambios <= 0) {
  throw new Error('La normalización de periodicidad no corrigió ningún estado heredado.');
}
const despensa = JSON.parse(localStorage.getItem('pfi-despensa-productos') ?? '[]');
for (const id of ['chorizo', 'queso', 'salchichas', 'pan', 'arroz-antiguo', 'detergente-antiguo']) {
  const producto = despensa.find((item) => item.id === id);
  if (producto?.tipo !== 'despensa' || producto?.frecuencia !== 'mensual') {
    throw new Error(`${id} no quedó como despensa mensual: ${JSON.stringify(producto)}.`);
  }
}
const jamonManual = despensa.find((item) => item.id === 'jamon-manual');
if (jamonManual?.tipo !== 'despensa' || jamonManual?.frecuencia !== 'manual') {
  throw new Error('La corrección no conservó la frecuencia manual del jamón.');
}
const pollo = despensa.find((item) => item.id === 'pollo-antiguo');
if (pollo?.tipo !== 'perecedero' || pollo?.frecuencia !== 'semanal') {
  throw new Error(`La carne fresca heredada no volvió a semanal: ${JSON.stringify(pollo)}.`);
}
const reserva = despensa.find((item) => item.id === 'reserva-explicita');
if (reserva?.frecuencia !== 'cuando-falte' || reserva?.stockMinimo !== 2) {
  throw new Error('La migración alteró una reposición cuando-falte con reserva explícita.');
}
if (normalizarPeriodicidadDespensa() !== 0) {
  throw new Error('La periodicidad ya corregida no debe seguir mutando la despensa.');
}

// Altas nuevas: la sección real del catálogo debe aplicar la misma política que
// CompraPlanificada. Mercadona usa nombres como "Carne", no necesariamente
// "Carnicería", que fue la causa de la clasificación antigua incorrecta.
localStorage.removeItem('pfi-despensa-productos');
localStorage.removeItem('pfi-inventario-movimientos');
crearProductosDespensaDesdeCatalogo([
  { productoId: 'carne', nombre: 'Filetes de ternera', seccion: 'Carne', formato: 'Bandeja', precio: 7, imagen: null },
  { productoId: 'pescado', nombre: 'Lubina limpia', seccion: 'Marisco y pescado', formato: 'Pieza', precio: 6, imagen: null },
  { productoId: 'verdura', nombre: 'Calabacín verde', seccion: 'Fruta y verdura', formato: 'Pieza', precio: 1, imagen: null },
  { productoId: 'pan', nombre: 'Pan de burger Hacendado', seccion: 'Panadería y pastelería', formato: 'Paquete', precio: 1.5, imagen: null },
  { productoId: 'embutido', nombre: 'Chorizo sarta Hacendado', seccion: 'Charcutería y quesos', formato: 'Pieza', precio: 2.5, imagen: null },
  { productoId: 'leche', nombre: 'Leche entera Hacendado', seccion: 'Huevos, leche y mantequilla', formato: 'Brick', precio: 1, imagen: null },
  { productoId: 'arroz', nombre: 'Arroz redondo Hacendado', seccion: 'Arroz, legumbres y pasta', formato: 'Paquete', precio: 1.4, imagen: null },
  { productoId: 'limpieza', nombre: 'Detergente lavadora', seccion: 'Limpieza y hogar', formato: 'Botella', precio: 4, imagen: null },
  { productoId: 'mascota', nombre: 'Comida para perro', seccion: 'Mascotas', formato: 'Saco', precio: 10, imagen: null },
]);
const altas = JSON.parse(localStorage.getItem('pfi-despensa-productos') ?? '[]');
for (const id of ['carne', 'pescado', 'verdura']) {
  const producto = altas.find((item) => item.productoId === id);
  if (producto?.tipo !== 'perecedero' || producto?.frecuencia !== 'semanal') {
    throw new Error(`${id} nuevo no quedó como fresco semanal: ${JSON.stringify(producto)}.`);
  }
}
for (const id of ['pan', 'embutido', 'leche', 'arroz', 'limpieza', 'mascota']) {
  const producto = altas.find((item) => item.productoId === id);
  if (producto?.tipo !== 'despensa' || producto?.frecuencia !== 'mensual') {
    throw new Error(`${id} nuevo no quedó como compra mensual: ${JSON.stringify(producto)}.`);
  }
}

const quesos = unirIngredientes([
  { nombre: 'Queso curado', cantidad: 1, unidad: 'cuña', seccion: 'Lácteos y huevos' },
  { nombre: 'Queso roquefort', cantidad: 1, unidad: 'cuña', seccion: 'Lácteos y huevos' },
]);
if (quesos.some((ingrediente) => ingrediente.unidad !== 'ud' || ingrediente.cantidad !== 1)) {
  throw new Error(`Las cuñas de queso no se normalizaron a unidad comercial: ${JSON.stringify(quesos)}.`);
}

console.log('✓ estados heredados se alinean con semanal/mensual');
console.log('✓ frecuencias manuales y reservas cuando-falte explícitas se conservan');
console.log('✓ altas nuevas de carne/pescado/verdura son semanales');
console.log('✓ altas nuevas no frescas nacen mensuales');
console.log('✓ las cuñas de queso equivalen a una unidad comercial');
