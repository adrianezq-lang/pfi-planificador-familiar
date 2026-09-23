import type { SemanaMenu } from '../data/MenuMensual';

type RangoSemana = Pick<SemanaMenu, 'inicio' | 'fin'>;

export function fechaLocalISO(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function semanaContieneFecha(
  semana: RangoSemana | undefined,
  fecha: Date = new Date(),
): boolean {
  const hoy = fechaLocalISO(fecha);
  return Boolean(semana?.inicio && semana.fin && semana.inicio <= hoy && hoy <= semana.fin);
}

export function indiceSemanaParaFecha(
  semanas: readonly RangoSemana[],
  fecha: Date = new Date(),
): number {
  const indice = semanas.findIndex((semana) => semanaContieneFecha(semana, fecha));
  return indice < 0 ? 0 : indice;
}

export function indiceDiaParaFecha(
  semana: RangoSemana | undefined,
  fecha: Date = new Date(),
): number {
  if (!semana?.inicio || !semanaContieneFecha(semana, fecha)) return 0;
  const [anio, mes, dia] = semana.inicio.split('-').map(Number);
  const [anioHoy, mesHoy, diaHoy] = fechaLocalISO(fecha).split('-').map(Number);
  return Math.round(
    (Date.UTC(anioHoy, mesHoy - 1, diaHoy) - Date.UTC(anio, mes - 1, dia)) /
      86400000,
  );
}
