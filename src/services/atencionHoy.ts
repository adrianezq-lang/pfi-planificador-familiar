import type { ItemConservacion } from './conservacion';
import type { ProductoDespensa } from './despensa';
import {
  describirExcepciones,
  type ExcepcionesSemana,
} from './excepcionesSemana';

export type AtencionConservacion = {
  id: string;
  nombre: string;
  detalle: string;
  dias: number;
  vencido: boolean;
};

export type ResumenAtencionHoy = {
  conservacion: AtencionConservacion[];
  excepciones: string[];
  stock: ProductoDespensa[];
  total: number;
};

function diasHasta(fechaIso: string, ahora: Date): number {
  const limite = new Date(fechaIso);
  if (Number.isNaN(limite.getTime())) return 9999;
  const inicioHoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  ).getTime();
  const inicioLimite = new Date(
    limite.getFullYear(),
    limite.getMonth(),
    limite.getDate(),
  ).getTime();
  return Math.round((inicioLimite - inicioHoy) / 86_400_000);
}

function detalleCaducidad(dias: number): string {
  if (dias < 0) return 'Fecha límite superada';
  if (dias === 0) return 'Consumir hoy';
  if (dias === 1) return 'Consumir mañana';
  return `Consumir en ${dias} días`;
}

function necesitaAvisoStock(producto: ProductoDespensa): boolean {
  if (producto.tipo === 'perecedero' || producto.frecuencia === 'manual') {
    return false;
  }

  const falta = Math.max(0, producto.stockObjetivo - producto.stockActual);
  return producto.stockActual <= producto.umbralAviso && falta > 0;
}

export function generarResumenAtencionHoy(
  conservacion: ItemConservacion[],
  excepciones: ExcepcionesSemana,
  despensa: ProductoDespensa[],
  ahora = new Date(),
): ResumenAtencionHoy {
  const conservacionUrgente = conservacion
    .filter((item) => item.fechaLimite)
    .map((item) => {
      const dias = diasHasta(item.fechaLimite as string, ahora);
      return {
        id: item.id,
        nombre: item.nombre,
        detalle: detalleCaducidad(dias),
        dias,
        vencido: dias < 0,
      };
    })
    .filter((item) => item.dias <= 2)
    .sort((a, b) => a.dias - b.dias || a.nombre.localeCompare(b.nombre, 'es'));

  const excepcionesActivas = describirExcepciones(excepciones);

  const stockBajo = despensa
    .filter(necesitaAvisoStock)
    .sort((a, b) => {
      const proporcionA = a.stockObjetivo > 0 ? a.stockActual / a.stockObjetivo : 1;
      const proporcionB = b.stockObjetivo > 0 ? b.stockActual / b.stockObjetivo : 1;
      return proporcionA - proporcionB || a.nombre.localeCompare(b.nombre, 'es');
    });

  return {
    conservacion: conservacionUrgente,
    excepciones: excepcionesActivas,
    stock: stockBajo,
    total:
      conservacionUrgente.length +
      excepcionesActivas.length +
      stockBajo.length,
  };
}
