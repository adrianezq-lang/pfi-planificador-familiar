import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';

const KEY = 'pfi-excepciones-calendario-v1';
export const EVENTO_EXCEPCIONES = 'pfi-calendario-actualizado';

export type ExcepcionCalendario = {
  noEnCasa?: boolean;
  sinComida?: boolean;
  sinCena?: boolean;
};
export type ExcepcionesCalendario = Record<string, ExcepcionCalendario>;

function normalizarExcepcion(valor: unknown): ExcepcionCalendario | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const entrada = valor as ExcepcionCalendario;
  const excepcion = {
    noEnCasa: entrada.noEnCasa === true,
    sinComida: entrada.sinComida === true,
    sinCena: entrada.sinCena === true,
  };
  return excepcion.noEnCasa || excepcion.sinComida || excepcion.sinCena
    ? excepcion
    : null;
}

export function cargarExcepciones(): ExcepcionesCalendario {
  try {
    const valor = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown;
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return {};
    return Object.fromEntries(
      Object.entries(valor).flatMap(([fecha, entrada]) => {
        const excepcion = normalizarExcepcion(entrada);
        return excepcion ? [[fecha, excepcion]] : [];
      }),
    );
  } catch {
    return {};
  }
}

export function guardarExcepcion(
  id: string,
  excepcion: ExcepcionCalendario | null,
): void {
  const data = cargarExcepciones();
  const normalizada = normalizarExcepcion(excepcion);
  if (normalizada) data[id] = normalizada;
  else delete data[id];
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(EVENTO_EXCEPCIONES));
}

function isoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function fechasSemana(semana: SemanaMenu): string[] {
  if (!semana.inicio || !semana.fin) return [];
  const inicio = new Date(`${semana.inicio}T12:00:00`);
  const fin = new Date(`${semana.fin}T12:00:00`);
  const fechas: string[] = [];
  for (const cursor = new Date(inicio); cursor <= fin; cursor.setDate(cursor.getDate() + 1)) {
    fechas.push(isoLocal(cursor));
  }
  return fechas;
}

export function indiceDiaSemana(fechaIso: string): number {
  const dia = new Date(`${fechaIso}T12:00:00`).getDay();
  return dia === 0 ? 6 : dia - 1;
}

export function aplicarExcepcionDia(
  dia: DiaMenu,
  excepcion?: ExcepcionCalendario,
): DiaMenu | null {
  if (excepcion?.noEnCasa || (excepcion?.sinComida && excepcion?.sinCena)) return null;
  return {
    ...dia,
    comida: excepcion?.sinComida ? [] : [...dia.comida],
    cena: excepcion?.sinCena ? [] : [...dia.cena],
    postreComida: excepcion?.sinComida ? 'Sin postre' : dia.postreComida,
    postreCena: excepcion?.sinCena ? 'Sin postre' : dia.postreCena,
    postreComidaReceta: excepcion?.sinComida ? 'Sin postre' : dia.postreComidaReceta,
    postreCenaReceta: excepcion?.sinCena ? 'Sin postre' : dia.postreCenaReceta,
  };
}

export function menuEfectivoSemana(
  semana: SemanaMenu | undefined,
  excepciones = cargarExcepciones(),
): DiaMenu[] {
  if (!semana || semana.excluida) return [];
  const fechas = fechasSemana(semana);
  if (!fechas.length) return semana.menu.map((dia) => ({ ...dia }));
  return fechas.flatMap((fecha) => {
    const dia = semana.menu[indiceDiaSemana(fecha)];
    if (!dia) return [];
    const efectivo = aplicarExcepcionDia(dia, excepciones[fecha]);
    return efectivo ? [efectivo] : [];
  });
}

export function menuEfectivoMes(
  semanas: SemanaMenu[],
  excepciones = cargarExcepciones(),
): DiaMenu[] {
  return semanas.flatMap((semana) => menuEfectivoSemana(semana, excepciones));
}
