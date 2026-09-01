export type ProductoMercadonaCatalogo = {
  productoId: string;
  nombre: string;
  precio: number | null;
  precioReferencia: string | null;
  formato: string;
  unidadesTotales?: number | null;
  tamanoUnidad?: number | null;
  formatoUnidad?: string | null;
  pesoAproximado: boolean;
  seccion: string;
  subcategoria: string;
  imagen: string | null;
  url: string;
  disponible: boolean;
};

type CatalogoMercadonaJson = {
  actualizado?: string;
  codigoPostal?: string;
  almacen?: string;
  totalProductos?: number;
  productos?: Record<string, unknown>[];
};

export type ResultadoCatalogoMercadona = {
  actualizado: string;
  codigoPostal: string;
  almacen: string;
  productos: ProductoMercadonaCatalogo[];
};

export const CLAVE_MIS_PRODUCTOS =
  'pfi-catalogo-mercadona-seleccionados';

let catalogoEnMemoria:
  | ResultadoCatalogoMercadona
  | null = null;
let catalogoEnCarga: Promise<ResultadoCatalogoMercadona> | null = null;
let productosPorIdEnMemoria: Map<string, ProductoMercadonaCatalogo> | null = null;

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function obtenerObjeto(
  valor: unknown,
): Record<string, unknown> {
  if (
    typeof valor === 'object' &&
    valor !== null
  ) {
    return valor as Record<string, unknown>;
  }

  return {};
}

function obtenerNumero(
  valor: unknown,
): number | null {
  if (
    typeof valor === 'number' &&
    Number.isFinite(valor)
  ) {
    return valor;
  }

  if (typeof valor === 'string') {
    const numero = Number(
      valor.replace(',', '.'),
    );

    return Number.isFinite(numero)
      ? numero
      : null;
  }

  return null;
}

function normalizarProducto(
  producto: Record<string, unknown>,
): ProductoMercadonaCatalogo {
  const instruccionesPrecio =
    obtenerObjeto(
      producto.price_instructions,
    );

  const precio =
    obtenerNumero(producto.precio) ??
    obtenerNumero(
      instruccionesPrecio.unit_price,
    );

  const precioReferenciaRaw =
    producto.precioReferencia ??
    instruccionesPrecio.reference_price;

  const precioReferencia =
    typeof precioReferenciaRaw === 'string'
      ? precioReferenciaRaw
      : typeof precioReferenciaRaw === 'number'
        ? String(precioReferenciaRaw)
        : null;

  // Soportamos tanto el catálogo ya normalizado como los nombres originales
  // de la fuente. Esto evita perder la capacidad real de multipacks si cambia
  // la forma en la que se genera el JSON.
  const unidadesTotales =
    obtenerNumero(producto.unidadesTotales) ??
    obtenerNumero(producto.total_units) ??
    obtenerNumero(producto.pack_size) ??
    obtenerNumero(instruccionesPrecio.pack_size);

  const tamanoUnidad =
    obtenerNumero(producto['tamañoUnidad']) ??
    obtenerNumero(producto.tamanoUnidad) ??
    obtenerNumero(producto.unit_size) ??
    obtenerNumero(instruccionesPrecio.unit_size);

  const formatoUnidadRaw =
    producto.formatoUnidad ??
    producto.unit_format ??
    producto.size_format ??
    instruccionesPrecio.size_format;

  const formatoUnidad =
    typeof formatoUnidadRaw === 'string'
      ? formatoUnidadRaw
      : null;

  return {
    productoId: String(
      producto.productoId ??
        producto.id ??
        '',
    ),

    nombre: String(
      producto.nombre ??
        producto.nombreComercial ??
        producto.display_name ??
        producto.name ??
        'Producto sin nombre',
    ),

    precio,

    precioReferencia,

    formato: String(
      producto.formato ??
        producto.packaging ??
        'Envase',
    ),

    unidadesTotales,
    tamanoUnidad,
    formatoUnidad,

    pesoAproximado: Boolean(
      producto.pesoAproximado ??
        producto.esPesoVariable,
    ),

    seccion: String(
      producto.seccion ??
        producto['sección'] ??
        producto.category_name ??
        'Sin clasificar',
    ),

    subcategoria: String(
      producto.subcategoria ??
        producto.subcategory_name ??
        'Sin clasificar',
    ),

    imagen:
      typeof producto.imagen === 'string'
        ? producto.imagen
        : typeof producto.image_url ===
            'string'
          ? producto.image_url
          : typeof producto.thumbnail ===
              'string'
            ? producto.thumbnail
            : null,

    url: String(
      producto.url ??
        producto.share_url ??
        '',
    ),

    disponible:
      producto.disponible !== false,
  };
}

export async function cargarCatalogoMercadona(
  forzarRecarga = false,
): Promise<ResultadoCatalogoMercadona> {
  if (catalogoEnMemoria && !forzarRecarga) {
    return catalogoEnMemoria;
  }

  if (catalogoEnCarga && !forzarRecarga) {
    return catalogoEnCarga;
  }

  const cargar = async (): Promise<ResultadoCatalogoMercadona> => {
    const rutaCatalogo = forzarRecarga
      ? `/catalogo-mercadona.json?t=${Date.now()}`
      : '/catalogo-mercadona.json';
    const respuesta = await fetch(rutaCatalogo, {
      cache: forzarRecarga ? 'reload' : 'force-cache',
    });

    if (!respuesta.ok) {
      throw new Error(
        'No se ha podido cargar el catálogo de Mercadona.',
      );
    }

    const datos =
      (await respuesta.json()) as CatalogoMercadonaJson;

    if (!Array.isArray(datos.productos)) {
      throw new Error(
        'El catálogo de Mercadona no tiene el formato esperado.',
      );
    }

    const productos = datos.productos
      .map(normalizarProducto)
      .filter(
        (producto) =>
          producto.productoId &&
          producto.disponible,
      );

    const resultado: ResultadoCatalogoMercadona = {
      actualizado: datos.actualizado ?? '',
      codigoPostal: datos.codigoPostal ?? '',
      almacen: datos.almacen ?? '',
      productos,
    };

    catalogoEnMemoria = resultado;
    productosPorIdEnMemoria = new Map(
      productos.map((producto) => [producto.productoId, producto]),
    );

    return resultado;
  };

  const promesa = cargar();
  catalogoEnCarga = promesa;

  try {
    return await promesa;
  } finally {
    if (catalogoEnCarga === promesa) catalogoEnCarga = null;
  }
}

export async function obtenerProductoCatalogoPorId(
  productoId: string,
): Promise<ProductoMercadonaCatalogo | undefined> {
  if (!productosPorIdEnMemoria) {
    await cargarCatalogoMercadona();
  }

  return productosPorIdEnMemoria?.get(productoId);
}

export function cargarIdsMisProductos(): string[] {
  try {
    const guardados =
      localStorage.getItem(
        CLAVE_MIS_PRODUCTOS,
      );

    if (!guardados) {
      return [];
    }

    const ids =
      JSON.parse(guardados) as unknown;

    if (!Array.isArray(ids)) {
      return [];
    }

    return Array.from(
      new Set(ids.map(String)),
    );
  } catch {
    return [];
  }
}

export function guardarIdsMisProductos(
  ids: string[],
): void {
  const idsUnicos = Array.from(
    new Set(ids),
  );

  localStorage.setItem(
    CLAVE_MIS_PRODUCTOS,
    JSON.stringify(idsUnicos),
  );
}

export function productoEstaSeleccionado(
  productoId: string,
): boolean {
  return cargarIdsMisProductos().includes(
    productoId,
  );
}

export function alternarProductoSeleccionado(
  productoId: string,
): string[] {
  const ids =
    cargarIdsMisProductos();

  const nuevosIds = ids.includes(
    productoId,
  )
    ? ids.filter(
        (id) => id !== productoId,
      )
    : [...ids, productoId];

  guardarIdsMisProductos(nuevosIds);

  return nuevosIds;
}

export async function cargarMisProductosMercadona(): Promise<
  ProductoMercadonaCatalogo[]
> {
  const { productos } =
    await cargarCatalogoMercadona();

  const idsSeleccionados =
    new Set(cargarIdsMisProductos());

  return productos.filter((producto) =>
    idsSeleccionados.has(
      producto.productoId,
    ),
  );
}

function calcularCoincidencia(
  ingrediente: string,
  producto: ProductoMercadonaCatalogo,
): number {
  const termino =
    normalizarTexto(ingrediente);

  const nombre =
    normalizarTexto(producto.nombre);

  const contenido = normalizarTexto(
    [
      producto.nombre,
      producto.formato,
      producto.seccion,
      producto.subcategoria,
    ].join(' '),
  );

  if (!termino) {
    return 0;
  }

  let puntuacion = 0;

  if (nombre === termino) {
    puntuacion += 1000;
  }

  if (nombre.startsWith(termino)) {
    puntuacion += 600;
  }

  if (nombre.includes(termino)) {
    puntuacion += 400;
  }

  termino
    .split(' ')
    .filter(
      (palabra) =>
        palabra.length >= 2,
    )
    .forEach((palabra) => {
      if (nombre.includes(palabra)) {
        puntuacion += 150;
      } else if (
        contenido.includes(palabra)
      ) {
        puntuacion += 60;
      }
    });

  return puntuacion;
}

export async function buscarProductosParaIngrediente(
  ingrediente: string,
): Promise<ProductoMercadonaCatalogo[]> {
  const productos =
    await cargarMisProductosMercadona();

  return productos
    .map((producto) => ({
      producto,
      puntuacion:
        calcularCoincidencia(
          ingrediente,
          producto,
        ),
    }))
    .filter(
      (resultado) =>
        resultado.puntuacion > 0,
    )
    .sort(
      (a, b) =>
        b.puntuacion -
        a.puntuacion,
    )
    .map(
      (resultado) =>
        resultado.producto,
    );
}

export async function buscarProductoParaIngrediente(
  ingrediente: string,
): Promise<
  ProductoMercadonaCatalogo | undefined
> {
  const productos =
    await buscarProductosParaIngrediente(
      ingrediente,
    );

  return productos[0];
}

export async function obtenerProductoPorId(
  productoId: string,
): Promise<
  ProductoMercadonaCatalogo | undefined
> {
  const { productos } =
    await cargarCatalogoMercadona();

  return productos.find(
    (producto) =>
      producto.productoId ===
      productoId,
  );
}

export async function buscarEnCatalogoMercadona(
  texto: string,
): Promise<ProductoMercadonaCatalogo[]> {
  const { productos } =
    await cargarCatalogoMercadona();

  const termino =
    normalizarTexto(texto);

  if (!termino) {
    return productos;
  }

  return productos
    .map((producto) => ({
      producto,
      puntuacion:
        calcularCoincidencia(
          termino,
          producto,
        ),
    }))
    .filter(
      (resultado) =>
        resultado.puntuacion > 0,
    )
    .sort(
      (a, b) =>
        b.puntuacion -
        a.puntuacion,
    )
    .map(
      (resultado) =>
        resultado.producto,
    );
}

export function limpiarCacheCatalogoMercadona(): void {
  catalogoEnMemoria = null;
}