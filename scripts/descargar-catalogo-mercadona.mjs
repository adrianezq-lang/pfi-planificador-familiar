import fs from 'node:fs';
import path from 'node:path';
import {
  API_BASE,
  cargarConfiguracionMercadona,
  crearDescargadorMercadona,
  crearSesionMercadona,
} from './mercadona-sesion.mjs';

const RUTA_SALIDA = path.resolve(
  'public/catalogo-mercadona.json',
);

const PAUSA_MS = 120;
const MAX_REINTENTOS = 3;

function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function convertirNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}

function obtenerCategorias(datos) {
  if (Array.isArray(datos)) {
    return datos;
  }

  if (Array.isArray(datos?.results)) {
    return datos.results;
  }

  if (Array.isArray(datos?.categories)) {
    return datos.categories;
  }

  return [];
}

function extraerProductos(
  nodo,
  seccionPrincipal,
  subcategoria,
) {
  const productos = [];

  if (!nodo || typeof nodo !== 'object') {
    return productos;
  }

  if (Array.isArray(nodo.products)) {
    nodo.products.forEach((producto) => {
      productos.push({
        ...producto,
        __seccion: seccionPrincipal,
        __subcategoria: subcategoria,
      });
    });
  }

  const categoriasHijas = [
    ...(Array.isArray(nodo.categories)
      ? nodo.categories
      : []),

    ...(Array.isArray(nodo.subcategories)
      ? nodo.subcategories
      : []),
  ];

  categoriasHijas.forEach((categoria) => {
    productos.push(
      ...extraerProductos(
        categoria,
        seccionPrincipal,
        categoria.name ??
          categoria.display_name ??
          subcategoria,
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
  const instrucciones =
    producto.price_instructions ?? {};

  return {
    productoId: String(producto.id),

    nombre:
      producto.display_name ??
      producto.name ??
      'Producto sin nombre',

    precio: convertirNumero(
      instrucciones.unit_price,
    ),

    precioReferencia: convertirNumero(
      instrucciones.reference_price,
    ),

    formato:
      producto.packaging ??
      instrucciones.unit_name ??
      'Envase',

    unidadesTotales: convertirNumero(
      instrucciones.total_units,
    ),

    tamañoUnidad: convertirNumero(
      instrucciones.unit_size,
    ),

    formatoUnidad:
      instrucciones.size_format ??
      instrucciones.reference_format ??
      null,

    pesoAproximado: Boolean(
      instrucciones.approx_size ||
        instrucciones.unit_selector,
    ),

    sección:
      producto.__seccion ??
      'Sin clasificar',

    subcategoria:
      producto.__subcategoria ??
      'Sin clasificar',

    imagen: obtenerImagen(producto),

    url:
      producto.share_url ??
      `https://tienda.mercadona.es/product/${producto.id}`,

    disponible:
      producto.published !== false,
  };
}

async function ejecutar() {
  console.log(
    '=====================================',
  );

  console.log(
    'PFI - Catálogo completo Mercadona',
  );

  console.log(
    '=====================================',
  );

  const { codigoPostal } = cargarConfiguracionMercadona();
  const sesion = await crearSesionMercadona(codigoPostal);
  const descargarJson = crearDescargadorMercadona(sesion, MAX_REINTENTOS);

  console.log(`Zona: ${sesion.codigoPostal} · almacén ${sesion.almacen}`);

  const datosRaiz = await descargarJson(
    `${API_BASE}/categories/`,
  );

  const categoriasPrincipales =
    obtenerCategorias(datosRaiz);

  if (categoriasPrincipales.length === 0) {
    throw new Error(
      'No se han recibido categorías.',
    );
  }

  const subcategorias =
    categoriasPrincipales.flatMap(
      (categoriaPrincipal) => {
        const hijas = Array.isArray(
          categoriaPrincipal.categories,
        )
          ? categoriaPrincipal.categories
          : [];

        return hijas.map(
          (subcategoria) => ({
            ...subcategoria,

            seccionPrincipal:
              categoriaPrincipal.name ??
              categoriaPrincipal.display_name ??
              'Sin clasificar',
          }),
        );
      },
    );

  console.log(
    `Subcategorías: ${subcategorias.length}`,
  );

  const mapaProductos = new Map();

  for (
    let indice = 0;
    indice < subcategorias.length;
    indice += 1
  ) {
    const subcategoria =
      subcategorias[indice];

    if (!subcategoria.id) {
      continue;
    }

    const nombreSubcategoria =
      subcategoria.name ??
      subcategoria.display_name ??
      String(subcategoria.id);

    console.log(
      `[${indice + 1}/${subcategorias.length}] ${nombreSubcategoria}`,
    );

    try {
      const detalle =
        await descargarJson(
          `${API_BASE}/categories/${subcategoria.id}/`,
        );

      const productos =
        extraerProductos(
          detalle,
          subcategoria.seccionPrincipal,
          nombreSubcategoria,
        );

      productos.forEach((producto) => {
        if (!producto.id) {
          return;
        }

        mapaProductos.set(
          String(producto.id),
          producto,
        );
      });
    } catch (error) {
      console.warn(
        `No se pudo descargar ${nombreSubcategoria}: ${error.message}`,
      );
    }

    await esperar(PAUSA_MS);
  }

  const catalogo = [
    ...mapaProductos.values(),
  ]
    .map(transformarProducto)
    .sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        'es',
      ),
    );

  fs.mkdirSync(
    path.dirname(RUTA_SALIDA),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    RUTA_SALIDA,
    JSON.stringify(
      {
        actualizado:
          new Date().toISOString(),

        codigoPostal: sesion.codigoPostal,

        almacen: sesion.almacen,

        totalProductos:
          catalogo.length,

        productos: catalogo,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('');
  console.log(
    `✅ Productos guardados: ${catalogo.length}`,
  );

  console.log(
    '✅ Generado public/catalogo-mercadona.json',
  );
}

ejecutar().catch((error) => {
  console.error('');
  console.error(`❌ ${error.message}`);
  process.exit(1);
});