import type { LineaCompra } from '../motor/compra';
import { registrarCompra } from './inventario.ts';

export type PeriodoCompra = 'semana' | 'mes';

export type ClavesEstadoCompra = {
  marcados: string;
  registrados: string;
};

export type ResultadoRegistroCompra = {
  clavesRegistradas: string[];
  lineasRegistradas: number;
  lineasSinInventario: number;
};

export function crearClavesEstadoCompra(
  periodo: PeriodoCompra,
  mes: string,
  semanaActiva: number,
): ClavesEstadoCompra {
  const tramo = periodo === 'semana' ? String(semanaActiva + 1) : 'todo';
  return {
    // Conserva la clave ya usada por la lista para no perder sus marcas.
    marcados: `pfi-compra-${periodo}-${mes}-${tramo}`,
    registrados: `pfi-compra-inventario-v1-${periodo}-${mes}-${tramo}`,
  };
}

export function cargarClavesGuardadas(clave: string): string[] {
  try {
    const valor = JSON.parse(localStorage.getItem(clave) ?? '[]') as unknown;
    if (!Array.isArray(valor)) return [];
    return Array.from(
      new Set(valor.filter((item): item is string => typeof item === 'string')),
    );
  } catch {
    return [];
  }
}

export function guardarClavesCompra(clave: string, valores: string[]): void {
  try {
    localStorage.setItem(clave, JSON.stringify(Array.from(new Set(valores))));
  } catch {
    // La lista sigue funcionando durante esta sesión aunque el navegador no permita guardarla.
  }
}

export function obtenerLineasPendientesDeInventario(
  lineas: LineaCompra[],
  marcados: string[],
  registrados: string[],
): LineaCompra[] {
  const clavesMarcadas = new Set(marcados);
  const clavesRegistradas = new Set(registrados);
  return lineas.filter(
    (linea) =>
      clavesMarcadas.has(linea.clave) &&
      !clavesRegistradas.has(linea.clave) &&
      Boolean(linea.productoDespensa) &&
      linea.envases > 0,
  );
}

export function registrarMarcadosEnInventario(
  lineas: LineaCompra[],
  marcados: string[],
  registrados: string[],
  observaciones: string,
): ResultadoRegistroCompra {
  const pendientes = obtenerLineasPendientesDeInventario(
    lineas,
    marcados,
    registrados,
  );
  const clavesMarcadas = new Set(marcados);
  const clavesRegistradas = new Set(registrados);

  pendientes.forEach((linea) => {
    if (!linea.productoDespensa) return;
    registrarCompra(
      linea.productoDespensa.productoId,
      linea.envases,
      observaciones,
    );
    clavesRegistradas.add(linea.clave);
  });

  const lineasSinInventario = lineas.filter(
    (linea) =>
      clavesMarcadas.has(linea.clave) &&
      !linea.productoDespensa &&
      linea.envases > 0,
  ).length;

  return {
    clavesRegistradas: Array.from(clavesRegistradas),
    lineasRegistradas: pendientes.length,
    lineasSinInventario,
  };
}
