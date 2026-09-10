import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';

const KEY = 'pfi-excepciones-calendario-v1';
export const EVENTO_EXCEPCIONES = 'pfi-calendario-actualizado';

export type ExcepcionCalendario = {
  noEnCasa?: boolean;
  sinComida?: boolean;
  sinCena?: boolean;
  sinNinos?: boolean;
};
export type ExcepcionesCalendario = Record<string, ExcepcionCalendario>;

function normalizarExcepcion(valor: unknown): ExcepcionCalendario | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const entrada = valor as ExcepcionCalendario;
  const excepcion = {
    noEnCasa: entrada.noEnCasa === true,
    sinComida: entrada.sinComida === true,
    sinCena: entrada.sinCena === true,
    sinNinos: entrada.sinNinos === true,
  };
  return excepcion.noEnCasa || excepcion.sinComida || excepcion.sinCena || excepcion.sinNinos
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

/**
 * Marca sábado y domingo con una sola escritura, conservando cualquier otra
 * excepción que ya tuviera cada fecha (por ejemplo, una cena fuera de casa).
 */
export function guardarFinDeSemanaSinNinos(
  semana: SemanaMenu,
  sinNinos: boolean,
): string[] {
  const fechas = fechasFinDeSemana(semana);
  if (fechas.length === 0) return [];

  const data = cargarExcepciones();
  fechas.forEach((fecha) => {
    const normalizada = normalizarExcepcion({
      ...data[fecha],
      sinNinos,
    });
    if (normalizada) data[fecha] = normalizada;
    else delete data[fecha];
  });
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(EVENTO_EXCEPCIONES));
  return fechas;
}

export function finDeSemanaSinNinos(
  semana: SemanaMenu | undefined,
  excepciones = cargarExcepciones(),
): boolean {
  if (!semana) return false;
  const fechas = fechasFinDeSemana(semana);
  return fechas.length > 0 && fechas.every(
    (fecha) => excepciones[fecha]?.sinNinos === true,
  );
}

function isoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Incluye la otra mitad del fin de semana cuando cae en el mes contiguo. */
export function fechasFinDeSemana(semana: SemanaMenu): string[] {
  const visibles = fechasSemana(semana).filter(
    (fecha) => indiceDiaSemana(fecha) >= 5,
  );
  if (visibles.length === 0) return [];

  const resultado = new Set(visibles);
  const sabado = visibles.find((fecha) => indiceDiaSemana(fecha) === 5);
  const domingo = visibles.find((fecha) => indiceDiaSemana(fecha) === 6);
  if (sabado && !domingo) {
    const siguiente = new Date(`${sabado}T12:00:00`);
    siguiente.setDate(siguiente.getDate() + 1);
    resultado.add(isoLocal(siguiente));
  }
  if (domingo && !sabado) {
    const anterior = new Date(`${domingo}T12:00:00`);
    anterior.setDate(anterior.getDate() - 1);
    resultado.add(isoLocal(anterior));
  }
  return [...resultado].sort();
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
    sinNinos: excepcion?.sinNinos === true,
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
