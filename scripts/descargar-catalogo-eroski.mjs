import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extraerProductosEroski } from './catalogos-supermercados.mjs';

const EROSKI_BASE = 'https://supermercado.eroski.es';
const SITEMAP_URL = `${EROSKI_BASE}/sitemap.xml`;
const CATALOGO_URL = `${EROSKI_BASE}/es/supermarket:loadpage`;
const RUTA_SALIDA = path.resolve('public/catalogo-eroski.json');
const RUTA_TEMPORAL = `${RUTA_SALIDA}.tmp`;
const RAICES_SUPERMERCADO = new Set([
  '2059698', // Frescos
  '2059806', // Alimentación
  '2059919', // Congelados
  '2060118', // Dulces y desayuno
  '2060211', // Bebidas
  '2060327', // Bebé
  '2060401', // Higiene y belleza
  '2060538', // Limpieza
  '2060623', // Mascotas
]);
const CONCURRENCIA = Math.max(
  1,
  Math.min(4, Number(process.env.PFI_EROSKI_CONCURRENCIA ?? 3)),
);
const PAUSA_MS = Math.max(120, Number(process.env.PFI_EROSKI_PAUSA_MS ?? 300));
const MAX_PAGINAS_CATEGORIA = 150;
const MIN_PRODUCTOS = 3_000;
const MAX_REINTENTOS = 3;

let siguienteInicio = 0;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respetarRitmo() {
  const inicio = Math.max(Date.now(), siguienteInicio);
  siguienteInicio = inicio + PAUSA_MS;
  if (inicio > Date.now()) await esperar(inicio - Date.now());
}

function cabeceras(acepta) {
  return {
    Accept: acepta,
    'Accept-Language': 'es-ES,es;q=0.9',
    'User-Agent': 'PFI catalog updater (family price comparison)',
  };
}

async function descargar(url, acepta, extra = {}) {
  let ultimoError;
  for (let intento = 1; intento <= MAX_REINTENTOS; intento += 1) {
    await respetarRitmo();
    try {
      const respuesta = await fetch(url, {
        headers: { ...cabeceras(acepta), ...extra },
        signal: AbortSignal.timeout(25_000),
      });
      if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
      }
      return respuesta;
    } catch (error) {
      ultimoError = error;
      if (intento < MAX_REINTENTOS) await esperar(600 * intento);
    }
  }
  throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
}

export function extraerCategoriasCatalogoEroski(xml) {
  const urls = [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((coincidencia) => coincidencia[1].replaceAll('&amp;', '&'));

  return urls.filter((urlTexto) => {
    try {
      const url = new URL(urlTexto);
      const segmentos = url.pathname.split('/').filter(Boolean);
      if (url.origin !== EROSKI_BASE || segmentos.length !== 4) return false;
      if (segmentos[0] !== 'es' || segmentos[1] !== 'supermercado') return false;
      if (!/^\d+-/.test(segmentos[2]) || !/^\d+-/.test(segmentos[3])) return false;
      return RAICES_SUPERMERCADO.has(segmentos[2].split('-')[0]);
    } catch {
      return false;
    }
  });
}

function codigoCategoria(urlTexto) {
  return new URL(urlTexto).pathname
    .split('/')
    .filter(Boolean)
    .slice(2)
    .join('/');
}

function nombreCategoria(urlTexto) {
  const ultimo = new URL(urlTexto).pathname.split('/').filter(Boolean).at(-1) ?? '';
  return ultimo.replace(/^\d+-/, '').replaceAll('-', ' ');
}

async function descargarPaginaCategoria(categoria, pagina) {
  const parametros = new URLSearchParams({
    't:ac': codigoCategoria(categoria),
    't:zoneid': 'productListZone',
    pageNumber: String(pagina),
  });
  const respuesta = await descargar(
    `${CATALOGO_URL}?${parametros}`,
    'application/json, text/javascript, */*; q=0.01',
    {
      Referer: categoria,
      'X-Requested-With': 'XMLHttpRequest',
    },
  );
  const datos = await respuesta.json();
  if (!datos || typeof datos.content !== 'string') {
    throw new Error('respuesta paginada no reconocida');
  }
  return datos.content;
}

async function descargarCategoria(categoria) {
  const productos = [];
  const paginasVistas = new Set();

  for (let pagina = 0; pagina < MAX_PAGINAS_CATEGORIA; pagina += 1) {
    const contenido = await descargarPaginaCategoria(categoria, pagina);
    if (!contenido.trim()) return productos;

    const paginaProductos = extraerProductosEroski(contenido, 100);
    if (paginaProductos.length === 0) {
      throw new Error(`no se pudieron interpretar los productos de la página ${pagina + 1}`);
    }
    const firma = paginaProductos.map(({ id }) => id).join('|');
    if (paginasVistas.has(firma)) {
      throw new Error(`la página ${pagina + 1} repite resultados`);
    }
    paginasVistas.add(firma);
    productos.push(...paginaProductos);
  }

  throw new Error(`supera el límite de ${MAX_PAGINAS_CATEGORIA} páginas`);
}

async function ejecutar() {
  console.log('PFI · Actualización del catálogo oficial Eroski');
  const sitemap = await (await descargar(SITEMAP_URL, 'application/xml,text/xml')).text();
  const categorias = extraerCategoriasCatalogoEroski(sitemap);
  if (categorias.length < 90) {
    throw new Error(`Sitemap incompleto: solo ${categorias.length} categorías principales.`);
  }

  console.log(`${categorias.length} categorías · ${CONCURRENCIA} descargas simultáneas`);
  const resultados = new Array(categorias.length);
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < categorias.length) {
      const indice = siguiente;
      siguiente += 1;
      const categoria = categorias[indice];
      try {
        const productos = await descargarCategoria(categoria);
        resultados[indice] = { productos };
        console.log(
          `[${indice + 1}/${categorias.length}] ${nombreCategoria(categoria)}: ${productos.length}`,
        );
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        resultados[indice] = { error: mensaje };
        console.error(`[${indice + 1}/${categorias.length}] ${nombreCategoria(categoria)}: ${mensaje}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCIA }, trabajador));
  const errores = resultados.flatMap((resultado, indice) =>
    resultado?.error ? [`${nombreCategoria(categorias[indice])}: ${resultado.error}`] : []);
  if (errores.length > 0) {
    throw new Error(`No se reemplaza el catálogo: fallaron ${errores.length} categorías.`);
  }

  const porId = new Map();
  resultados.forEach(({ productos }) => {
    productos.forEach((producto) => porId.set(producto.id, producto));
  });
  const productos = [...porId.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'));
  if (productos.length < MIN_PRODUCTOS) {
    throw new Error(`No se reemplaza el catálogo: solo ${productos.length} productos válidos.`);
  }

  const catalogo = {
    version: 2,
    actualizado: new Date().toISOString(),
    fechaPrecios: productos[0]?.actualizadaEn,
    fuente: SITEMAP_URL,
    totalCategorias: categorias.length,
    totalProductos: productos.length,
    campos: ['id', 'nombre', 'marca', 'precio', 'cantidad', 'unidad'],
    productos: productos.map((producto) => [
      producto.id,
      producto.nombre,
      producto.marca,
      producto.precio,
      producto.cantidad,
      producto.unidad,
    ]),
  };
  await mkdir(path.dirname(RUTA_SALIDA), { recursive: true });
  await writeFile(RUTA_TEMPORAL, JSON.stringify(catalogo), 'utf8');
  await rename(RUTA_TEMPORAL, RUTA_SALIDA);
  console.log(`✓ ${productos.length} productos guardados en public/catalogo-eroski.json`);
}

ejecutar()
  .catch(async (error) => {
    await rm(RUTA_TEMPORAL, { force: true });
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
