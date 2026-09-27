const CLAVE_COMPRAS_REALES = 'pfi-compras-reales-v1';
export const EVENTO_COMPRAS_REALES = 'pfi:compras-reales-actualizadas';

export type PeriodoCompraReal = 'semana' | 'mes';
export type OrigenCompraReal = 'lista-automatica' | 'lista-manual';

export type RegistroCompraReal = {
  id: string;
  referencia: string;
  fecha: string;
  mes: string;
  periodo: PeriodoCompraReal;
  semana: number | null;
  productoId: string | null;
  productoNombre: string;
  tiendaNombre: string | null;
  costePrevisto: number | null;
  costePagado: number | null;
  origen: OrigenCompraReal;
  observaciones: string;
};

export type ResumenComprasReales = {
  mes: string;
  comprasRegistradas: number;
  importesConfirmados: number;
  importesPendientes: number;
  costePrevistoSustituido: number;
  costePagado: number;
  ajustePrevision: number;
  registros: RegistroCompraReal[];
};

type EntradaCompraReal = Omit<RegistroCompraReal, 'id' | 'fecha'>;

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function importeOpcional(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? redondear(Math.max(0, valor))
    : null;
}

function esPeriodo(valor: unknown): valor is PeriodoCompraReal {
  return valor === 'semana' || valor === 'mes';
}

function esOrigen(valor: unknown): valor is OrigenCompraReal {
  return valor === 'lista-automatica' || valor === 'lista-manual';
}

function normalizarRegistro(valor: unknown): RegistroCompraReal | null {
  if (!valor || typeof valor !== 'object') return null;
  const registro = valor as Partial<RegistroCompraReal>;
  if (
    typeof registro.id !== 'string' ||
    typeof registro.referencia !== 'string' ||
    typeof registro.fecha !== 'string' ||
    typeof registro.mes !== 'string' ||
    !/^\d{4}-\d{2}$/.test(registro.mes) ||
    !esPeriodo(registro.periodo) ||
    typeof registro.productoNombre !== 'string' ||
    !esOrigen(registro.origen)
  ) {
    return null;
  }

  return {
    id: registro.id,
    referencia: registro.referencia,
    fecha: registro.fecha,
    mes: registro.mes,
    periodo: registro.periodo,
    semana:
      registro.periodo === 'semana' &&
      typeof registro.semana === 'number' &&
      Number.isInteger(registro.semana) &&
      registro.semana > 0
        ? registro.semana
        : null,
    productoId: typeof registro.productoId === 'string' ? registro.productoId : null,
    productoNombre: registro.productoNombre,
    tiendaNombre:
      typeof registro.tiendaNombre === 'string' ? registro.tiendaNombre : null,
    costePrevisto: importeOpcional(registro.costePrevisto),
    costePagado: importeOpcional(registro.costePagado),
    origen: registro.origen,
    observaciones:
      typeof registro.observaciones === 'string' ? registro.observaciones : '',
  };
}

export function cargarComprasReales(): RegistroCompraReal[] {
  try {
    const datos = JSON.parse(
      localStorage.getItem(CLAVE_COMPRAS_REALES) ?? '[]',
    ) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos
      .map(normalizarRegistro)
      .filter((registro): registro is RegistroCompraReal => registro !== null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  } catch {
    return [];
  }
}

function guardar(registros: RegistroCompraReal[]): RegistroCompraReal[] {
  localStorage.setItem(CLAVE_COMPRAS_REALES, JSON.stringify(registros));
  window.dispatchEvent(new CustomEvent(EVENTO_COMPRAS_REALES));
  return registros;
}

export function registrarCompraReal(entrada: EntradaCompraReal): RegistroCompraReal[] {
  if (
    !entrada.referencia.trim() ||
    !entrada.productoNombre.trim() ||
    !/^\d{4}-\d{2}$/.test(entrada.mes)
  ) {
    return cargarComprasReales();
  }

  const actuales = cargarComprasReales();
  if (actuales.some((registro) => registro.referencia === entrada.referencia)) {
    return actuales;
  }

  const nuevo: RegistroCompraReal = {
    ...entrada,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fecha: new Date().toISOString(),
    costePrevisto: importeOpcional(entrada.costePrevisto),
    costePagado: importeOpcional(entrada.costePagado),
  };
  return guardar([nuevo, ...actuales]);
}

export function eliminarRegistroCompraReal(id: string): RegistroCompraReal[] {
  return guardar(cargarComprasReales().filter((registro) => registro.id !== id));
}

export function confirmarImporteCompraReal(
  referencia: string,
  costePagado: number,
  costePrevisto?: number | null,
): RegistroCompraReal[] {
  const pagado = importeOpcional(costePagado);
  if (pagado === null) return cargarComprasReales();

  let actualizado = false;
  const registros = cargarComprasReales().map((registro) => {
    if (registro.referencia !== referencia) return registro;
    actualizado = true;
    return {
      ...registro,
      costePagado: pagado,
      costePrevisto:
        costePrevisto === undefined
          ? registro.costePrevisto
          : importeOpcional(costePrevisto),
    };
  });
  return actualizado ? guardar(registros) : registros;
}

export function resumirComprasRealesMes(
  mes: string,
  registros = cargarComprasReales(),
): ResumenComprasReales {
  const delMes = registros.filter((registro) => registro.mes === mes);
  const confirmados = delMes.filter((registro) => registro.costePagado !== null);
  const costePrevistoSustituido = redondear(
    confirmados.reduce(
      (total, registro) => total + (registro.costePrevisto ?? 0),
      0,
    ),
  );
  const costePagado = redondear(
    confirmados.reduce(
      (total, registro) => total + (registro.costePagado ?? 0),
      0,
    ),
  );

  return {
    mes,
    comprasRegistradas: delMes.length,
    importesConfirmados: confirmados.length,
    importesPendientes: delMes.length - confirmados.length,
    costePrevistoSustituido,
    costePagado,
    ajustePrevision: redondear(costePagado - costePrevistoSustituido),
    registros: delMes,
  };
}
