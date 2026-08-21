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

  const helpers = String.raw`function raizPalabra(palabra: string): string {
  if (palabra.length > 5 && palabra.endsWith('es')) return palabra.slice(0, -2);
  if (palabra.length > 4 && palabra.endsWith('s')) return palabra.slice(0, -1);
  return palabra;
}

function palabrasSignificativas(texto: string): string[] {
  const ignorar = new Set(['tengo', 'queda', 'quedan', 'quedar', 'casa', 'medio', 'media', 'paquete', 'envase', 'bote', 'bolsa', 'brick', 'brik', 'unidad', 'unidades', 'hacendado', 'aproximadamente']);
  return normalizar(texto)
    .split(' ')
    .map(raizPalabra)
    .filter((palabra) => palabra.length >= 3 && !ignorar.has(palabra));
}

function unidadStockSolicitada(texto: string): string | null {
  if (/\bcabezas?\b/.test(texto)) return 'cabeza';
  if (/\bdientes?\b/.test(texto)) return 'diente';
  if (/\bhuevos?\b/.test(texto)) return 'huevo';
  if (/\blatas?\b/.test(texto)) return 'lata';
  if (/\b(?:kg|kilos?|kilogramos?)\b/.test(texto)) return 'kg';
  if (/\b(?:g|gramos?)\b/.test(texto)) return 'g';
  if (/\b(?:ml|mililitros?)\b/.test(texto)) return 'ml';
  if (/\b(?:l|litros?)\b/.test(texto)) return 'l';
  if (/\b(?:paquetes?|envases?|botes?|bolsas?|bricks?|briks?)\b/.test(texto)) return 'envase';
  return null;
}

function buscarProductoInventario(texto: string, unidadPedida: string | null): ProductoDespensa | null {
  const palabrasMensaje = new Set(palabrasSignificativas(texto));
  let mejor: ProductoDespensa | null = null;
  let mejorPuntuacion = 0;

  cargarDespensa().forEach((producto) => {
    const palabrasProducto = palabrasSignificativas(producto.nombre);
    let puntos = palabrasProducto.reduce(
      (total, palabra) => total + (palabrasMensaje.has(palabra) ? 3 : 0),
      0,
    );
    const config = configuracionStockReal(producto);
    if (unidadPedida && raizPalabra(config.unidadContenido) === raizPalabra(unidadPedida)) puntos += 5;
    if (unidadPedida === 'envase') puntos += 1;
    if (puntos > mejorPuntuacion) {
      mejor = producto;
      mejorPuntuacion = puntos;
    }
  });

  return mejorPuntuacion >= 3 ? mejor : null;
}

function cantidadStockDesdeTexto(
  texto: string,
  producto: ProductoDespensa,
  unidadPedida: string | null,
): { envases: number; descripcion: string } | null {
  const config = configuracionStockReal(producto);
  const fraccionEnvase = /\b(?:medio|media)\s+(?:paquete|envase|bote|bolsa|brick|brik)\b/.test(texto)
    ? 0.5
    : /\bun\s+cuarto\s+(?:de\s+)?(?:paquete|envase|bote|bolsa|brick|brik)\b/.test(texto)
      ? 0.25
      : null;

  if (fraccionEnvase !== null) {
    const cantidadReal = cantidadRealDesdeEnvases(fraccionEnvase, config);
    return {
      envases: fraccionEnvase,
      descripcion: config.unidadContenido === 'envase'
        ? formatearNumeroStock(fraccionEnvase) + ' envase'
        : formatearNumeroStock(cantidadReal) + ' ' + etiquetaUnidadStock(config.unidadContenido, cantidadReal),
    };
  }

  const numero = texto.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (!numero) return null;
  let cantidad = Number(numero[1].replace(',', '.'));
  if (!Number.isFinite(cantidad) || cantidad < 0) return null;

  if (unidadPedida === 'kg') cantidad *= 1000;
  if (unidadPedida === 'l') cantidad *= 1000;
  const unidadNormalizada = unidadPedida === 'kg' ? 'g' : unidadPedida === 'l' ? 'ml' : unidadPedida;

  if (unidadNormalizada === 'envase' || (!unidadNormalizada && config.unidadContenido === 'envase')) {
    return {
      envases: cantidad,
      descripcion: formatearNumeroStock(cantidad) + ' ' + (cantidad === 1 ? 'envase' : 'envases'),
    };
  }

  const unidadConfig = raizPalabra(config.unidadContenido);
  if (unidadNormalizada && raizPalabra(unidadNormalizada) !== unidadConfig) return null;
  const envases = envasesDesdeCantidadReal(cantidad, config);
  return {
    envases,
    descripcion: formatearNumeroStock(cantidad) + ' ' + etiquetaUnidadStock(config.unidadContenido, cantidad),
  };
}

function procesarAjusteStockNatural(texto: string): ResultadoAsistentePfi | null {
  if (!/\b(?:me\s+quedan?|quedan?|tengo|hay)\b/.test(texto)) return null;
  const unidadPedida = unidadStockSolicitada(texto);
  const producto = buscarProductoInventario(texto, unidadPedida);
  if (!producto) return null;
  const cantidad = cantidadStockDesdeTexto(texto, producto, unidadPedida);
  if (!cantidad) return null;

  actualizarStockProductoDespensa(producto.productoId, cantidad.envases);
  return {
    entendido: true,
    respuesta: 'He actualizado ' + producto.nombre + ': quedan ' + cantidad.descripcion + '. Compra tendrá este stock en cuenta.',
  };
}

`;

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
