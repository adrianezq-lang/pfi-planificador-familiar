const memoria = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};

const {
  aplicarConfiguracionPostresAlPlan,
  crearConfiguracionPostresDesdeRecetas,
} = await import('../src/services/postres.ts');
const {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
  repararAsociacionesIngredientes,
} = await import('../src/services/asociacionesIngredientes.ts');
const {
  obtenerSeccionCompra,
} = await import('../src/services/categoriasCompra.ts');

const recetasPostre = [
  {
    nombre: 'Sandía', categoria: 'Postres', tipo: 'postre',
    ingredientes: [{ nombre: 'Media sandía', cantidad: 0.25, unidad: 'ud', seccion: 'Fruta y verdura' }],
  },
  {
    nombre: 'Manzana', categoria: 'Postres', tipo: 'postre',
    ingredientes: [{ nombre: 'Manzanas', cantidad: 4, unidad: 'ud', seccion: 'Fruta y verdura' }],
  },
  {
    nombre: 'Yogur natural', categoria: 'Postres', tipo: 'postre',
    ingredientes: [{ nombre: 'Yogures naturales', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos' }],
  },
  {
    nombre: 'Tarta de queso', categoria: 'Postres', tipo: 'postre',
    ingredientes: [{ nombre: 'Tarta', cantidad: 1, unidad: 'ud', seccion: 'Panadería' }],
  },
];
const config = crearConfiguracionPostresDesdeRecetas(recetasPostre);
if (JSON.stringify(config.comida) !== JSON.stringify(['Sandía', 'Manzana'])) {
  throw new Error(`La comida no usa solo fruta del recetario: ${JSON.stringify(config.comida)}`);
}
if (JSON.stringify(config.cena) !== JSON.stringify(['Yogur natural'])) {
  throw new Error(`La cena no usa solo yogur del recetario: ${JSON.stringify(config.cena)}`);
}

const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const plan = [{
  id: 'semana-1', nombre: 'Semana 1',
  menu: dias.map((dia) => ({
    dia, comida: ['Plato'], cena: ['Cena'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '',
  })),
}];
const aplicado = aplicarConfiguracionPostresAlPlan(plan, config)[0].menu;
for (let i = 0; i < 6; i += 1) {
  if (!['Sandía', 'Manzana'].includes(aplicado[i].postreComidaReceta)) {
    throw new Error(`${dias[i]} no tiene fruta de receta en la comida.`);
  }
  if (aplicado[i].postreCenaReceta !== 'Yogur natural') {
    throw new Error(`${dias[i]} no tiene yogur de receta en la cena.`);
  }
}
if (aplicado[6].postreComidaReceta !== 'Sin postre' || aplicado[6].postreCenaReceta !== 'Sin postre') {
  throw new Error('El domingo debe quedar sin postre por defecto.');
}

function linea(seccionProducto, nombre, seccionIngrediente) {
  return {
    ingrediente: { nombre, cantidad: 1, unidad: 'ud', seccion: seccionIngrediente },
    producto: seccionProducto ? { seccion: seccionProducto, subcategoria: '', nombre } : null,
  };
}
const categorias = [
  [linea('', 'Pechugas de pollo', 'Carne'), 'Carnicería'],
  [linea('', 'Salmón', 'Pescado'), 'Pescadería'],
  [linea('Carne', 'Filete de ternera', 'Despensa'), 'Carnicería'],
  [linea('Marisco y pescado', 'Lubina', 'Despensa'), 'Pescadería'],
  [linea('Aperitivos', 'Nachos', 'Despensa'), 'Aperitivos'],
];
for (const [entrada, esperada] of categorias) {
  const obtenida = obtenerSeccionCompra(entrada);
  if (obtenida !== esperada) throw new Error(`${entrada.ingrediente.nombre}: ${obtenida}, esperaba ${esperada}`);
}

guardarAsociacionesIngredientes({ Huevos: 'producto-huevos' });
localStorage.removeItem('pfi-asociaciones-ingredientes-mercadona');
const recuperadasCopia = cargarAsociacionesIngredientes();
if (recuperadasCopia.Huevos !== 'producto-huevos') {
  throw new Error('No se recuperó la copia de seguridad de asociaciones.');
}

memoria.delete('pfi-asociaciones-ingredientes-mercadona');
memoria.delete('pfi-asociaciones-ingredientes-mercadona-copia');
const reparadas = await repararAsociacionesIngredientes(
  [{ ingredientes: [{ nombre: 'Filetes de pollo' }] }],
  [{ productoId: 'pollo-1', nombre: 'Filetes de pollo' }],
);
if (reparadas !== 1 || cargarAsociacionesIngredientes()['Filetes de pollo'] !== 'pollo-1') {
  throw new Error('No se reparó la asociación exacta desde la despensa.');
}

console.log('✓ postres únicamente desde el recetario');
console.log('✓ comida con fruta y cena con yogur');
console.log('✓ carne, pescado y aperitivos en su sección');
console.log('✓ copia y reparación automática de asociaciones');
