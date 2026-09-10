import {
  actualizarProductosCatalogo,
  buscarCatalogo,
} from '../../../scripts/catalogos-supermercados.mjs';

export const maxDuration = 60;

function valorConsulta(valor) {
  return String(Array.isArray(valor) ? valor[0] : valor ?? '').trim();
}

function leerCuerpo(peticion) {
  if (peticion.body && typeof peticion.body === 'object') return peticion.body;
  if (typeof peticion.body === 'string') {
    try {
      return JSON.parse(peticion.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(peticion, respuesta) {
  respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!['GET', 'POST'].includes(peticion.method ?? 'GET')) {
    respuesta.statusCode = 405;
    respuesta.setHeader('Allow', 'GET, POST');
    respuesta.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }));
    return;
  }

  try {
    if (peticion.method === 'POST') {
      respuesta.setHeader('Cache-Control', 'no-store');
      const cuerpo = leerCuerpo(peticion);
      const resultados = await actualizarProductosCatalogo(cuerpo.items);
      respuesta.statusCode = 200;
      respuesta.end(JSON.stringify({ ok: true, resultados }));
      return;
    }

    const tiendaId = valorConsulta(peticion.query?.tienda);
    const consulta = valorConsulta(peticion.query?.q);
    const productos = await buscarCatalogo(tiendaId, consulta);
    respuesta.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=3600',
    );
    respuesta.statusCode = 200;
    respuesta.end(JSON.stringify({
      ok: true,
      tiendaId,
      productos,
      aviso: tiendaId === 'eroski'
        ? 'Precio de la tienda online de referencia de Eroski; puede variar al elegir entrega.'
        : null,
    }));
  } catch (error) {
    console.error('PFI catálogo comparador:', error);
    respuesta.statusCode = 502;
    respuesta.end(JSON.stringify({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'No se ha podido consultar el catálogo.',
    }));
  }
}

