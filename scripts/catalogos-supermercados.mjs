const EROSKI_BASE = 'https://supermercado.eroski.es';
const CARREFOUR_BASE = 'https://www.carrefour.es';
const CARREFOUR_API = `${CARREFOUR_BASE}/search-api/query/v1/search`;
const TIENDAS_CATALOGO = new Set(['eroski', 'carrefour']);

const ENTIDADES = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', euro: '€',
};

function decodificarEntidades(texto) {
  return String(texto)
    .replace(/&#x([0-9a-f]+);/gi, (_, codigo) =>
      String.fromCodePoint(Number.parseInt(codigo, 16)))
    .replace(/&#(\d+);/g, (_, codigo) =>
      String.fromCodePoint(Number.parseInt(codigo, 10)))
    .replace(/&([a-zA-Z]+);/g, (entidad, nombre) =>
      ENTIDADES[nombre] ?? entidad);
}

function normalizarTexto(texto) {
  return String(texto)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function numeroPrecio(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().replace(/\s/g, '');
  if (!limpio) return null;
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : limpio;
  const numero = Number(normalizado.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numero) ? numero : null;
}

function unidadNormalizada(unidad, cantidad) {
  const valor = normalizarTexto(unidad).replace(/\./g, '');
  if (/^(kg|kilo|kilos|kilogramo|kilogramos)$/.test(valor)) {
    return { cantidad, unidad: 'kg' };
  }
  if (/^(g|gr|gramo|gramos)$/.test(valor)) {
    return { cantidad, unidad: 'g' };
  }
  if (/^(l|litro|litros)$/.test(valor)) {
    return { cantidad, unidad: 'l' };
  }
  if (/^(cl|centilitro|centilitros)$/.test(valor)) {
    return { cantidad: cantidad * 10, unidad: 'ml' };
  }
  if (/^(ml|mililitro|mililitros)$/.test(valor)) {
    return { cantidad, unidad: 'ml' };
  }
  return { cantidad, unidad: 'ud' };
}

/** Extrae el contenido comercial total a partir del nombre oficial. */
export function extraerFormatoCatalogo(nombre, alPeso = false) {
  if (alPeso) return { cantidad: 1, unidad: 'kg', modoVenta: 'peso' };
  const texto = normalizarTexto(nombre);
  const unidadPatron = '(kg|kilos?|kilogramos?|g|gr|gramos?|l|litros?|cl|centilitros?|ml|mililitros?)';
  const multiplicadores = [
    new RegExp(`\\b(\\d{1,3})\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unidadPatron}\\b`, 'i'),
    new RegExp(`\\b(\\d{1,3})\\s*(?:briks?|botellas?|latas?|botes?|paquetes?|bolsas?|unidades?|uds?)\\s*(?:de|x)\\s*(\\d+(?:[.,]\\d+)?)\\s*${unidadPatron}\\b`, 'i'),
  ];

  for (const patron of multiplicadores) {
    const coincidencia = texto.match(patron);
    if (!coincidencia) continue;
    const unidades = Number(coincidencia[1]);
    const medida = Number(coincidencia[2].replace(',', '.'));
    const convertida = unidadNormalizada(coincidencia[3], medida * unidades);
    return { ...convertida, modoVenta: 'envase' };
  }

  const medida = texto.match(
    new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s*${unidadPatron}\\b`, 'i'),
  );
  if (medida) {
    const convertida = unidadNormalizada(
      medida[2],
      Number(medida[1].replace(',', '.')),
    );
    return { ...convertida, modoVenta: 'envase' };
  }

  const unidades = texto.match(/\b(\d{1,3})\s*(?:unidades?|uds?|rollos?|huevos?)\b/i);
  return {
    cantidad: unidades ? Number(unidades[1]) : 1,
    unidad: 'ud',
    modoVenta: 'envase',
  };
}

function fechaHoy() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date()).map(({ type, value }) => [type, value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function productoCatalogo({
  tiendaId,
  id,
  nombre,
  marca = '',
  precio,
  precioReferencia = null,
  unidadReferencia = null,
  imagen = null,
  url,
  alPeso = false,
}) {
  const formato = extraerFormatoCatalogo(nombre, alPeso);
  let referenciaCalculada = Number.isFinite(precioReferencia)
    ? precioReferencia
    : null;
  let unidadCalculada = unidadReferencia;
  if (!referenciaCalculada && formato.cantidad > 0) {
    if (formato.unidad === 'g') {
      referenciaCalculada = Number(precio) / (formato.cantidad / 1000);
      unidadCalculada = 'kg';
    } else if (formato.unidad === 'ml') {
      referenciaCalculada = Number(precio) / (formato.cantidad / 1000);
      unidadCalculada = 'l';
    } else if (formato.unidad === 'kg' || formato.unidad === 'l') {
      referenciaCalculada = Number(precio) / formato.cantidad;
      unidadCalculada = formato.unidad;
    } else if (formato.unidad === 'ud' && formato.cantidad > 1) {
      referenciaCalculada = Number(precio) / formato.cantidad;
      unidadCalculada = 'ud';
    }
  }
  return {
    tiendaId,
    id: String(id),
    nombre: String(nombre).trim(),
    marca: String(marca).trim(),
    precio: Math.round(Number(precio) * 100) / 100,
    cantidad: Math.round(formato.cantidad * 1000) / 1000,
    unidad: formato.unidad,
    modoVenta: formato.modoVenta,
    precioReferencia: Number.isFinite(referenciaCalculada)
      ? Math.round(referenciaCalculada * 1000) / 1000
      : null,
    unidadReferencia: unidadCalculada,
    imagen,
    url,
    actualizadaEn: fechaHoy(),
  };
}

export function extraerProductosEroski(pagina, limite = 20) {
  const coincidencias = [
    ...String(pagina).matchAll(/\{&quot;event&quot;:&quot;select_item&quot;[^"]*/g),
  ];
  const productos = [];
  const vistos = new Set();

  for (let indice = 0; indice < coincidencias.length; indice += 1) {
    const coincidencia = coincidencias[indice];
    let item;
    try {
      const datos = JSON.parse(decodificarEntidades(coincidencia[0]));
      item = datos?.ecommerce?.items?.[0];
    } catch {
      continue;
    }

    const idBase = String(item?.item_id ?? '').trim();
    const precio = numeroPrecio(item?.price);
    const nombre = decodificarEntidades(item?.item_name ?? '').trim();
    if (!idBase || !nombre || !precio || precio <= 0 || vistos.has(idBase)) continue;

    const inicioTramo = (coincidencia.index ?? 0) + coincidencia[0].length;
    const finTramo = coincidencias[indice + 1]?.index ?? String(pagina).length;
    const tramo = String(pagina).slice(inicioTramo, finTramo);
    const referencia = tramo.match(/1\s+(KILO|LITRO)\s+A\s+([\d.,]+)/i);
    const alPeso = normalizarTexto(nombre).includes('compra minima');
    const precioReferencia = alPeso
      ? precio
      : numeroPrecio(referencia?.[2]);
    const unidadReferencia = alPeso || referencia?.[1]?.toUpperCase() === 'KILO'
      ? 'kg'
      : referencia?.[1]
        ? 'l'
        : null;
    const id = alPeso ? `${idBase}:granel` : idBase;

    vistos.add(idBase);
    productos.push(productoCatalogo({
      tiendaId: 'eroski',
      id,
      nombre,
      marca: item?.item_brand ?? '',
      precio,
      precioReferencia,
      unidadReferencia,
      imagen: `${EROSKI_BASE}//images/${idBase}.jpg`,
      url: `${EROSKI_BASE}/es/productdetail/${idBase}-x/`,
      alPeso,
    }));
    if (productos.length >= limite) break;
  }

  return productos;
}

export function extraerProductosCarrefour(datos, limite = 20) {
  const documentos = Array.isArray(datos?.content?.docs)
    ? datos.content.docs
    : [];
  return documentos.flatMap((documento) => {
    const id = String(documento?.product_id ?? '').trim();
    const nombre = String(documento?.display_name ?? '').trim();
    const precio = numeroPrecio(documento?.active_price);
    if (!id || !nombre || !precio || precio <= 0) return [];

    const textoReferencia = String(documento?.price_per_unit_text ?? '');
    const referencia = textoReferencia.match(/([\d.,]+)\s*€?\s*\/?\s*(kg|kilo|l|litro|ud)/i)
      ?? textoReferencia.match(/(?:kg|kilo|l|litro|ud)[^\d]*([\d.,]+)/i);
    const precioReferencia = numeroPrecio(referencia?.[1]);
    const unidadReferenciaTexto = referencia?.[2]
      ?? textoReferencia.match(/\b(kg|kilo|l|litro|ud)\b/i)?.[1]
      ?? null;
    const unidadReferencia = unidadReferenciaTexto
      ? (/^(kg|kilo)$/i.test(unidadReferenciaTexto) ? 'kg'
        : /^(l|litro)$/i.test(unidadReferenciaTexto) ? 'l' : 'ud')
      : null;
    const url = String(documento?.url ?? '').trim();
    const imagen = String(documento?.image_path ?? '').trim();

    return [productoCatalogo({
      tiendaId: 'carrefour',
      id,
      nombre,
      marca: documento?.brand_name ?? documento?.brand ?? '',
      precio,
      precioReferencia,
      unidadReferencia,
      imagen: imagen || null,
      url: url.startsWith('http') ? url : `${CARREFOUR_BASE}${url}`,
    })];
  }).slice(0, limite);
}

function cabeceras(tiendaId, acepta) {
  return {
    Accept: acepta,
    'Accept-Language': 'es-ES,es;q=0.9',
    'User-Agent': `PFI/0.9.26 (${tiendaId}; comparador familiar)`,
  };
}

async function descargarTexto(url, tiendaId) {
  const respuesta = await fetch(url, {
    headers: cabeceras(tiendaId, 'text/html,application/xhtml+xml'),
    signal: AbortSignal.timeout(18_000),
  });
  if (!respuesta.ok) {
    throw new Error(`${tiendaId === 'eroski' ? 'Eroski' : 'Carrefour'} respondió con HTTP ${respuesta.status}.`);
  }
  return respuesta.text();
}

export async function buscarEroski(consulta, limite = 20) {
  const url = `${EROSKI_BASE}/es/search/results/?q=${encodeURIComponent(consulta)}&suggestionsFilter=false`;
  const pagina = await descargarTexto(url, 'eroski');
  const productos = extraerProductosEroski(pagina, limite);
  if (productos.length === 0) {
    throw new Error('Eroski no ha devuelto productos para esa búsqueda.');
  }
  return productos;
}

function parametrosCarrefour(consulta, tienda) {
  return new URLSearchParams({
    internal: 'true', instance: 'x-carrefour', env: CARREFOUR_BASE,
    scope: 'desktop', lang: 'es', session: 'empathy',
    citrusCatalog: 'food', catalog: 'food', baseUrlCitrus: CARREFOUR_BASE,
    enabled: 'true', hasConsent: 'true', siteKey: 'wFOzqveg',
    origin: 'url:external', store: tienda,
    shopperId: `pfi${Date.now().toString(36).padEnd(25, '0').slice(0, 25)}`,
    query: consulta, start: '0', rows: '24',
  });
}

export async function buscarCarrefour(consulta, limite = 20) {
  const tienda = process.env.CARREFOUR_STORE_ID || '005290';
  const respuesta = await fetch(`${CARREFOUR_API}?${parametrosCarrefour(consulta, tienda)}`, {
    headers: {
      ...cabeceras('carrefour', 'application/json, text/plain, */*'),
      Origin: CARREFOUR_BASE,
      Referer: `${CARREFOUR_BASE}/`,
    },
    signal: AbortSignal.timeout(18_000),
  });
  if (!respuesta.ok) {
    throw new Error(`Carrefour no permite consultar ahora su catálogo (HTTP ${respuesta.status}).`);
  }
  const productos = extraerProductosCarrefour(await respuesta.json(), limite);
  if (productos.length === 0) {
    throw new Error('Carrefour no ha devuelto productos para esa búsqueda.');
  }
  return productos;
}

export async function buscarCatalogo(tiendaId, consulta, limite = 20) {
  if (!TIENDAS_CATALOGO.has(tiendaId)) {
    throw new Error('Ese establecimiento no ofrece catálogo automático.');
  }
  const texto = String(consulta ?? '').trim().slice(0, 80);
  if (texto.length < 2) throw new Error('Escribe al menos 2 caracteres para buscar.');
  return tiendaId === 'eroski'
    ? buscarEroski(texto, limite)
    : buscarCarrefour(texto, limite);
}

export async function actualizarProductoCatalogo({
  tiendaId,
  referenciaExterna,
  nombreProducto,
}) {
  if (tiendaId === 'eroski') {
    const [idBase, variante] = String(referenciaExterna).split(':');
    if (!/^\d+$/.test(idBase)) throw new Error('Referencia de Eroski no válida.');
    const pagina = await descargarTexto(
      `${EROSKI_BASE}/es/productdetail/${idBase}-x/`,
      'eroski',
    );
    const precio = numeroPrecio(
      pagina.match(/itemprop="price"\s+class="offer-now">\s*([\d.,]+)/i)?.[1],
    );
    const nombre = decodificarEntidades(
      pagina.match(/<h1[^>]*class="description-title"[^>]*>([^<]*)/i)?.[1]
        ?? nombreProducto,
    ).trim();
    if (!precio || precio <= 0 || !nombre) {
      throw new Error(`Eroski ${idBase}: no se ha encontrado un precio válido.`);
    }
    return productoCatalogo({
      tiendaId,
      id: variante === 'granel' ? `${idBase}:granel` : idBase,
      nombre,
      precio,
      imagen: `${EROSKI_BASE}//images/${idBase}.jpg`,
      url: `${EROSKI_BASE}/es/productdetail/${idBase}-x/`,
      alPeso: variante === 'granel',
    });
  }

  if (tiendaId === 'carrefour') {
    const productos = await buscarCarrefour(nombreProducto, 24);
    const exacto = productos.find(
      (producto) => producto.id === String(referenciaExterna),
    );
    if (!exacto) throw new Error('El producto de Carrefour ya no aparece en el catálogo.');
    return exacto;
  }

  throw new Error('Ese precio no procede de un catálogo automático.');
}

export async function actualizarProductosCatalogo(items, concurrencia = 3) {
  const entradas = Array.isArray(items) ? items.slice(0, 40) : [];
  const resultados = new Array(entradas.length);
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < entradas.length) {
      const indice = siguiente;
      siguiente += 1;
      const entrada = entradas[indice];
      try {
        resultados[indice] = {
          ok: true,
          tiendaId: entrada?.tiendaId,
          referenciaExterna: entrada?.referenciaExterna,
          producto: await actualizarProductoCatalogo(entrada ?? {}),
        };
      } catch (error) {
        resultados[indice] = {
          ok: false,
          tiendaId: entrada?.tiendaId,
          referenciaExterna: entrada?.referenciaExterna,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrencia, entradas.length) }, trabajador),
  );
  return resultados;
}
