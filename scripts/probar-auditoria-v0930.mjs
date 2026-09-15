import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const memoria = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  get length() { return memoria.size; },
  key(indice) { return Array.from(memoria.keys())[indice] ?? null; },
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
  clear() { memoria.clear(); },
};

globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return {
      actualizado: '2026-09-15T00:00:00.000Z',
      codigoPostal: '48950',
      almacen: 'test',
      productos: [
        {
          productoId: 'sku-prueba',
          nombre: 'Producto de prueba',
          precio: 1.5,
          precioReferencia: null,
          formato: 'Paquete 1 ud',
          pesoAproximado: false,
          seccion: 'Despensa',
          subcategoria: 'Prueba',
          imagen: null,
          url: '',
          disponible: true,
        },
      ],
    };
  },
});

memoria.set(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({ 'Ingrediente prueba': 'sku-prueba' }),
);
memoria.set(
  'pfi-asociaciones-ingredientes-mercadona-copia',
  JSON.stringify({ 'Ingrediente prueba': 'sku-prueba' }),
);

const {
  cargarDespensa,
  crearProductoDespensaDesdeCatalogo,
  eliminarProductoDespensa,
  sincronizarProductosRecetasConDespensa,
} = await import('../src/services/despensa.ts');

const producto = {
  productoId: 'sku-prueba',
  nombre: 'Producto de prueba',
  precio: 1.5,
  precioReferencia: null,
  formato: 'Paquete 1 ud',
  pesoAproximado: false,
  seccion: 'Despensa',
  subcategoria: 'Prueba',
  imagen: null,
  url: '',
  disponible: true,
};

crearProductoDespensaDesdeCatalogo(producto);
assert.equal(cargarDespensa().length, 1, 'El producto explícitamente añadido debe entrar en despensa.');

const productoGuardado = cargarDespensa()[0];
eliminarProductoDespensa(productoGuardado.id);
assert.equal(cargarDespensa().length, 0, 'Quitar de despensa debe eliminar el producto.');

const reañadidos = await sincronizarProductosRecetasConDespensa([
  {
    nombre: 'Receta prueba',
    categoria: 'Otros',
    tipo: 'plato',
    ingredientes: [
      {
        nombre: 'Ingrediente prueba',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Despensa',
      },
    ],
  },
]);
assert.equal(reañadidos, 0, 'La sincronización automática debe respetar una retirada manual.');
assert.equal(cargarDespensa().length, 0, 'Un producto quitado no debe reaparecer al sincronizar recetas.');

crearProductoDespensaDesdeCatalogo(producto);
assert.equal(cargarDespensa().length, 1, 'Una acción explícita debe permitir volver a añadir el producto.');

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const copias = await readFile(new URL('../src/services/copiasSeguridad.ts', import.meta.url), 'utf8');
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const version = packageJson.version;

assert.match(app, new RegExp(`app-version\\">v${version.replaceAll('.', '\\.')}`), 'La cabecera debe mostrar la versión de package.json.');
assert.match(copias, new RegExp(`VERSION_APP = '${version.replaceAll('.', '\\.')}'`), 'Las copias deben declarar la versión actual.');
assert.match(sw, new RegExp(`CACHE_NAME = 'pfi-v${version.replaceAll('.', '\\.')}-`), 'La caché PWA debe corresponder a la versión actual.');
assert.match(readme, new RegExp(`Versión ${version.replaceAll('.', '\\.')}`), 'README debe indicar la versión actual.');

console.log('✓ retirar un producto de despensa es una decisión persistente');
console.log('✓ volver a añadirlo explícitamente reactiva su seguimiento');
console.log('✓ cabecera, copias, PWA y documentación comparten versión');
