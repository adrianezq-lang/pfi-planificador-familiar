import type { LineaCompra } from '../motor/compra';
import type { AsignacionComparador } from './comparadorPrecios.ts';
import {
  crearProductoDespensaDesdeCatalogo,
  registrarUltimaCompraDespensa,
} from './despensa.ts';
import { registrarCompra } from './inventario.ts';
import { registrarAhorroReal } from './ahorroReal.ts';
import { registrarCompraReal } from './comprasReales.ts';

export type PeriodoCompra = 'semana' | 'mes';

export type ClavesEstadoCompra = {
  marcados: string;
  registrados: string;
};

export type ResultadoRegistroCompra = {
  clavesRegistradas: string[];
  lineasRegistradas: number;
  lineasSinInventario: number;
  ahorrosRegistrados: number;
  importesConfirmados: number;
  importesPendientes: number;
};

function contextoReferencia(referencia: string): {
  periodo: PeriodoCompra;
  mes: string;
  semana: number | null;
} | null {
  const coincidencia = /^(semana|mes):(\d{4}-\d{2})(?::(\d+))?/.exec(referencia);
  if (!coincidencia) return null;
  return {
    periodo: coincidencia[1] as PeriodoCompra,
    mes: coincidencia[2],
    semana:
      coincidencia[1] === 'semana' && coincidencia[3]
        ? Number(coincidencia[3])
        : null,
  };
}

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
  referenciaRegistro = observaciones,
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
  let ahorrosRegistrados = 0;
  let importesConfirmados = 0;
  let importesPendientes = 0;
  const contexto = contextoReferencia(referenciaRegistro);

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
    if (contexto) {
      registrarCompraReal({
        referencia: `${referenciaRegistro}|${linea.clave}`,
        mes: contexto.mes,
        periodo: contexto.periodo,
        semana: contexto.semana,
        productoId,
        productoNombre: opcion?.productoNombre ?? linea.producto?.nombre ?? linea.ingrediente.nombre,
        tiendaNombre: opcion?.tiendaNombre ?? linea.producto?.tiendaPrecio ?? null,
        costePrevisto: linea.subtotal,
        costePagado: opcion?.coste ?? null,
        origen: 'lista-automatica',
        observaciones,
      });
      if (opcion) importesConfirmados += 1;
      else importesPendientes += 1;
    }
    if (opcion) {
      registrarUltimaCompraDespensa(productoId, {
        tiendaId: opcion.tiendaId,
        tiendaNombre: opcion.tiendaNombre,
        productoNombre: opcion.productoNombre,
        precio: opcion.precioEnvase,
      });
      if (asignacion?.ahorroFrenteMercadona !== null && asignacion?.ahorroFrenteMercadona !== undefined) {
        registrarAhorroReal({
          referencia: `${referenciaRegistro}|${linea.clave}`,
          productoId,
          productoNombre: opcion.productoNombre,
          tiendaId: opcion.tiendaId,
          tiendaNombre: opcion.tiendaNombre,
          costeReferencia: opcion.coste + asignacion.ahorroFrenteMercadona,
          costePagado: opcion.coste,
          origenImporte: opcion.tiendaId === 'mercadona'
            ? 'mercadona'
            : opcion.automatica
              ? 'catalogo'
              : 'precio-registrado',
          observaciones,
        });
        ahorrosRegistrados += 1;
      }
    } else if (linea.producto?.origenPrecio === 'manual') {
      registrarUltimaCompraDespensa(productoId, {
        tiendaId: `manual:${normalizarClave(linea.producto.tiendaPrecio ?? 'otra-tienda')}`,
        tiendaNombre: linea.producto.tiendaPrecio ?? 'Otra tienda',
        productoNombre: linea.producto.nombre,
        precio: linea.producto.precio ?? 0,
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
    ahorrosRegistrados,
    importesConfirmados,
    importesPendientes,
  };
}
