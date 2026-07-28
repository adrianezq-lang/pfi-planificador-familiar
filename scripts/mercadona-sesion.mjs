import fs from 'node:fs';
import path from 'node:path';

export const API_BASE = 'https://tienda.mercadona.es/api';
const RUTA_CONFIG = path.resolve('scripts/config-mercadona.json');

function validarCodigoPostal(valor) {
  const codigoPostal = String(valor ?? '').trim();

  if (!/^\d{5}$/.test(codigoPostal)) {
    throw new Error(
      'El código postal de scripts/config-mercadona.json debe tener 5 cifras.',
    );
  }

  return codigoPostal;
}

export function cargarConfiguracionMercadona() {
  if (!fs.existsSync(RUTA_CONFIG)) {
    return { codigoPostal: '48950' };
  }

  const config = JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8'));

  return {
    codigoPostal: validarCodigoPostal(config.codigoPostal),
  };
}

function separarCookies(headers) {
  const disponibles =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie')].filter(Boolean);

  return disponibles
    .map((cookie) => String(cookie).split(';')[0])
    .filter(Boolean)
    .join('; ');
}

export async function crearSesionMercadona(codigoPostal) {
  const respuesta = await fetch(
    `${API_BASE}/postal-codes/actions/change-pc/`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_postal_code: codigoPostal }),
    },
  );

  if (!respuesta.ok) {
    throw new Error(
      `Mercadona no ha aceptado el CP ${codigoPostal} (HTTP ${respuesta.status}).`,
    );
  }

  const almacen = respuesta.headers.get('x-customer-wh') ?? '';
  const cookie = separarCookies(respuesta.headers);

  if (!almacen) {
    throw new Error(
      `No se ha podido resolver el almacén de Mercadona para el CP ${codigoPostal}.`,
    );
  }

  return {
    codigoPostal,
    almacen,
    cookie,
  };
}

export function crearDescargadorMercadona(sesion, maxReintentos = 3) {
  return async function descargarJson(url, intento = 1) {
    const separador = url.includes('?') ? '&' : '?';
    const urlLocal = `${url}${separador}lang=es&wh=${encodeURIComponent(
      sesion.almacen,
    )}`;

    try {
      const respuesta = await fetch(urlLocal, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es-ES,es;q=0.9',
          'x-customer-pc': sesion.codigoPostal,
          'x-customer-wh': sesion.almacen,
          ...(sesion.cookie ? { Cookie: sesion.cookie } : {}),
        },
      });

      if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
      }

      return await respuesta.json();
    } catch (error) {
      if (intento < maxReintentos) {
        await new Promise((resolve) => setTimeout(resolve, intento * 700));
        return descargarJson(url, intento + 1);
      }

      throw new Error(`No se pudo descargar ${urlLocal}: ${error.message}`);
    }
  };
}
