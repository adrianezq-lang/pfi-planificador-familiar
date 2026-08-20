import fs from 'node:fs';

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const rutaPrecios = 'public/precios-mercadona.json';
const rutaObjetivos = 'scripts/productos-objetivo.json';
comprobar(fs.existsSync(rutaPrecios), 'No se ha generado public/precios-mercadona.json');
comprobar(fs.existsSync(rutaObjetivos), 'No existe scripts/productos-objetivo.json');

const precios = JSON.parse(fs.readFileSync(rutaPrecios, 'utf8'));
const objetivos = JSON.parse(fs.readFileSync(rutaObjetivos, 'utf8'));
comprobar(Array.isArray(objetivos) && objetivos.length === 51, `Se esperaban 51 objetivos Mercadona y hay ${Array.isArray(objetivos) ? objetivos.length : 0}`);

const ingredientesObjetivo = objetivos.map((entrada) =>
  typeof entrada === 'string' ? entrada : entrada?.ingrediente,
);

for (const ingrediente of ingredientesObjetivo) {
  comprobar(typeof ingrediente === 'string' && ingrediente.trim(), 'Hay un objetivo Mercadona sin ingrediente válido');
  comprobar(precios[ingrediente], `Falta un precio objetivo de Mercadona: ${ingrediente}`);
}

comprobar(
  Object.keys(precios).length === ingredientesObjetivo.length,
  `El catálogo de precios debe resolver 51/51 objetivos y ha resuelto ${Object.keys(precios).length}/51`,
);

for (const [ingrediente, producto] of Object.entries(precios)) {
  comprobar(typeof producto?.nombreComercial === 'string' && producto.nombreComercial.trim(), `${ingrediente}: nombre comercial inválido`);
  comprobar(typeof producto?.precio === 'number' && Number.isFinite(producto.precio) && producto.precio > 0, `${ingrediente}: precio inválido`);
  comprobar(typeof producto?.productoId === 'string' && producto.productoId, `${ingrediente}: productoId inválido`);
}

function texto(ingrediente) {
  const producto = precios[ingrediente];
  return `${producto?.nombreComercial ?? ''} ${producto?.seccion ?? ''} ${producto?.subcategoria ?? ''} ${producto?.formato ?? ''}`
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

comprobar(/huevo/.test(texto('Huevos')), 'Huevos no apunta a huevos reales');
comprobar(/patata/.test(texto('Patatas')) && !/(frita|snack|chips|cocida|congelad)/.test(texto('Patatas')), 'Patatas apunta a un producto incorrecto');
comprobar(/cebolla/.test(texto('Cebolla')) && !/(tierna|caramelizada|frita|encurtida|polvo|congelad|preparada)/.test(texto('Cebolla')), 'Cebolla no apunta a cebolla fresca normal');
comprobar(/zanahoria/.test(texto('Zanahorias')) && !/(en tiras|rallada|cocida|conserva|congelad|preparada)/.test(texto('Zanahorias')), 'Zanahorias no apunta a zanahoria fresca');
comprobar(/ajo/.test(texto('Ajo')) && !/(tierno|negro|pelad|granulado|polvo|congelad|pasta)/.test(texto('Ajo')), 'Ajo fresco apunta a un formato incorrecto');
comprobar(/salmon/.test(texto('Salmón')) && /pescado fresco/.test(texto('Salmón')) && !/(perro|gato|mascota|compy|conserva|al natural|ahumado|marinado|congelad)/.test(texto('Salmón')), 'Salmón no apunta a pescado fresco');
comprobar(/almeja/.test(texto('Almejas')) && !/(congelad|ultracongelad|conserva|lata)/.test(texto('Almejas')), 'Almejas no apunta a almeja fresca');
comprobar(/hamburgues|burger/.test(texto('Hamburguesas')), 'Hamburguesas no apunta a hamburguesas reales');
comprobar(/pan/.test(texto('Pan de hamburguesa')) && /(hamburgues|burger)/.test(texto('Pan de hamburguesa')), 'Pan de hamburguesa incorrecto');
comprobar(/pan/.test(texto('Pan de perrito')) && /(perrito|hot dog|hotdog)/.test(texto('Pan de perrito')), 'Pan de perrito incorrecto');
comprobar(/ajo/.test(texto('Ajo en polvo')) && /(granulado|polvo)/.test(texto('Ajo en polvo')) && !/cebolla/.test(texto('Ajo en polvo')), 'Ajo en polvo/granulado incorrecto');
comprobar(/mozzarella/.test(texto('Mozzarella rallada')) && /rallad/.test(texto('Mozzarella rallada')), 'Mozzarella rallada incorrecta');
comprobar(/(4 quesos|cuatro quesos)/.test(texto('Mezcla cuatro quesos')) && /rallad/.test(texto('Mezcla cuatro quesos')), 'Mezcla cuatro quesos incorrecta');

for (const ingrediente of ['Garbanzos secos', 'Alubias blancas secas', 'Alubias rojas secas']) {
  comprobar(!/(cocid|tarro)/.test(texto(ingrediente)), `${ingrediente} sigue asociado a legumbre cocida`);
}

comprobar(/6/.test(texto('Atún')), 'Atún no parece corresponder al pack de 6 objetivo');

console.log('✓ Mercadona: 51/51 objetivos resueltos con precio válido');
console.log('✓ frescos, pescados, panes, quesos y especias críticos verificados');
console.log('✓ no hay asociaciones conocidas de mascotas, conservas, congelados o formatos incorrectos');
