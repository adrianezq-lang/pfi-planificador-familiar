import fs from 'node:fs';

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const ruta = 'public/precios-mercadona.json';
comprobar(fs.existsSync(ruta), 'No se ha generado public/precios-mercadona.json');

const precios = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const requeridos = [
  'Salmón',
  'Hamburguesas',
  'Pan de hamburguesa',
  'Pan de perrito',
  'Ajo en polvo',
  'Mozzarella rallada',
  'Garbanzos secos',
  'Alubias blancas secas',
  'Alubias rojas secas',
  'Atún',
];

for (const ingrediente of requeridos) {
  comprobar(precios[ingrediente], `Falta un precio crítico de Mercadona: ${ingrediente}`);
}

for (const [ingrediente, producto] of Object.entries(precios)) {
  comprobar(typeof producto?.nombreComercial === 'string' && producto.nombreComercial.trim(), `${ingrediente}: nombre comercial inválido`);
  comprobar(typeof producto?.precio === 'number' && Number.isFinite(producto.precio) && producto.precio > 0, `${ingrediente}: precio inválido`);
  comprobar(typeof producto?.productoId === 'string' && producto.productoId, `${ingrediente}: productoId inválido`);
}

function texto(ingrediente) {
  const producto = precios[ingrediente];
  return `${producto?.nombreComercial ?? ''} ${producto?.seccion ?? ''} ${producto?.formato ?? ''}`
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

comprobar(!/(perro|gato|mascota|compy)/.test(texto('Salmón')), 'Salmón sigue asociado a mascotas');
comprobar(/hamburgues/.test(texto('Hamburguesas')), 'Hamburguesas no apunta a hamburguesas reales');
comprobar(/pan/.test(texto('Pan de hamburguesa')) && /hamburgues/.test(texto('Pan de hamburguesa')), 'Pan de hamburguesa incorrecto');
comprobar(/pan/.test(texto('Pan de perrito')) && /(perrito|hot dog|hotdog)/.test(texto('Pan de perrito')), 'Pan de perrito incorrecto');
comprobar(/ajo/.test(texto('Ajo en polvo')) && !/cebolla/.test(texto('Ajo en polvo')), 'Ajo en polvo incorrecto');
comprobar(/mozzarella/.test(texto('Mozzarella rallada')) && /rallad/.test(texto('Mozzarella rallada')), 'Mozzarella rallada incorrecta');

for (const ingrediente of ['Garbanzos secos', 'Alubias blancas secas', 'Alubias rojas secas']) {
  comprobar(!/(cocid|tarro)/.test(texto(ingrediente)), `${ingrediente} sigue asociado a legumbre cocida`);
}

comprobar(/6/.test(texto('Atún')), 'Atún no parece corresponder al pack de 6 objetivo');

console.log(`✓ ${Object.keys(precios).length} precios generados con formato válido`);
console.log('✓ los productos críticos están presentes');
console.log('✓ no hay asociaciones conocidas de mascotas/pescado/formatos incorrectos');
