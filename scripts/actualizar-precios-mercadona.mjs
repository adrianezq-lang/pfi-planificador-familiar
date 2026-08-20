import fs from 'node:fs';
import path from 'node:path';
import {
  API_BASE,
  cargarConfiguracionMercadona,
  crearDescargadorMercadona,
  crearSesionMercadona,
} from './mercadona-sesion.mjs';
import { esProductoSeguro } from './matching-mercadona.mjs';

const RUTA_OBJETIVOS = path.resolve(
  'scripts/productos-objetivo.json',
);

const RUTA_SALIDA = path.resolve(
  'public/precios-mercadona.json',
);

const RUTA_INFORME = path.resolve(
  'scripts/informe-precios-mercadona.json',
);

const PAUSA_MS = 150;

function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizar(texto = '') {
  return String(texto)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function obtenerPalabras(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((palabra) => palabra.length > 1);
}

function leerObjetivos() {
  if (!fs.existsSync(RUTA_OBJETIVOS)) {
    throw new Error(
      'No existe scripts/productos-objetivo.json',
    );
  }

  const contenido = JSON.parse(
    fs.readFileSync(RUTA_OBJETIVOS, 'utf8'),
  );

  if (!Array.isArray(contenido)) {
    throw new Error(
      'productos-objetivo.json debe contener una lista.',
    );
  }

  return contenido.map((entrada) => {
    if (typeof entrada === 'string') {
      return {
        ingrediente: entrada,
        buscar: entrada,
        productoId: null,
      };
    }

    if (
      entrada &&
      typeof entrada === 'object' &&
      typeof entrada.ingrediente === 'string'
    ) {
      return {
        ingrediente: entrada.ingrediente,
        buscar:
          typeof entrada.buscar === 'string'
            ? entrada.buscar
            : entrada.ingrediente,
        productoId: entrada.productoId
          ? String(entrada.productoId)
          : null,
      };
    }

    throw new Error(
      'Cada producto debe ser un texto o un objeto válido.',
    );
  });
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
  seccionPadre = 'Sin clasificar',
) {
  const encontrados = [];

  if (!nodo || typeof nodo !== 'object') {
    return encontrados;
  }

  const seccion =
    nodo.name ??
    nodo.display_name ??
    seccionPadre;

  if (Array.isArray(nodo.products)) {
    nodo.products.forEach((producto) => {
      encontrados.push({
        ...producto,
        __seccion: seccion,
      });
    });
  }

  const subcategorias = [
    ...(Array.isArray(nodo.categories)
      ? nodo.categories
      : []),
    ...(Array.isArray(nodo.subcategories)
      ? nodo.subcategories
      : []),
  ];

  subcategorias.forEach((subcategoria) => {
    encontrados.push(
      ...extraerProductos(
        subcategoria,
        seccion,
      ),
    );
  });

  return encontrados;
}

function puntuarProducto(busqueda, producto) {
  const nombre = normalizar(
    producto.display_name ??
      producto.name ??
      '',
  );

  const consulta = normalizar(busqueda);

  if (!nombre || !consulta) {
    return 0;
  }

  if (nombre === consulta) {
    return 10_000;
  }

  let puntos = 0;

  if (nombre.startsWith(consulta)) {
    puntos += 2_000;
  }

  if (nombre.includes(consulta)) {
    puntos += 1_200;
  }

  const palabrasConsulta =
    obtenerPalabras(consulta);

  const palabrasNombre =
    new Set(obtenerPalabras(nombre));

  palabrasConsulta.forEach((palabra) => {
    if (palabrasNombre.has(palabra)) {
      puntos += 250;
    } else if (nombre.includes(palabra)) {
      puntos += 100;
    } else {
      puntos -= 150;
    }
  });

  return puntos;
}

function buscarMejorProducto(
  objetivo,
  productos,
) {
  if (objetivo.productoId) {
    const encontrado = productos.find(
      (producto) =>
        String(producto.id) ===
        objetivo.productoId,
    );

    return {
      producto: encontrado ?? null,
      puntuacion: encontrado ? 10_000 : 0,
    };
  }

  let mejorProducto = null;
  let mejorPuntuacion = 0;

  productos.forEach((producto) => {
    if (!esProductoSeguro(objetivo, producto)) {
      return;
    }

    const puntuacion = puntuarProducto(
      objetivo.buscar,
      producto,
    );

    if (puntuacion > mejorPuntuacion) {
      mejorProducto = producto;
      mejorPuntuacion = puntuacion;
    }
  });

  return {
    producto: mejorProducto,
    puntuacion: mejorPuntuacion,
  };
}

function convertirNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}

function obtenerCantidadEnvase(producto) {
  const instrucciones =
    producto.price_instructions ?? {};

  const totalUnidades = convertirNumero(
    instrucciones.total_units,
  );

  if (
    totalUnidades !== null &&
    totalUnidades > 0
  ) {
    return totalUnidades;
  }

  const tamaño = convertirNumero(
    instrucciones.unit_size,
  );

  if (tamaño !== null && tamaño > 0) {
    const formato = normalizar(
      instrucciones.size_format ??
        instrucciones.reference_format ??
        '',
    );

    if (formato === 'kg') {
      return tamaño * 1000;
    }

    return tamaño;
  }

  return 1;
}

function obtenerUnidadBase(producto) {
  const instrucciones =
    producto.price_instructions ?? {};

  const formato = normalizar(
    instrucciones.size_format ??
      instrucciones.reference_format ??
      '',
  );

  const nombreUnidad = normalizar(
    instrucciones.unit_name ?? '',
  );

  if (formato === 'kg') {
    return 'g';
  }

  if (formato === 'l') {
    return 'l';
  }

  if (nombreUnidad.includes('lata')) {
    return 'lata';
  }

  if (nombreUnidad.includes('unidad')) {
    return 'ud';
  }

  if (
    convertirNumero(
      instrucciones.total_units,
    )
  ) {
    return 'ud';
  }

  const envase = normalizar(
    producto.packaging ?? '',
  );

  if (envase.includes('bandeja')) {
    return 'bandeja';
  }

  if (envase.includes('bolsa')) {
    return 'bolsa';
  }

  if (envase.includes('bote')) {
    return 'bote';
  }

  if (envase.includes('tarro')) {
    return 'tarro';
  }

  if (envase.includes('brick')) {
    return 'brick';
  }

  if (envase.includes('paquete')) {
    return 'paquete';
  }

  return 'envase';
}

function obtenerFormato(producto) {
  const instrucciones =
    producto.price_instructions ?? {};

  const partes = [];

  if (producto.packaging) {
    partes.push(producto.packaging);
  }

  const totalUnidades = convertirNumero(
    instrucciones.total_units,
  );

  if (
    totalUnidades !== null &&
    totalUnidades > 1
  ) {
    partes.push(
      `${totalUnidades} unidades`,
    );
  }

  const tamaño = convertirNumero(
    instrucciones.unit_size,
  );

  const formato =
    instrucciones.size_format ??
    instrucciones.reference_format;

  if (
    tamaño !== null &&
    tamaño > 0 &&
    formato
  ) {
    if (formato === 'kg' && tamaño < 1) {
      partes.push(
        `${Math.round(tamaño * 1000)} g`,
      );
    } else {
      partes.push(`${tamaño} ${formato}`);
    }
  }

  return partes.length > 0
    ? [...new Set(partes)].join(' · ')
    : 'Envase';
}

function transformarProducto(
  ingrediente,
  producto,
  detalle,
  fecha,
) {
  const datos = detalle ?? producto;

  const instrucciones =
    datos.price_instructions ?? {};

  const precio = convertirNumero(
    instrucciones.unit_price,
  );

  return {
    ingrediente,
    nombreComercial:
      datos.display_name ??
      datos.name ??
      ingrediente,

    productoId: String(
      datos.id ?? producto.id,
    ),

    formato: obtenerFormato(datos),

    unidadesPorEnvase:
      obtenerCantidadEnvase(datos),

    unidadBase: obtenerUnidadBase(datos),

    precio,

    seccion:
      producto.__seccion ??
      datos.category_name ??
      'Sin clasificar',

    url:
      datos.share_url ??
      `https://tienda.mercadona.es/product/${
        datos.id ?? producto.id
      }`,

    imagen:
      datos.thumbnail ??
      datos.image_url ??
      datos.photos?.[0]?.regular ??
      null,

    esPesoVariable: Boolean(
      instrucciones.approx_size ||
        instrucciones.unit_selector,
    ),

    actualizado: fecha,
  };
}

async function descargarCatalogo(descargarJson) {
  console.log('Descargando categorías...');

  const datosCategorias = await descargarJson(
    `${API_BASE}/categories/`,
  );

  const categoriasPrincipales =
    obtenerCategorias(datosCategorias);

  if (categoriasPrincipales.length === 0) {
    throw new Error(
      'No se han recibido categorías.',
    );
  }

  const subcategorias = categoriasPrincipales.flatMap(
    (categoriaPrincipal) => {
      const hijas = Array.isArray(
        categoriaPrincipal.categories,
      )
        ? categoriaPrincipal.categories
        : [];

      return hijas.map((subcategoria) => ({
        ...subcategoria,
        nombreCategoriaPrincipal:
          categoriaPrincipal.name ??
          'Sin clasificar',
      }));
    },
  );

  if (subcategorias.length === 0) {
    throw new Error(
      'No se han recibido subcategorías.',
    );
  }

  console.log(
    `Subcategorías encontradas: ${subcategorias.length}`,
  );

  const mapaProductos = new Map();

  for (
    let indice = 0;
    indice < subcategorias.length;
    indice += 1
  ) {
    const subcategoria = subcategorias[indice];

    if (!subcategoria.id) {
      continue;
    }

    const nombre =
      subcategoria.name ??
      String(subcategoria.id);

    console.log(
      `Subcategoría ${indice + 1} de ${
        subcategorias.length
      }: ${nombre}`,
    );

    try {
      const detalle = await descargarJson(
        `${API_BASE}/categories/${subcategoria.id}/`,
      );

      const productos = extraerProductos(
        detalle,
        subcategoria.nombreCategoriaPrincipal,
      );

      productos.forEach((producto) => {
        if (producto.id) {
          mapaProductos.set(
            String(producto.id),
            {
              ...producto,
              __seccion:
                subcategoria.nombreCategoriaPrincipal,
              __subcategoria: nombre,
            },
          );
        }
      });
    } catch (error) {
      console.warn(
        `  Aviso: no se pudo descargar ${nombre}: ${error.message}`,
      );
    }

    await esperar(PAUSA_MS);
  }

  const productos = [
    ...mapaProductos.values(),
  ];

  if (productos.length === 0) {
    throw new Error(
      'No se ha podido descargar ningún producto.',
    );
  }

  console.log(
    `Productos descargados: ${productos.length}`,
  );

  return productos;
}

async function ejecutar() {
  console.log(
    '=====================================',
  );
  console.log(
    'PFI - Actualizador de Mercadona',
  );
  console.log(
    '=====================================',
  );

  const { codigoPostal } = cargarConfiguracionMercadona();
  const sesion = await crearSesionMercadona(codigoPostal);
  const descargarJson = crearDescargadorMercadona(sesion);

  console.log(`Zona: ${sesion.codigoPostal} · almacén ${sesion.almacen}`);

  const objetivos = leerObjetivos();

  console.log(
    `Productos objetivo: ${objetivos.length}`,
  );

  const productosMercadona =
    await descargarCatalogo(descargarJson);

  console.log(
    `Productos descargados: ${productosMercadona.length}`,
  );

  const fecha = new Date()
    .toISOString()
    .slice(0, 10);

  const catalogoActualizado = {};
  const coincidencias = [];
  const pendientes = [];

  for (
    let indice = 0;
    indice < objetivos.length;
    indice += 1
  ) {
    const objetivo = objetivos[indice];

    console.log(
      `[${indice + 1}/${objetivos.length}] ${
        objetivo.ingrediente
      }`,
    );

    const resultado = buscarMejorProducto(
      objetivo,
      productosMercadona,
    );

    if (
      !resultado.producto ||
      resultado.puntuacion < 180
    ) {
      console.log('  No encontrado');

      pendientes.push({
        ingrediente:
          objetivo.ingrediente,
        buscar: objetivo.buscar,
        puntuacion:
          resultado.puntuacion,
      });

      continue;
    }

    let detalle = null;

    try {
      detalle = await descargarJson(
        `${API_BASE}/products/${resultado.producto.id}/`,
      );

      await esperar(PAUSA_MS);
    } catch {
      console.log(
        '  No se pudo descargar la ficha completa',
      );
    }

    const productoTransformado =
      transformarProducto(
        objetivo.ingrediente,
        resultado.producto,
        detalle,
        fecha,
      );

    catalogoActualizado[
      objetivo.ingrediente
    ] = productoTransformado;

    coincidencias.push({
      ingrediente:
        objetivo.ingrediente,

      productoId:
        productoTransformado.productoId,

      nombreComercial:
        productoTransformado.nombreComercial,

      precio:
        productoTransformado.precio,

      puntuacion:
        resultado.puntuacion,
    });

    console.log(
      `  ${productoTransformado.nombreComercial}`,
    );

    console.log(
      productoTransformado.precio === null
        ? '  Precio no disponible'
        : `  ${productoTransformado.precio.toFixed(
            2,
          )} €`,
    );
  }

  fs.mkdirSync(
    path.dirname(RUTA_SALIDA),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    RUTA_SALIDA,
    JSON.stringify(
      catalogoActualizado,
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    RUTA_INFORME,
    JSON.stringify(
      {
        actualizado:
          new Date().toISOString(),

        codigoPostal: sesion.codigoPostal,

        almacen: sesion.almacen,

        totalObjetivos:
          objetivos.length,

        actualizados:
          coincidencias.length,

        pendientes:
          pendientes.length,

        coincidencias,
        noEncontrados: pendientes,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('');
  console.log(
    '=====================================',
  );
  console.log(
    `Actualizados: ${coincidencias.length}`,
  );
  console.log(
    `Pendientes: ${pendientes.length}`,
  );
  console.log(
    'Generado public/precios-mercadona.json',
  );
  console.log(
    'Generado scripts/informe-precios-mercadona.json',
  );
  console.log(
    '=====================================',
  );
}

ejecutar().catch((error) => {
  console.error('');
  console.error(
    `ERROR: ${error.message}`,
  );

  process.exit(1);
});