import type { Receta } from '../data/Recetas';
import { calcularCosteProporcionalIngrediente } from '../motor/compra';
import { obtenerProductoAsociado } from './asociacionesIngredientes';
import {
  eliminarMovimiento,
  obtenerStockActual,
  registrarConsumo,
} from './inventario';

export type MomentoConsumoMenu = 'comida' | 'cena';

export type ProductoConsumidoMenu = {
  productoId: string;
  nombre: string;
  previstoEnvases: number;
  consumidoEnvases: number;
  faltanteEnvases: number;
  movimientoId: string | null;
};

export type ConfirmacionConsumoMenu = {
  clave: string;
  fecha: string;
  momento: MomentoConsumoMenu;
  platos: string[];
  confirmadoEn: string;
  productos: ProductoConsumidoMenu[];
  ingredientesSinProducto: string[];
  ingredientesSinConversion: string[];
};

const CLAVE_CONSUMOS_MENU = 'pfi-consumos-menu-v1';
export const EVENTO_CONSUMOS_MENU = 'pfi:consumos-menu-actualizados';

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function crearClaveConsumoMenu(
  fecha: string,
  momento: MomentoConsumoMenu,
): string {
  return `${fecha}:${momento}`;
}

function esConfirmacion(valor: unknown): valor is ConfirmacionConsumoMenu {
  if (!valor || typeof valor !== 'object') return false;
  const item = valor as Partial<ConfirmacionConsumoMenu>;
  return (
    typeof item.clave === 'string' &&
    typeof item.fecha === 'string' &&
    (item.momento === 'comida' || item.momento === 'cena') &&
    Array.isArray(item.platos) &&
    typeof item.confirmadoEn === 'string' &&
    Array.isArray(item.productos) &&
    Array.isArray(item.ingredientesSinProducto) &&
    Array.isArray(item.ingredientesSinConversion)
  );
}

export function cargarConfirmacionesConsumoMenu(): ConfirmacionConsumoMenu[] {
  try {
    const raw = localStorage.getItem(CLAVE_CONSUMOS_MENU);
    if (!raw) return [];
    const datos = JSON.parse(raw) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos.filter(esConfirmacion);
  } catch {
    return [];
  }
}

function guardarConfirmaciones(items: ConfirmacionConsumoMenu[]): void {
  localStorage.setItem(CLAVE_CONSUMOS_MENU, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENTO_CONSUMOS_MENU));
}

export function obtenerConfirmacionConsumoMenu(
  fecha: string,
  momento: MomentoConsumoMenu,
): ConfirmacionConsumoMenu | null {
  const clave = crearClaveConsumoMenu(fecha, momento);
  return cargarConfirmacionesConsumoMenu().find((item) => item.clave === clave) ?? null;
}

function recetasDelServicio(
  nombres: string[],
  recetas: Receta[],
): Receta[] {
  const porNombre = new Map(
    recetas.map((receta) => [normalizar(receta.nombre), receta]),
  );
  return Array.from(
    new Map(
      nombres
        .map((nombre) => porNombre.get(normalizar(nombre)))
        .filter((receta): receta is Receta => Boolean(receta))
        .map((receta) => [normalizar(receta.nombre), receta]),
    ).values(),
  );
}

export async function confirmarConsumoMenu({
  fecha,
  momento,
  platos,
  postre,
  recetas,
}: {
  fecha: string;
  momento: MomentoConsumoMenu;
  platos: string[];
  postre?: string;
  recetas: Receta[];
}): Promise<ConfirmacionConsumoMenu> {
  const existente = obtenerConfirmacionConsumoMenu(fecha, momento);
  if (existente) return existente;

  const nombresServicio = [
    ...platos,
    ...(postre && normalizar(postre) !== 'sin postre' ? [postre] : []),
  ];
  const recetasServicio = recetasDelServicio(nombresServicio, recetas);
  const necesidadesPorProducto = new Map<
    string,
    {
      nombre: string;
      previstoEnvases: number;
    }
  >();
  const ingredientesSinProducto = new Set<string>();
  const ingredientesSinConversion = new Set<string>();

  for (const receta of recetasServicio) {
    for (const ingrediente of receta.ingredientes) {
      const producto = await obtenerProductoAsociado(ingrediente.nombre);
      if (!producto) {
        ingredientesSinProducto.add(ingrediente.nombre);
        continue;
      }

      const calculo = calcularCosteProporcionalIngrediente(ingrediente, producto);
      if (
        calculo.envasesExactos === null ||
        !Number.isFinite(calculo.envasesExactos) ||
        calculo.envasesExactos <= 0
      ) {
        ingredientesSinConversion.add(ingrediente.nombre);
        continue;
      }

      const anterior = necesidadesPorProducto.get(producto.productoId);
      necesidadesPorProducto.set(producto.productoId, {
        nombre: producto.nombre,
        previstoEnvases:
          (anterior?.previstoEnvases ?? 0) + calculo.envasesExactos,
      });
    }
  }

  const productos: ProductoConsumidoMenu[] = [];

  necesidadesPorProducto.forEach((necesidad, productoId) => {
    const stockAntes = Math.max(0, obtenerStockActual(productoId));
    const consumidoEnvases = Math.min(stockAntes, necesidad.previstoEnvases);
    let movimientoId: string | null = null;

    if (consumidoEnvases > 0.0001) {
      const movimientos = registrarConsumo(
        productoId,
        consumidoEnvases,
        'menu',
        `${fecha} · ${momento} · ${nombresServicio.join(' + ')}`,
      );
      movimientoId = movimientos[0]?.id ?? null;
    }

    productos.push({
      productoId,
      nombre: necesidad.nombre,
      previstoEnvases: necesidad.previstoEnvases,
      consumidoEnvases,
      faltanteEnvases: Math.max(0, necesidad.previstoEnvases - consumidoEnvases),
      movimientoId,
    });
  });

  const confirmacion: ConfirmacionConsumoMenu = {
    clave: crearClaveConsumoMenu(fecha, momento),
    fecha,
    momento,
    platos: nombresServicio,
    confirmadoEn: new Date().toISOString(),
    productos,
    ingredientesSinProducto: Array.from(ingredientesSinProducto).sort(),
    ingredientesSinConversion: Array.from(ingredientesSinConversion).sort(),
  };

  guardarConfirmaciones([
    confirmacion,
    ...cargarConfirmacionesConsumoMenu(),
  ]);

  return confirmacion;
}

export function deshacerConfirmacionConsumoMenu(
  fecha: string,
  momento: MomentoConsumoMenu,
): boolean {
  const confirmacion = obtenerConfirmacionConsumoMenu(fecha, momento);
  if (!confirmacion) return false;

  confirmacion.productos.forEach((producto) => {
    if (producto.movimientoId) eliminarMovimiento(producto.movimientoId);
  });

  guardarConfirmaciones(
    cargarConfirmacionesConsumoMenu().filter(
      (item) => item.clave !== confirmacion.clave,
    ),
  );
  return true;
}

export function resumenConfirmacionConsumo(
  confirmacion: ConfirmacionConsumoMenu,
): {
  previsto: number;
  consumido: number;
  faltante: number;
  incidencias: number;
} {
  return {
    previsto: confirmacion.productos.reduce(
      (total, producto) => total + producto.previstoEnvases,
      0,
    ),
    consumido: confirmacion.productos.reduce(
      (total, producto) => total + producto.consumidoEnvases,
      0,
    ),
    faltante: confirmacion.productos.reduce(
      (total, producto) => total + producto.faltanteEnvases,
      0,
    ),
    incidencias:
      confirmacion.ingredientesSinProducto.length +
      confirmacion.ingredientesSinConversion.length +
      confirmacion.productos.filter((producto) => producto.faltanteEnvases > 0.0001).length,
  };
}
