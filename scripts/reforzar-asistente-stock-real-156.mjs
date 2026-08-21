import fs from 'node:fs';

const ruta = 'src/services/asistentePfi.ts';
if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
let contenido = fs.readFileSync(ruta, 'utf8');

function insertarImportes() {
  if (contenido.includes("from './stockReal")) return;
  const patron = /import \{ anadirConservacion, type TipoConservacion \} from '\.\/conservacion(?:\.ts)?';/;
  const encontrado = contenido.match(patron)?.[0];
  if (!encontrado) throw new Error('No se encontró el import de conservación del asistente.');
  const nuevos = `${encontrado}\nimport {\n  actualizarStockProductoDespensa,\n  cargarDespensa,\n  type ProductoDespensa,\n} from './despensa';\nimport {\n  configuracionStockReal,\n  cantidadRealDesdeEnvases,\n  envasesDesdeCantidadReal,\n  etiquetaUnidadStock,\n  formatearNumeroStock,\n} from './stockReal';`;
  contenido = contenido.replace(encontrado, nuevos);
}

function insertarAyudantes() {
  if (contenido.includes('function procesarAjusteStockNatural')) return;
  const marcador = `function cambiarPlato(\n  menu: DiaMenu[],`;
  if (!contenido.includes(marcador)) throw new Error('No se encontró el punto de inserción de ayudantes del asistente.');

  const helpers = `function raizPalabra(palabra: string): string {\n  if (palabra.length > 5 && palabra.endsWith('es')) return palabra.slice(0, -2);\n  if (palabra.length > 4 && palabra.endsWith('s')) return palabra.slice(0, -1);\n  return palabra;\n}\n\nfunction palabrasSignificativas(texto: string): string[] {\n  const ignorar = new Set(['tengo', 'queda', 'quedan', 'quedar', 'quedan', 'casa', 'medio', 'media', 'paquete', 'envase', 'bote', 'bolsa', 'brick', 'brik', 'unidad', 'unidades', 'hacendado', 'aproximadamente']);\n  return normalizar(texto)\n    .split(' ')\n    .map(raizPalabra)\n    .filter((palabra) => palabra.length >= 3 && !ignorar.has(palabra));\n}\n\nfunction unidadStockSolicitada(texto: string): string | null {\n  if (/\\bcabezas?\\b/.test(texto)) return 'cabeza';\n  if (/\\bdientes?\\b/.test(texto)) return 'diente';\n  if (/\\bhuevos?\\b/.test(texto)) return 'huevo';\n  if (/\\blatas?\\b/.test(texto)) return 'lata';\n  if (/\\b(?:kg|kilos?|kilogramos?)\\b/.test(texto)) return 'kg';\n  if (/\\b(?:g|gramos?)\\b/.test(texto)) return 'g';\n  if (/\\b(?:ml|mililitros?)\\b/.test(texto)) return 'ml';\n  if (/\\b(?:l|litros?)\\b/.test(texto)) return 'l';\n  if (/\\b(?:paquetes?|envases?|botes?|bolsas?|bricks?|briks?)\\b/.test(texto)) return 'envase';\n  return null;\n}\n\nfunction buscarProductoInventario(texto: string, unidadPedida: string | null): ProductoDespensa | null {\n  const palabrasMensaje = new Set(palabrasSignificativas(texto));\n  let mejor: ProductoDespensa | null = null;\n  let mejorPuntuacion = 0;\n\n  cargarDespensa().forEach((producto) => {\n    const palabrasProducto = palabrasSignificativas(producto.nombre);\n    let puntos = palabrasProducto.reduce(\n      (total, palabra) => total + (palabrasMensaje.has(palabra) ? 3 : 0),\n      0,\n    );\n    const config = configuracionStockReal(producto);\n    if (unidadPedida && raizPalabra(config.unidadContenido) === raizPalabra(unidadPedida)) puntos += 5;\n    if (unidadPedida === 'envase') puntos += 1;\n    if (puntos > mejorPuntuacion) {\n      mejor = producto;\n      mejorPuntuacion = puntos;\n    }\n  });\n\n  return mejorPuntuacion >= 3 ? mejor : null;\n}\n\nfunction cantidadStockDesdeTexto(\n  texto: string,\n  producto: ProductoDespensa,\n  unidadPedida: string | null,\n): { envases: number; descripcion: string } | null {\n  const config = configuracionStockReal(producto);\n  const fraccionEnvase = /\\b(?:medio|media)\\s+(?:paquete|envase|bote|bolsa|brick|brik)\\b/.test(texto)\n    ? 0.5\n    : /\\bun\\s+cuarto\\s+(?:de\\s+)?(?:paquete|envase|bote|bolsa|brick|brik)\\b/.test(texto)\n      ? 0.25\n      : null;\n\n  if (fraccionEnvase !== null) {\n    const cantidadReal = cantidadRealDesdeEnvases(fraccionEnvase, config);\n    return {\n      envases: fraccionEnvase,\n      descripcion: config.unidadContenido === 'envase'\n        ? \\`${'${'}formatearNumeroStock(fraccionEnvase)} envase\\`\n        : \\`${'${'}formatearNumeroStock(cantidadReal)} ${'${'}etiquetaUnidadStock(config.unidadContenido, cantidadReal)}\\`,\n    };\n  }\n\n  const numero = texto.match(/\\b(\\d+(?:[.,]\\d+)?)\\b/);\n  if (!numero) return null;\n  let cantidad = Number(numero[1].replace(',', '.'));\n  if (!Number.isFinite(cantidad) || cantidad < 0) return null;\n\n  if (unidadPedida === 'kg') cantidad *= 1000;\n  if (unidadPedida === 'l') cantidad *= 1000;\n  const unidadNormalizada = unidadPedida === 'kg' ? 'g' : unidadPedida === 'l' ? 'ml' : unidadPedida;\n\n  if (unidadNormalizada === 'envase' || (!unidadNormalizada && config.unidadContenido === 'envase')) {\n    return { envases: cantidad, descripcion: \\`${'${'}formatearNumeroStock(cantidad)} ${'${'}cantidad === 1 ? 'envase' : 'envases'}\\` };\n  }\n\n  const unidadConfig = raizPalabra(config.unidadContenido);\n  if (unidadNormalizada && raizPalabra(unidadNormalizada) !== unidadConfig) return null;\n  const envases = envasesDesdeCantidadReal(cantidad, config);\n  return {\n    envases,\n    descripcion: \\`${'${'}formatearNumeroStock(cantidad)} ${'${'}etiquetaUnidadStock(config.unidadContenido, cantidad)}\\`,\n  };\n}\n\nfunction procesarAjusteStockNatural(texto: string): ResultadoAsistentePfi | null {\n  if (!/\\b(?:me\\s+quedan?|quedan?|tengo|hay)\\b/.test(texto)) return null;\n  const unidadPedida = unidadStockSolicitada(texto);\n  const producto = buscarProductoInventario(texto, unidadPedida);\n  if (!producto) return null;\n  const cantidad = cantidadStockDesdeTexto(texto, producto, unidadPedida);\n  if (!cantidad) return null;\n\n  actualizarStockProductoDespensa(producto.productoId, cantidad.envases);\n  return {\n    entendido: true,\n    respuesta: \\`He actualizado ${'${'}producto.nombre}: quedan ${'${'}cantidad.descripcion}. Compra tendrá este stock en cuenta.\\`,\n  };\n}\n\n`;

  contenido = contenido.replace(marcador, `${helpers}${marcador}`);
}

function insertarProcesamiento() {
  const marcador = `  if (!texto) {\n    return { entendido: false, respuesta: 'Escribe el cambio que quieres hacer.' };\n  }`;
  const nuevo = `${marcador}\n\n  const ajusteStock = procesarAjusteStockNatural(texto);\n  if (ajusteStock) return ajusteStock;`;
  if (contenido.includes('const ajusteStock = procesarAjusteStockNatural(texto);')) return;
  if (!contenido.includes(marcador)) throw new Error('No se encontró el inicio del procesador del asistente.');
  contenido = contenido.replace(marcador, nuevo);
}

function actualizarAyuda() {
  contenido = contenido.replace(
    '“he congelado 2 raciones de lentejas”.',
    '“he congelado 2 raciones de lentejas” o “me quedan 10 huevos”.',
  );
}

insertarImportes();
insertarAyudantes();
insertarProcesamiento();
actualizarAyuda();
fs.writeFileSync(ruta, contenido, 'utf8');
console.log('✓ asistente conectado al stock real: cantidades naturales actualizan Inventario');
