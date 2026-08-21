import fs from 'node:fs';

const ruta = 'src/services/listaCompra.ts';
if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
let contenido = fs.readFileSync(ruta, 'utf8');

function insertarTras(marcador, insercion, etiqueta) {
  if (contenido.includes(insercion.trim())) return;
  if (!contenido.includes(marcador)) throw new Error(`No se encontró ${etiqueta}`);
  contenido = contenido.replace(marcador, `${marcador}${insercion}`);
}

function reemplazar(antes, despues, etiqueta) {
  if (contenido.includes(despues)) return;
  if (!contenido.includes(antes)) throw new Error(`No se pudo aplicar ${etiqueta}`);
  contenido = contenido.replace(antes, despues);
}

insertarTras(
  "import { cantidadConservada } from './conservacion';",
  "\nimport { obtenerProductoIdAsociado } from './asociacionesIngredientes';\nimport { buscarProductoDespensa } from './despensa';",
  'imports de coherencia inventario/conservación',
);

reemplazar(
  `    .map((ingrediente) => {\n      const disponible = cantidadConservada(ingrediente.nombre, ingrediente.unidad);\n      return disponible > 0`,
  `    .map((ingrediente) => {\n      const productoId = obtenerProductoIdAsociado(ingrediente.nombre);\n      const controladoEnInventario = productoId\n        ? Boolean(buscarProductoDespensa(productoId))\n        : false;\n      // El inventario es la fuente de verdad cuando el producto está controlado allí.\n      // Abiertos/Congelados solo descuenta como alternativa para productos sin inventario,\n      // evitando restar dos veces la misma cantidad.\n      const disponible = controladoEnInventario\n        ? 0\n        : cantidadConservada(ingrediente.nombre, ingrediente.unidad);\n      return disponible > 0`,
  'protección frente a doble descuento',
);

fs.writeFileSync(ruta, contenido, 'utf8');
console.log('✓ coherencia inventario/conservación: una misma cantidad no se descuenta dos veces');
