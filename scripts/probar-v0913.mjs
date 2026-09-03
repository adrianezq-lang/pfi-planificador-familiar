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
  limpiarTodasLasAsociaciones,
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
  [linea('', 'Tomate triturado', 'Fruta y verdura'), 'Conservas'],
  [linea('', 'Ajo en polvo', 'Fruta y verdura'), 'Salsas, Aceites y Especias'],
  [linea('', 'Garbanzos secos', 'Despensa'), 'Arroz, Pasta y Legumbres'],
  [linea('', 'Comida para perro', 'Despensa'), 'Mascotas'],
  [linea('', 'Detergente lavadora', 'Despensa'), 'Limpieza y Hogar'],
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

// La reparación siempre valida contra el catálogo actual. El test simula en un
// único catálogo tanto productos recuperables como IDs históricos que siguen
// existiendo pero son semánticamente incompatibles con el ingrediente.
globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return {
      productos: [
        { productoId: 'pollo-1', nombre: 'Filetes de pollo', precio: 5, formato: 'Bandeja', disponible: true },
        { productoId: '69297', nombre: 'Ajos morados', precio: 1.85, formato: 'Malla', tamanoUnidad: 0.25, formatoUnidad: 'kg', disponible: true },
        { productoId: '80859', nombre: 'Tortillas de trigo Wraps', precio: 2.05, formato: 'Paquete', disponible: true },
        { productoId: '3724', nombre: 'Pechuga de pollo', precio: 4.5, formato: 'Bandeja', disponible: true },
        { productoId: '17108', nombre: 'Tomate frito Hacendado', precio: 0.9, formato: 'Tarro', disponible: true },
        { productoId: '13741', nombre: 'Zancarrón de vacuno', precio: 8.5, formato: 'Bandeja', disponible: true },
        { productoId: '5214', nombre: 'Garbanzo Hacendado', precio: 1.45, formato: 'Paquete', disponible: true },
        { productoId: '5124', nombre: 'Alubia blanca Hacendado', precio: 2.45, formato: 'Paquete', disponible: true },
        { productoId: '67609', nombre: 'Alubia roja Hacendado', precio: 3, formato: 'Paquete', disponible: true },
        { productoId: '51110', nombre: 'Queso rallado mozzarella pizza-Roma de vaca Hacendado', precio: 1.7, formato: 'Paquete', disponible: true },
        { productoId: '2873', nombre: 'Burger meat de vacuno', precio: 4.4, formato: 'Paquete', disponible: true },
        { productoId: '87204', nombre: 'Filete de salmón con piel y sin espinas', precio: 8.05, formato: 'Bandeja', disponible: true },
        { productoId: '21629', nombre: 'Bacón ahumado Monells lonchas', precio: 2.2, formato: 'Paquete', disponible: true },
        { productoId: '14378', nombre: 'Pan de pita Mission', precio: 1.8, formato: 'Paquete', disponible: true },
        { productoId: '13778', nombre: 'Relleno ultracongelado para kebab', precio: 4, formato: 'Paquete', disponible: true },
        { productoId: '17647', nombre: 'Tomate para untar Hacendado con aceite de oliva', precio: 0.95, formato: 'Tarro', disponible: true },
        { productoId: '26033', nombre: 'Garbanzo cocido Pedrosillano Hacendado', precio: 0.9, formato: 'Tarro', disponible: true },
        { productoId: '26216', nombre: 'Alubia blanca cocida Hacendado', precio: 0.8, formato: 'Tarro', disponible: true },
        { productoId: '26222', nombre: 'Alubia roja cocida Hacendado', precio: 0.9, formato: 'Tarro', disponible: true },
        { productoId: '50917', nombre: 'Mozzarella Hacendado lonchas', precio: 2, formato: 'Paquete', disponible: true },
        { productoId: '3106', nombre: 'Arreglo para puchero', precio: 4, formato: 'Bandeja', disponible: true },
        { productoId: '64558', nombre: 'Rollitos para perro sabor salmón', precio: 2, formato: 'Paquete', disponible: true },
        { productoId: '2876', nombre: 'Merluza empanada', precio: 4, formato: 'Paquete', disponible: true },
        { productoId: '86516', nombre: 'Cebolla en polvo Hacendado', precio: 1.2, formato: 'Bote', disponible: true },
      ],
    };
  },
});

memoria.delete('pfi-asociaciones-ingredientes-mercadona');
memoria.delete('pfi-asociaciones-ingredientes-mercadona-copia');
const reparadas = await repararAsociacionesIngredientes(
  [{ ingredientes: [{ nombre: 'Filetes de pollo' }] }],
  [{ productoId: 'pollo-1', nombre: 'Filetes de pollo' }],
);
if (reparadas !== 1 || cargarAsociacionesIngredientes()['Filetes de pollo'] !== 'pollo-1') {
  throw new Error('No se reparó la asociación exacta desde la despensa.');
}

limpiarTodasLasAsociaciones();
const ajosRecuperados = await repararAsociacionesIngredientes(
  [{ ingredientes: [{ nombre: 'Ajo' }] }],
);
if (ajosRecuperados !== 1 || cargarAsociacionesIngredientes().Ajo !== '69297') {
  throw new Error('No se recuperó la asociación conocida de la malla de ajos.');
}

limpiarTodasLasAsociaciones();
guardarAsociacionesIngredientes({
  Pollo: '3106',
  'Tortillas de trigo': '14378',
  'Pechugas de pollo': '13778',
  'Tomate para pizza': '17647',
  'Garbanzos secos': '26033',
  'Alubias blancas secas': '26216',
  'Alubias rojas secas': '26222',
  'Mozzarella rallada': '50917',
  Hamburguesas: '3106',
  'Salmón': '64558',
  'Pan hamburguesa': '2876',
  'Pan perrito': '2876',
  'Ajo en polvo': '86516',
  Bacon: '21629',
});

const ingredientesSaneamiento = [
  'Tortillas de trigo',
  'Pechugas de pollo',
  'Tomate para pizza',
  'Morcillo',
  'Garbanzos secos',
  'Alubias blancas secas',
  'Alubias rojas secas',
  'Mozzarella rallada',
  'Hamburguesas',
  'Salmón',
  'Pan hamburguesa',
  'Pan perrito',
  'Ajo en polvo',
  'Bacon',
].map((nombre) => ({ nombre }));

const saneadas = await repararAsociacionesIngredientes([
  { ingredientes: ingredientesSaneamiento },
]);
const asociacionesSaneadas = cargarAsociacionesIngredientes();
const esperadas = {
  'Tortillas de trigo': '80859',
  'Pechugas de pollo': '3724',
  'Tomate para pizza': '17108',
  Morcillo: '13741',
  'Garbanzos secos': '5214',
  'Alubias blancas secas': '5124',
  'Alubias rojas secas': '67609',
  'Mozzarella rallada': '51110',
  Hamburguesas: '2873',
  'Salmón': '87204',
  Bacon: '21629',
};
for (const [ingrediente, productoId] of Object.entries(esperadas)) {
  if (asociacionesSaneadas[ingrediente] !== productoId) {
    throw new Error(`${ingrediente} no quedó saneado: ${asociacionesSaneadas[ingrediente]}, esperaba ${productoId}.`);
  }
}
for (const ingrediente of ['Pan hamburguesa', 'Pan perrito', 'Ajo en polvo', 'Pollo']) {
  if (asociacionesSaneadas[ingrediente]) {
    throw new Error(`${ingrediente} conserva una asociación histórica incompatible: ${asociacionesSaneadas[ingrediente]}.`);
  }
}
if (saneadas < 1) {
  throw new Error('El saneamiento semántico no informó de ningún cambio.');
}

console.log('✓ postres únicamente desde el recetario');
console.log('✓ comida con fruta y cena con yogur');
console.log('✓ carne, pescado y aperitivos en su sección');
console.log('✓ copia y reparación automática de asociaciones');
console.log('✓ asociación conocida de la malla de ajos');
console.log('✓ IDs válidos pero semánticamente incorrectos se corrigen');
console.log('✓ asociaciones manuales no problemáticas se conservan');
console.log('✓ pan y ajo en polvo quedan sin asociación antes que comprar un producto incorrecto');