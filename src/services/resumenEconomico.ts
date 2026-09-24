import type { ResultadoCompra } from '../motor/compra';
import {
  crearPeriodoIdCompraManual,
  type ProductoManualCompra,
} from './productosManualesCompra';

export type DesgloseEconomico = {
  subtotalConocido: number;
  partidasSinImporte: number;
  cantidadesEstimadas: number;
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
    partidasSinImporte: 0,
    cantidadesEstimadas: 0,
  };
}

function sumarDesgloses(
  desgloses: readonly DesgloseEconomico[],
): DesgloseEconomico {
  return desgloses.reduce<DesgloseEconomico>(
    (total, desglose) => ({
      subtotalConocido: total.subtotalConocido + desglose.subtotalConocido,
      partidasSinImporte:
        total.partidasSinImporte + desglose.partidasSinImporte,
      cantidadesEstimadas:
        total.cantidadesEstimadas + desglose.cantidadesEstimadas,
    }),
    vacio(),
  );
}

function desgloseCompra(
  compra: ResultadoCompra | null | undefined,
): DesgloseEconomico {
  if (!compra) return vacio();

  return {
    subtotalConocido: compra.total,
    partidasSinImporte:
      compra.productosSinSeleccionar.length + compra.productosSinPrecio.length,
    cantidadesEstimadas: compra.productosEstimados.length,
  };
}

function desgloseManuales(
  productos: readonly ProductoManualCompra[],
): DesgloseEconomico {
  return {
    subtotalConocido: productos.reduce(
      (total, producto) => total + (producto.precioTotal ?? 0),
      0,
    ),
    partidasSinImporte: productos.filter(
      (producto) => producto.precioTotal === null,
    ).length,
    cantidadesEstimadas: 0,
  };
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
