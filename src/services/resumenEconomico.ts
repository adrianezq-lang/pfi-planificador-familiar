import type { ResultadoCompra } from '../motor/compra';
import {
  crearPeriodoIdCompraManual,
  type ProductoManualCompra,
} from './productosManualesCompra';

export type DesgloseEconomico = {
  subtotalConocido: number;
  subtotalConfirmado: number;
  subtotalEstimado: number;
  partidasTotales: number;
  partidasConfirmadas: number;
  partidasSinImporte: number;
  cantidadesEstimadas: number;
  partidasPesoVariable: number;
  partidasConversionEstimada: number;
  partidasFormatoPendiente: number;
  ingredientesSinProducto: string[];
  productosSinPrecio: string[];
  comprasManualesSinPrecio: string[];
  productosEstimados: string[];
  partidasExcluidasDisponibilidad: number;
  ingredientesNoDisponibles: string[];
};

export type ResumenEconomicoMensual = {
  presupuestoSemanal: number;
  presupuestoMensual: number;
  totalAcumulado: number;
  previsionMes: number;
  mostrarPresupuestoMensual: boolean;
  semana: DesgloseEconomico;
  compraMensual: DesgloseEconomico;
  prevision: DesgloseEconomico;
};

function vacio(): DesgloseEconomico {
  return {
    subtotalConocido: 0,
    subtotalConfirmado: 0,
    subtotalEstimado: 0,
    partidasTotales: 0,
    partidasConfirmadas: 0,
    partidasSinImporte: 0,
    cantidadesEstimadas: 0,
    partidasPesoVariable: 0,
    partidasConversionEstimada: 0,
    partidasFormatoPendiente: 0,
    ingredientesSinProducto: [],
    productosSinPrecio: [],
    comprasManualesSinPrecio: [],
    productosEstimados: [],
    partidasExcluidasDisponibilidad: 0,
    ingredientesNoDisponibles: [],
  };
}

function unirNombres(...listas: readonly string[][]): string[] {
  return Array.from(
    new Set(
      listas
        .flat()
        .map((nombre) => nombre.trim())
        .filter(Boolean),
    ),
  );
}

function sumarDesgloses(
  desgloses: readonly DesgloseEconomico[],
): DesgloseEconomico {
  return desgloses.reduce<DesgloseEconomico>(
    (total, desglose) => ({
      subtotalConocido: total.subtotalConocido + desglose.subtotalConocido,
      subtotalConfirmado:
        total.subtotalConfirmado + desglose.subtotalConfirmado,
      subtotalEstimado: total.subtotalEstimado + desglose.subtotalEstimado,
      partidasTotales: total.partidasTotales + desglose.partidasTotales,
      partidasConfirmadas:
        total.partidasConfirmadas + desglose.partidasConfirmadas,
      partidasSinImporte:
        total.partidasSinImporte + desglose.partidasSinImporte,
      cantidadesEstimadas:
        total.cantidadesEstimadas + desglose.cantidadesEstimadas,
      partidasPesoVariable:
        total.partidasPesoVariable + desglose.partidasPesoVariable,
      partidasConversionEstimada:
        total.partidasConversionEstimada + desglose.partidasConversionEstimada,
      partidasFormatoPendiente:
        total.partidasFormatoPendiente + desglose.partidasFormatoPendiente,
      ingredientesSinProducto: unirNombres(
        total.ingredientesSinProducto,
        desglose.ingredientesSinProducto,
      ),
      productosSinPrecio: unirNombres(
        total.productosSinPrecio,
        desglose.productosSinPrecio,
      ),
      comprasManualesSinPrecio: unirNombres(
        total.comprasManualesSinPrecio,
        desglose.comprasManualesSinPrecio,
      ),
      productosEstimados: unirNombres(
        total.productosEstimados,
        desglose.productosEstimados,
      ),
      partidasExcluidasDisponibilidad:
        (total.partidasExcluidasDisponibilidad ?? 0) +
        (desglose.partidasExcluidasDisponibilidad ?? 0),
      ingredientesNoDisponibles: unirNombres(
        total.ingredientesNoDisponibles ?? [],
        desglose.ingredientesNoDisponibles ?? [],
      ),
    }),
    vacio(),
  );
}

function desgloseCompra(
  compra: ResultadoCompra | null | undefined,
): DesgloseEconomico {
  if (!compra) return vacio();

  const lineasConImporte = compra.lineas.filter(
    (linea) => linea.subtotal !== null,
  );
  const lineasConfirmadas = lineasConImporte.filter(
    (linea) => linea.precisionCantidad === 'exacta',
  );
  const subtotalConfirmado = lineasConfirmadas.reduce(
    (total, linea) => total + (linea.subtotal ?? 0),
    0,
  );

  return {
    subtotalConocido: compra.total,
    subtotalConfirmado,
    subtotalEstimado: Math.max(0, compra.total - subtotalConfirmado),
    partidasTotales:
      compra.lineas.length + (compra.ingredientesNoDisponibles?.length ?? 0),
    partidasConfirmadas: lineasConfirmadas.length,
    partidasSinImporte:
      compra.productosSinSeleccionar.length + compra.productosSinPrecio.length,
    cantidadesEstimadas: compra.productosEstimados.length,
    partidasPesoVariable: lineasConImporte.filter(
      (linea) => linea.precisionCantidad === 'peso-variable',
    ).length,
    partidasConversionEstimada: lineasConImporte.filter(
      (linea) => linea.precisionCantidad === 'conversion-aproximada',
    ).length,
    partidasFormatoPendiente: lineasConImporte.filter(
      (linea) => linea.precisionCantidad === 'formato-incompleto',
    ).length,
    ingredientesSinProducto: unirNombres(compra.productosSinSeleccionar),
    productosSinPrecio: unirNombres(compra.productosSinPrecio),
    comprasManualesSinPrecio: [],
    productosEstimados: unirNombres(compra.productosEstimados),
    partidasExcluidasDisponibilidad: compra.ingredientesNoDisponibles?.length ?? 0,
    ingredientesNoDisponibles: unirNombres(
      (compra.ingredientesNoDisponibles ?? []).map((estado) => estado.ingrediente),
    ),
  };
}

function desgloseManuales(
  productos: readonly ProductoManualCompra[],
): DesgloseEconomico {
  const conPrecio = productos.filter((producto) => producto.precioTotal !== null);
  const subtotalConfirmado = conPrecio.reduce(
    (total, producto) => total + (producto.precioTotal ?? 0),
    0,
  );
  return {
    subtotalConocido: subtotalConfirmado,
    subtotalConfirmado,
    subtotalEstimado: 0,
    partidasTotales: productos.length,
    partidasConfirmadas: conPrecio.length,
    partidasSinImporte: productos.filter(
      (producto) => producto.precioTotal === null,
    ).length,
    cantidadesEstimadas: 0,
    partidasPesoVariable: 0,
    partidasConversionEstimada: 0,
    partidasFormatoPendiente: 0,
    ingredientesSinProducto: [],
    productosSinPrecio: [],
    comprasManualesSinPrecio: unirNombres(
      productos
        .filter((producto) => producto.precioTotal === null)
        .map((producto) => producto.nombre),
    ),
    productosEstimados: [],
    partidasExcluidasDisponibilidad: 0,
    ingredientesNoDisponibles: [],
  };
}

export function contarCausasImportePendiente(
  desglose: DesgloseEconomico,
): number {
  return (
    desglose.ingredientesSinProducto.length +
    desglose.productosSinPrecio.length +
    desglose.comprasManualesSinPrecio.length
  );
}

export function calcularConfianzaPresupuesto(
  desglose: DesgloseEconomico,
): number {
  if (desglose.partidasTotales <= 0) return 100;
  const puntos =
    desglose.partidasConfirmadas +
    desglose.partidasPesoVariable * 0.85 +
    desglose.partidasConversionEstimada * 0.65 +
    desglose.partidasFormatoPendiente * 0.35;
  return Math.max(
    0,
    Math.min(100, Math.round((puntos / desglose.partidasTotales) * 100)),
  );
}

export function etiquetaConfianzaPresupuesto(confianza: number): string {
  if (confianza >= 95) return 'muy alta';
  if (confianza >= 80) return 'alta';
  if (confianza >= 60) return 'media';
  return 'baja';
}

export function calcularResumenEconomicoMensual({
  compraMes,
  comprasSemanas,
  productosManuales,
  mesActivo,
  semanaActiva,
}: {
  compraMes: ResultadoCompra | null | undefined;
  comprasSemanas: readonly ResultadoCompra[];
  productosManuales: readonly ProductoManualCompra[];
  mesActivo: string;
  semanaActiva: number;
}): ResumenEconomicoMensual {
  const indiceSeguro = comprasSemanas.length === 0
    ? 0
    : Math.max(0, Math.min(semanaActiva, comprasSemanas.length - 1));
  const manualesMes = productosManuales.filter(
    (producto) =>
      producto.periodoId ===
      crearPeriodoIdCompraManual('mes', mesActivo, indiceSeguro),
  );
  const desglosesSemanas = comprasSemanas.map((compra, indice) => {
    const periodo = crearPeriodoIdCompraManual('semana', mesActivo, indice);
    const manuales = productosManuales.filter(
      (producto) => producto.periodoId === periodo,
    );
    return sumarDesgloses([desgloseCompra(compra), desgloseManuales(manuales)]);
  });
  const compraMensual = sumarDesgloses([
    desgloseCompra(compraMes),
    desgloseManuales(manualesMes),
  ]);
  const semana = desglosesSemanas[indiceSeguro] ?? vacio();
  const prevision = sumarDesgloses([compraMensual, ...desglosesSemanas]);
  const acumulado = sumarDesgloses([
    compraMensual,
    ...desglosesSemanas.slice(0, indiceSeguro + 1),
  ]);

  return {
    presupuestoSemanal: semana.subtotalConocido,
    presupuestoMensual: compraMensual.subtotalConocido,
    totalAcumulado: acumulado.subtotalConocido,
    previsionMes: prevision.subtotalConocido,
    mostrarPresupuestoMensual: indiceSeguro === 0,
    semana,
    compraMensual,
    prevision,
  };
}
