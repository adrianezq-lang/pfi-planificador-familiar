import {
  API_BASE,
  crearDescargadorMercadona,
  crearSesionMercadona,
} from '../../../scripts/mercadona-sesion.mjs';

export const maxDuration = 60;

const CODIGO_POSTAL_DEFECTO = '48950';
const CONCURRENCIA = 4;
const MAX_REINTENTOS = 3;

function convertirNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function obtenerCategorias(datos) {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.results)) return datos.results;
  if (Array.isArray(datos?.categories)) return datos.categories;
  return [];
}

function extraerProductos(nodo, seccionPrincipal, subcategoria) {
  const productos = [];
  if (!nodo || typeof nodo !== 'object') return productos;

  if (Array.isArray(nodo.products)) {
    nodo.products.forEach((producto) => {
      productos.push({
        ...producto,
        __seccion: seccionPrincipal,
        __subcategoria: subcategoria,
      });
    });
  }

  const hijas = [
    ...(Array.isArray(nodo.categories) ? nodo.categories : []),
    ...(Array.isArray(nodo.subcategories) ? nodo.subcategories : []),
  ];

  hijas.forEach((categoria) => {
    productos.push(
      ...extraerProductos(
        categoria,
        seccionPrincipal,
        categoria.name ?? categoria.display_name ?? subcategoria,
      ),
    );
  });

  return productos;
}

function obtenerImagen(producto) {
  return (
    producto.thumbnail ??
    producto.image_url ??
    producto.photos?.[0]?.regular ??
    producto.photos?.[0]?.thumbnail ??
    null
  );
}

function transformarProducto(producto) {
  const instrucciones = producto.price_instructions ?? {};

  return {
    productoId: String(producto.id),
    nombre: producto.display_name ?? producto.name ?? 'Producto sin nombre',
    precio: convertirNumero(instrucciones.unit_price),
    precioReferencia: convertirNumero(instrucciones.reference_price),
    formato: producto.packaging ?? instrucciones.unit_name ?? 'Envase',
    unidadesTotales: convertirNumero(instrucciones.total_units),
    tamañoUnidad: convertirNumero(instrucciones.unit_size),
    formatoUnidad:
      instrucciones.size_format ?? instrucciones.reference_format ?? null,
    pesoAproximado: Boolean(
      instrucciones.approx_size || instrucciones.unit_selector,
    ),
    sección: producto.__seccion ?? 'Sin clasificar',
    subcategoria: producto.__subcategoria ?? 'Sin clasificar',
    imagen: obtenerImagen(producto),
    url:
      producto.share_url ??
      `https://tienda.mercadona.es/product/${producto.id}`,
    disponible: producto.published !== false,
  };
}

async function mapearConLimite(elementos, limite, tarea) {
  const resultados = new Array(elementos.length);
  let siguiente = 0;

  async function trabajador() {
    while (true) {
      const indice = siguiente;
      siguiente += 1;
      if (indice >= elementos.length) return;
      resultados[indice] = await tarea(elementos[indice], indice);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limite, elementos.length) }, () => trabajador()),
  );
  return resultados;
}

function codigoPostalDesdePeticion(peticion) {
  const valor =
    peticion?.query?.cp ??
    peticion?.query?.codigoPostal ??
    CODIGO_POSTAL_DEFECTO;
  const cp = String(Array.isArray(valor) ? valor[0] : valor).trim();
  return /^\d{5}$/.test(cp) ? cp : CODIGO_POSTAL_DEFECTO;
}

async function descargarCatalogo(codigoPostal) {
  const sesion = await crearSesionMercadona(codigoPostal);
  const descargarJson = crearDescargadorMercadona(sesion, MAX_REINTENTOS);
  const raiz = await descargarJson(`${API_BASE}/categories/`);
  const principales = obtenerCategorias(raiz);

  if (principales.length === 0) {
    throw new Error('Mercadona no ha devuelto categorías para esta zona.');
  }

  const subcategorias = principales.flatMap((principal) => {
    const hijas = Array.isArray(principal.categories) ? principal.categories : [];
    return hijas
      .filter((subcategoria) => subcategoria?.id)
      .map((subcategoria) => ({
        ...subcategoria,
        seccionPrincipal:
          principal.name ?? principal.display_name ?? 'Sin clasificar',
      }));
  });

  const lotes = await mapearConLimite(
    subcategorias,
    CONCURRENCIA,
    async (subcategoria) => {
      const nombre =
        subcategoria.name ??
        subcategoria.display_name ??
        String(subcategoria.id);

      try {
        const detalle = await descargarJson(
          `${API_BASE}/categories/${subcategoria.id}/`,
        );
        return extraerProductos(detalle, subcategoria.seccionPrincipal, nombre);
      } catch (error) {
        console.warn(
          `No se pudo descargar la subcategoría ${nombre}:`,
          error instanceof Error ? error.message : String(error),
        );
        return [];
      }
    },
  );

  const mapa = new Map();
  lotes.flat().forEach((producto) => {
    if (producto?.id) mapa.set(String(producto.id), producto);
  });

  const productos = [...mapa.values()]
    .map(transformarProducto)
    .filter((producto) => producto.disponible)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (productos.length < 1000) {
    throw new Error(
      `La actualización recibida parece incompleta (${productos.length} productos). Se conserva el catálogo anterior.`,
    );
  }

  return {
    actualizado: new Date().toISOString(),
    codigoPostal: sesion.codigoPostal,
    almacen: sesion.almacen,
    totalProductos: productos.length,
    productos,
  };
}

export default async function handler(peticion, respuesta) {
  respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!['GET', 'POST'].includes(peticion.method ?? 'GET')) {
    respuesta.statusCode = 405;
    respuesta.setHeader('Allow', 'GET, POST');
    respuesta.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }));
    return;
  }

  if (peticion.method === 'GET') {
    respuesta.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=3600',
    );
  } else {
    respuesta.setHeader('Cache-Control', 'no-store');
  }

  try {
    const catalogo = await descargarCatalogo(codigoPostalDesdePeticion(peticion));
    respuesta.statusCode = 200;
    respuesta.end(JSON.stringify({ ok: true, ...catalogo }));
  } catch (error) {
    console.error('PFI Mercadona:', error);
    respuesta.statusCode = 502;
    respuesta.end(
      JSON.stringify({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se ha podido actualizar Mercadona.',
      }),
    );
  }
}
