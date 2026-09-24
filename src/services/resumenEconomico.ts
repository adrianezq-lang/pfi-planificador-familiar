import type { ResultadoCompra } from '../motor/compra';
import {
  crearPeriodoIdCompraManual,
  type ProductoManualCompra,
} from './productosManualesCompra';

export type DesgloseEconomico = {
  subtotalConocido: number;
  partidasSinImporte: number;
  cantidadesEstimadas: number;
  ingredientesSinProducto: string[];
  productosSinPrecio: string[];
  comprasManualesSinPrecio: string[];
  productosEstimados: string[];
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
    ingredientesSinProducto: [],
    productosSinPrecio: [],
    comprasManualesSinPrecio: [],
    productosEstimados: [],
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
      partidasSinImporte:
        total.partidasSinImporte + desglose.partidasSinImporte,
      cantidadesEstimadas:
        total.cantidadesEstimadas + desglose.cantidadesEstimadas,
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
    ingredientesSinProducto: unirNombres(compra.productosSinSeleccionar),
    productosSinPrecio: unirNombres(compra.productosSinPrecio),
    comprasManualesSinPrecio: [],
    productosEstimados: unirNombres(compra.productosEstimados),
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
    ingredientesSinProducto: [],
    productosSinPrecio: [],
    comprasManualesSinPrecio: unirNombres(
      productos
        .filter((producto) => producto.precioTotal === null)
        .map((producto) => producto.nombre),
    ),
    productosEstimados: [],
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
