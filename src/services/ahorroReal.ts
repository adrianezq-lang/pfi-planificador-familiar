import { fechaLocalISO } from './fechaSemana.ts';

const CLAVE_AHORRO_REAL = 'pfi-ahorro-real-v1';
export const EVENTO_AHORRO_REAL = 'pfi:ahorro-real-actualizado';

export type OrigenImporteReal =
  | 'mercadona'
  | 'catalogo'
  | 'precio-registrado';

export type RegistroAhorroReal = {
  id: string;
  referencia: string;
  fecha: string;
  productoId: string | null;
  productoNombre: string;
  tiendaId: string;
  tiendaNombre: string;
  costeReferencia: number;
  costePagado: number;
  ahorro: number;
  origenImporte: OrigenImporteReal;
  observaciones: string;
};

export type ResumenAhorroReal = {
  mes: string;
  comprasComparadas: number;
  costeReferencia: number;
  costePagado: number;
  ahorroNeto: number;
  ahorroPositivo: number;
  sobrecoste: number;
  registros: RegistroAhorroReal[];
};

type EntradaAhorroReal = Omit<RegistroAhorroReal, 'id' | 'fecha' | 'ahorro'>;

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function esOrigenImporte(valor: unknown): valor is OrigenImporteReal {
  return valor === 'mercadona' || valor === 'catalogo' || valor === 'precio-registrado';
}

function normalizarRegistro(valor: unknown): RegistroAhorroReal | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const registro = valor as Partial<RegistroAhorroReal>;
  if (
    typeof registro.id !== 'string' ||
    typeof registro.referencia !== 'string' ||
    typeof registro.fecha !== 'string' ||
    typeof registro.productoNombre !== 'string' ||
    typeof registro.tiendaId !== 'string' ||
    typeof registro.tiendaNombre !== 'string' ||
    typeof registro.costeReferencia !== 'number' ||
    !Number.isFinite(registro.costeReferencia) ||
    typeof registro.costePagado !== 'number' ||
    !Number.isFinite(registro.costePagado) ||
    !esOrigenImporte(registro.origenImporte)
  ) {
    return null;
  }

  const costeReferencia = redondear(Math.max(0, registro.costeReferencia));
  const costePagado = redondear(Math.max(0, registro.costePagado));
  return {
    id: registro.id,
    referencia: registro.referencia,
    fecha: registro.fecha,
    productoId: typeof registro.productoId === 'string' ? registro.productoId : null,
    productoNombre: registro.productoNombre,
    tiendaId: registro.tiendaId,
    tiendaNombre: registro.tiendaNombre,
    costeReferencia,
    costePagado,
    ahorro: redondear(costeReferencia - costePagado),
    origenImporte: registro.origenImporte,
    observaciones: typeof registro.observaciones === 'string' ? registro.observaciones : '',
  };
}

export function cargarAhorroReal(): RegistroAhorroReal[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_AHORRO_REAL) ?? '[]') as unknown;
    if (!Array.isArray(datos)) return [];
    return datos
      .map(normalizarRegistro)
      .filter((registro): registro is RegistroAhorroReal => registro !== null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  } catch {
    return [];
  }
}

function guardar(registros: RegistroAhorroReal[]): RegistroAhorroReal[] {
  localStorage.setItem(CLAVE_AHORRO_REAL, JSON.stringify(registros));
  window.dispatchEvent(new CustomEvent(EVENTO_AHORRO_REAL));
  return registros;
}

export function registrarAhorroReal(entrada: EntradaAhorroReal): RegistroAhorroReal[] {
  const costeReferencia = redondear(Math.max(0, entrada.costeReferencia));
  const costePagado = redondear(Math.max(0, entrada.costePagado));
  if (
    !entrada.referencia.trim() ||
    !entrada.productoNombre.trim() ||
    !Number.isFinite(costeReferencia) ||
    !Number.isFinite(costePagado)
  ) {
    return cargarAhorroReal();
  }

  const actuales = cargarAhorroReal();
  if (actuales.some((registro) => registro.referencia === entrada.referencia)) {
    return actuales;
  }

  const fecha = new Date().toISOString();
  const nuevo: RegistroAhorroReal = {
    ...entrada,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fecha,
    costeReferencia,
    costePagado,
    ahorro: redondear(costeReferencia - costePagado),
  };
  return guardar([nuevo, ...actuales]);
}

export function eliminarRegistroAhorroReal(id: string): RegistroAhorroReal[] {
  return guardar(cargarAhorroReal().filter((registro) => registro.id !== id));
}

export function resumirAhorroRealMes(
  mes: string,
  registros = cargarAhorroReal(),
): ResumenAhorroReal {
  const delMes = registros.filter((registro) => {
    const fecha = new Date(registro.fecha);
    const mesLocal = Number.isNaN(fecha.getTime())
      ? registro.fecha.slice(0, 7)
      : fechaLocalISO(fecha).slice(0, 7);
    return mesLocal === mes;
  });
  const costeReferencia = redondear(
    delMes.reduce((total, registro) => total + registro.costeReferencia, 0),
  );
  const costePagado = redondear(
    delMes.reduce((total, registro) => total + registro.costePagado, 0),
  );
  const ahorroNeto = redondear(costeReferencia - costePagado);
  return {
    mes,
    comprasComparadas: delMes.length,
    costeReferencia,
    costePagado,
    ahorroNeto,
    ahorroPositivo: redondear(
      delMes.reduce((total, registro) => total + Math.max(0, registro.ahorro), 0),
    ),
    sobrecoste: redondear(
      delMes.reduce((total, registro) => total + Math.max(0, -registro.ahorro), 0),
    ),
    registros: delMes,
  };
}
