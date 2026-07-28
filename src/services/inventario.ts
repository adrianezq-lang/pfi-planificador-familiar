export type TipoMovimiento =
  | 'compra'
  | 'consumo'
  | 'ajuste';

export type OrigenMovimiento =
  | 'manual'
  | 'menu'
  | 'reposicion';

export type MovimientoInventario = {
  id: string;
  productoId: string;
  tipo: TipoMovimiento;
  origen: OrigenMovimiento;
  cantidad: number;
  fecha: string;
  observaciones?: string;
};

const CLAVE_MOVIMIENTOS =
  'pfi-inventario-movimientos';
export const EVENTO_INVENTARIO =
  'pfi:inventario-actualizado';

function crearId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function esTipoMovimiento(
  valor: unknown,
): valor is TipoMovimiento {
  return (
    valor === 'compra' ||
    valor === 'consumo' ||
    valor === 'ajuste'
  );
}

function esOrigenMovimiento(
  valor: unknown,
): valor is OrigenMovimiento {
  return (
    valor === 'manual' ||
    valor === 'menu' ||
    valor === 'reposicion'
  );
}

function normalizarMovimiento(
  valor: unknown,
): MovimientoInventario | null {
  if (
    typeof valor !== 'object' ||
    valor === null
  ) {
    return null;
  }

  const movimiento = valor as Partial<MovimientoInventario>;

  if (
    typeof movimiento.id !== 'string' ||
    typeof movimiento.productoId !== 'string' ||
    !esTipoMovimiento(movimiento.tipo) ||
    !esOrigenMovimiento(movimiento.origen) ||
    typeof movimiento.cantidad !== 'number' ||
    !Number.isFinite(movimiento.cantidad) ||
    typeof movimiento.fecha !== 'string'
  ) {
    return null;
  }

  return {
    id: movimiento.id,
    productoId: movimiento.productoId,
    tipo: movimiento.tipo,
    origen: movimiento.origen,
    cantidad: movimiento.cantidad,
    fecha: movimiento.fecha,
    observaciones:
      typeof movimiento.observaciones === 'string'
        ? movimiento.observaciones
        : undefined,
  };
}

export function cargarMovimientos(): MovimientoInventario[] {
  try {
    const raw = localStorage.getItem(
      CLAVE_MOVIMIENTOS,
    );

    if (!raw) {
      return [];
    }

    const datos = JSON.parse(raw) as unknown;

    if (!Array.isArray(datos)) {
      return [];
    }

    return datos
      .map(normalizarMovimiento)
      .filter(
        (
          movimiento,
        ): movimiento is MovimientoInventario =>
          movimiento !== null,
      )
      .sort((a, b) =>
        b.fecha.localeCompare(a.fecha),
      );
  } catch {
    return [];
  }
}

function guardarMovimientos(
  movimientos: MovimientoInventario[],
): void {
  localStorage.setItem(
    CLAVE_MOVIMIENTOS,
    JSON.stringify(movimientos),
  );

  window.dispatchEvent(
    new Event(EVENTO_INVENTARIO),
  );
}

function registrarMovimiento(
  movimiento: Omit<
    MovimientoInventario,
    'id' | 'fecha'
  >,
): MovimientoInventario[] {
  if (
    !Number.isFinite(movimiento.cantidad) ||
    movimiento.cantidad === 0
  ) {
    return cargarMovimientos();
  }

  const nuevo: MovimientoInventario = {
    ...movimiento,
    id: crearId(),
    fecha: new Date().toISOString(),
  };

  const movimientos = [
    nuevo,
    ...cargarMovimientos(),
  ];

  guardarMovimientos(movimientos);
  return movimientos;
}

export function registrarCompra(
  productoId: string,
  cantidad: number,
  observaciones = '',
): MovimientoInventario[] {
  return registrarMovimiento({
    productoId,
    tipo: 'compra',
    origen: 'reposicion',
    cantidad: Math.abs(cantidad),
    observaciones,
  });
}

export function registrarConsumo(
  productoId: string,
  cantidad: number,
  origen: OrigenMovimiento = 'menu',
  observaciones = '',
): MovimientoInventario[] {
  return registrarMovimiento({
    productoId,
    tipo: 'consumo',
    origen,
    cantidad: Math.abs(cantidad),
    observaciones,
  });
}

export function registrarAjuste(
  productoId: string,
  cantidad: number,
  observaciones = '',
): MovimientoInventario[] {
  return registrarMovimiento({
    productoId,
    tipo: 'ajuste',
    origen: 'manual',
    cantidad,
    observaciones,
  });
}

export function movimientosProducto(
  productoId: string,
): MovimientoInventario[] {
  return cargarMovimientos().filter(
    (movimiento) =>
      movimiento.productoId === productoId,
  );
}

export function obtenerStockActual(
  productoId: string,
): number {
  return movimientosProducto(productoId).reduce(
    (stock, movimiento) => {
      if (movimiento.tipo === 'consumo') {
        return stock - movimiento.cantidad;
      }

      return stock + movimiento.cantidad;
    },
    0,
  );
}

export function registrarAjusteStock(
  productoId: string,
  stockDeseado: number,
  observaciones = 'Ajuste de inventario',
): MovimientoInventario[] {
  const actual = obtenerStockActual(productoId);
  const deseado = Math.max(0, stockDeseado);
  const diferencia = deseado - actual;

  if (Math.abs(diferencia) < 0.0001) {
    return cargarMovimientos();
  }

  return registrarAjuste(
    productoId,
    diferencia,
    observaciones,
  );
}

export function eliminarMovimiento(
  id: string,
): MovimientoInventario[] {
  const movimientos = cargarMovimientos().filter(
    (movimiento) => movimiento.id !== id,
  );

  guardarMovimientos(movimientos);
  return movimientos;
}

export function calcularReposicionInventario(
  productoId: string,
  stockObjetivo: number,
): number {
  return Math.max(
    0,
    stockObjetivo - obtenerStockActual(productoId),
  );
}

export function consumoEntreFechas(
  productoId: string,
  inicio: Date,
  fin: Date,
): number {
  return movimientosProducto(productoId)
    .filter((movimiento) => {
      const fecha = new Date(movimiento.fecha);

      return (
        movimiento.tipo === 'consumo' &&
        fecha >= inicio &&
        fecha <= fin
      );
    })
    .reduce(
      (total, movimiento) =>
        total + movimiento.cantidad,
      0,
    );
}

export function consumoUltimos30Dias(
  productoId: string,
): number {
  const fin = new Date();
  const inicio = new Date();
  inicio.setDate(fin.getDate() - 30);

  return consumoEntreFechas(
    productoId,
    inicio,
    fin,
  );
}

export function previsionAgotamiento(
  productoId: string,
): number | null {
  const consumo = consumoUltimos30Dias(productoId);

  if (consumo <= 0) {
    return null;
  }

  const stock = obtenerStockActual(productoId);
  return Math.max(0, stock) / (consumo / 30);
}
