import type { ProductoDespensa } from './despensa';

const CLAVE_NECESIDADES_MENSUALES = 'pfi-necesidades-mensuales';
export const EVENTO_NECESIDADES_MENSUALES = 'pfi:necesidades-mensuales-actualizadas';

type NecesidadesMensuales = Record<string, number>;

function numeroNoNegativo(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? Math.max(0, valor)
    : 0;
}

export function cargarNecesidadesMensuales(): NecesidadesMensuales {
  try {
    const raw = localStorage.getItem(CLAVE_NECESIDADES_MENSUALES);
    if (!raw) return {};

    const datos = JSON.parse(raw) as unknown;
    if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(datos as Record<string, unknown>)
        .map(([productoId, cantidad]) => [productoId, numeroNoNegativo(cantidad)])
        .filter(([, cantidad]) => cantidad > 0),
    );
  } catch {
    return {};
  }
}

export function obtenerNecesidadMensual(
  productoId: string,
  frecuencia?: ProductoDespensa['frecuencia'],
): number {
  const guardada = cargarNecesidadesMensuales()[productoId];
  if (guardada !== undefined) return guardada;

  // Si un producto ya estaba marcado como mensual en una versión anterior,
  // damos sentido real a esa elección con un envase/mes como punto de partida.
  return frecuencia === 'mensual' ? 1 : 0;
}

export function guardarNecesidadMensual(
  productoId: string,
  cantidad: number,
): void {
  const necesidades = cargarNecesidadesMensuales();
  const normalizada = numeroNoNegativo(cantidad);

  if (normalizada > 0) necesidades[productoId] = normalizada;
  else delete necesidades[productoId];

  localStorage.setItem(
    CLAVE_NECESIDADES_MENSUALES,
    JSON.stringify(necesidades),
  );
  window.dispatchEvent(new Event(EVENTO_NECESIDADES_MENSUALES));
}

export function calcularCompraMensualEnvases(
  producto: Pick<ProductoDespensa, 'stockActual' | 'stockMinimo'>,
  necesidadMenuEnvases: number,
  cantidadMensual: number,
): number {
  const objetivo = Math.max(
    0,
    necesidadMenuEnvases,
    cantidadMensual,
    producto.stockMinimo,
  );

  return Math.max(
    0,
    Math.ceil(objetivo - Math.max(0, producto.stockActual) - 0.000001),
  );
}
