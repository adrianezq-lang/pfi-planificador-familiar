import type { DiaMenu } from '../data/Menusemanal';
import type { PerfilFamiliar } from './perfil';

export type MomentoExcepcion = 'comida' | 'cena';

export type ExcepcionesSemana = {
  soloAdultos: boolean;
  fueraTodaSemana: boolean;
  comidasFuera: Record<string, Partial<Record<MomentoExcepcion, boolean>>>;
};

const CLAVE = 'pfi-excepciones-semana-v156';
const CLAVE_SEMANA_ACTIVA = 'pfi-semana-activa';
export const EVENTO_EXCEPCIONES_SEMANA = 'pfi:excepciones-semana-actualizadas';

function vacias(): ExcepcionesSemana {
  return { soloAdultos: false, fueraTodaSemana: false, comidasFuera: {} };
}

function indiceSeguro(indice?: number): number {
  if (Number.isInteger(indice) && Number(indice) >= 0) return Number(indice);
  try {
    const guardado = Number(localStorage.getItem(CLAVE_SEMANA_ACTIVA));
    return Number.isInteger(guardado) && guardado >= 0 ? guardado : 0;
  } catch {
    return 0;
  }
}

function normalizar(valor: unknown): ExcepcionesSemana {
  if (!valor || typeof valor !== 'object') return vacias();
  const parcial = valor as Partial<ExcepcionesSemana>;
  const comidasFuera: ExcepcionesSemana['comidasFuera'] = {};

  if (parcial.comidasFuera && typeof parcial.comidasFuera === 'object') {
    Object.entries(parcial.comidasFuera).forEach(([dia, momentos]) => {
      if (!momentos || typeof momentos !== 'object') return;
      const m = momentos as Partial<Record<MomentoExcepcion, unknown>>;
      const limpio: Partial<Record<MomentoExcepcion, boolean>> = {};
      if (m.comida === true) limpio.comida = true;
      if (m.cena === true) limpio.cena = true;
      if (Object.keys(limpio).length > 0) comidasFuera[dia] = limpio;
    });
  }

  return {
    soloAdultos: parcial.soloAdultos === true,
    fueraTodaSemana: parcial.fueraTodaSemana === true,
    comidasFuera,
  };
}

function cargarMapa(): Record<string, ExcepcionesSemana> {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const salida: Record<string, ExcepcionesSemana> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([clave, valor]) => {
      salida[clave] = normalizar(valor);
    });
    return salida;
  } catch {
    return {};
  }
}

export function cargarExcepcionesSemana(indice?: number): ExcepcionesSemana {
  return cargarMapa()[String(indiceSeguro(indice))] ?? vacias();
}

export function guardarExcepcionesSemana(
  excepciones: ExcepcionesSemana,
  indice?: number,
): ExcepcionesSemana {
  const semana = indiceSeguro(indice);
  const mapa = cargarMapa();
  const normalizadas = normalizar(excepciones);
  mapa[String(semana)] = normalizadas;
  localStorage.setItem(CLAVE, JSON.stringify(mapa));
  window.dispatchEvent(new CustomEvent(EVENTO_EXCEPCIONES_SEMANA, { detail: { semana } }));
  return normalizadas;
}

export function limpiarExcepcionesSemana(indice?: number): void {
  const semana = indiceSeguro(indice);
  const mapa = cargarMapa();
  delete mapa[String(semana)];
  localStorage.setItem(CLAVE, JSON.stringify(mapa));
  window.dispatchEvent(new CustomEvent(EVENTO_EXCEPCIONES_SEMANA, { detail: { semana } }));
}

export function alternarComidaFuera(
  dia: string,
  momento: MomentoExcepcion,
  indice?: number,
): ExcepcionesSemana {
  const actual = cargarExcepcionesSemana(indice);
  const diaActual = actual.comidasFuera[dia] ?? {};
  const siguienteValor = diaActual[momento] !== true;
  const nuevoDia = { ...diaActual, [momento]: siguienteValor };
  if (!siguienteValor) delete nuevoDia[momento];

  const comidasFuera = { ...actual.comidasFuera };
  if (Object.keys(nuevoDia).length === 0) delete comidasFuera[dia];
  else comidasFuera[dia] = nuevoDia;

  return guardarExcepcionesSemana({ ...actual, comidasFuera }, indice);
}

export function perfilTemporalParaSemana(
  perfil: PerfilFamiliar,
  excepciones: ExcepcionesSemana,
): PerfilFamiliar {
  if (!excepciones.soloAdultos) {
    return { ...perfil, edadesNinos: [...perfil.edadesNinos] };
  }

  return {
    ...perfil,
    ninos: 0,
    edadesNinos: [],
    bebes: 0,
    bebesComenMenu: false,
  };
}

export function aplicarExcepcionesAlMenu(
  menu: DiaMenu[],
  excepciones: ExcepcionesSemana,
): DiaMenu[] {
  return menu.map((dia) => {
    const fuera = excepciones.comidasFuera[dia.dia] ?? {};
    const sinComida = excepciones.fueraTodaSemana || fuera.comida === true;
    const sinCena = excepciones.fueraTodaSemana || fuera.cena === true;

    return {
      ...dia,
      comida: sinComida ? [] : [...dia.comida],
      cena: sinCena ? [] : [...dia.cena],
      ...(sinComida
        ? {
            postreComida: 'Sin postre' as const,
            postreComidaReceta: 'Sin postre',
            detallePostreComida: 'Sin postre',
            cantidadPostreComida: 0,
          }
        : {}),
      ...(sinCena
        ? {
            postreCena: 'Sin postre' as const,
            postreCenaReceta: 'Sin postre',
            detallePostreCena: 'Sin postre',
            cantidadPostreCena: 0,
          }
        : {}),
    };
  });
}

export function hayExcepcionesActivas(excepciones: ExcepcionesSemana): boolean {
  return (
    excepciones.soloAdultos ||
    excepciones.fueraTodaSemana ||
    Object.keys(excepciones.comidasFuera).length > 0
  );
}

export function describirExcepciones(excepciones: ExcepcionesSemana): string[] {
  const salida: string[] = [];
  if (excepciones.soloAdultos) salida.push('Solo adultos esta semana');
  if (excepciones.fueraTodaSemana) salida.push('No comemos en casa esta semana');
  Object.entries(excepciones.comidasFuera).forEach(([dia, momentos]) => {
    if (momentos.comida) salida.push(`${dia}: comida fuera`);
    if (momentos.cena) salida.push(`${dia}: cena fuera`);
  });
  return salida;
}
