import type {
  ModoVentaComparador,
  OfertaComparador,
  UnidadOfertaComparador,
} from './comparadorPrecios';

export type TiendaCatalogo = 'eroski' | 'carrefour';

export type ProductoCatalogoSupermercado = {
  tiendaId: TiendaCatalogo;
  id: string;
  nombre: string;
  marca: string;
  precio: number;
  cantidad: number;
  unidad: UnidadOfertaComparador;
  modoVenta: ModoVentaComparador;
  precioReferencia: number | null;
  unidadReferencia: 'kg' | 'l' | 'ud' | null;
  imagen: string | null;
  url: string;
  actualizadaEn: string;
};

export type ResultadoBusquedaCatalogo = {
  productos: ProductoCatalogoSupermercado[];
  aviso: string | null;
};

export type ResultadoRefrescoCatalogos = {
  actualizaciones: Array<{
    oferta: OfertaComparador;
    producto: ProductoCatalogoSupermercado;
  }>;
  errores: string[];
};

const TIENDAS = new Set<TiendaCatalogo>(['eroski', 'carrefour']);
const UNIDADES = new Set<UnidadOfertaComparador>(['g', 'kg', 'ml', 'l', 'ud']);

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function textoSeguro(valor: unknown, maximo: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function urlSegura(valor: unknown): string | null {
  const texto = textoSeguro(valor, 800);
  if (!texto) return null;
  try {
    const url = new URL(texto);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function esTiendaConCatalogo(
  tiendaId: string,
): tiendaId is TiendaCatalogo {
  return TIENDAS.has(tiendaId as TiendaCatalogo);
}

export function normalizarProductoCatalogo(
  valor: unknown,
): ProductoCatalogoSupermercado | null {
  if (!esObjeto(valor) || !esTiendaConCatalogo(String(valor.tiendaId ?? ''))) {
    return null;
  }
  const id = textoSeguro(valor.id, 120);
  const nombre = textoSeguro(valor.nombre, 240);
  const marca = textoSeguro(valor.marca, 120);
  const precio = Number(valor.precio);
  const cantidad = Number(valor.cantidad);
  const unidad = UNIDADES.has(valor.unidad as UnidadOfertaComparador)
    ? valor.unidad as UnidadOfertaComparador
    : null;
  const modoVenta = valor.modoVenta === 'peso' ? 'peso' : 'envase';
  const precioReferenciaNumero = Number(valor.precioReferencia);
  const unidadReferencia = ['kg', 'l', 'ud'].includes(String(valor.unidadReferencia))
    ? valor.unidadReferencia as 'kg' | 'l' | 'ud'
    : null;
  const url = urlSegura(valor.url);
  const imagen = urlSegura(valor.imagen);
  const actualizadaEn = textoSeguro(valor.actualizadaEn, 10);

  if (
    !id || !nombre || !url || !unidad ||
    !Number.isFinite(precio) || precio <= 0 ||
    !Number.isFinite(cantidad) || cantidad <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(actualizadaEn)
  ) {
    return null;
  }

  return {
    tiendaId: valor.tiendaId as TiendaCatalogo,
    id,
    nombre,
    marca,
    precio: Math.round(precio * 100) / 100,
    cantidad: Math.round(cantidad * 1000) / 1000,
    unidad,
    modoVenta,
    precioReferencia: Number.isFinite(precioReferenciaNumero) && precioReferenciaNumero > 0
      ? Math.round(precioReferenciaNumero * 1000) / 1000
      : null,
    unidadReferencia,
    imagen,
    url,
    actualizadaEn,
  };
}

async function leerRespuesta(respuesta: Response): Promise<Record<string, unknown>> {
  let datos: unknown;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error('El catálogo ha devuelto una respuesta que PFI no reconoce.');
  }
  if (!esObjeto(datos)) {
    throw new Error('El catálogo ha devuelto datos incompletos.');
  }
  if (!respuesta.ok || datos.ok !== true) {
    throw new Error(
      textoSeguro(datos.error, 300) || 'No se ha podido consultar el catálogo.',
    );
  }
  return datos;
}

export async function buscarProductosCatalogo(
  tiendaId: TiendaCatalogo,
  consulta: string,
  codigoPostal: string,
  signal?: AbortSignal,
): Promise<ResultadoBusquedaCatalogo> {
  const termino = consulta.trim();
  if (termino.length < 2) throw new Error('Escribe al menos 2 caracteres para buscar.');

  const parametros = new URLSearchParams({
    tienda: tiendaId,
    q: termino.slice(0, 80),
    cp: /^\d{5}$/.test(codigoPostal) ? codigoPostal : '48950',
  });
  const respuesta = await fetch(`/api/pfi/comparador/catalogo?${parametros}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  const datos = await leerRespuesta(respuesta);
  const productos = Array.isArray(datos.productos)
    ? datos.productos
        .map(normalizarProductoCatalogo)
        .filter((producto): producto is ProductoCatalogoSupermercado => Boolean(producto))
    : [];
  if (productos.length === 0) {
    throw new Error('No se han encontrado productos válidos en ese catálogo.');
  }
  return {
    productos,
    aviso: textoSeguro(datos.aviso, 300) || null,
  };
}

export async function refrescarOfertasCatalogo(
  ofertas: OfertaComparador[],
): Promise<ResultadoRefrescoCatalogos> {
  const vinculadas = ofertas.filter(
    (oferta) =>
      oferta.origen === 'catalogo' &&
      esTiendaConCatalogo(oferta.tiendaId) &&
      Boolean(oferta.referenciaExterna),
  );
  if (vinculadas.length === 0) return { actualizaciones: [], errores: [] };
  const actualizaciones: ResultadoRefrescoCatalogos['actualizaciones'] = [];
  const errores: string[] = [];

  for (let inicio = 0; inicio < vinculadas.length; inicio += 30) {
    const lote = vinculadas.slice(inicio, inicio + 30);
    try {
      const respuesta = await fetch('/api/pfi/comparador/catalogo', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: lote.map((oferta) => ({
            tiendaId: oferta.tiendaId,
            referenciaExterna: oferta.referenciaExterna,
            nombreProducto: oferta.nombreProducto,
          })),
        }),
      });
      const datos = await leerRespuesta(respuesta);
      const resultados = Array.isArray(datos.resultados) ? datos.resultados : [];

      lote.forEach((oferta, indice) => {
        const valor = resultados[indice];
        if (!esObjeto(valor)) {
          errores.push(`${oferta.nombreProducto}: respuesta de catálogo incompleta.`);
          return;
        }
        const tiendaId = textoSeguro(valor.tiendaId, 80);
        const referencia = textoSeguro(valor.referenciaExterna, 120);
        const producto = normalizarProductoCatalogo(valor.producto);
        if (
          valor.ok === true &&
          tiendaId === oferta.tiendaId &&
          referencia === oferta.referenciaExterna &&
          producto?.tiendaId === oferta.tiendaId
        ) {
          actualizaciones.push({ oferta, producto });
          return;
        }
        errores.push(
          textoSeguro(valor.error, 260) ||
          `${oferta.nombreProducto}: no se ha podido validar la actualización.`,
        );
      });
    } catch (errorDesconocido) {
      errores.push(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido consultar el catálogo.',
      );
    }
  }

  return { actualizaciones, errores };
}

export function formatoProductoCatalogo(
  producto: ProductoCatalogoSupermercado,
): string {
  if (producto.modoVenta === 'peso') return `${producto.precio.toFixed(2)} €/kg`;
  const contenido = `${producto.cantidad.toLocaleString('es-ES')} ${producto.unidad}`;
  if (producto.precioReferencia && producto.unidadReferencia) {
    return `${contenido} · ${producto.precioReferencia.toLocaleString('es-ES', {
      maximumFractionDigits: 3,
    })} €/${producto.unidadReferencia}`;
  }
  return contenido;
}
