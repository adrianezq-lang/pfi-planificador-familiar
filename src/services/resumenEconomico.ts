import type { ResultadoCompra } from '../motor/compra';
import {
  crearPeriodoIdCompraManual,
  type ProductoManualCompra,
} from './productosManualesCompra';

export type DesgloseEconomico = {
  subtotalConocido: number;
  importeConfirmado: number;
  importeEstimado: number;
  partidasConfirmadas: number;
  partidasSinImporte: number;
  cantidadesEstimadas: number;
  estimadasPesoVariable: number;
  estimadasConversion: number;
  formatosIncompletos: number;
  fiabilidadPorcentaje: number;
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
    importeConfirmado: 0,
    importeEstimado: 0,
    partidasConfirmadas: 0,
    partidasSinImporte: 0,
    cantidadesEstimadas: 0,
    estimadasPesoVariable: 0,
    estimadasConversion: 0,
    formatosIncompletos: 0,
    fiabilidadPorcentaje: 100,
    ingredientesSinProducto: [],
    productosSinPrecio: [],
    comprasManualesSinPrecio: [],
    productosEstimados: [],
    partidasExcluidasDisponibilidad: 0,
    ingredientesNoDisponibles: [],
  });
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

function calcularFiabilidad(desglose: {
  partidasConfirmadas: number;
  estimadasPesoVariable: number;
  estimadasConversion: number;
  formatosIncompletos: number;
  partidasSinImporte: number;
  partidasExcluidasDisponibilidad: number;
}): number {
  const evaluadas =
    desglose.partidasConfirmadas +
    desglose.estimadasPesoVariable +
    desglose.estimadasConversion +
    desglose.formatosIncompletos +
    desglose.partidasSinImporte +
    desglose.partidasExcluidasDisponibilidad;

  if (evaluadas <= 0) return 100;

  const puntos =
    desglose.partidasConfirmadas +
    desglose.estimadasPesoVariable * 0.85 +
    desglose.estimadasConversion * 0.65 +
    desglose.formatosIncompletos * 0.25;

  return Math.max(0, Math.min(100, Math.round((puntos / evaluadas) * 100)));
}

function conFiabilidad(desglose: DesgloseEconomico): DesgloseEconomico {
  return {
    ...desglose,
    fiabilidadPorcentaje: calcularFiabilidad(desglose),
  };
}

function sumarDesgloses(
  desgloses: readonly DesgloseEconomico[],
): DesgloseEconomico {
  const unido = desgloses.reduce<DesgloseEconomico>(
    (total, desglose) => ({
      subtotalConocido: total.subtotalConocido + desglose.subtotalConocido,
      importeConfirmado: total.importeConfirmado + desglose.importeConfirmado,
      importeEstimado: total.importeEstimado + desglose.importeEstimado,
      partidasConfirmadas: total.partidasConfirmadas + desglose.partidasConfirmadas,
      partidasSinImporte:
        total.partidasSinImporte + desglose.partidasSinImporte,
      cantidadesEstimadas:
        total.cantidadesEstimadas + desglose.cantidadesEstimadas,
      estimadasPesoVariable:
        total.estimadasPesoVariable + desglose.estimadasPesoVariable,
      estimadasConversion:
        total.estimadasConversion + desglose.estimadasConversion,
      formatosIncompletos:
        total.formatosIncompletos + desglose.formatosIncompletos,
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

  return conFiabilidad(unido);
}

function desgloseCompra(
  compra: ResultadoCompra | null | undefined,
): DesgloseEconomico {
  if (!compra) return vacio();

  const lineasValoradas = compra.lineas.filter((linea) => linea.subtotal !== null);
  const confirmadas = lineasValoradas.filter((linea) => !linea.calculoEstimado);
  const estimadas = lineasValoradas.filter((linea) => linea.calculoEstimado);
  const estimadasPesoVariable = estimadas.filter(
    (linea) => linea.motivoEstimacion === 'peso-variable',
  ).length;
  const estimadasConversion = estimadas.filter(
    (linea) => linea.motivoEstimacion === 'conversion-aproximada',
  ).length;
  const formatosIncompletos = estimadas.filter(
    (linea) => linea.motivoEstimacion === 'formato-incompleto' || !linea.motivoEstimacion,
  ).length;

  return conFiabilidad({
    subtotalConocido: compra.total,
    importeConfirmado: confirmadas.reduce(
      (total, linea) => total + (linea.subtotal ?? 0),
      0,
    ),
    importeEstimado: estimadas.reduce(
      (total, linea) => total + (linea.subtotal ?? 0),
      0,
    ),
    partidasConfirmadas: confirmadas.length,
    partidasSinImporte:
      compra.productosSinSeleccionar.length + compra.productosSinPrecio.length,
    cantidadesEstimadas: estimadas.length,
    estimadasPesoVariable,
    estimadasConversion,
    formatosIncompletos,
    ingredientesSinProducto: unirNombres(compra.productosSinSeleccionar),
    productosSinPrecio: unirNombres(compra.productosSinPrecio),
    comprasManualesSinPrecio: [],
    productosEstimados: unirNombres(compra.productosEstimados),
    partidasExcluidasDisponibilidad: compra.ingredientesNoDisponibles?.length ?? 0,
    ingredientesNoDisponibles: unirNombres(
      (compra.ingredientesNoDisponibles ?? []).map((estado) => estado.ingrediente),
    ),
  });
}

function desgloseManuales(
  productos: readonly ProductoManualCompra[],
): DesgloseEconomico {
  const valorados = productos.filter((producto) => producto.precioTotal !== null);
  const subtotal = valorados.reduce(
    (total, producto) => total + (producto.precioTotal ?? 0),
    0,
  );

  return conFiabilidad({
    subtotalConocido: subtotal,
    importeConfirmado: subtotal,
    importeEstimado: 0,
    partidasConfirmadas: valorados.length,
    partidasSinImporte: productos.filter(
      (producto) => producto.precioTotal === null,
    ).length,
    cantidadesEstimadas: 0,
    estimadasPesoVariable: 0,
    estimadasConversion: 0,
    formatosIncompletos: 0,
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
