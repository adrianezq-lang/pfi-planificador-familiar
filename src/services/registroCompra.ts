import type { LineaCompra } from '../motor/compra';
import type { AsignacionComparador } from './comparadorPrecios.ts';
import {
  crearProductoDespensaDesdeCatalogo,
  registrarUltimaCompraDespensa,
} from './despensa.ts';
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

function normalizarClave(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function claveAsignacionLinea(linea: LineaCompra): string {
  if (linea.producto?.productoId) return `producto:${linea.producto.productoId}`;
  const ingredientes = linea.necesidades
    .map((ingrediente) => normalizarClave(ingrediente.nombre))
    .filter(Boolean)
    .sort();
  return `ingrediente:${ingredientes.join('+') || normalizarClave(linea.ingrediente.nombre)}`;
}

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
      Boolean(linea.productoDespensa || linea.producto) &&
      linea.envases > 0,
  );
}

export function registrarMarcadosEnInventario(
  lineas: LineaCompra[],
  marcados: string[],
  registrados: string[],
  observaciones: string,
  asignaciones: AsignacionComparador[] = [],
): ResultadoRegistroCompra {
  const pendientes = obtenerLineasPendientesDeInventario(
    lineas,
    marcados,
    registrados,
  );
  const clavesMarcadas = new Set(marcados);
  const clavesRegistradas = new Set(registrados);
  const asignacionPorClave = new Map(
    asignaciones.map((asignacion) => [asignacion.clave, asignacion]),
  );
  let lineasRegistradas = 0;

  pendientes.forEach((linea) => {
    if (!linea.productoDespensa && linea.producto) {
      crearProductoDespensaDesdeCatalogo(linea.producto);
    }
    const productoId = linea.productoDespensa?.productoId ?? linea.producto?.productoId;
    if (!productoId) return;
    const asignacion = asignacionPorClave.get(claveAsignacionLinea(linea));
    const opcion = asignacion?.opcion;
    const cantidadInventario = opcion?.equivalenciaInventarioEnvases ?? linea.envases;
    const detalleCompra = opcion
      ? `${observaciones} · ${opcion.tiendaNombre}: ${opcion.productoNombre}`
      : observaciones;
    registrarCompra(
      productoId,
      cantidadInventario,
      detalleCompra,
    );
    if (opcion) {
      registrarUltimaCompraDespensa(productoId, {
        tiendaId: opcion.tiendaId,
        tiendaNombre: opcion.tiendaNombre,
        productoNombre: opcion.productoNombre,
        precio: opcion.precioEnvase,
      });
    }
    clavesRegistradas.add(linea.clave);
    lineasRegistradas += 1;
  });

  const lineasSinInventario = lineas.filter(
    (linea) =>
      clavesMarcadas.has(linea.clave) &&
      !linea.productoDespensa &&
      !linea.producto &&
      linea.envases > 0,
  ).length;

  return {
    clavesRegistradas: Array.from(clavesRegistradas),
    lineasRegistradas,
    lineasSinInventario,
  };
}
