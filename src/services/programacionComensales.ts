import {
  cargarPerfil,
  type ConfiguracionComensales,
  type MomentoComida,
  type PerfilFamiliar,
  type PlanComensales,
} from './perfil';

export type CambioComensalesProgramado = {
  id: string;
  desde: string;
  hasta?: string;
  etiqueta: string;
  comensales: PlanComensales;
  creadoEn: string;
};

export type NuevoCambioComensalesProgramado = {
  desde: string;
  hasta?: string;
  etiqueta?: string;
  comensales: PlanComensales;
};

const CLAVE_PROGRAMACION = 'pfi-programacion-comensales-v1';
export const EVENTO_PROGRAMACION_COMENSALES =
  'pfi-programacion-comensales-actualizada';

function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00`);
  return Number.isFinite(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor;
}

function clonarConfiguracion(
  configuracion: ConfiguracionComensales,
): ConfiguracionComensales {
  return {
    adultos: configuracion.adultos,
    ninos: [...configuracion.ninos],
    bebes: configuracion.bebes,
  };
}

export function clonarPlanComensales(plan: PlanComensales): PlanComensales {
  return {
    comidaLaborable: clonarConfiguracion(plan.comidaLaborable),
    comidaFinSemana: clonarConfiguracion(plan.comidaFinSemana),
    cena: clonarConfiguracion(plan.cena),
  };
}

function normalizarConfiguracion(
  valor: ConfiguracionComensales,
  perfil: PerfilFamiliar,
): ConfiguracionComensales {
  return {
    adultos: Math.max(
      0,
      Math.min(perfil.adultos, Math.round(Number(valor.adultos) || 0)),
    ),
    ninos: Array.from(
      { length: perfil.ninos },
      (_, indice) => valor.ninos?.[indice] === true,
    ),
    bebes: perfil.bebesComenMenu
      ? Math.max(
          0,
          Math.min(perfil.bebes, Math.round(Number(valor.bebes) || 0)),
        )
      : 0,
  };
}

function normalizarPlan(
  plan: PlanComensales,
  perfil: PerfilFamiliar,
): PlanComensales {
  return {
    comidaLaborable: normalizarConfiguracion(plan.comidaLaborable, perfil),
    comidaFinSemana: normalizarConfiguracion(plan.comidaFinSemana, perfil),
    cena: normalizarConfiguracion(plan.cena, perfil),
  };
}

function sanearCambio(
  valor: unknown,
  perfil: PerfilFamiliar,
): CambioComensalesProgramado | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const item = valor as Partial<CambioComensalesProgramado>;
  if (
    typeof item.id !== 'string' ||
    !fechaValida(item.desde ?? '') ||
    !item.comensales ||
    typeof item.comensales !== 'object'
  ) {
    return null;
  }
  const hasta =
    typeof item.hasta === 'string' && fechaValida(item.hasta)
      ? item.hasta
      : undefined;
  if (hasta && hasta < item.desde!) return null;

  return {
    id: item.id,
    desde: item.desde!,
    hasta,
    etiqueta:
      typeof item.etiqueta === 'string' && item.etiqueta.trim()
        ? item.etiqueta.trim()
        : 'Cambio de comensales',
    comensales: normalizarPlan(item.comensales as PlanComensales, perfil),
    creadoEn:
      typeof item.creadoEn === 'string' && item.creadoEn
        ? item.creadoEn
        : new Date().toISOString(),
  };
}

export function cargarProgramacionComensales(
  perfil: PerfilFamiliar = cargarPerfil(),
): CambioComensalesProgramado[] {
  try {
    const datos = JSON.parse(
      localStorage.getItem(CLAVE_PROGRAMACION) ?? '[]',
    ) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos
      .map((item) => sanearCambio(item, perfil))
      .filter((item): item is CambioComensalesProgramado => item !== null)
      .sort((a, b) =>
        a.desde.localeCompare(b.desde) ||
        a.creadoEn.localeCompare(b.creadoEn),
      );
  } catch {
    return [];
  }
}

function guardar(
  cambios: CambioComensalesProgramado[],
): CambioComensalesProgramado[] {
  localStorage.setItem(CLAVE_PROGRAMACION, JSON.stringify(cambios));
  window.dispatchEvent(new CustomEvent(EVENTO_PROGRAMACION_COMENSALES));
  return cambios;
}

export function programarCambioComensales(
  nuevo: NuevoCambioComensalesProgramado,
  perfil: PerfilFamiliar = cargarPerfil(),
): CambioComensalesProgramado[] {
  if (!fechaValida(nuevo.desde)) {
    throw new Error('Indica una fecha válida para empezar el cambio.');
  }
  if (nuevo.hasta && !fechaValida(nuevo.hasta)) {
    throw new Error('La fecha final no es válida.');
  }
  if (nuevo.hasta && nuevo.hasta < nuevo.desde) {
    throw new Error('La fecha final no puede ser anterior a la inicial.');
  }

  const cambio: CambioComensalesProgramado = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    desde: nuevo.desde,
    hasta: nuevo.hasta || undefined,
    etiqueta: nuevo.etiqueta?.trim() || 'Cambio de comensales',
    comensales: normalizarPlan(nuevo.comensales, perfil),
    creadoEn: new Date().toISOString(),
  };

  return guardar([
    ...cargarProgramacionComensales(perfil),
    cambio,
  ].sort((a, b) => a.desde.localeCompare(b.desde)));
}

export function eliminarCambioComensalesProgramado(
  id: string,
  perfil: PerfilFamiliar = cargarPerfil(),
): CambioComensalesProgramado[] {
  return guardar(
    cargarProgramacionComensales(perfil).filter((item) => item.id !== id),
  );
}

export function cambioComensalesActivoEnFecha(
  fecha: string,
  perfil: PerfilFamiliar = cargarPerfil(),
  programacion = cargarProgramacionComensales(perfil),
): CambioComensalesProgramado | null {
  if (!fechaValida(fecha)) return null;
  return programacion
    .filter(
      (item) =>
        item.desde <= fecha &&
        (!item.hasta || item.hasta >= fecha),
    )
    .sort((a, b) =>
      b.desde.localeCompare(a.desde) ||
      b.creadoEn.localeCompare(a.creadoEn),
    )[0] ?? null;
}

function esFinDeSemana(dia: string): boolean {
  const normalizado = dia
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return normalizado === 'sabado' || normalizado === 'domingo';
}

export function obtenerConfiguracionComensalesProgramada(
  fecha: string,
  momento: MomentoComida,
  dia: string,
  perfil: PerfilFamiliar = cargarPerfil(),
): ConfiguracionComensales | null {
  const cambio = cambioComensalesActivoEnFecha(fecha, perfil);
  if (!cambio) return null;
  const configuracion =
    momento === 'cena'
      ? cambio.comensales.cena
      : esFinDeSemana(dia)
        ? cambio.comensales.comidaFinSemana
        : cambio.comensales.comidaLaborable;
  return clonarConfiguracion(configuracion);
}
